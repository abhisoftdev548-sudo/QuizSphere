import express from 'express';
import { getWallet, getTransactions, purchaseQCoins, getPackages } from '../controllers/qcoin.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { qcoinPurchaseSchema } from '../validators/common.validator.js';

const router = express.Router();

router.get('/wallet', authenticate, getWallet);
router.get('/transactions', authenticate, getTransactions);
router.get('/packages', getPackages);
router.post('/purchase', authenticate, validate(qcoinPurchaseSchema), purchaseQCoins);

export default router;
