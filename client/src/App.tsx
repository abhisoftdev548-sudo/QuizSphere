import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import { Button, Card, EmptyState, PageSkeleton } from './components/ui';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const QuizDetailPage = lazy(() => import('./pages/QuizDetailPage'));
const PollDetailPage = lazy(() => import('./pages/PollDetailPage'));
const CreatorStudioPage = lazy(() => import('./pages/CreatorStudioPage'));
const CreatorAnalyticsPage = lazy(() => import('./pages/CreatorAnalyticsPage'));
const QuizEditorPage = lazy(() => import('./pages/QuizEditorPage'));
const PollEditorPage = lazy(() => import('./pages/PollEditorPage'));
const AttemptsPage = lazy(() => import('./pages/AttemptsPage'));
const QuizSessionPage = lazy(() => import('./pages/QuizSessionPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const ReviewQueuePage = lazy(() => import('./pages/admin/ReviewQueuePage'));
const AdminReviewDetailPage = lazy(() => import('./pages/admin/AdminReviewDetailPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminPlatformPage = lazy(() => import('./pages/admin/AdminPlatformPage'));
const AdminLedgerPage = lazy(() => import('./pages/admin/AdminLedgerPage'));

function Guard({ children, admin = false }: { children: JSX.Element; admin?: boolean }) {
  const { user, isLoading, authCheckError, authCheckStatus, retryAuthCheck } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen bg-canvas p-6"><PageSkeleton /></div>;
  if (!user && authCheckError && authCheckStatus !== 401) {
    return <div className="page-container"><Card><EmptyState title="Could not verify your session" description={`${authCheckError} Your login may still be active; retry before signing in again.`} action={<Button variant="outline" onClick={() => void retryAuthCheck()}>Retry session check</Button>} /></Card></div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/app/overview" replace />;
  return children;
}

function AuthPageRoute({ mode }: { mode: 'login' | 'register' }) {
  const { user } = useAuth();
  return user ? <Navigate to="/app/overview" replace /> : <AuthPage mode={mode} />;
}

export default function App() {
  return <Suspense fallback={<div className="min-h-screen bg-canvas p-6"><PageSkeleton /></div>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/explore/quizzes/:id" element={<QuizDetailPage />} />
      <Route path="/explore/polls/:id" element={<PollDetailPage />} />
      <Route path="/login" element={<AuthPageRoute mode="login" />} />
      <Route path="/register" element={<AuthPageRoute mode="register" />} />
      <Route path="/app" element={<Guard><DashboardLayout /></Guard>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="explore/quizzes/:id" element={<QuizDetailPage />} />
        <Route path="explore/polls/:id" element={<PollDetailPage />} />
        <Route path="creator-studio" element={<CreatorStudioPage />} />
        <Route path="creator-studio/analytics/:type/:id" element={<CreatorAnalyticsPage />} />
        <Route path="creator-studio/new/quiz" element={<QuizEditorPage />} />
        <Route path="creator-studio/new/poll" element={<PollEditorPage />} />
        <Route path="creator-studio/quizzes/:id/edit" element={<QuizEditorPage />} />
        <Route path="creator-studio/polls/:id/edit" element={<PollEditorPage />} />
        <Route path="attempts" element={<AttemptsPage />} />
        <Route path="quiz-session/:attemptId" element={<QuizSessionPage />} />
        <Route path="leaderboards" element={<LeaderboardPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<Guard admin><AdminOverviewPage /></Guard>} />
        <Route path="admin/reviews" element={<Guard admin><ReviewQueuePage /></Guard>} />
        <Route path="admin/reviews/:type/:id" element={<Guard admin><AdminReviewDetailPage /></Guard>} />
        <Route path="admin/users" element={<Guard admin><AdminUsersPage /></Guard>} />
        <Route path="admin/platform" element={<Guard admin><AdminPlatformPage /></Guard>} />
        <Route path="admin/ledger" element={<Guard admin><AdminLedgerPage /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>;
}
