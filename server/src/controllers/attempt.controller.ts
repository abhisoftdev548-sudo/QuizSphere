import type { Request, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { QuizPrizePool } from '../models/PrizePool.js';
import { QuizVersion } from '../models/Quiz.js';
import { applyLedgerEntry } from '../services/wallet.service.js';
import { isAnswerCorrect, scoreAnswers } from '../services/scoring.service.js';
import { runInTransaction } from '../services/transaction.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData } from '../utils/http.js';

function owner(req: Request): string { return req.auth!.userId; }

export async function startAttempt(req: Request, res: Response): Promise<void> {
  const requestKey = req.get('idempotency-key')?.trim();
  if (!requestKey || requestKey.length > 120) throw new ApiError(400, 'An Idempotency-Key header is required to start an attempt.', 'IDEMPOTENCY_KEY_REQUIRED');
  const quiz = await Quiz.findOne({ _id: req.params.id, status: 'published' }).lean() as any;
  const time = new Date();
  if (!quiz || (quiz.closesAt && quiz.closesAt <= time) || !quiz.currentVersionId) throw new ApiError(404, 'This quiz is not currently available.', 'CONTENT_NOT_FOUND');
  const existingAttempt = await QuizAttempt.findOne({ userId: owner(req), quizId: quiz._id, requestKey }).lean() as any;
  if (existingAttempt) {
    const result = existingAttempt.status === 'in_progress' ? await authorizedQuestionPayload(String(existingAttempt._id), owner(req)) : null;
    sendData(res, { attempt: publicAttempt(existingAttempt), ...(result ? { questions: result.questions } : {}) });
    return;
  }

  const result = await runInTransaction(async (session) => {
    const currentQuiz = await Quiz.findOne({ _id: quiz._id, status: 'published' }).session(session);
    if (!currentQuiz || !currentQuiz.currentVersionId) throw new ApiError(409, 'This quiz is no longer available.', 'CONTENT_CLOSED');
    const currentTime = new Date();
    if (currentQuiz.closesAt && currentQuiz.closesAt <= currentTime) throw new ApiError(409, 'This quiz has closed.', 'CONTENT_CLOSED');
    const version = await QuizVersion.findById(currentQuiz.currentVersionId).session(session);
    if (!version || version.questions.length < 1) throw new ApiError(409, 'This quiz is not ready for attempts.', 'CONTENT_UNAVAILABLE');
    const startedAt = new Date();
    const expiresAt = currentQuiz.timeLimitSeconds ? new Date(startedAt.getTime() + currentQuiz.timeLimitSeconds * 1000) : null;
    const attempt = new QuizAttempt({ quizId: currentQuiz._id, quizVersionId: version._id, userId: owner(req), requestKey, startedAt, expiresAt, entryFee: currentQuiz.entryFee });
    await attempt.save({ session });
    if (currentQuiz.entryFee > 0) {
      const entry = await applyLedgerEntry({ userId: owner(req), amount: -currentQuiz.entryFee, type: 'quiz_entry_fee', idempotencyKey: `quiz-entry:${attempt._id}`, description: `Entry fee for “${currentQuiz.title}”`, relatedType: 'attempt', relatedId: attempt._id }, session);
      await Notification.create([{ userId: owner(req), type: 'qcoin_spent', title: 'QCoins used to start a quiz', message: `${currentQuiz.entryFee} QCoins were used for “${currentQuiz.title}”.`, link: `/app/quiz-session/${attempt._id}`, relatedType: 'ledger', relatedId: entry._id }], { session });
      if (currentQuiz.prizeRules.length > 0) {
        await QuizPrizePool.findOneAndUpdate({ quizId: currentQuiz._id }, { $setOnInsert: { quizId: currentQuiz._id }, $inc: { collectedEntryFees: currentQuiz.entryFee } }, { upsert: true, new: true, session });
      }
    }
    await Quiz.updateOne({ _id: currentQuiz._id }, { $inc: { attemptCount: 1 } }, { session });
    return { attempt, questions: version.questions.map((question: any) => publicQuestion(question)) };
  });
  sendData(res, { attempt: publicAttempt(result.attempt), questions: result.questions }, 201);
}

export async function saveAnswers(req: Request, res: Response): Promise<void> {
  const attempt = await QuizAttempt.findOne({ _id: req.params.id, userId: owner(req) });
  if (!attempt) throw new ApiError(404, 'Attempt not found.', 'ATTEMPT_NOT_FOUND');
  if (attempt.status !== 'in_progress') throw new ApiError(409, 'This attempt is already finalized.', 'ATTEMPT_FINALIZED');
  if (attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now()) throw new ApiError(409, 'The time limit for this attempt has ended. Submit your answers to see your result.', 'ATTEMPT_EXPIRED');
  const version = await QuizVersion.findById(attempt.quizVersionId).lean() as any;
  if (!version) throw new ApiError(404, 'The quiz version could not be found.', 'QUIZ_VERSION_NOT_FOUND');
  const byId = new Map(version.questions.map((question: any) => [String(question._id), question]));
  const incoming = (req.body as { answers: Array<{ questionId: string; selections: string[]; textAnswer: string }> }).answers;
  const validated = incoming.map((answer) => {
    const question: any = byId.get(answer.questionId);
    if (!question) throw new ApiError(422, 'One or more answers refer to an invalid question.', 'INVALID_ANSWER');
    const validKeys = new Set(question.options.map((option: any) => option.key));
    if (answer.selections.some((key) => !validKeys.has(key))) throw new ApiError(422, 'An answer option is not valid for this question.', 'INVALID_ANSWER');
    if (question.type !== 'multiple_choice' && answer.selections.length > 1) throw new ApiError(422, 'This question accepts only one answer.', 'INVALID_ANSWER');
    return { questionId: answer.questionId, selections: answer.selections, textAnswer: answer.textAnswer ?? '' };
  });
  attempt.answers = validated as any;
  await attempt.save();
  sendData(res, { saved: true, savedAt: new Date() });
}

export async function submitAttempt(req: Request, res: Response): Promise<void> {
  const result = await runInTransaction(async (session) => {
    const attempt = await QuizAttempt.findOne({ _id: req.params.id, userId: owner(req) }).session(session);
    if (!attempt) throw new ApiError(404, 'Attempt not found.', 'ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'in_progress') return attempt;
    const version = await QuizVersion.findById(attempt.quizVersionId).session(session);
    const quiz = await Quiz.findById(attempt.quizId).session(session);
    if (!version || !quiz) throw new ApiError(404, 'Quiz attempt details are no longer available.', 'ATTEMPT_NOT_FOUND');
    const scored = scoreAnswers(version.questions as any[], attempt.answers as any[]);
    const timedOut = Boolean(attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now());
    attempt.status = timedOut ? 'expired' : 'completed';
    attempt.score = scored.percent;
    attempt.maxScore = scored.maxScore;
    attempt.correctCount = scored.correctCount;
    attempt.passed = scored.percent >= quiz.passingScorePercent;
    attempt.submittedAt = new Date();
    await attempt.save({ session });
    await Notification.create([{ userId: attempt.userId, type: 'result_available', title: 'Your quiz result is ready', message: `You scored ${scored.percent}% on “${quiz.title}”.`, link: `/attempts/${attempt._id}`, relatedType: 'attempt', relatedId: attempt._id }], { session });
    return attempt;
  });
  const payload = await resultPayload(result as any);
  sendData(res, payload);
}

export async function getAttempt(req: Request, res: Response): Promise<void> {
  const attempt = await QuizAttempt.findOne({ _id: req.params.id, userId: owner(req) });
  if (!attempt) throw new ApiError(404, 'Attempt not found.', 'ATTEMPT_NOT_FOUND');
  if (attempt.status === 'in_progress') {
    const version = await QuizVersion.findById(attempt.quizVersionId).lean() as any;
    const quiz = await Quiz.findById(attempt.quizId).select('title').lean() as any;
    if (!version) throw new ApiError(404, 'Quiz attempt details are no longer available.', 'ATTEMPT_NOT_FOUND');
    sendData(res, { attempt: { ...publicAttempt(attempt), quizTitle: quiz?.title ?? 'Quiz' }, questions: version.questions.map((question: any) => publicQuestion(question)), savedAnswers: attempt.answers });
    return;
  }
  sendData(res, await resultPayload(attempt));
}

export async function getAttemptResult(req: Request, res: Response): Promise<void> {
  const attempt = await QuizAttempt.findOne({ _id: req.params.id, userId: owner(req) });
  if (!attempt) throw new ApiError(404, 'Attempt not found.', 'ATTEMPT_NOT_FOUND');
  sendData(res, await resultPayload(attempt));
}

async function resultPayload(attempt: any) {
  const quiz = await Quiz.findById(attempt.quizId).select('title allowResultReview passingScorePercent').lean() as any;
  const base = { attempt: { ...publicAttempt(attempt), quizTitle: quiz?.title ?? 'Quiz' }, resultDetails: null as null | unknown[] };
  if (attempt.status === 'in_progress') return base;
  if (!quiz?.allowResultReview) return base;
  const version = await QuizVersion.findById(attempt.quizVersionId).lean() as any;
  if (!version) return base;
  const byQuestion = new Map((attempt.answers ?? []).map((answer: any) => [String(answer.questionId), answer]));
  const details = version.questions.map((question: any) => {
    const answer: any = byQuestion.get(String(question._id));
    const isCorrect = isAnswerCorrect(question, answer);
    return { questionId: String(question._id), prompt: question.prompt, type: question.type, options: question.options, correctAnswers: question.correctAnswers, explanation: question.explanation, submittedAnswer: answer?.selections?.length ? answer.selections : answer?.textAnswer ?? '', isCorrect, points: question.points };
  });
  return { ...base, resultDetails: details };
}

async function authorizedQuestionPayload(attemptId: string, userId: string) {
  const attempt = await QuizAttempt.findOne({ _id: attemptId, userId }).lean() as any;
  if (!attempt || attempt.status !== 'in_progress') return null;
  const version = await QuizVersion.findById(attempt.quizVersionId).lean() as any;
  return version ? { questions: version.questions.map((question: any) => publicQuestion(question)) } : null;
}

function publicAttempt(attempt: any) {
  return { id: String(attempt._id), quizId: String(attempt.quizId), status: attempt.status, score: attempt.score, maxScore: attempt.maxScore, correctCount: attempt.correctCount, passed: attempt.passed, entryFee: attempt.entryFee, rewardAmount: attempt.rewardAmount, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt, submittedAt: attempt.submittedAt };
}
function publicQuestion(question: any) {
  return { id: String(question._id), type: question.type, prompt: question.prompt, options: question.options.map((option: any) => ({ key: option.key, text: option.text })), hint: question.hint, points: question.points };
}
