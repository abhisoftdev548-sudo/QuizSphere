import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  BarChart3, 
  Trophy, 
  Coins, 
  MessageSquare, 
  Bell, 
  User, 
  Settings,
  FileQuestion,
  Shield,
  Users,
  Flag,
  ScrollText,
  Sliders,
  X,
  Sparkles,
  Library,
  Vote
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import useAuthStore from '../../store/authStore';

const userNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Explore Quizzes', icon: BookOpen, path: '/quizzes' },
  { label: 'My Quizzes', icon: Library, path: '/my-quizzes' },
  { label: 'Explore Polls', icon: BarChart3, path: '/polls' },
  { label: 'My Polls', icon: Vote, path: '/my-polls' },
  { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
  { label: 'QCoin Wallet', icon: Coins, path: '/wallet' },
  { label: 'Ratings', icon: MessageSquare, path: '/ratings' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Profile', icon: User, path: '/profile' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const adminNav = [
  { label: 'Admin Dashboard', icon: Shield, path: '/admin' },
  { label: 'Approvals', icon: FileQuestion, path: '/admin/approvals' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Reports', icon: Flag, path: '/admin/reports' },
  { label: 'Audit Logs', icon: ScrollText, path: '/admin/audit-logs' },
  { label: 'Platform Settings', icon: Sliders, path: '/admin/settings' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/admin' && location.pathname.startsWith(item.path));
    return (
      <NavLink
        to={item.path}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
          isActive ? 'bg-primary text-white shadow-sm' : 'text-textSecondary hover:bg-primary-light hover:text-primary'
        }`}
      >
        <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-textPrimary leading-none">QuizSphere</h1>
            <p className="text-[11px] text-textSecondary font-medium tracking-wide uppercase mt-0.5">Premium Quizzes</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Main Menu</p>
          <div className="space-y-1">
            {userNav.map(item => <NavItem key={item.path} item={item} />)}
          </div>
        </div>

        {isAdmin && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold text-textSecondary uppercase tracking-wider">Administration</p>
            <div className="space-y-1">
              {adminNav.map(item => <NavItem key={item.path} item={item} />)}
            </div>
          </div>
        )}
      </div>

      {/* User at bottom */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-appBg">
          <Avatar src={user?.avatar} name={user?.username} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-textPrimary truncate">{user?.username || 'User'}</p>
            <p className="text-[12px] text-textSecondary capitalize">{user?.role || 'user'} • {user?.points || 0} pts</p>
          </div>
          <div className={`w-2 h-2 rounded-full ${user ? 'bg-success' : 'bg-border'}`} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-[260px] bg-surface border-r border-border flex-col fixed left-0 top-0 h-screen z-30">
        {content}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 w-[280px] h-screen bg-surface z-50 lg:hidden flex flex-col shadow-modal"
            >
              <button onClick={onClose} className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-appBg flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
