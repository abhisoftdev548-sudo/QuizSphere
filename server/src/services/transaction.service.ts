import mongoose, { type ClientSession } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export async function runInTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  let value!: T;
  try {
    await session.withTransaction(async () => {
      value = await work(session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return value;
  } finally {
    await session.endSession();
  }
}

export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000;
}

export function transactionRequiredError(): ApiError {
  return new ApiError(503, 'This operation requires MongoDB transaction support. Configure MongoDB Atlas or a replica set.', 'TRANSACTION_SUPPORT_REQUIRED');
}
