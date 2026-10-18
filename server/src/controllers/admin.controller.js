import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Poll from '../models/Poll.js';
import Attempt from '../models/Attempt.js';
import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
import Settings from '../models/Settings.js';
import QCoinTransaction from '../models/QCoinTransaction.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalQuizzes,
      totalPolls,
      pendingQuizzes,
      pendingPolls,
      totalAttempts,
      pendingReports,
      recentUsers,
      recentQuizzes,
      qcoinStats
    ] = await Promise.all([
      User.countDocuments(),
      Quiz.countDocuments(),
      Poll.countDocuments(),
      Quiz.countDocuments({ status: 'pending' }),
      Poll.countDocuments({ status: 'pending' }),
      Attempt.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      User.find().sort({ createdAt: -1 }).limit(5).select('username email avatar createdAt role').lean(),
      Quiz.find().sort({ createdAt: -1 }).limit(5).populate('author', 'username').lean(),
      QCoinTransaction.aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' } } }])
    ]);

    const attemptsByDay = await Attempt.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totals: { totalUsers, totalQuizzes, totalPolls, pendingQuizzes, pendingPolls, totalAttempts, pendingReports },
        recentUsers,
        recentQuizzes,
        qcoinStats,
        attemptsByDay
      }
    });
  } catch (err) { next(err); }
};

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.role && req.query.role !== 'all') filter.role = req.query.role;
    if (req.query.isActive !== undefined && req.query.isActive !== 'all') filter.isActive = req.query.isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password').lean(),
      User.countDocuments(filter)
    ]);

    res.json({ success: true, data: { users, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const allowed = ['role', 'isActive', 'points', 'qcoins'];
    for (const key of allowed) if (req.body[key] !== undefined) user[key] = req.body[key];
    await user.save();

    await AuditLog.create({ admin: req.user._id, action: 'update_user', targetType: 'user', targetId: user._id, details: req.body, ip: req.ip });

    res.json({ success: true, message: 'User updated', data: { user: user.toJSON() } });
  } catch (err) { next(err); }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });

    await User.findByIdAndDelete(req.params.id);
    await AuditLog.create({ admin: req.user._id, action: 'delete_user', targetType: 'user', targetId: user._id, details: { username: user.username }, ip: req.ip });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
};

export const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.targetType && req.query.targetType !== 'all') filter.targetType = req.query.targetType;

    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reporter', 'username avatar').populate('reviewedBy', 'username').lean(),
      Report.countDocuments(filter)
    ]);

    res.json({ success: true, data: { reports, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

export const reviewReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    report.status = req.body.status;
    report.reviewedBy = req.user._id;
    report.reviewNotes = req.body.reviewNotes || '';
    await report.save();

    await AuditLog.create({ admin: req.user._id, action: `report_${req.body.status}`, targetType: 'report', targetId: report._id, details: req.body, ip: req.ip });

    res.json({ success: true, message: 'Report reviewed', data: { report } });
  } catch (err) { next(err); }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.action && req.query.action !== 'all') filter.action = req.query.action;
    if (req.query.admin) filter.admin = req.query.admin;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('admin', 'username avatar').lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({ success: true, data: { logs, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find().lean();
    res.json({ success: true, data: { settings } });
  } catch (err) { next(err); }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;
    let setting = await Settings.findOne({ key });
    if (setting) {
      setting.value = value;
      setting.description = description || setting.description;
      setting.updatedBy = req.user._id;
      await setting.save();
    } else {
      setting = await Settings.create({ key, value, description, updatedBy: req.user._id });
    }

    await AuditLog.create({ admin: req.user._id, action: 'update_settings', targetType: 'settings', targetId: setting._id, details: { key, value }, ip: req.ip });

    res.json({ success: true, message: 'Setting updated', data: { setting } });
  } catch (err) { next(err); }
};
