import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { sanitizeInput } from './middleware/sanitize.js';

import authRoutes from './routes/auth.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import pollRoutes from './routes/poll.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import qcoinRoutes from './routes/qcoin.routes.js';
import ratingRoutes from './routes/rating.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reportRoutes from './routes/report.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Security & middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'QuizSphere API is running', timestamp: new Date().toISOString(), db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/qcoins', qcoinRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// 404 and error handler
app.use(notFound);
app.use(errorHandler);

// Start server
const start = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 QuizSphere server running on port ${PORT}`);
    console.log(`📡 Client URL: ${CLIENT_URL}`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  });
};

start();

export default app;
