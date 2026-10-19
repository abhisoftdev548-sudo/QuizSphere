import type { Request, Response } from 'express';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { QCoinLedger } from '../models/QCoinLedger.js';
import { UserPass } from '../models/UserPass.js';
import { applyLedgerEntry } from '../services/wallet.service.js';
import { passProductsOrDefault, type PassKey } from '../constants/passes.js';
import { runInTransaction } from '../services/transaction.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData } from '../utils/http.js';

export async function listPasses(req: Request, res: Response): Promise<void> {
  const config = await PlatformConfig.findById('global').select('passProducts').lean();
  const products = passProductsOrDefault(config?.passProducts as any);
  const balances = await UserPass.find({ userId: req.auth!.userId }).lean();
  const balanceByKey = new Map(balances.map((item) => [item.passKey, item.balance]));
  sendData(res, { items: products.map((item) => ({ ...item, balance: balanceByKey.get(item.key) ?? 0 })) });
}

export async function purchasePass(req: Request, res: Response): Promise<void> {
  const key = req.get('idempotency-key')?.trim();
  if (!key || key.length > 120) throw new ApiError(400, 'An Idempotency-Key header is required to purchase a pass.', 'IDEMPOTENCY_KEY_REQUIRED');
  const product = passProductsOrDefault((await PlatformConfig.findById('global').select('passProducts').lean())?.passProducts as any)
    .find((item) => item.key === req.params.passKey);
  if (!product || !product.active) throw new ApiError(404, 'This pass is not currently available.', 'PASS_UNAVAILABLE');
  if (product.price <= 0) throw new ApiError(409, 'This pass is not configured for QCoin purchase yet. Contact the platform administrator.', 'PASS_NOT_PRICED');

  const userId = req.auth!.userId;
  const result = await runInTransaction(async (session) => {
    const ledgerKey = `pass-purchase:${userId}:${key}`;
    const existing = await QCoinLedger.findOne({ idempotencyKey: ledgerKey }).session(session);
    if (existing) {
      if (String(existing.userId) !== userId || existing.type !== 'pass_purchase' || existing.referenceId !== product.key) throw new ApiError(409, 'This purchase key was already used for a different transaction.', 'IDEMPOTENCY_CONFLICT');
      return UserPass.findOne({ userId, passKey: product.key }).session(session);
    }
    await applyLedgerEntry({
      userId,
      amount: -product.price,
      type: 'pass_purchase',
      idempotencyKey: ledgerKey,
      description: `Purchased ${product.name}`,
      relatedType: 'account',
      referenceId: product.key,
    }, session);
    return UserPass.findOneAndUpdate(
      { userId, passKey: product.key },
      { $inc: { balance: 1 }, $setOnInsert: { userId, passKey: product.key } },
      { upsert: true, new: true, session, setDefaultsOnInsert: true },
    );
  });
  sendData(res, { passKey: product.key, passName: product.name, balance: result?.balance ?? 0, paid: product.price });
}

export async function sellPass(req: Request, res: Response): Promise<void> {
  const requestKey = req.get('idempotency-key')?.trim();
  if (!requestKey || requestKey.length > 120) throw new ApiError(400, 'An Idempotency-Key header is required to sell a pass.', 'IDEMPOTENCY_KEY_REQUIRED');
  const passKey = (req.body as { passKey: PassKey }).passKey;
  const product = passProductsOrDefault((await PlatformConfig.findById('global').select('passProducts').lean())?.passProducts as any)
    .find((item) => item.key === passKey);
  if (!product) throw new ApiError(422, 'Choose a valid pass to sell.', 'INVALID_PASS');
  if (product.buybackPrice <= 0) throw new ApiError(409, 'The platform is not currently buying this pass.', 'PASS_NOT_BUYBACK_ENABLED');

  const userId = req.auth!.userId;
  const result = await runInTransaction(async (session) => {
    const ledgerKey = `pass-buyback:${userId}:${requestKey}`;
    const existing = await QCoinLedger.findOne({ idempotencyKey: ledgerKey }).session(session);
    if (existing) {
      if (String(existing.userId) !== userId || existing.type !== 'pass_sale' || existing.referenceId !== passKey) throw new ApiError(409, 'This sale key was already used for a different transaction.', 'IDEMPOTENCY_CONFLICT');
      return existing;
    }
    const inventory = await UserPass.findOneAndUpdate(
      { userId, passKey, balance: { $gte: 1 } },
      { $inc: { balance: -1 } },
      { new: true, session },
    );
    if (!inventory) throw new ApiError(402, `You do not have a ${product.name} to sell.`, 'PASS_REQUIRED', { passKey });
    return applyLedgerEntry({
      userId,
      amount: product.buybackPrice,
      type: 'pass_sale',
      idempotencyKey: ledgerKey,
      description: `Sold ${product.name} to QuizSphere`,
      relatedType: 'account',
      referenceId: passKey,
    }, session);
  });
  sendData(res, { passKey, passName: product.name, paid: result.amount });
}
