import Rating from '../models/Rating.js';
import Quiz from '../models/Quiz.js';
import Poll from '../models/Poll.js';
import { createNotification } from '../utils/notifications.js';

export const createRating = async (req, res, next) => {
  try {
    const { targetType, targetId, rating, review } = req.body;

    let target;
    if (targetType === 'quiz') target = await Quiz.findById(targetId);
    else if (targetType === 'poll') target = await Poll.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'Target not found' });

    const existing = await Rating.findOne({ user: req.user._id, targetType, targetId });
    if (existing) {
      existing.rating = rating;
      existing.review = review || '';
      await existing.save();
      
      // Update avg rating
      const ratings = await Rating.find({ targetType, targetId });
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      if (targetType === 'quiz') await Quiz.findByIdAndUpdate(targetId, { avgRating: Math.round(avg * 10) / 10, totalRatings: ratings.length });

      return res.json({ success: true, message: 'Rating updated', data: { rating: existing } });
    }

    const newRating = await Rating.create({ user: req.user._id, targetType, targetId, rating, review });

    const ratings = await Rating.find({ targetType, targetId });
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    if (targetType === 'quiz') await Quiz.findByIdAndUpdate(targetId, { avgRating: Math.round(avg * 10) / 10, totalRatings: ratings.length });

    // Notify author
    if (target.author && target.author.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: target.author,
        type: 'new_rating',
        title: 'New rating received',
        message: `${req.user.username} rated your ${targetType} ${rating} stars`,
        link: targetType === 'quiz' ? `/quizzes/${targetId}` : `/polls/${targetId}`,
        relatedId: targetId,
        relatedType: targetType
      });
    }

    res.status(201).json({ success: true, message: 'Rating submitted', data: { rating: newRating } });
  } catch (err) { next(err); }
};

export const getRatings = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) return res.status(400).json({ success: false, message: 'targetType and targetId required' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      Rating.find({ targetType, targetId, isPublic: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'username avatar').lean(),
      Rating.countDocuments({ targetType, targetId, isPublic: true })
    ]);

    const avgRating = total ? (await Rating.aggregate([{ $match: { targetType, targetId: ratings[0]?.targetId || targetId } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]))[0]?.avg || 0 : 0;

    res.json({ success: true, data: { ratings, total, page, totalPages: Math.ceil(total / limit), avgRating: Math.round(avgRating * 10) / 10 } });
  } catch (err) { next(err); }
};

export const deleteRating = async (req, res, next) => {
  try {
    const rating = await Rating.findById(req.params.id);
    if (!rating) return res.status(404).json({ success: false, message: 'Rating not found' });
    if (rating.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not authorized' });

    await Rating.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Rating deleted' });
  } catch (err) { next(err); }
};
