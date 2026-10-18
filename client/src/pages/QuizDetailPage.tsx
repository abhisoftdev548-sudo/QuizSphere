import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Award, BookOpenCheck, CheckCircle2, Clock3, Coins, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../layouts/DashboardLayout';
import { Button, Card, EmptyState, Modal, PageHeader, PageSkeleton } from '../components/ui';
import { apiErrorMessage, getData, postData } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

type QuizDetail = { id: string; title: string; description: string; category: string | null; difficulty: string; tags: string[]; questionCount: number; timeLimitSeconds: number | null; passingScorePercent: number; entryFee: number; prizeRules: Array<{ rank: number; sharePercent: number }>; creatorFundedPrize: number; closesAt: string | null; allowResultReview: boolean; creator: { id: string; username: string; displayName: string; avatarUrl?: string | null } | null };

export default function QuizDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const client = useQueryClient();
  const startKey = useRef<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [startError, setStartError] = useState('');
  const isApp = location.pathname.startsWith('/app');
  const backTo = isApp ? '/app/explore' : '/explore';
  const query = useQuery({ queryKey: ['quiz-detail', id], queryFn: () => getData<QuizDetail>(`/explore/quizzes/${id}`) });
  async function start() {
    if (!query.data) return;
    setStartError('');
    try {
      startKey.current ??= crypto.randomUUID();
      const result = await postData<{ attempt: { id: string; status: string }; questions?: unknown[] }>(`/participation/quizzes/${id}/attempts`, {}, { 'Idempotency-Key': startKey.current });
      await client.invalidateQueries({ queryKey: ['auth', 'me'] });
      setConfirmOpen(false);
      navigate(`/app/quiz-session/${result.attempt.id}`, { state: { questionPayload: result.questions } });
    } catch (error) { setStartError(apiErrorMessage(error)); }
  }

  if (query.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (query.isError || !query.data) return <div className="page-container"><Card><EmptyState title="Quiz details unavailable" description={query.isError ? apiErrorMessage(query.error) : 'This quiz may have closed or been unpublished.'} action={<Link to={backTo} className="text-sm font-semibold text-brand-700">Back to Explore</Link>} /></Card></div>;
  const quiz = query.data;
  const insufficient = (user?.walletBalance ?? 0) < quiz.entryFee;
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
            <FeeRow icon={Coins} label="Entry fee" value={`${quiz.entryFee} QCoins`} />
            <FeeRow icon={CheckCircle2} label="Available balance" value={user ? `${user.walletBalance.toLocaleString()} QCoins` : 'Sign in to view'} />
            {quiz.closesAt && <FeeRow icon={Clock3} label="Closes" value={new Date(quiz.closesAt).toLocaleDateString()} />}
            {quiz.prizeRules?.length > 0 && <div className="rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">Prize distribution is configured for {quiz.prizeRules.length} eligible rank{quiz.prizeRules.length === 1 ? '' : 's'}. Final payouts depend on the published settlement terms.</div>}
          </div>
          {user ? <Button className="mt-5 w-full" onClick={() => { setStartError(''); startKey.current = crypto.randomUUID(); setConfirmOpen(true); }} disabled={insufficient}>{insufficient ? 'Not enough QCoins' : 'Start quiz'}<ArrowRight size={16} /></Button> : <Link to="/login" state={{ from: { pathname: location.pathname } }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in to participate<ArrowRight size={15} /></Link>}
          {insufficient && user && <p className="mt-2 text-center text-xs text-rose-600">Add QCoins by participating in eligible activities or check your wallet.</p>}
          <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">QCoins are virtual platform credits and cannot be withdrawn.</p>
        </Card>
        {user && <Card className="p-4"><div className="flex items-start gap-2.5"><UsersRound size={16} className="mt-0.5 text-brand-600" /><p className="text-xs leading-5 text-slate-500">Your attempt and score are recorded to support your activity history and community rankings.</p></div></Card>}
      </aside>
    </div>
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm quiz entry" footer={<><Button variant="outline" onClick={() => setConfirmOpen(false)}>Not now</Button><Button onClick={() => void start()}>{quiz.entryFee ? `Pay ${quiz.entryFee} QCoins & start` : 'Start quiz'}<ArrowRight size={15} /></Button></>}>
      <p className="text-sm leading-6 text-slate-600">Starting this quiz will create a tracked attempt{quiz.entryFee > 0 ? ` and deduct ${quiz.entryFee} QCoins from your wallet` : ''}. You’ll see the questions after confirmation.</p>
      <div className="mt-4 flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Entry fee</span><strong className="text-ink">{quiz.entryFee} QCoins</strong></div>
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
