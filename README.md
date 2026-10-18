# QuizSphere — Premium Quiz & Poll SaaS Platform

QuizSphere is a complete, functional full-stack quiz & poll platform built with a premium SaaS dashboard design inspired by Growth Circle. It includes quiz creation, polls, QCoin economy, leaderboard, ratings, notifications, and full admin moderation.

## Tech Stack

- **Frontend**: React + Vite, Tailwind CSS, React Router, Lucide React, Framer Motion
- **Backend**: Node.js + Express, MongoDB + Mongoose, JWT (httpOnly cookies), bcrypt, Helmet, CORS, rate limiting, Zod validation
- **Design**: Custom design system with tokens #6C3BFA primary, #F7F9FC app background, Inter font, rounded-xl cards, modal system

## Features

- **Auth**: Register/Login, JWT httpOnly cookies, role-based (user/admin)
- **Quizzes**: Create, edit, pending → admin approval, attempt with timer, scoring, QCoin rewards, results review
- **Polls**: Create, vote (single/multiple), approval workflow
- **Leaderboard**: Weekly/monthly/all-time, podium for top 3, current user highlight
- **QCoins**: Immutable transaction ledger, earn/spend/purchase, wallet + history, packages
- **Ratings**: Rate quizzes/polls, reviews
- **Notifications**: Real-time bell with unread badge
- **Reports**: Report content, admin moderation queue
- **Admin**: Dashboard stats, approvals table (member, content, date, status, score, review action), user management, reports, audit logs, platform settings
- **UI**: Persistent sidebar (260px), topbar with search/bell/profile, empty states, skeletons, toasts, modals (confirm/form/info/danger)

## Project Structure

```
/client - React Vite frontend
  /src/components/ui - Button, Input, Select, Card, Badge, Table, Tabs, Pagination, Avatar, EmptyState, Skeleton, Modal, Toast
  /src/components/layout - Sidebar, Topbar, Layout
  /src/pages/auth - Landing, Login, Register
  /src/pages/user - Dashboard, Quizzes, QuizDetails, QuizCreate, QuizAttempt, QuizResults, Polls, PollCreate, PollDetails, Leaderboard, Wallet, Ratings, Notifications, Profile, Settings
  /src/pages/admin - Dashboard, Approvals, Users, Reports, AuditLogs, PlatformSettings
  /src/lib/api - Axios instance
  /src/store/authStore - Zustand auth
/server - Express backend
  /src/models - User, Quiz, Question, Attempt, Poll, Vote, Rating, QCoinTransaction, Notification, Report, AuditLog, Settings
  /src/routes - auth, quizzes, polls, leaderboard, qcoins, ratings, notifications, admin, reports
  /src/controllers - Business logic
  /src/services - quiz, poll, leaderboard, auth
  /src/middleware - auth, validate, errorHandler, sanitize, rateLimiter
  /src/validators - Zod schemas
  /src/utils - jwt, qcoin, notifications
  /src/config/db - Mongo connection
```

## Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas or local MongoDB

### Backend

```bash
cd server
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
npm install
npm run dev # runs on http://localhost:5000
```

**.env variables:**
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/quizsphere
JWT_SECRET=your_32_char_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
BCRYPT_SALT_ROUNDS=12
```

### Frontend

```bash
cd client
npm install
npm run dev # http://localhost:5173
```

**Vite env (optional):**
```
VITE_API_URL=http://localhost:5000/api
```

### Create First Admin

Register normally, then in MongoDB set role to admin:

```js
db.users.updateOne({ email: "admin@quizsphere.com" }, { $set: { role: "admin" } })
```

Or register with role admin when no admin exists (allowed in dev).

Demo accounts after seeding (if you create seed):
- Admin: admin@quizsphere.com / admin123
- User: demo@quizsphere.com / demo123

### Seeding (optional)

Create `server/src/seed.js` to populate demo quizzes:

```js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from './models/User.js';
import Quiz from './models/Quiz.js';
import Question from './models/Question.js';

await mongoose.connect(process.env.MONGO_URI);
const admin = await User.findOne({ email: 'admin@quizsphere.com' });
const quiz = await Quiz.create({ title: 'JS Basics', description: 'Test JS knowledge', category: 'Technology', difficulty: 'easy', author: admin._id, status: 'approved', timeLimit: 10, qcoinReward: 20 });
const q1 = await Question.create({ quiz: quiz._id, text: 'What is closure?', options: [{ text: 'Function + lexical env', isCorrect: true }, { text: 'Loop', isCorrect: false }], points: 10, order: 0 });
quiz.questions = [q1._id];
await quiz.save();
console.log('Seeded');
process.exit();
```

## API Endpoints

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login (sets httpOnly cookie)
- `GET /api/auth/me` - Current user
- `GET /api/quizzes` - List quizzes (filters: search, category, difficulty, status)
- `POST /api/quizzes` - Create quiz (pending)
- `GET /api/quizzes/:id` - Quiz details
- `POST /api/quizzes/:id/attempt` - Submit attempt
- `POST /api/quizzes/:id/review` - Admin approve/reject
- `GET /api/polls` - List polls
- `POST /api/polls` - Create poll
- `POST /api/polls/:id/vote` - Vote
- `GET /api/leaderboard?range=weekly|monthly|all-time` - Leaderboard
- `GET /api/qcoins/wallet` - Wallet + transactions
- `POST /api/qcoins/purchase` - Purchase QCoins (simulated)
- `POST /api/ratings` - Rate content
- `GET /api/notifications` - Notifications
- `GET /api/admin/dashboard` - Admin stats
- `GET /api/admin/users` - User management
- `GET /api/admin/reports` - Reports
- `GET /api/admin/audit-logs` - Audit logs

## Design System

Defined in `client/tailwind.config.js`:

- Primary #6C3BFA, hover #5B2BE0, light #F0EDFF
- App bg #F7F9FC, surface #FFFFFF, border #E6EBF2
- Text primary #172033, secondary #8493AA
- Success #16A37A, warning #F59E0B, error #E5484D
- Buttons rounded-lg 8px, h-10, font 14/500
- Cards rounded-xl 12px, border 1px, subtle shadow
- Badges rounded-full soft bg
- Sidebar 260px white, active purple, hover light purple
- Topbar white with border
- Modals rounded-2xl centered, dark backdrop, scale+fade animation

## Deployment

- **Frontend**: Vercel/Netlify - set VITE_API_URL to backend URL
- **Backend**: Render/Railway/Fly - set env vars, allow CORS CLIENT_URL
- **DB**: MongoDB Atlas - whitelist IPs

## Security

- Helmet, CORS with credentials, rate limiting, Zod validation, sanitized inputs, httpOnly cookies, bcrypt 12 rounds, JWT

## License

MIT
