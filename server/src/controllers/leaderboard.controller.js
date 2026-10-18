import * as leaderboardService from '../services/leaderboard.service.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    const result = await leaderboardService.getLeaderboard({
      range: req.query.range || 'all-time',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      currentUserId: req.user?._id
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getUserStats = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const result = await leaderboardService.getUserStats(userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
