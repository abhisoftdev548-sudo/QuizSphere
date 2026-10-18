import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import Attempt from '../models/Attempt.js';
import User from '../models/User.js';
import { addQCoinTransaction, calculateQuizReward } from '../utils/qcoin.js';
import { createNotification } from '../utils/notifications.js';

const sanitizeQuestionsForUser = (questions, isAuthorOrAdmin) => {
  if (isAuthorOrAdmin) return questions;
  // For regular users viewing quiz details or attempting, hide correct answers
  return questions.map(q => {
    const obj = q.toObject ? q.toObject() : { ...q };
    if (obj.type === 'fill-blank') {
      delete obj.correctAnswer;
    } else {
      // Remove isCorrect flag, but keep options text
      if (obj.options) {
        obj.options = obj.options.map(opt => ({ text: opt.text }));
      }
    }
    delete obj.explanation;
    return obj;
  });
};

export const createQuiz = async (userId, data) => {
  const { questions, ...quizData } = data;
  
  const quiz = await Quiz.create({
    ...quizData,
    author: userId,
    status: 'pending'
  });

  const questionDocs = await Promise.all(
    questions.map((q, idx) => Question.create({
      quiz: quiz._id,
      text: q.text,
      type: q.type || 'multiple-choice',
      options: q.type === 'fill-blank' ? [] : (q.options || []),
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      points: q.points || 10,
      order: q.order ?? idx
    }))
  );

  quiz.questions = questionDocs.map(q => q._id);
  await quiz.save();

  await User.findByIdAndUpdate(userId, { $inc: { quizzesCreated: 1 } });

  return await Quiz.findById(quiz._id).populate('author', 'username avatar').populate('questions');
};

export const getQuizzes = async ({ page = 1, limit = 12, search, category, difficulty, status = 'approved', sortBy = 'createdAt', sortOrder = 'desc', userId = null, authorId = null, isAdmin = false }) => {
  const query = {};
  
  if (!isAdmin) {
    query.status = 'approved';
    query.isPublic = true;
  } else if (status) {
    if (status !== 'all') query.status = status;
  }

  if (search) {
    query.$text = { $search: search };
  }
  if (category && category !== 'all') query.category = category;
  if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
  if (authorId) query.author = authorId;

  const sort = {};
  if (search) sort.score = { $meta: 'textScore' };
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;

  const [quizzes, total] = await Promise.all([
    Quiz.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatar points')
      .lean(),
    Quiz.countDocuments(query)
  ]);

  return { quizzes, total, page, totalPages: Math.ceil(total / limit) };
};

export const getQuizById = async (quizId, userId = null, isAdmin = false) => {
  const quiz = await Quiz.findById(quizId)
    .populate('author', 'username avatar bio points quizzesCreated')
    .populate('questions');

  if (!quiz) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 });

  if (!isAdmin && quiz.status !== 'approved' && quiz.author._id.toString() !== userId) {
    throw Object.assign(new Error('Quiz not available'), { statusCode: 403 });
  }

  const isAuthorOrAdmin = isAdmin || quiz.author._id.toString() === userId;
  
  // Sanitize if not author/admin and not in attempt context
  // For details page, hide answers
  if (!isAuthorOrAdmin) {
    quiz.questions = sanitizeQuestionsForUser(quiz.questions, false);
  }

  return quiz;
};

export const getQuizForAttempt = async (quizId, userId, isAdmin = false) => {
  const quiz = await Quiz.findById(quizId)
    .populate('author', 'username avatar')
    .populate('questions');

  if (!quiz) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 });
  if (quiz.status !== 'approved' && !isAdmin && quiz.author._id.toString() !== userId) {
    throw Object.assign(new Error('Quiz not available'), { statusCode: 403 });
  }

  const isAuthorOrAdmin = isAdmin || quiz.author._id.toString() === userId;
  // For attempt, hide correct answers
  if (!isAuthorOrAdmin) {
    quiz.questions = sanitizeQuestionsForUser(quiz.questions, false);
  }

  return quiz;
};

export const updateQuiz = async (quizId, userId, data, isAdmin = false) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 });

  if (!isAdmin && quiz.author.toString() !== userId) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }

  const { questions, ...quizData } = data;

  Object.assign(quiz, quizData);
  if (!isAdmin) quiz.status = 'pending';
  await quiz.save();

  if (questions && questions.length > 0) {
    await Question.deleteMany({ quiz: quiz._id });
    const questionDocs = await Promise.all(
      questions.map((q, idx) => Question.create({
        quiz: quiz._id,
        text: q.text,
        type: q.type || 'multiple-choice',
        options: q.type === 'fill-blank' ? [] : (q.options || []),
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        points: q.points || 10,
        order: q.order ?? idx
      }))
    );
    quiz.questions = questionDocs.map(q => q._id);
    await quiz.save();
  }

  return await Quiz.findById(quiz._id).populate('author', 'username avatar').populate('questions');
};

export const deleteQuiz = async (quizId, userId, isAdmin = false) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 });
  if (!isAdmin && quiz.author.toString() !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });

  await Question.deleteMany({ quiz: quiz._id });
  await Quiz.findByIdAndDelete(quizId);
  return true;
};

export const reviewQuiz = async (quizId, status, rejectionReason, adminId) => {
  const quiz = await Quiz.findById(quizId).populate('author');
  if (!quiz) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 });

  quiz.status = status;
  if (status === 'rejected') quiz.rejectionReason = rejectionReason || 'Does not meet guidelines';
  else quiz.rejectionReason = '';
  await quiz.save();

  if (quiz.author) {
    await createNotification({
      userId: quiz.author._id,
      type: status === 'approved' ? 'quiz_approved' : 'quiz_rejected',
      title: status === 'approved' ? 'Quiz Approved' : 'Quiz Rejected',
      message: status === 'approved' ? `Your quiz "${quiz.title}" has been approved and is now live!` : `Your quiz "${quiz.title}" was rejected: ${quiz.rejectionReason}`,
      link: `/quizzes/${quiz._id}`,
      relatedId: quiz._id,
      relatedType: 'quiz'
    });
  }

  return quiz;
};

export const attemptQuiz = async (userId, quizId, answersData, timeTaken) => {
  const quiz = await Quiz.findById(quizId).populate('questions');
  if (!quiz) throw Object.assign(new Error('Quiz not found'), { statusCode: 404 });
  if (quiz.status !== 'approved') throw Object.assign(new Error('Quiz not available for attempt'), { statusCode: 403 });

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (quiz.qcoinCost > 0) {
    if (user.qcoins < quiz.qcoinCost) throw Object.assign(new Error('Insufficient QCoins to attempt this quiz'), { statusCode: 400 });
    await addQCoinTransaction({
      userId,
      type: 'spend',
      amount: -quiz.qcoinCost,
      description: `Spent ${quiz.qcoinCost} QCoins to attempt quiz: ${quiz.title}`,
      relatedId: quiz._id,
      relatedType: 'quiz'
    });
  }

  let score = 0;
  let totalPoints = 0;
  const processedAnswers = [];

  for (const q of quiz.questions) {
    totalPoints += q.points;
    const userAnswer = answersData.find(a => a.questionId === q._id.toString());
    if (!userAnswer) {
      processedAnswers.push({ question: q._id, selectedOptionIndexes: [], textAnswer: '', isCorrect: false, pointsEarned: 0, timeSpent: 0 });
      continue;
    }

    let isCorrect = false;

    if (q.type === 'fill-blank') {
      const correct = (q.correctAnswer || '').trim().toLowerCase();
      const given = (userAnswer.textAnswer || '').trim().toLowerCase();
      isCorrect = correct === given && given.length > 0;
    } else {
      const correctIndexes = q.options.map((opt, idx) => opt.isCorrect ? idx : -1).filter(i => i !== -1);
      const selected = userAnswer.selectedOptionIndexes || [];
      
      if (q.type === 'single-choice' || q.type === 'true-false') {
        isCorrect = selected.length === 1 && correctIndexes.includes(selected[0]);
      } else {
        // multiple-choice: exact match
        isCorrect = correctIndexes.length === selected.length && correctIndexes.every(ci => selected.includes(ci));
      }
    }

    const pointsEarned = isCorrect ? q.points : 0;
    score += pointsEarned;

    processedAnswers.push({
      question: q._id,
      selectedOptionIndexes: userAnswer.selectedOptionIndexes || [],
      textAnswer: userAnswer.textAnswer || '',
      isCorrect,
      pointsEarned,
      timeSpent: userAnswer.timeSpent || 0
    });
  }

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed = percentage >= quiz.passingScore;

  const attempt = await Attempt.create({
    user: userId,
    quiz: quizId,
    answers: processedAnswers,
    score,
    totalPoints,
    percentage,
    passed,
    timeTaken: timeTaken || 0
  });

  const allAttempts = await Attempt.find({ quiz: quizId });
  const avgScore = allAttempts.reduce((sum, a) => sum + a.percentage, 0) / allAttempts.length;
  await Quiz.findByIdAndUpdate(quizId, { totalAttempts: allAttempts.length, avgScore: Math.round(avgScore) });

  let qcoinsEarned = 0;
  if (passed) {
    qcoinsEarned = calculateQuizReward(quiz, attempt);
    attempt.qcoinsEarned = qcoinsEarned;
    await attempt.save();

    await addQCoinTransaction({
      userId,
      type: 'earn',
      amount: qcoinsEarned,
      description: `Earned ${qcoinsEarned} QCoins for completing quiz: ${quiz.title} (${percentage}%)`,
      relatedId: attempt._id,
      relatedType: 'attempt'
    });

    await User.findByIdAndUpdate(userId, { $inc: { points: score, quizzesCompleted: 1 } });
    
    await createNotification({
      userId,
      type: 'qcoin_earned',
      title: 'QCoins Earned!',
      message: `You earned ${qcoinsEarned} QCoins for scoring ${percentage}% on "${quiz.title}"`,
      link: `/quizzes/${quizId}/results/${attempt._id}`,
      relatedId: attempt._id,
      relatedType: 'attempt'
    });
  } else {
    await User.findByIdAndUpdate(userId, { $inc: { quizzesCompleted: 1 } });
  }

  return await Attempt.findById(attempt._id).populate('quiz', 'title category difficulty qcoinReward').populate('answers.question');
};

export const getAttempts = async (userId, { page = 1, limit = 10, quizId = null }) => {
  const query = { user: userId };
  if (quizId) query.quiz = quizId;

  const skip = (page - 1) * limit;
  const [attempts, total] = await Promise.all([
    Attempt.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('quiz', 'title category difficulty thumbnail').lean(),
    Attempt.countDocuments(query)
  ]);

  return { attempts, total, page, totalPages: Math.ceil(total / limit) };
};

export const getAttemptById = async (attemptId, userId, isAdmin = false) => {
  const attempt = await Attempt.findById(attemptId).populate('quiz').populate('answers.question').populate('user', 'username avatar');
  if (!attempt) throw Object.assign(new Error('Attempt not found'), { statusCode: 404 });
  if (!isAdmin && attempt.user._id.toString() !== userId && attempt.user.toString() !== userId) throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  return attempt;
};

export const getCreatorAnalytics = async (authorId) => {
  const quizzes = await Quiz.find({ author: authorId }).select('_id title category status totalAttempts avgScore avgRating totalRatings createdAt').lean();
  
  const quizIds = quizzes.map(q => q._id);
  const attempts = await Attempt.find({ quiz: { $in: quizIds } }).lean();
  
  const totalAttempts = attempts.length;
  const avgScore = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length) : 0;
  const totalQCoinsGiven = attempts.reduce((sum, a) => sum + (a.qcoinsEarned || 0), 0);
  const passRate = attempts.length ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0;

  const attemptsByDay = await Attempt.aggregate([
    { $match: { quiz: { $in: quizIds }, createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const topQuizzes = [...quizzes].sort((a, b) => (b.totalAttempts || 0) - (a.totalAttempts || 0)).slice(0, 5);

  return {
    quizzes,
    stats: { totalQuizzes: quizzes.length, totalAttempts, avgScore, totalQCoinsGiven, passRate },
    attemptsByDay,
    topQuizzes
  };
};
