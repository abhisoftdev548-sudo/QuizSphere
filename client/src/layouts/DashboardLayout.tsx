import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Bell, BookOpenCheck, ChevronDown, CircleDollarSign, Compass,
  LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Trophy, UserRound,
  UsersRound, X, Zap, FileClock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getData } from '../services/api';
import { useToast } from '../context/ToastContext';

const primaryLinks = [
  { label: 'Overview', to: '/app/overview', icon: LayoutDashboard },
  { label: 'Explore', to: '/app/explore', icon: Compass },
  { label: 'Creator Studio', to: '/app/creator-studio', icon: BookOpenCheck },
  { label: 'My Attempts', to: '/app/attempts', icon: FileClock },
  { label: 'Leaderboards', to: '/app/leaderboards', icon: Trophy },
  { label: 'QCoin Wallet', to: '/app/wallet', icon: CircleDollarSign },
  { label: 'Notifications', to: '/app/notifications', icon: Bell },
];
const accountLinks = [
  { label: 'My Profile', to: '/app/profile', icon: UserRound },
  { label: 'Settings', to: '/app/settings', icon: Settings },
];
const adminLinks = [
  { label: 'Admin Overview', to: '/app/admin', icon: ShieldCheck },
  { label: 'Review Queue', to: '/app/admin/reviews', icon: FileClock },
  { label: 'Users', to: '/app/admin/users', icon: UsersRound },
  { label: 'Platform Setup', to: '/app/admin/platform', icon: Settings },
  { label: 'QCoin Ledger', to: '/app/admin/ledger', icon: Activity },
];
const routeTitles: Array<[RegExp, string]> = [
  [/\/app\/admin\/reviews/, 'Review Queue'], [/\/app\/admin\/users/, 'User Management'], [/\/app\/admin\/platform/, 'Platform Setup'], [/\/app\/admin\/ledger/, 'QCoin Ledger'], [/\/app\/admin/, 'Administration'],
  [/\/app\/creator-studio\/analytics/, 'Creator Analytics'], [/\/app\/creator-studio\/new\/quiz/, 'Create Quiz'], [/\/app\/creator-studio\/new\/poll/, 'Create Poll'], [/\/app\/creator-studio\/quizzes/, 'Quiz Details'], [/\/app\/creator-studio\/polls/, 'Poll Details'], [/\/app\/creator-studio/, 'Creator Studio'],
  [/\/app\/explore\/quizzes/, 'Quiz Details'], [/\/app\/explore\/polls/, 'Poll Details'], [/\/app\/overview/, 'Overview'], [/\/app\/explore/, 'Explore'], [/\/app\/attempts/, 'My Attempts'], [/\/app\/leaderboards/, 'Leaderboards'], [/\/app\/wallet/, 'QCoin Wallet'], [/\/app\/notifications/, 'Notifications'], [/\/app\/profile/, 'My Profile'], [/\/app\/settings/, 'Settings'],
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('qs-sidebar-collapsed') === 'true');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const reduced = useReducedMotion();
  const routeTitle = routeTitles.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? 'QuizSphere';
  const width = collapsed ? 'md:w-[78px]' : 'md:w-[252px]';

  useEffect(() => { localStorage.setItem('qs-sidebar-collapsed', String(collapsed)); }, [collapsed]);
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return <div className="min-h-screen bg-canvas">
    <div className={`fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 md:block ${width}`}>
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} role={user?.role ?? 'user'} user={user} />
    </div>
    <AnimatePresence>
      {drawerOpen && <>
        <motion.button aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[88vw] md:hidden" initial={reduced ? false : { x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ duration: reduced ? 0 : 0.2 }}>
          <Sidebar collapsed={false} mobile onClose={() => setDrawerOpen(false)} role={user?.role ?? 'user'} user={user} />
        </motion.div>
      </>}
    </AnimatePresence>
    <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'md:ml-[78px]' : 'md:ml-[252px]'}`}>
      <Topbar title={routeTitle} onMenu={() => setDrawerOpen(true)} />
      <main className="min-h-[calc(100vh-64px)]"><Outlet /></main>
    </div>
  </div>;
}

function Sidebar({ collapsed, onCollapse, mobile = false, onClose, role, user }: { collapsed: boolean; onCollapse?: () => void; mobile?: boolean; onClose?: () => void; role: string; user: ReturnType<typeof useAuth>['user'] }) {
  const navClass = ({ isActive }: { isActive: boolean }) => `group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors ${isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20' : 'text-slate-500 hover:bg-slate-100 hover:text-ink'} ${collapsed && !mobile ? 'justify-center px-2' : ''}`;
  return <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
    <div className={`flex h-[68px] shrink-0 items-center border-b border-slate-100 px-5 ${collapsed && !mobile ? 'justify-center px-0' : 'justify-between'}`}>
      <NavLink to="/app/overview" className="flex items-center gap-2.5" aria-label="QuizSphere home">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm"><Zap size={18} fill="currentColor" strokeWidth={1.8} /></div>
        {(!collapsed || mobile) && <div className="leading-tight"><span className="block text-[15px] font-extrabold tracking-[-0.04em] text-ink">Quiz<span className="text-brand-600">Sphere</span></span><span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Learn together</span></div>}
      </NavLink>
      {mobile ? <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={onClose} aria-label="Close navigation"><X size={18} /></button> : !collapsed && <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={onCollapse} aria-label="Collapse sidebar"><PanelLeftClose size={17} /></button>}
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-5">
      <p className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 ${collapsed && !mobile ? 'sr-only' : ''}`}>Workspace</p>
      <nav className="space-y-1" aria-label="Primary navigation">
        {primaryLinks.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} className={navClass} title={collapsed && !mobile ? label : undefined} onClick={onClose}>
          <Icon size={18} strokeWidth={1.8} className="shrink-0" />{(!collapsed || mobile) && <span>{label}</span>}
        </NavLink>)}
      </nav>
      <p className={`mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 ${collapsed && !mobile ? 'sr-only' : ''}`}>Account</p>
      <nav className="space-y-1" aria-label="Account navigation">
        {accountLinks.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} className={navClass} title={collapsed && !mobile ? label : undefined} onClick={onClose}>
          <Icon size={18} strokeWidth={1.8} className="shrink-0" />{(!collapsed || mobile) && <span>{label}</span>}
        </NavLink>)}
      </nav>
      {role === 'admin' && <>
        <p className={`mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 ${collapsed && !mobile ? 'sr-only' : ''}`}>Administration</p>
        <nav className="space-y-1" aria-label="Administration navigation">
          {adminLinks.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/app/admin'} className={navClass} title={collapsed && !mobile ? label : undefined} onClick={onClose}>
            <Icon size={18} strokeWidth={1.8} className="shrink-0" />{(!collapsed || mobile) && <span>{label}</span>}
          </NavLink>)}
        </nav>
      </>}
    </div>
    <div className={`border-t border-slate-100 p-3 ${collapsed && !mobile ? 'flex justify-center' : ''}`}>
      {(!collapsed || mobile) ? <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5">
        <Avatar name={user?.displayName ?? 'Member'} url={user?.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-ink">{user?.displayName ?? 'Your account'}</p><p className="truncate text-[10px] text-slate-400">{user?.role === 'admin' ? 'Administrator' : `@${user?.username ?? 'member'}`}</p></div>
        <NavLink to="/app/settings" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600" aria-label="Settings"><Settings size={15} /></NavLink>
      </div> : <Avatar name={user?.displayName ?? 'Member'} url={user?.avatarUrl} size="sm" />}
      {!mobile && collapsed && <button onClick={onCollapse} className="mt-2 flex w-full justify-center rounded-lg py-2 text-slate-400 hover:bg-slate-100" aria-label="Expand sidebar"><PanelLeftOpen size={17} /></button>}
    </div>
  </aside>;
}

function Topbar({ title, onMenu }: { title: string; onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let mounted = true;
    void getData<{ unreadCount: number }>('/users/me/notifications', { limit: 1 }).then((data) => { if (mounted) setUnread(data.unreadCount); }).catch(() => {});
    return () => { mounted = false; };
  }, [location.pathname]);
  async function handleLogout() {
    try { await logout(); } catch { /* local session is cleared by the auth provider */ }
    toast('You have been signed out.', 'info');
    navigate('/login');
  }
  return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <button className="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={onMenu} aria-label="Open navigation"><Menu size={19} /></button>
      <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{title}</p><p className="hidden text-[11px] text-slate-400 sm:block">Your place to create, play, and grow</p></div>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="hidden items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50/80 px-2.5 py-1.5 text-xs font-semibold text-brand-700 sm:flex"><Zap size={14} fill="currentColor" />{user?.walletBalance?.toLocaleString() ?? 0}<span className="font-medium text-brand-600">QCoins</span></div>
      <button onClick={() => navigate('/app/notifications')} className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-600" aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}><Bell size={18} />{unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />}</button>
      <div className="relative">
        <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50" aria-expanded={menuOpen} aria-haspopup="menu">
          <Avatar name={user?.displayName ?? 'Member'} url={user?.avatarUrl} size="sm" /><span className="hidden max-w-[120px] truncate text-xs font-semibold text-slate-700 lg:block">{user?.displayName}</span><ChevronDown size={14} className="hidden text-slate-400 sm:block" />
        </button>
        {menuOpen && <><button className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close profile menu" /><div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft" role="menu">
          <div className="border-b border-slate-100 px-3 py-2.5"><p className="truncate text-sm font-semibold text-ink">{user?.displayName}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div>
          <button onClick={() => { setMenuOpen(false); navigate('/app/profile'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"><UserRound size={16} />My profile</button>
          <button onClick={() => { setMenuOpen(false); navigate('/app/settings'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"><Settings size={16} />Settings</button>
          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={16} />Sign out</button>
        </div></>}
      </div>
    </div>
  </header>;
}

export function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm';
  if (url) return <img src={url} alt={`${name} avatar`} className={`${sizeClass} shrink-0 rounded-full bg-slate-100 object-cover ring-1 ring-slate-200`} />;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'Q';
  return <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 ring-1 ring-brand-200/60`} aria-label={`${name} avatar`}>{initials}</div>;
}
