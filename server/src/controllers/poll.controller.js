import * as pollService from '../services/poll.service.js';

export const createPoll = async (req, res, next) => {
  try {
    const poll = await pollService.createPoll(req.user._id, req.body);
    res.status(201).json({ success: true, message: 'Poll created and pending review', data: { poll } });
  } catch (err) { next(err); }
};

export const getPolls = async (req, res, next) => {
  try {
    const { page, limit, search, category, status, sortBy, sortOrder } = req.query;
    const result = await pollService.getPolls({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
      search,
      category,
      status,
      sortBy,
      sortOrder,
      authorId: req.query.author,
      isAdmin: req.user?.role === 'admin'
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getPollById = async (req, res, next) => {
  try {
    const { poll, userVote } = await pollService.getPollById(req.params.id, req.user?._id, req.user?.role === 'admin');
    res.json({ success: true, data: { poll, userVote } });
  } catch (err) { next(err); }
};

export const updatePoll = async (req, res, next) => {
  try {
    const poll = await pollService.updatePoll(req.params.id, req.user._id, req.body, req.user.role === 'admin');
    res.json({ success: true, message: 'Poll updated', data: { poll } });
  } catch (err) { next(err); }
};

export const deletePoll = async (req, res, next) => {
  try {
    await pollService.deletePoll(req.params.id, req.user._id, req.user.role === 'admin');
    res.json({ success: true, message: 'Poll deleted' });
  } catch (err) { next(err); }
};

export const votePoll = async (req, res, next) => {
  try {
    const result = await pollService.votePoll(req.user._id, req.params.id, req.body.optionIndexes);
    res.json({ success: true, message: 'Vote recorded', data: result });
  } catch (err) { next(err); }
};

export const reviewPoll = async (req, res, next) => {
  try {
    const poll = await pollService.reviewPoll(req.params.id, req.body.status, req.body.rejectionReason, req.user._id);
    const AuditLog = (await import('../models/AuditLog.js')).default;
    await AuditLog.create({ admin: req.user._id, action: `poll_${req.body.status}`, targetType: 'poll', targetId: poll._id, details: { question: poll.question, reason: req.body.rejectionReason }, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, message: `Poll ${req.body.status}`, data: { poll } });
  } catch (err) { next(err); }
};

export const getMyPolls = async (req, res, next) => {
  try {
    const result = await pollService.getPolls({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 12,
      authorId: req.user._id,
      isAdmin: true,
      status: req.query.status || 'all'
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
