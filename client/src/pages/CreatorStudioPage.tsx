import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, BookOpenCheck, FilePlus2, Filter, MessageSquareText, Pencil, Plus, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, PageSkeleton, SelectInput, StatusBadge } from '../components/ui';
import { apiErrorMessage, getData, postData } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { CreatorContent, Status } from '../types/api';

const tabs = [
  { id: 'all', label: 'All content' }, { id: 'quiz', label: 'Quizzes' }, { id: 'poll', label: 'Polls' },
];
const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' }, { value: 'draft', label: 'Drafts' }, { value: 'pending_review', label: 'Pending review' },
  { value: 'changes_requested', label: 'Changes requested' }, { value: 'approved', label: 'Approved' }, { value: 'published', label: 'Published' }, { value: 'rejected', label: 'Rejected' }, { value: 'suspended', label: 'Suspended by admin' }, { value: 'closed', label: 'Closed' },
];

export default function CreatorStudioPage() {
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState('all');
  const { toast } = useToast();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['creator-content'], queryFn: () => getData<{ items: CreatorContent[] }>('/creator/content').then((result) => result.items) });
  const items = useMemo(() => (query.data ?? []).filter((item) => (tab === 'all' || item.type === tab) && (status === 'all' || item.status === status)), [query.data, tab, status]);
  const countByStatus = (s: Status) => (query.data ?? []).filter((item) => item.status === s).length;
  async function publish(item: CreatorContent) {
    try {
      await postData(`/creator/${item.type}/${item.id}/publish`);
      toast('Your content is now published.');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['creator-content'] }),
        client.invalidateQueries({ queryKey: ['auth', 'me'] }),
        client.invalidateQueries({ queryKey: ['wallet'] }),
      ]);
    } catch (error) { toast(apiErrorMessage(error), 'error'); }
  }

  return <div className="page-container">
    <PageHeader title="Creator Studio" description="Create and publish quizzes directly, and track your quizzes and polls from one place." eyebrow="Your creations" action={<div className="flex flex-wrap gap-2"><Link to="/app/creator-studio/new/poll" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Plus size={15} />Create poll</Link><Link to="/app/creator-studio/new/quiz" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"><Plus size={15} />Create quiz</Link></div>} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StudioSummary label="Total creations" value={query.data?.length ?? 0} icon={Sparkles} color="purple" />
      <StudioSummary label="Pending review" value={countByStatus('pending_review')} icon={FilePlus2} color="amber" />
      <StudioSummary label="Changes requested" value={countByStatus('changes_requested')} icon={MessageSquareText} color="indigo" />
      <StudioSummary label="Published" value={countByStatus('published')} icon={BookOpenCheck} color="green" />
    </div>

    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Content type">
          {tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === item.id ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`}>{item.label}{query.data && <span className={`ml-1.5 ${tab === item.id ? 'text-brand-500' : 'text-slate-400'}`}>{item.id === 'all' ? query.data.length : query.data.filter((content) => content.type === item.id).length}</span>}</button>)}
        </div>
        <div className="flex items-center gap-2"><Filter size={14} className="text-slate-400" /><SelectInput value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-[160px] py-2 text-xs" aria-label="Filter by status">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput></div>
      </div>
      {query.isLoading ? <div className="p-5"><PageSkeleton /></div> : query.isError ? <EmptyState title="Could not load your content" description={apiErrorMessage(query.error)} action={<Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>} /> : items.length === 0 ? <EmptyState title={query.data?.length ? 'No items match this filter' : 'Your studio is ready'} description={query.data?.length ? 'Choose another status or content type to see more of your work.' : 'Create a quiz, save it as a draft, then publish it when ready. Polls still go through admin review.'} action={!query.data?.length && <div className="flex gap-2"><Link to="/app/creator-studio/new/quiz" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Create a quiz</Link><Link to="/app/creator-studio/new/poll" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Create a poll</Link></div>} /> : <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="table-head"><th className="px-5 py-3">Content</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>
          {items.map((item) => <tr key={`${item.type}-${item.id}`} className="transition hover:bg-slate-50/70"><td className="max-w-[360px] px-5 py-4"><p className="truncate text-sm font-semibold text-ink">{item.title}</p><p className="mt-1 truncate text-xs text-slate-400">{item.category || (item.type === 'quiz' ? `${item.questionCount ?? 0} questions` : `${item.options?.length ?? 0} options`)}{item.reviewFeedback && <span className="text-indigo-600"> · {item.reviewFeedback}</span>}</p>{item.status === 'suspended' && item.suspensionReason && <p className="mt-1 whitespace-normal text-xs leading-5 text-rose-600">Admin suspension reason: {item.suspensionReason}</p>}</td><td className="table-cell capitalize">{item.type}</td><td className="table-cell"><StatusBadge status={item.status} /></td><td className="table-cell whitespace-nowrap">{new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td><td className="table-cell"><div className="flex justify-end gap-1.5">{(item.status === 'approved' || (item.type === 'quiz' && ['draft', 'changes_requested', 'rejected'].includes(item.status))) && <Button size="sm" variant="secondary" onClick={() => void publish(item)}><Send size={13} />Publish</Button>}{['draft', 'changes_requested', 'rejected', 'suspended'].includes(item.status) && <Link to={`/app/creator-studio/${item.type === 'quiz' ? 'quizzes' : 'polls'}/${item.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:border-brand-200 hover:text-brand-700"><Pencil size={13} />Edit</Link>}{item.status === 'published' && <Link to={`/app/creator-studio/analytics/${item.type}/${item.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:border-brand-200 hover:text-brand-700" aria-label="View analytics"><BarChart3 size={13} />Analytics</Link>}{item.status === 'pending_review' && <span className="px-2 py-1 text-xs text-slate-400">In review</span>}</div></td></tr>)}
        </tbody></table>
      </div>}
    </Card>
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs leading-5 text-blue-800"><MessageSquareText size={15} className="mt-0.5 shrink-0" /><span>Publish quizzes directly when ready. Polls continue to require admin review; suspended quizzes remain yours and can be edited and republished.</span></div>
  </div>;
}

function StudioSummary({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Sparkles; color: 'purple' | 'amber' | 'indigo' | 'green' }) {
  const colors = { purple: 'bg-brand-50 text-brand-600', amber: 'bg-amber-50 text-amber-600', indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-emerald-50 text-emerald-600' };
  return <Card className="flex items-center gap-3 p-4"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}><Icon size={17} /></span><div><p className="text-[11px] text-slate-400">{label}</p><p className="mt-0.5 text-lg font-bold text-ink">{value}</p></div></Card>;
}
