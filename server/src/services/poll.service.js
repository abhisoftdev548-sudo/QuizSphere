import Poll from '../models/Poll.js';
import Vote from '../models/Vote.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notifications.js';
import { addQCoinTransaction } from '../utils/qcoin.js';

export const createPoll = async (userId, data) => {
  const options = data.options.map(o => ({ text: o.text, votes: 0 }));
  const poll = await Poll.create({
    question: data.question,
    description: data.description || '',
    options,
    author: userId,
    category: data.category || 'General',
    isMultipleChoice: data.isMultipleChoice || false,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 7*24*60*60*1000),
    tags: data.tags || [],
    thumbnail: data.thumbnail || '',
    isPublic: data.isPublic ?? true,
    status: 'pending'
  });

  await User.findByIdAndUpdate(userId, { $inc: { pollsCreated: 1 } });
  return await Poll.findById(poll._id).populate('author', 'username avatar');
};

export const getPolls = async ({ page = 1, limit = 12, search, category, status = 'approved', sortBy = 'createdAt', sortOrder = 'desc', authorId = null, isAdmin = false }) => {
  const query = {};
  if (!isAdmin) {
    query.status = 'approved';
    query.isPublic = true;
    query.expiresAt = { $gt: new Date() };
  } else if (status && status !== 'all') {
    query.status = status;
  }

  if (search) query.$or = [{ question: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
  if (category && category !== 'all') query.category = category;
  if (authorId) query.author = authorId;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [polls, total] = await Promise.all([
    Poll.find(query).sort(sort).skip(skip).limit(limit).populate('author', 'username avatar points').lean(),
    Poll.countDocuments(query)
  ]);

  return { polls, total, page, totalPages: Math.ceil(total / limit) };
};

export const getPollById = async (pollId, userId = null, isAdmin = false) => {
  const poll = await Poll.findById(pollId).populate('author', 'username avatar bio points');
  if (!poll) throw Object.assign(new Error('Poll not found'), { statusCode: 404 });
  if (!isAdmin && poll.status !== 'approved' && poll.author._id.toString() !== userId) throw Object.assign(new Error('Poll not available'), { statusCode: 403 });
  
  let userVote = null;
  if (userId) {
    userVote = await Vote.findOne({ user: userId, poll: pollId });
  }

  return { poll, userVote };
};

export const updatePoll = async (pollId, userId, data, isAdmin = false) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw Object.assign(new Error('Poll not found'), { statusCode: 404 });
  if (!isAdmin && poll.author.toString() !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });

  if (data.options) {
    const existingVotes = poll.totalVotes;
    if (existingVotes > 0 && !isAdmin) throw Object.assign(new Error('Cannot edit poll after votes have been cast'), { statusCode: 400 });
    poll.options = data.options.map(o => ({ text: o.text, votes: 0 }));
    poll.totalVotes = 0;
  }

  Object.assign(poll, {
    question: data.question ?? poll.question,
    description: data.description ?? poll.description,
    category: data.category ?? poll.category,
    isMultipleChoice: data.isMultipleChoice ?? poll.isMultipleChoice,
    tags: data.tags ?? poll.tags,
    thumbnail: data.thumbnail ?? poll.thumbnail,
    isPublic: data.isPublic ?? poll.isPublic
  });

  if (!isAdmin) poll.status = 'pending';
  if (data.expiresAt) poll.expiresAt = new Date(data.expiresAt);

  await poll.save();
  return await Poll.findById(poll._id).populate('author', 'username avatar');
};

export const deletePoll = async (pollId, userId, isAdmin = false) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw Object.assign(new Error('Poll not found'), { statusCode: 404 });
  if (!isAdmin && poll.author.toString() !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });

  await Vote.deleteMany({ poll: pollId });
  await Poll.findByIdAndDelete(pollId);
  return true;
};

export const votePoll = async (userId, pollId, optionIndexes) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw Object.assign(new Error('Poll not found'), { statusCode: 404 });
  if (poll.status !== 'approved') throw Object.assign(new Error('Poll not available'), { statusCode: 403 });
  if (poll.expiresAt < new Date()) throw Object.assign(new Error('Poll has expired'), { statusCode: 400 });

  const existing = await Vote.findOne({ user: userId, poll: pollId });
  if (existing) throw Object.assign(new Error('You have already voted on this poll'), { statusCode: 400 });

  if (!poll.isMultipleChoice && optionIndexes.length > 1) throw Object.assign(new Error('This poll allows only one choice'), { statusCode: 400 });

  for (const idx of optionIndexes) {
    if (idx < 0 || idx >= poll.options.length) throw Object.assign(new Error('Invalid option index'), { statusCode: 400 });
  }

  for (const idx of optionIndexes) {
    poll.options[idx].votes += 1;
  }
  poll.totalVotes += 1;
  await poll.save();

  const vote = await Vote.create({
    user: userId,
    poll: pollId,
    optionIndexes,
    optionIds: optionIndexes.map(i => poll.options[i]._id)
  });

  try {
    await addQCoinTransaction({
      userId,
      type: 'earn',
      amount: 2,
      description: `Earned 2 QCoins for voting on poll: ${poll.question.substring(0, 50)}`,
      relatedId: poll._id,
      relatedType: 'poll'
    });
    await User.findByIdAndUpdate(userId, { $inc: { points: 2 } });
  } catch (e) {
    console.error('QCoin reward error', e.message);
  }

  if (poll.author.toString() !== userId) {
    await createNotification({
      userId: poll.author,
      type: 'poll_vote',
      title: 'New vote on your poll',
      message: `Someone voted on your poll "${poll.question.substring(0, 50)}..."`,
      link: `/polls/${pollId}`,
      relatedId: poll._id,
      relatedType: 'poll'
    });
  }

  return { poll: await Poll.findById(pollId), vote };
};

export const reviewPoll = async (pollId, status, rejectionReason, adminId) => {
  const poll = await Poll.findById(pollId).populate('author');
  if (!poll) throw Object.assign(new Error('Poll not found'), { statusCode: 404 });

  poll.status = status;
  if (status === 'rejected') poll.rejectionReason = rejectionReason || 'Does not meet guidelines';
  else poll.rejectionReason = '';
  await poll.save();

  if (poll.author) {
    await createNotification({
      userId: poll.author._id,
      type: status === 'approved' ? 'poll_approved' : 'poll_rejected',
      title: status === 'approved' ? 'Poll Approved' : 'Poll Rejected',
      message: status === 'approved' ? `Your poll "${poll.question.substring(0, 50)}..." has been approved!` : `Your poll was rejected: ${poll.rejectionReason}`,
      link: `/polls/${poll._id}`,
      relatedId: poll._id,
      relatedType: 'poll'
    });
  }

  return poll;
};

export const getCreatorAnalytics = async (authorId) => {
  const polls = await Poll.find({ author: authorId }).select('_id question category status totalVotes createdAt').lean();
  const pollIds = polls.map(p => p._id);
  const votes = await Vote.find({ poll: { $in: pollIds } }).lean();
  const totalVotes = votes.length;
  const topPolls = [...polls].sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0)).slice(0, 5);
  return { polls, stats: { totalPolls: polls.length, totalVotes }, topPolls };
};
