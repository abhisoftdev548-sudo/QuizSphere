import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { allowedOrigins, env } from './config/env.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import exploreRoutes from './routes/explore.routes.js';
import creatorRoutes from './routes/creator.routes.js';
import attemptRoutes from './routes/attempt.routes.js';
import pollRoutes from './routes/poll.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import platformRoutes from './routes/platform.routes.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key', 'X-Confirm-QCoin-Fee'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(csrfProtection);
app.use((req, _res, next) => {
  if (!req.path.startsWith('/api/v1') || req.path === '/api/v1/health') return next();
  if (mongoose.connection.readyState !== 1) return next(new ApiError(503, 'The QuizSphere database is not connected. Check server configuration and try again.', 'DATABASE_UNAVAILABLE'));
  next();
});
app.use('/api/v1', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));

app.get('/api/v1/health', (_req, res) => res.json({ success: true, data: { service: 'QuizSphere API', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', environment: env.NODE_ENV } }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/explore', exploreRoutes);
app.use('/api/v1/creator', creatorRoutes);
app.use('/api/v1/participation', attemptRoutes);
app.use('/api/v1/polls', pollRoutes);
app.use('/api/v1/leaderboards', leaderboardRoutes);
app.use('/api/v1/platform', platformRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', notFound);
app.use(errorHandler);

export default app;
