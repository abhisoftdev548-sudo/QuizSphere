import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, BookOpenCheck, CircleDollarSign, FileClock, Gauge, Plus, Sparkles, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHeader, PageSkeleton } from '../components/ui';
import { getData, apiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { SpecialEventDashboardCard } from '../components/SpecialEventFeature';

type Overview = { metrics: { qcoinBalance: number; attempts: number; completedAttempts: number; averageScore: number | null; publishedCreations: number; pendingSubmissions: number; leaderboardRank: number | null }; recentActivity: Array<{ id: string; type: string; title: string; description: string; createdAt: string }> };

export default function OverviewPage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['overview'], queryFn: () => getData<Overview>('/users/me/overview') });
  if (query.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (query.isError || !query.data) return <div className="page-container"><Card><EmptyState title="Your overview is unavailable" description={apiErrorMessage(query.error)} action={<Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>} /></Card></div>;
  const data = query.data;
  const metrics = data.metrics;
  const firstName = user?.displayName.split(' ')[0] ?? 'there';
  return <div className="page-container">
    <PageHeader eyebrow="Your workspace" title={`Good ${greeting()}, ${firstName}`} description="A clear view of your participation and creator activity." action={<Link to="/app/creator-studio/new/quiz" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"><Plus size={16} />Create quiz</Link>} />
    <SpecialEventDashboardCard />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Available QCoins" value={metrics.qcoinBalance.toLocaleString()} detail="Virtual platform balance" icon={CircleDollarSign} accent="purple" to="/app/wallet" />
      <MetricCard label="Quiz attempts" value={String(metrics.attempts)} detail={`${metrics.completedAttempts} completed`} icon={BookOpenCheck} accent="blue" to="/app/attempts" />
      <MetricCard label="Average score" value={metrics.averageScore === null ? '—' : `${metrics.averageScore}%`} detail={metrics.averageScore === null ? 'Complete a quiz to see performance' : 'Across completed attempts'} icon={Gauge} accent="green" to="/app/attempts" />
      <MetricCard label="Published creations" value={String(metrics.publishedCreations)} detail={metrics.pendingSubmissions ? `${metrics.pendingSubmissions} in review or revision` : 'Your community contributions'} icon={Sparkles} accent="amber" to="/app/creator-studio" />
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.75fr)]">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-ink">Recent activity</h2><p className="mt-1 text-xs text-slate-400">Your latest activity across QuizSphere</p></div><Link to="/app/attempts" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">View attempts<ArrowRight size={13} /></Link></div>
        {data.recentActivity.length ? <div className="divide-y divide-slate-100">{data.recentActivity.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 px-5 py-4"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.type === 'attempt' ? 'bg-brand-50 text-brand-600' : 'bg-blue-50 text-blue-600'}`}>{item.type === 'attempt' ? <BookOpenCheck size={16} /> : <FileClock size={16} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{item.title}</p><p className="mt-1 truncate text-xs text-slate-500">{item.description}</p></div><time className="shrink-0 pt-1 text-[11px] text-slate-400">{relativeDate(item.createdAt)}</time></div>)}</div> : <EmptyState title="No activity yet" description="Your attempts, updates, and creator milestones will show up here when they happen." action={<Link to="/app/explore" className="text-sm font-semibold text-brand-700">Explore quizzes and polls</Link>} />}
      </Card>
      <div className="space-y-5">
        <Card className="overflow-hidden"><div className="bg-brand-600 px-5 py-5 text-white"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-white/75">Your community standing</p><p className="mt-2 text-2xl font-bold">{metrics.leaderboardRank ? `#${metrics.leaderboardRank}` : 'Not ranked yet'}</p><p className="mt-1 text-xs text-white/70">Based on eligible completed activity</p></div><Trophy size={21} className="text-brand-200" /></div></div><div className="p-5"><p className="text-xs leading-5 text-slate-500">Rankings appear when eligible participation has been recorded. Your wallet balance never determines your rank.</p><Link to="/app/leaderboards" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800">View leaderboards<ArrowUpRight size={14} /></Link></div></Card>
        <Card className="p-5"><div className="flex items-center gap-2"><Zap size={16} className="text-brand-600" /><h2 className="text-sm font-bold text-ink">Quick actions</h2></div><div className="mt-3 space-y-1">{[
          { to: '/app/explore', label: 'Discover published content', icon: ArrowUpRight },
          { to: '/app/creator-studio/new/quiz', label: 'Build a quiz', icon: Plus },
          { to: '/app/creator-studio/new/poll', label: 'Create a poll', icon: Plus },
        ].map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="flex items-center justify-between rounded-lg px-2.5 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-brand-700"><span className="flex items-center gap-2.5"><Icon size={15} className="text-slate-400" />{label}</span><ArrowRight size={14} className="text-slate-300" /></Link>)}</div></Card>
      </div>
    </div>
  </div>;
}

function MetricCard({ label, value, detail, icon: Icon, accent, to }: { label: string; value: string; detail: string; icon: typeof CircleDollarSign; accent: 'purple' | 'blue' | 'green' | 'amber'; to: string }) {
  const accents = { purple: 'bg-brand-50 text-brand-600', blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' };
  return <Link to={to} className="group"><Card className="h-full p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-brand-200 group-hover:shadow-soft"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-[26px] font-bold leading-none tracking-tight text-ink">{value}</p><p className="mt-2.5 truncate text-[11px] text-slate-400">{detail}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accents[accent]}`}><Icon size={17} /></span></div></Card></Link>;
}
function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'; }
function relativeDate(date: string) { const ms = Date.now() - new Date(date).getTime(); const days = Math.floor(ms / 86_400_000); if (days <= 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days}d ago`; return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
