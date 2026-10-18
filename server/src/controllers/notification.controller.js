import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = { user: req.user._id };
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);

    res.json({ success: true, data: { notifications, total, unreadCount, page, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    notif.isRead = true;
    await notif.save();
    res.json({ success: true, message: 'Marked as read', data: { notification: notif } });
  } catch (err) { next(err); }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) { next(err); }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { next(err); }
};

export const clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) { next(err); }
};
