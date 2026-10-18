import Notification from '../models/Notification.js';

export const createNotification = async ({ userId, type, title, message, link = '', relatedId = null, relatedType = '' }) => {
  try {
    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      link,
      relatedId,
      relatedType
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
};

export const createBulkNotifications = async (userIds, data) => {
  try {
    const docs = userIds.map(uid => ({ user: uid, ...data }));
    return await Notification.insertMany(docs);
  } catch (err) {
    console.error('Bulk notification error:', err.message);
  }
};
