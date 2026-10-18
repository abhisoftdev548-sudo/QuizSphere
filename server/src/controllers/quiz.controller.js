import * as quizService from '../services/quiz.service.js';

export const createQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.createQuiz(req.user._id, req.body);
    res.status(201).json({ success: true, message: 'Quiz created and pending review', data: { quiz } });
  } catch (err) { next(err); }
};

export const getQuizzes = async (req, res, next) => {
  try {
    const { page, limit, search, category, difficulty, status, sortBy, sortOrder } = req.query;
    const result = await quizService.getQuizzes({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
      search,
      category,
      difficulty,
      status,
      sortBy,
      sortOrder,
      authorId: req.query.author,
      isAdmin: req.user?.role === 'admin',
      userId: req.user?._id
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getQuizById = async (req, res, next) => {
  try {
    const quiz = await quizService.getQuizById(req.params.id, req.user?._id?.toString(), req.user?.role === 'admin');
    res.json({ success: true, data: { quiz } });
  } catch (err) { next(err); }
};

export const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.updateQuiz(req.params.id, req.user._id, req.body, req.user.role === 'admin');
    res.json({ success: true, message: 'Quiz updated', data: { quiz } });
  } catch (err) { next(err); }
};

export const deleteQuiz = async (req, res, next) => {
  try {
    await quizService.deleteQuiz(req.params.id, req.user._id, req.user.role === 'admin');
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) { next(err); }
};

export const reviewQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.reviewQuiz(req.params.id, req.body.status, req.body.rejectionReason, req.user._id);
    // Audit log
    const AuditLog = (await import('../models/AuditLog.js')).default;
    await AuditLog.create({ admin: req.user._id, action: `quiz_${req.body.status}`, targetType: 'quiz', targetId: quiz._id, details: { title: quiz.title, reason: req.body.rejectionReason }, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, message: `Quiz ${req.body.status}`, data: { quiz } });
  } catch (err) { next(err); }
};

export const attemptQuiz = async (req, res, next) => {
  try {
    const attempt = await quizService.attemptQuiz(req.user._id, req.params.id, req.body.answers, req.body.timeTaken);
    res.status(201).json({ success: true, message: 'Quiz submitted', data: { attempt } });
  } catch (err) { next(err); }
};

export const getAttempts = async (req, res, next) => {
  try {
    const result = await quizService.getAttempts(req.user._id, { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 10, quizId: req.query.quizId });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getAttemptById = async (req, res, next) => {
  try {
    const attempt = await quizService.getAttemptById(req.params.attemptId, req.user._id, req.user.role === 'admin');
    res.json({ success: true, data: { attempt } });
  } catch (err) { next(err); }
};

export const getMyQuizzes = async (req, res, next) => {
  try {
    const result = await quizService.getQuizzes({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 12,
      authorId: req.user._id,
      isAdmin: true,
      status: req.query.status || 'all'
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
