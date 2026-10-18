import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, CircleDollarSign, FileCheck2, MessageSquareText, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, PageSkeleton } from '../components/ui';
import { apiErrorMessage, getData, patchData } from '../services/api';
import { useToast } from '../context/ToastContext';

type NotificationItem = { _id: string; type: string; title: string; message: string; link: string | null; readAt: string | null; createdAt: string };
export default function NotificationsPage() {
  const client = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => getData<{ items: NotificationItem[]; unreadCount: number }>('/users/me/notifications') });
  const mutation = useMutation({ mutationFn: (id: string) => patchData(`/users/me/notifications/${id}/read`), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) });
  async function markAll() { try { await mutation.mutateAsync('all'); toast('All notifications marked as read.'); } catch (error) { toast(apiErrorMessage(error), 'error'); } }
  return <div className="page-container"><PageHeader title="Notifications" description="Updates triggered by your submissions, participation, and account activity." eyebrow="Your inbox" action={query.data?.unreadCount ? <Button variant="outline" onClick={() => void markAll()} disabled={mutation.isPending}><CheckCheck size={15} />Mark all read</Button> : undefined} />
    {query.isLoading ? <PageSkeleton /> : query.isError ? <Card><EmptyState title="Notifications unavailable" description={apiErrorMessage(query.error)} action={<Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>} /></Card> : !query.data?.items.length ? <Card><EmptyState icon={Bell} title="You’re all caught up" description="When something relevant happens—like a review update or reward—your notification will appear here." /></Card> : <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-ink">Recent updates</h2><p className="mt-1 text-xs text-slate-400">{query.data.unreadCount} unread</p></div><Bell size={17} className="text-slate-400" /></div><div className="divide-y divide-slate-100">{query.data.items.map((item) => <div key={item._id} className={`flex gap-3 px-5 py-4 transition ${item.readAt ? '' : 'bg-brand-50/30'}`}><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notificationIcon(item.type).bg}`}>{notificationIcon(item.type).icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">{item.title}</p><time className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p>{item.link && <Link to={item.link.startsWith('/app') ? item.link : `/app${item.link}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">View update →</Link>}</div>{!item.readAt && <button onClick={() => mutation.mutate(item._id)} className="h-7 shrink-0 rounded-lg px-2 text-[10px] font-semibold text-brand-700 hover:bg-brand-100" aria-label={`Mark ${item.title} as read`}>Mark read</button>}</div>)}</div></Card>}
  </div>;
}
function notificationIcon(type: string) {
  if (type.includes('qcoin')) return { bg: 'bg-amber-50 text-amber-600', icon: <CircleDollarSign size={16} /> };
  if (type.includes('prize')) return { bg: 'bg-emerald-50 text-emerald-600', icon: <Trophy size={16} /> };
  if (type.includes('changes') || type.includes('rejected')) return { bg: 'bg-indigo-50 text-indigo-600', icon: <MessageSquareText size={16} /> };
  return { bg: 'bg-brand-50 text-brand-600', icon: <FileCheck2 size={16} /> };
}
