import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Clock3, Coins, EyeOff, LockKeyhole, Vote } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Avatar } from '../layouts/DashboardLayout';
import { Button, Card, EmptyState, Modal, PageHeader, PageSkeleton } from '../components/ui';
import { apiErrorMessage, getData, postData } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

type PollDetail = { id: string; title: string; description: string; category: string | null; options: Array<{ id: string; text: string }>; allowMultiple: boolean; anonymous: boolean; resultVisibility: 'after_vote' | 'after_close' | 'public'; allowVoteChange: boolean; startsAt: string | null; closesAt: string | null; votingFee: number; voteCount: number | null; results: Array<{ optionId: string; count: number }> | null; myVote: string[] | null; creator: { id: string; username: string; displayName: string; avatarUrl?: string | null } | null; status?: string };

export default function PollDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const isApp = location.pathname.startsWith('/app');
  const backTo = isApp ? '/app/explore' : '/explore';
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const voteKey = useRef<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [voteError, setVoteError] = useState('');
  const query = useQuery({ queryKey: ['poll-detail', id], queryFn: () => getData<PollDetail>(`/explore/polls/${id}`) });
  const poll = query.data;
  const counts = useMemo(() => new Map(poll?.results?.map((result) => [result.optionId, result.count]) ?? []), [poll?.results]);

  async function castVote() {
    if (!poll || selected.length < 1) return;
    setVoteError('');
    voteKey.current ??= crypto.randomUUID();
    try {
      await postData(`/polls/${id}/vote`, { optionIds: selected }, { 'Idempotency-Key': voteKey.current });
      setConfirmOpen(false);
      toast('Your vote has been recorded.');
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['poll-detail', id] }), queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })]);
    } catch (error) { setVoteError(apiErrorMessage(error)); }
  }

  if (query.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (query.isError || !poll) return <div className="page-container"><Card><EmptyState title="Poll details unavailable" description={query.isError ? apiErrorMessage(query.error) : 'This poll may have closed or been unpublished.'} action={<Link to={backTo} className="text-sm font-semibold text-brand-700">Back to Explore</Link>} /></Card></div>;
  const hasVoted = Boolean(poll.myVote?.length);
  const closed = poll.status === 'closed' || Boolean(poll.closesAt && new Date(poll.closesAt).getTime() <= Date.now());
  const canChange = hasVoted && poll.allowVoteChange && !closed;
  const allowMultiple = poll.allowMultiple;
  const isSelected = (optionId: string) => selected.includes(optionId);
  function toggle(optionId: string) {
    if (hasVoted && !canChange) return;
    setSelected((current) => allowMultiple ? (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]) : [optionId]);
  }
  const totalVotes = poll.voteCount ?? [...counts.values()].reduce((sum, count) => sum + count, 0);

  return <div className="page-container">
    <Link to={backTo} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />Back to Explore</Link>
    <PageHeader title={poll.title} description={poll.description} eyebrow={poll.category ?? 'Community poll'} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
      <Card className="p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">{poll.allowMultiple ? 'Choose all that apply' : 'Choose one option'}</span>{poll.anonymous && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"><EyeOff size={12} />Anonymous</span>}</div>
        <div className="space-y-2.5" role={poll.allowMultiple ? 'group' : 'radiogroup'} aria-label="Poll choices">
          {poll.options.map((option) => {
            const count = counts.get(option.id) ?? 0;
            const percent = totalVotes > 0 && poll.results ? Math.round((count / totalVotes) * 100) : 0;
            return <button key={option.id} type="button" role={poll.allowMultiple ? 'checkbox' : 'radio'} aria-checked={isSelected(option.id)} onClick={() => toggle(option.id)} disabled={hasVoted && !canChange} className={`relative w-full overflow-hidden rounded-xl border px-4 py-3.5 text-left transition ${isSelected(option.id) ? 'border-brand-300 bg-brand-50/80' : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50'} ${(hasVoted && !canChange) ? 'cursor-default' : ''}`}>
              {poll.results && <span className="absolute inset-y-0 left-0 bg-brand-50 transition-all" style={{ width: `${percent}%` }} />}
              <span className="relative flex items-center justify-between gap-3"><span className="flex items-center gap-3"><span className={`flex h-5 w-5 shrink-0 items-center justify-center border ${poll.allowMultiple ? 'rounded-md' : 'rounded-full'} ${isSelected(option.id) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'}`}>{isSelected(option.id) && <Check size={12} />}</span><span className="text-sm font-medium text-ink">{option.text}</span></span>{poll.results && <span className="text-xs font-semibold text-slate-600">{percent}% <span className="font-normal text-slate-400">({count})</span></span>}</span>
            </button>;
          })}
        </div>
        {hasVoted && <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800">Your vote is recorded. {canChange ? 'You can update it while voting remains open.' : 'Thanks for taking part.'}</p>}
        {closed && <p className="mt-4 rounded-xl bg-slate-100 px-3.5 py-3 text-xs text-slate-600">Voting is closed for this poll.</p>}
        {!hasVoted && !closed && <div className="mt-5 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-slate-400">{poll.resultVisibility === 'after_close' ? 'Results will be visible after the poll closes.' : poll.resultVisibility === 'public' ? 'Results are visible to everyone.' : 'Results become visible after you vote.'}</p>{user ? <Button onClick={() => { setVoteError(''); voteKey.current = crypto.randomUUID(); setConfirmOpen(true); }} disabled={selected.length === 0}>{poll.votingFee > 0 ? `Continue · ${poll.votingFee} QCoins` : 'Submit vote'}<ArrowRight size={15} /></Button> : <Link to="/login" state={{ from: { pathname: location.pathname } }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Sign in to vote<ArrowRight size={15} /></Link>}</div>}
        {hasVoted && canChange && <div className="mt-5 flex justify-end border-t border-slate-100 pt-4"><Button onClick={() => { setVoteError(''); voteKey.current = crypto.randomUUID(); setConfirmOpen(true); }}>Update my vote<ArrowRight size={15} /></Button></div>}
      </Card>
      <aside className="space-y-4">
        <Card className="p-5"><h2 className="text-sm font-bold text-ink">Poll details</h2><div className="mt-4 space-y-3.5">
          <PollInfo icon={Vote} label="Votes" value={poll.voteCount === null ? 'Hidden' : String(poll.voteCount)} />
          <PollInfo icon={Coins} label="Voting fee" value={`${poll.votingFee} QCoins`} />
          <PollInfo icon={Clock3} label={closed ? 'Status' : 'Closes'} value={closed ? 'Closed' : poll.closesAt ? new Date(poll.closesAt).toLocaleDateString() : 'No closing date'} />
          <PollInfo icon={LockKeyhole} label="Results" value={poll.resultVisibility.replaceAll('_', ' ')} />
        </div><p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">{poll.anonymous ? 'This poll is anonymous. Voter identities are not shown.' : 'Your choice is recorded privately to enforce the poll rules.'} QCoins are virtual and cannot be withdrawn.</p></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><Avatar name={poll.creator?.displayName ?? 'QuizSphere creator'} url={poll.creator?.avatarUrl} size="sm" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{poll.creator?.displayName ?? 'Community creator'}</p><p className="text-[11px] text-slate-400">Poll creator</p></div></div></Card>
      </aside>
    </div>
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={canChange ? 'Confirm vote update' : 'Confirm your vote'} footer={<><Button variant="outline" onClick={() => setConfirmOpen(false)}>Not now</Button><Button onClick={() => void castVote()}>{canChange ? 'Update vote' : poll.votingFee > 0 ? `Pay ${poll.votingFee} QCoins & vote` : 'Confirm vote'}<ArrowRight size={15} /></Button></>}>
      <p className="text-sm leading-6 text-slate-600">{canChange ? 'Your new selection will replace your previous choice.' : 'Your vote will be recorded according to this poll’s rules.'}{poll.votingFee > 0 ? ` ${poll.votingFee} QCoins will be deducted.` : ''}</p>
      {user && poll.votingFee > user.walletBalance && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">Your wallet balance is too low to vote.</p>}
      {voteError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{voteError || apiErrorMessage(query.error)}</p>}
    </Modal>
  </div>;
}

function PollInfo({ icon: Icon, label, value }: { icon: typeof Vote; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs text-slate-500"><Icon size={14} className="text-slate-400" />{label}</span><span className="text-xs font-semibold capitalize text-ink">{value}</span></div>;
}
