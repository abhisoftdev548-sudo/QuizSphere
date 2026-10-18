import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import useAuthStore from '../../store/authStore';
import api from '../../lib/api';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications?limit=5');
        setNotifications(res.data.data.notifications);
        setUnread(res.data.data.unreadCount);
      } catch {}
    };
    if (user) fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-surface border-b border-border h-[64px] flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-appBg">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden md:flex items-center gap-2 bg-appBg rounded-xl px-3 h-10 w-[320px] border border-border">
          <Search className="w-4 h-4 text-textSecondary" />
          <input placeholder="Search quizzes, polls, users..." className="bg-transparent flex-1 text-[14px] outline-none placeholder:text-textSecondary" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative w-10 h-10 rounded-xl border border-border bg-surface flex items-center justify-center hover:bg-appBg transition-colors">
            <Bell className="w-5 h-5 text-textSecondary" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 mt-2 w-80 bg-surface rounded-xl border border-border shadow-modal overflow-hidden"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h4 className="font-semibold text-[14px]">Notifications</h4>
                  {unread > 0 && <span className="text-[12px] bg-error-light text-error px-2 py-0.5 rounded-full">{unread} new</span>}
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-textSecondary text-[14px]">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n._id} className={`p-4 border-b border-border last:border-0 hover:bg-appBg ${!n.isRead ? 'bg-primary-light/50' : ''}`}>
                        <p className="text-[13px] font-medium text-textPrimary">{n.title}</p>
                        <p className="text-[12px] text-textSecondary mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-textSecondary mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-border">
                  <button onClick={() => { setShowNotifs(false); navigate('/notifications'); }} className="w-full py-2 text-[13px] font-medium text-primary hover:bg-primary-light rounded-lg">View all</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={profileRef}>
          <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-appBg transition-colors">
            <Avatar src={user?.avatar} name={user?.username} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-[14px] font-medium leading-none">{user?.username}</p>
              <p className="text-[12px] text-textSecondary capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-textSecondary hidden md:block" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 mt-2 w-56 bg-surface rounded-xl border border-border shadow-modal overflow-hidden"
              >
                <div className="p-3 border-b border-border">
                  <p className="text-[14px] font-medium">{user?.username}</p>
                  <p className="text-[12px] text-textSecondary truncate">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-light text-primary">{user?.points || 0} pts</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning-light text-warning">{user?.qcoins || 0} QCoins</span>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => { setShowProfile(false); navigate('/profile'); }} className="w-full flex items-center gap-2 px-3 py-2 text-[14px] rounded-lg hover:bg-appBg text-left"><User className="w-4 h-4" /> Profile</button>
                  <button onClick={() => { setShowProfile(false); navigate('/settings'); }} className="w-full flex items-center gap-2 px-3 py-2 text-[14px] rounded-lg hover:bg-appBg text-left"><Settings className="w-4 h-4" /> Settings</button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-[14px] rounded-lg hover:bg-error-light text-error text-left"><LogOut className="w-4 h-4" /> Logout</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
