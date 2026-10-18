import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardCheck, Coins, Flag, ShieldCheck, UsersRound, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, PageSkeleton } from '../../components/ui';
import { apiErrorMessage, getData } from '../../services/api';

type AdminOverview = { metrics: { registeredUsers: number; activeUsers30d: number; publishedQuizzes: number; publishedPolls: number; pendingReviews: number; qcoinsIssued: number; qcoinsSpent: number; openReports: number; pendingSettlements: number }; recentActions: Array<{ _id: string; action: string; targetType: string; targetId: string; reason: string; createdAt: string; actorId?: { username?: string; displayName?: string } }> };
export default function AdminOverviewPage() {
  const query = useQuery({ queryKey: ['admin-overview'], queryFn: () => getData<AdminOverview>('/admin/overview') });
  if (query.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (query.isError || !query.data) return <div className="page-container"><Card><EmptyState title="Admin overview unavailable" description={apiErrorMessage(query.error)} action={<Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>} /></Card></div>;
  const metrics = query.data.metrics;
  return <div className="page-container"><PageHeader title="Administration" description="Live platform activity, moderation, and QCoin oversight." eyebrow="QuizSphere admin" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetric label="Registered users" value={metrics.registeredUsers} detail={`${metrics.activeUsers30d} active in the last 30 days`} icon={UsersRound} tint="purple" />
      <AdminMetric label="Pending reviews" value={metrics.pendingReviews} detail="Quiz and poll submissions" icon={ClipboardCheck} tint="amber" href="/app/admin/reviews" />
      <AdminMetric label="Published content" value={metrics.publishedQuizzes + metrics.publishedPolls} detail={`${metrics.publishedQuizzes} quizzes · ${metrics.publishedPolls} polls`} icon={Vote} tint="blue" />
      <AdminMetric label="Pending settlements" value={metrics.pendingSettlements} detail={`${metrics.openReports} open reports`} icon={Coins} tint="rose" href="/app/admin/ledger" />
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(310px,.85fr)]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-ink">Recent admin activity</h2><p className="mt-1 text-xs text-slate-400">Recorded actions with actor, target, and reason</p></div><ShieldCheck size={17} className="text-brand-600" /></div>{query.data.recentActions.length ? <div className="divide-y divide-slate-100">{query.data.recentActions.map((action) => <div key={action._id} className="flex items-start justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="text-sm font-semibold text-ink">{formatAction(action.action)}</p><p className="mt-1 truncate text-xs text-slate-500">{action.reason || `${action.targetType} · ${action.targetId}`}</p><p className="mt-1 text-[10px] text-slate-400">By {action.actorId?.displayName ?? action.actorId?.username ?? 'Administrator'} · {new Date(action.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold capitalize text-slate-500">{action.targetType}</span></div>)}</div> : <EmptyState title="No admin actions recorded" description="Moderation, pricing, and account changes will be recorded here." action={<Link to="/app/admin/reviews" className="text-sm font-semibold text-brand-700">Open review queue</Link>} />}</Card>
      <div className="space-y-5"><Card className="p-5"><h2 className="text-sm font-bold text-ink">QCoin circulation</h2><p className="mt-1 text-xs text-slate-400">Sum of recorded credits and debits in the ledger</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Issued</p><p className="mt-1 text-xl font-bold text-emerald-800">{metrics.qcoinsIssued.toLocaleString()}</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Spent</p><p className="mt-1 text-xl font-bold text-rose-800">{metrics.qcoinsSpent.toLocaleString()}</p></div></div><Link to="/app/admin/ledger" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">Inspect ledger<ArrowRight size={13} /></Link></Card>
        <Card className="p-5"><div className="flex items-center gap-2"><Flag size={16} className="text-amber-600" /><h2 className="text-sm font-bold text-ink">Review priorities</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">Review submissions for accuracy, safety, and clear participation terms before approval.</p><Link to="/app/admin/reviews" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Review submissions<ArrowRight size={15} /></Link></Card></div>
    </div>
  </div>;
}
function AdminMetric({ label, value, detail, icon: Icon, tint, href }: { label: string; value: number; detail: string; icon: typeof UsersRound; tint: 'purple' | 'amber' | 'blue' | 'rose'; href?: string }) {
  const tintClass = { purple: 'bg-brand-50 text-brand-600', amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600', rose: 'bg-rose-50 text-rose-600' }[tint];
  const card = <Card className="h-full p-4 transition hover:border-brand-200 hover:shadow-soft"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-[26px] font-bold leading-none text-ink">{value.toLocaleString()}</p><p className="mt-2 text-[11px] text-slate-400">{detail}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tintClass}`}><Icon size={17} /></span></div></Card>;
  return href ? <Link to={href}>{card}</Link> : card;
}
function formatAction(action: string) { return action.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
