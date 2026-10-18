import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Layout
import Layout from './components/layout/Layout';

// Public
import Landing from './pages/auth/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// User
import Dashboard from './pages/user/Dashboard';
import Quizzes from './pages/user/Quizzes';
import QuizDetails from './pages/user/QuizDetails';
import QuizCreate from './pages/user/QuizCreate';
import QuizAttempt from './pages/user/QuizAttempt';
import QuizResults from './pages/user/QuizResults';
import Polls from './pages/user/Polls';
import PollCreate from './pages/user/PollCreate';
import PollDetails from './pages/user/PollDetails';
import Leaderboard from './pages/user/Leaderboard';
import Wallet from './pages/user/Wallet';
import Ratings from './pages/user/Ratings';
import Notifications from './pages/user/Notifications';
import Profile from './pages/user/Profile';
import Settings from './pages/user/Settings';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import Approvals from './pages/admin/Approvals';
import AdminUsers from './pages/admin/Users';
import AdminReports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import PlatformSettings from './pages/admin/PlatformSettings';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  const { fetchMe, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* User protected */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/quizzes/create" element={<QuizCreate />} />
          <Route path="/quizzes/:id" element={<QuizDetails />} />
          <Route path="/quizzes/:id/edit" element={<QuizCreate />} />
          <Route path="/quizzes/:id/attempt" element={<QuizAttempt />} />
          <Route path="/quizzes/:id/results/:attemptId" element={<QuizResults />} />

          <Route path="/polls" element={<Polls />} />
          <Route path="/polls/create" element={<PollCreate />} />
          <Route path="/polls/:id" element={<PollDetails />} />

          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/ratings" element={<Ratings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute adminOnly><Approvals /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute adminOnly><PlatformSettings /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
