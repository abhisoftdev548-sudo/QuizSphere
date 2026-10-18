import type { Request, Response } from 'express';
import { PlatformConfig } from '../models/PlatformConfig.js';
import { sendData } from '../utils/http.js';

export async function getPublicRules(_req: Request, res: Response): Promise<void> {
  const config = await PlatformConfig.findById('global').select('signupBonus freeQuizQuestionLimit additionalQuestionFee maxQuizQuestions maxQuizEntryFee maxPollVoteFee').lean();
  sendData(res, { signupBonus: config?.signupBonus ?? 100, freeQuizQuestionLimit: config?.freeQuizQuestionLimit ?? 10, additionalQuestionFee: config?.additionalQuestionFee ?? 0, maxQuizQuestions: config?.maxQuizQuestions ?? 50, maxQuizEntryFee: config?.maxQuizEntryFee ?? 500, maxPollVoteFee: config?.maxPollVoteFee ?? 100 });
}
