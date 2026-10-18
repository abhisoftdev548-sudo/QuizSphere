import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Quiz from './models/Quiz.js';
import Question from './models/Question.js';
import Poll from './models/Poll.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Clear existing
    await User.deleteMany({});
    await Quiz.deleteMany({});
    await Question.deleteMany({});
    await Poll.deleteMany({});

    // Create users
    const admin = await User.create({
      username: 'admin',
      email: 'admin@quizsphere.com',
      password: 'admin123',
      role: 'admin',
      points: 5000,
      qcoins: 10000,
      bio: 'Platform admin'
    });

    const demo = await User.create({
      username: 'demo',
      email: 'demo@quizsphere.com',
      password: 'demo123',
      role: 'user',
      points: 1200,
      qcoins: 500,
      bio: 'Demo user'
    });

    const users = [admin, demo];
    for (let i = 1; i <= 8; i++) {
      const u = await User.create({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: 'password123',
        role: 'user',
        points: Math.floor(Math.random() * 3000),
        qcoins: Math.floor(Math.random() * 1000),
        bio: `Learner ${i}`
      });
      users.push(u);
    }

    console.log('Users created');

    // Create quizzes
    const quizData = [
      { title: 'JavaScript Fundamentals', description: 'Test your JS basics including closures, hoisting and prototypes', category: 'Technology', difficulty: 'easy', tags: ['js', 'programming'] },
      { title: 'React Advanced Patterns', description: 'Deep dive into React hooks, context and performance', category: 'Technology', difficulty: 'hard', tags: ['react', 'frontend'] },
      { title: 'World History Quiz', description: 'From ancient civilizations to modern era', category: 'History', difficulty: 'medium', tags: ['history', 'world'] },
      { title: 'Science & Universe', description: 'Explore physics, chemistry and astronomy', category: 'Science', difficulty: 'medium', tags: ['science', 'space'] },
      { title: 'Sports Trivia 2024', description: 'Latest sports events and records', category: 'Sports', difficulty: 'easy', tags: ['sports', 'trivia'] },
    ];

    for (const qd of quizData) {
      const quiz = await Quiz.create({
        ...qd,
        author: demo._id,
        status: 'approved',
        timeLimit: 10,
        passingScore: 60,
        qcoinReward: 20,
        totalAttempts: Math.floor(Math.random() * 50),
        avgScore: Math.floor(Math.random() * 40) + 60,
        avgRating: (Math.random() * 2 + 3).toFixed(1),
        totalRatings: Math.floor(Math.random() * 20)
      });

      const questions = [];
      for (let i = 0; i < 5; i++) {
        const question = await Question.create({
          quiz: quiz._id,
          text: `Sample question ${i + 1} for ${qd.title}?`,
          type: 'multiple-choice',
          options: [
            { text: 'Correct answer', isCorrect: true },
            { text: 'Wrong answer 1', isCorrect: false },
            { text: 'Wrong answer 2', isCorrect: false },
            { text: 'Wrong answer 3', isCorrect: false }
          ],
          explanation: 'This is the explanation for the question.',
          points: 10,
          order: i
        });
        questions.push(question._id);
      }
      quiz.questions = questions;
      await quiz.save();
    }

    // Pending quizzes for admin review
    for (let i = 0; i < 3; i++) {
      const quiz = await Quiz.create({
        title: `Pending Quiz ${i + 1}`,
        description: 'This quiz is awaiting admin approval',
        category: 'General',
        difficulty: 'medium',
        author: users[2 + i]._id,
        status: 'pending',
        timeLimit: 15,
        qcoinReward: 15
      });
      const q = await Question.create({
        quiz: quiz._id,
        text: 'What is QuizSphere?',
        options: [{ text: 'A quiz platform', isCorrect: true }, { text: 'A game', isCorrect: false }],
        points: 10,
        order: 0
      });
      quiz.questions = [q._id];
      await quiz.save();
    }

    // Create polls
    const pollData = [
      { question: 'What is your favorite programming language?', options: [{ text: 'JavaScript' }, { text: 'Python' }, { text: 'Go' }, { text: 'Rust' }], category: 'Technology' },
      { question: 'How often do you take quizzes?', options: [{ text: 'Daily' }, { text: 'Weekly' }, { text: 'Monthly' }, { text: 'Rarely' }], category: 'General' },
      { question: 'Best way to learn?', options: [{ text: 'Videos' }, { text: 'Reading' }, { text: 'Practice' }, { text: 'Mentorship' }], category: 'General' },
    ];

    for (const pd of pollData) {
      await Poll.create({
        ...pd,
        author: demo._id,
        status: 'approved',
        totalVotes: Math.floor(Math.random() * 100),
        options: pd.options.map(o => ({ ...o, votes: Math.floor(Math.random() * 30) }))
      });
    }

    console.log('Seed completed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
