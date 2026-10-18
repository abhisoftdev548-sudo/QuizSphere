import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Send, ShieldCheck, XCircle } from 'lucide-react';
import { Button, Card, EmptyState, Modal, PageSkeleton } from '../components/ui';
import { apiErrorMessage, getData, postData, putData } from '../services/api';
import { useToast } from '../context/ToastContext';

type Question = { id: string; type: string; prompt: string; options: Array<{ key: string; text: string }>; hint?: string; points: number };
type UserAnswer = { questionId: string; selections: string[]; textAnswer: string };
type AttemptResponse = { attempt: { id: string; quizId: string; quizTitle: string; status: string; score: number | null; maxScore: number | null; correctCount: number | null; passed: boolean | null; startedAt: string; expiresAt: string | null; submittedAt: string | null }; questions?: Question[]; savedAnswers?: UserAnswer[]; resultDetails?: Array<{ questionId: string; prompt: string; options: Array<{ key: string; text: string }>; correctAnswers: string[]; submittedAnswer: string[] | string; isCorrect: boolean; explanation: string; points: number }> | null };

export default function QuizSessionPage() {
  const { attemptId = '' } = useParams();
  const client = useQueryClient();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const hydrated = useRef(false);
  const submitting = useRef(false);
  const query = useQuery({ queryKey: ['quiz-attempt', attemptId], queryFn: () => getData<AttemptResponse>(`/participation/attempts/${attemptId}`) });
  const data = query.data;
  const questions = data?.questions ?? [];
  const current = questions[activeIndex];
  const completed = data?.attempt.status !== 'in_progress';
  const answeredCount = useMemo(() => Object.values(answers).filter((answer) => answer.selections.length || answer.textAnswer.trim()).length, [answers]);
  const currentAnswer = current ? answers[current.id] ?? { questionId: current.id, selections: [], textAnswer: '' } : null;

  useEffect(() => {
    if (!data || hydrated.current) return;
    const existing: Record<string, UserAnswer> = {};
    for (const answer of data.savedAnswers ?? []) existing[answer.questionId] = { questionId: answer.questionId, selections: answer.selections ?? [], textAnswer: answer.textAnswer ?? '' };
    setAnswers(existing);
    hydrated.current = true;
  }, [data]);
  useEffect(() => {
    hydrated.current = false;
    setAnswers({}); setActiveIndex(0);
  }, [attemptId]);
  useEffect(() => {
    if (!data?.attempt.expiresAt || completed) { setTimeLeft(null); return; }
    const update = () => setTimeLeft(Math.max(0, Math.ceil((new Date(data.attempt.expiresAt!).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [data?.attempt.expiresAt, completed]);

  async function saveAnswers(nextAnswers = answers) {
    if (completed || !data || submitting.current) return;
    const payload = Object.values(nextAnswers);
    setIsSaving(true);
    try { await putData(`/participation/attempts/${attemptId}/answers`, { answers: payload }); }
    catch (error) { setSubmitError(apiErrorMessage(error)); }
    finally { setIsSaving(false); }
  }
  useEffect(() => {
    if (!hydrated.current || !data || completed) return;
    const timer = window.setTimeout(() => { void saveAnswers(answers); }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, data, completed]);

  async function finishAttempt() {
    if (submitting.current) return;
    submitting.current = true;
    setSubmitError('');
    try {
      const expired = Boolean(data?.attempt.expiresAt && new Date(data.attempt.expiresAt).getTime() <= Date.now());
      if (!expired) await putData(`/participation/attempts/${attemptId}/answers`, { answers: Object.values(answers) });
      await postData(`/participation/attempts/${attemptId}/submit`);
      setConfirmOpen(false);
      toast('Your result is ready.');
      await client.invalidateQueries({ queryKey: ['quiz-attempt', attemptId] });
      await client.invalidateQueries({ queryKey: ['attempts'] });
      await client.invalidateQueries({ queryKey: ['overview'] });
      await client.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (error) { setSubmitError(apiErrorMessage(error)); }
    finally { submitting.current = false; }
  }
  useEffect(() => { if (timeLeft === 0 && data?.attempt.status === 'in_progress') void finishAttempt(); }, [timeLeft, data?.attempt.status]);

  if (query.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (query.isError || !data) return <div className="page-container"><Card><EmptyState title="Attempt unavailable" description={apiErrorMessage(query.error)} action={<Link to="/app/attempts" className="text-sm font-semibold text-brand-700">Back to My Attempts</Link>} /></Card></div>;
  if (completed) return <ResultView data={data} />;
  if (!current) return <div className="page-container"><Card><EmptyState title="Questions unavailable" description="The authorized question set could not be loaded. Return to Explore and contact support if this continues." /></Card></div>;

  function setSelection(key: string) {
    const existing = currentAnswer!;
    const selections = current.type === 'multiple_choice' ? existing.selections.includes(key) ? existing.selections.filter((value) => value !== key) : [...existing.selections, key] : [key];
    setAnswers((currentMap) => ({ ...currentMap, [current.id]: { questionId: current.id, selections, textAnswer: '' } }));
  }
  function setTextAnswer(value: string) { setAnswers((currentMap) => ({ ...currentMap, [current.id]: { questionId: current.id, selections: [], textAnswer: value } })); }
  const progress = Math.round((answeredCount / questions.length) * 100);
  return <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link to="/app/attempts" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />Exit to attempts</Link><div className="flex items-center gap-3"><span className="text-xs font-medium text-slate-400">{data.attempt.quizTitle}</span>{timeLeft !== null && <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums ${timeLeft < 60 ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700'}`}><Clock3 size={14} />{formatTime(timeLeft)}</span>}</div></div>
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-8"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Question {activeIndex + 1} <span className="font-normal text-slate-400">of {questions.length}</span></p><span className="text-xs font-semibold text-brand-700">{answeredCount} answered</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} /></div></div>
      <div className="min-h-[360px] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-4 flex items-center gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-700">{current.type.replaceAll('_', ' ')}</span><span className="text-xs text-slate-400">{current.points} point{current.points === 1 ? '' : 's'}</span></div>
        <h1 className="max-w-3xl text-xl font-bold leading-8 tracking-tight text-ink sm:text-2xl">{current.prompt}</h1>
        {current.hint && <p className="mt-3 text-xs text-slate-400">Hint: {current.hint}</p>}
        {current.options.length > 0 ? <div className="mt-7 space-y-3">{current.options.map((option, index) => {
          const selected = currentAnswer?.selections.includes(option.key) ?? false;
          return <button key={option.key} type="button" onClick={() => setSelection(option.key)} role={current.type === 'multiple_choice' ? 'checkbox' : 'radio'} aria-checked={selected} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${selected ? 'border-brand-300 bg-brand-50/80 shadow-sm' : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'}`}>{selected && <CheckCircle2 size={13} />}</span><span className="text-sm text-ink"><span className="mr-2 text-xs font-semibold text-slate-400">{String.fromCharCode(65 + index)}.</span>{option.text}</span></button>;
        })}</div> : <div className="mt-7"><label className="mb-2 block text-xs font-semibold text-slate-600">Your answer</label><textarea value={currentAnswer?.textAnswer ?? ''} onChange={(event) => setTextAnswer(event.target.value)} placeholder="Type your answer…" maxLength={1000} className="input-base min-h-[125px] resize-y" /></div>}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div className="flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-emerald-600" />{isSaving ? 'Saving your progress…' : 'Your answers are saved securely'}</div><div className="flex items-center justify-between gap-2 sm:justify-end"><Button variant="outline" onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0}>Previous</Button>{activeIndex < questions.length - 1 ? <Button onClick={() => setActiveIndex((index) => Math.min(questions.length - 1, index + 1))}>Next question<ArrowRight size={15} /></Button> : <Button onClick={() => setConfirmOpen(true)}><Send size={14} />Submit quiz</Button>}</div></div>
    </Card>
    {submitError && <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-3 text-xs text-rose-700">{submitError}</p>}
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit your quiz?" footer={<><Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep reviewing</Button><Button onClick={() => void finishAttempt()}>Submit answers<Send size={14} /></Button></>}>
      <p className="text-sm leading-6 text-slate-600">You have answered {answeredCount} of {questions.length} questions. Unanswered questions count as incorrect. You can’t change answers after submission.</p>
      {timeLeft !== null && <p className="mt-3 text-xs font-semibold text-slate-500">Time remaining: {formatTime(timeLeft)}</p>}
    </Modal>
  </div>;
}

function ResultView({ data }: { data: AttemptResponse }) {
  const attempt = data.attempt;
  const passed = Boolean(attempt.passed);
  const details = data.resultDetails;
  const total = attempt.maxScore ?? 0;
  return <div className="page-container"><div className="mx-auto max-w-4xl"><Link to="/app/attempts" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />My Attempts</Link>
    <Card className="overflow-hidden"><div className={`${passed ? 'bg-emerald-600' : 'bg-brand-700'} px-5 py-8 text-white sm:px-8`}><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">{attempt.status === 'expired' ? 'Time expired' : 'Quiz complete'}</p><h1 className="mt-2 text-2xl font-bold tracking-tight">{attempt.quizTitle}</h1><p className="mt-2 text-sm text-white/75">{passed ? 'You passed. Nice work.' : 'Your attempt has been recorded.'}</p></div><div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10"><strong className="text-3xl font-bold">{attempt.score ?? 0}%</strong><span className="text-[10px] uppercase tracking-[0.12em] text-white/70">score</span></div></div></div>
      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3 sm:px-8"><ResultStat label="Correct answers" value={attempt.correctCount === null ? '—' : String(attempt.correctCount)} /><ResultStat label="Total points" value={total ? `${total} pts` : '—'} /><ResultStat label="Status" value={passed ? 'Passed' : attempt.status === 'expired' ? 'Expired' : 'Complete'} /></div>
      <div className="p-5 sm:p-8">{details ? <><h2 className="text-sm font-bold text-ink">Answer review</h2><p className="mt-1 text-xs text-slate-400">This review is available because the quiz settings allow it.</p><div className="mt-4 space-y-3">{details.map((question, index) => <div key={question.questionId} className={`rounded-xl border p-4 ${question.isCorrect ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/30'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 ${question.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{question.isCorrect ? <CheckCircle2 size={17} /> : <XCircle size={17} />}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-400">Question {index + 1} · {question.points} point{question.points === 1 ? '' : 's'}</p><p className="mt-1 text-sm font-semibold text-ink">{question.prompt}</p><p className="mt-2 text-xs text-slate-600"><strong>Your answer:</strong> {answerLabel(question, question.submittedAnswer)}</p><p className="mt-1 text-xs text-emerald-700"><strong>Correct:</strong> {answerLabel(question, question.correctAnswers)}</p>{question.explanation && <p className="mt-2 text-xs leading-5 text-slate-500">{question.explanation}</p>}</div></div></div>)}</div></> : <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-ink">Result details are not available</p><p className="mt-1 text-xs leading-5 text-slate-500">The quiz creator chose not to reveal answer details. Your score and completion record remain available in My Attempts.</p></div>}
      <div className="mt-6 flex flex-wrap gap-2"><Link to="/app/explore" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Explore more<ArrowRight size={15} /></Link><Link to="/app/attempts" className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">My attempts</Link></div></div>
    </Card>
  </div></div>;
}
function ResultStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-ink">{value}</p></div>; }
function answerLabel(question: NonNullable<AttemptResponse['resultDetails']>[number], value: string | string[]) { const values = Array.isArray(value) ? value : [value]; if (question.options?.length) return values.map((key) => question.options.find((option) => option.key === key)?.text ?? key).join(', ') || 'No answer'; return values.filter(Boolean).join(', ') || 'No answer'; }
function formatTime(value: number) { const minutes = Math.floor(value / 60); const seconds = value % 60; return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
