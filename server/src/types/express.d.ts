import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: 'user' | 'admin' };
      user?: { _id: Types.ObjectId; email: string; username: string; displayName: string; role: 'user' | 'admin'; status: string; walletBalance: number; avatarUrl?: string | null; bio?: string; createdAt: Date };
    }
  }
}

export {};
