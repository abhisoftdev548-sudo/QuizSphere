import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Award, BookOpenCheck, CheckCircle2, Clock3, Coins, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../layouts/DashboardLayout';
import { Button, Card, EmptyState, Modal, PageHeader, PageSkeleton } from '../components/ui';
import { apiErrorMessage, getData, postData } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';

type QuizDetail = { id: string; title: string; description: string; category: string | null; quizType: 'general' | 'special_event'; difficulty: string; tags: string[]; questionCount: number; timeLimitSeconds: number | null; passingScorePercent: number; entryFee: number; requiredPassKey: string | null; prizeRules: Array<{ rank: number; sharePercent: number }>; creatorFundedPrize: number; rewardPerWinner: number; rewardPoolRemaining: number; startsAt: string | null; closesAt: string | null; closed: boolean; allowResultReview: boolean; creator: { id: string; username: string; displayName: string; avatarUrl?: string | null } | null };
type PassProduct = { key: string; name: string; kind: 'create' | 'participation'; price: number; active: boolean; balance: number };
type EventResults = { participantCount: number; items: Array<{ rank: number | null; score: number; passed: boolean; user: { id: string; username: string; displayName: string } }> };

export default function QuizDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  const startKey = useRef<string | null>(null);
  const passPurchaseKey = useRef<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [startError, setStartError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const isApp = location.pathname.startsWith('/app');
  const backTo = isApp ? '/app/explore' : '/explore';
  const query = useQuery({ queryKey: ['quiz-detail', id], queryFn: () => getData<QuizDetail>(`/explore/quizzes/${id}`) });
  useEffect(() => {
    if (!query.data?.startsAt && !query.data?.closesAt) return;
    const interval = window.setInterval(() => setClock(Date.now()), 15000);
    return () => window.clearInterval(interval);
  }, [query.data?.startsAt, query.data?.closesAt]);
  const eventClosed = Boolean(query.data?.quizType === 'special_event' && query.data.closesAt && new Date(query.data.closesAt).getTime() <= clock);
  const results = useQuery({ queryKey: ['quiz-event-results', id], enabled: eventClosed, queryFn: () => getData<EventResults>(`/explore/quizzes/${id}/results`) });
  const passes = useQuery({ queryKey: ['passes'], enabled: Boolean(user), queryFn: () => getData<{ items: PassProduct[] }>('/passes') });
  const requiredPass = passes.data?.items.find((item) => item.key === query.data?.requiredPassKey);
  const missingPass = Boolean(query.data?.requiredPassKey && (!requiredPass || requiredPass.balance < 1));
  const buyPass = useMutation({
    mutationFn: (passKey: string) => postData<{ passName: string; paid: number }>(`/passes/${passKey}/purchase`, {}, { 'Idempotency-Key': passPurchaseKey.current ?? crypto.randomUUID() }),
    onSuccess: async (result) => {
      passPurchaseKey.current = null;
      toast(`${result.passName} purchased.`);
      await Promise.all([client.invalidateQueries({ queryKey: ['passes'] }), client.invalidateQueries({ queryKey: ['auth', 'me'] }), client.invalidateQueries({ queryKey: ['wallet'] })]);
    },
  });
  async function start() {
    if (!query.data) return;
    setStartError('');
    try {
      startKey.current ??= crypto.randomUUID();
      const result = await postData<{ attempt: { id: string; status: string }; questions?: unknown[] }>(`/participation/quizzes/${id}/attempts`, {}, { 'Idempotency-Key': startKey.current });
      await Promise.all([client.invalidateQueries({ queryKey: ['auth', 'me'] }), client.invalidateQueries({ queryKey: ['passes'] })]);
      setConfirmOpen(false);
      navigate(`/app/quiz-session/${result.attempt.id}`, { state: { questionPayload: result.questions } });
    } catch (error) { setStartError(apiErrorMessage(error)); }
  }

  if (query.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (query.isError || !query.data) return <div className="page-container"><Card><EmptyState title="Quiz details unavailable" description={query.isError ? apiErrorMessage(query.error) : 'This quiz may have closed or been unpublished.'} action={<Link to={backTo} className="text-sm font-semibold text-brand-700">Back to Explore</Link>} /></Card></div>;
  const quiz = query.data;
  const insufficient = (user?.walletBalance ?? 0) < quiz.entryFee;
  const passNeeded = Boolean(quiz.requiredPassKey);
  const isCreator = Boolean(user && quiz.creator?.id === user.id);
  const notStarted = Boolean(quiz.startsAt && new Date(quiz.startsAt).getTime() > clock);
  const isClosed = quiz.closed || eventClosed;
  const requiredPassDetails = passes.data?.items.find((item) => item.key === quiz.requiredPassKey);
  return <div className="page-container">
    <Link to={backTo} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />Back to Explore</Link>
    <PageHeader title={quiz.title} description={quiz.description} eyebrow={quiz.category ?? 'Community quiz'} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold capitalize text-brand-700">{quiz.difficulty}</span>{quiz.tags?.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">{tag}</span>)}</div>
          <h2 className="text-sm font-bold text-ink">About this quiz</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{quiz.description || 'The creator has not added a description.'}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <DetailStat icon={BookOpenCheck} label="Questions" value={String(quiz.questionCount)} />
            <DetailStat icon={Clock3} label="Time limit" value={quiz.timeLimitSeconds ? `${Math.ceil(quiz.timeLimitSeconds / 60)} min` : 'No limit'} />
            <DetailStat icon={Award} label="Pass mark" value={`${quiz.passingScorePercent}%`} />
          </div>
          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/70 p-4"><div className="flex gap-2.5"><LockKeyhole size={17} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-xs font-bold text-amber-900">Questions stay private until you begin</p><p className="mt-1 text-xs leading-5 text-amber-800/80">Correct answers are checked securely on the server. Your result breakdown follows the creator’s quiz settings.</p></div></div></div>
        </Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-3"><Avatar name={quiz.creator?.displayName ?? 'QuizSphere creator'} url={quiz.creator?.avatarUrl} /><div><p className="text-sm font-semibold text-ink">{quiz.creator?.displayName ?? 'QuizSphere creator'}</p><p className="text-xs text-slate-400">{quiz.creator ? `@${quiz.creator.username}` : 'Community creator'}</p></div><ShieldCheck size={17} className="ml-auto text-emerald-600" /></div></Card>
      </div>
      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Participation</h2>
          <div className="mt-4 space-y-3.5">
            <FeeRow icon={Coins} label={passNeeded ? 'Required pass' : 'Entry fee'} value={passNeeded ? requiredPassDetails?.name ?? quiz.requiredPassKey! : `${quiz.entryFee} QCoins`} />
            {!passNeeded && <FeeRow icon={CheckCircle2} label="Available balance" value={user ? `${user.walletBalance.toLocaleString()} QCoins` : 'Sign in to view'} />}
            <FeeRow icon={ShieldCheck} label="Format" value={quiz.quizType === 'general' ? 'General Quiz' : 'Special Event'} />
            {quiz.startsAt && <FeeRow icon={Clock3} label="Starts" value={new Date(quiz.startsAt).toLocaleString()} />}
            {quiz.closesAt && <FeeRow icon={Clock3} label="Closes" value={new Date(quiz.closesAt).toLocaleString()} />}
            {quiz.creatorFundedPrize > 0 && <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">{quiz.quizType === 'general' ? <><strong>{quiz.rewardPerWinner} QCoins</strong> per passing participant, from a {quiz.creatorFundedPrize} QCoin pool. {quiz.rewardPoolRemaining} QCoins remain; rewards stop when the pool cannot cover a full reward.</> : <><strong>{quiz.creatorFundedPrize} QCoins</strong> prize pool · {quiz.prizeRules.map((rule) => `${rule.rank}${rankSuffix(rule.rank)}: ${rule.sharePercent}%`).join(' · ')}. Final prizes are paid after close and administrator settlement.</>}</div>}
          </div>
          {user && isCreator ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">You created this quiz and cannot participate in it.</p> : user ? <>
            {passNeeded && missingPass && <Button className="mt-5 w-full" disabled={isClosed || !requiredPassDetails?.active || !requiredPassDetails.price || requiredPassDetails.price > user.walletBalance || buyPass.isPending || passes.isLoading} onClick={() => { passPurchaseKey.current ??= crypto.randomUUID(); buyPass.mutate(requiredPassDetails!.key); }}>{isClosed ? 'Event closed' : !requiredPassDetails?.price ? 'Pass not priced yet' : requiredPassDetails.price > user.walletBalance ? 'Not enough QCoins' : buyPass.isPending ? 'Buying pass…' : `Buy ${requiredPassDetails?.name ?? 'required pass'} · ${requiredPassDetails?.price} QCoins`}<Coins size={15} /></Button>}
            {passNeeded && passes.isError && <p role="alert" className="mt-2 text-xs text-rose-600">Pass catalog unavailable: {apiErrorMessage(passes.error)}</p>}
            {passNeeded && requiredPass && requiredPass.balance > 0 && <Button className="mt-5 w-full" disabled={notStarted || isClosed} onClick={() => { setStartError(''); startKey.current = crypto.randomUUID(); setConfirmOpen(true); }}>{notStarted ? 'Event has not started' : isClosed ? 'Event closed' : 'Start quiz · transfer 1 pass'}<ArrowRight size={16} /></Button>}
            {!passNeeded && <Button className="mt-5 w-full" onClick={() => { setStartError(''); startKey.current = crypto.randomUUID(); setConfirmOpen(true); }} disabled={insufficient || notStarted || isClosed}>{notStarted ? 'Event has not started' : isClosed ? 'Event closed' : insufficient ? 'Not enough QCoins' : 'Start quiz'}<ArrowRight size={16} /></Button>}
            {buyPass.isError && <p role="alert" className="mt-2 text-xs text-rose-600">{apiErrorMessage(buyPass.error)}</p>}
            {missingPass && requiredPass && <p className="mt-2 text-center text-xs text-slate-500">Pass balance: {requiredPass.balance} · one pass transfers to the quiz creator per attempt.</p>}
          </> : <Link to="/login" state={{ from: { pathname: location.pathname } }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in to participate<ArrowRight size={15} /></Link>}
          {insufficient && user && !passNeeded && <p className="mt-2 text-center text-xs text-rose-600">Add QCoins by participating in eligible activities or check your wallet.</p>}
          <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">QCoins are virtual platform credits and cannot be withdrawn.</p>
        </Card>
        {user && <Card className="p-4"><div className="flex items-start gap-2.5"><UsersRound size={16} className="mt-0.5 text-brand-600" /><p className="text-xs leading-5 text-slate-500">Your attempt and score are recorded to support your activity history and community rankings.</p></div></Card>}
      </aside>
    </div>
    {quiz.quizType === 'special_event' && isClosed && <Card className="mt-5 p-5 sm:p-6"><h2 className="text-sm font-bold text-ink">Final event results</h2><p className="mt-1 text-xs text-slate-500">{results.data?.participantCount ?? 0} participants · ranks are shown after the event closes.</p>{results.isLoading ? <div className="mt-4 h-16 animate-pulse rounded-lg bg-slate-100" /> : results.isError ? <p role="alert" className="mt-3 text-xs text-rose-600">{apiErrorMessage(results.error)}</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-xs"><thead><tr className="border-b text-slate-400"><th className="py-2">Rank</th><th className="py-2">Participant</th><th className="py-2">Score</th><th className="py-2">Result</th></tr></thead><tbody>{results.data?.items.map((item) => <tr key={item.user.id} className="border-b border-slate-50"><td className="py-2.5">{item.rank ? `${item.rank}${rankSuffix(item.rank)}` : '—'}</td><td className="py-2.5 font-semibold text-ink">{item.user.displayName} <span className="font-normal text-slate-400">@{item.user.username}</span></td><td className="py-2.5">{item.score}%</td><td className="py-2.5">{item.passed ? 'Passed' : 'Not passed'}</td></tr>)}</tbody></table>{!results.data?.items.length && <p className="py-5 text-center text-xs text-slate-500">No submitted attempts for this event.</p>}</div>}</Card>}
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm quiz entry" footer={<><Button variant="outline" onClick={() => setConfirmOpen(false)}>Not now</Button><Button onClick={() => void start()}>{quiz.entryFee ? `Pay ${quiz.entryFee} QCoins & start` : 'Start quiz'}<ArrowRight size={15} /></Button></>}>
      <p className="text-sm leading-6 text-slate-600">Starting this quiz will create a tracked attempt{passNeeded ? ` and transfer one ${requiredPassDetails?.name ?? 'participation'} pass to the creator` : quiz.entryFee > 0 ? ` and deduct ${quiz.entryFee} QCoins from your wallet` : ''}. You’ll see the questions after confirmation.</p>
      <div className="mt-4 flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">{passNeeded ? 'Pass used' : 'Entry fee'}</span><strong className="text-ink">{passNeeded ? requiredPassDetails?.name ?? quiz.requiredPassKey : `${quiz.entryFee} QCoins`}</strong></div>
      {startError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{startError}</p>}
    </Modal>
  </div>;
}

function DetailStat({ icon: Icon, label, value }: { icon: typeof BookOpenCheck; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm"><Icon size={16} /></span><div><p className="text-[11px] text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-ink">{value}</p></div></div>;
}
function FeeRow({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs text-slate-500"><Icon size={14} className="text-slate-400" />{label}</span><span className="text-xs font-semibold text-ink">{value}</span></div>;
}
function rankSuffix(rank: number) { return rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'; }
