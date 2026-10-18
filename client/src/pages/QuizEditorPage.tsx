import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowDown, ArrowLeft, ArrowUp, Check, CircleHelp, Copy, Eye, FileCheck2, Plus, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, EmptyState, Field, Modal, PageHeader, PageSkeleton, SelectInput, TextArea, TextInput } from '../components/ui';
import { apiErrorCode, apiErrorDetails, apiErrorMessage, getData, postData, putData } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { Category } from '../types/api';

type QuizQuestion = { type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'; prompt: string; options: Array<{ key: string; text: string }>; correctAnswers: string[]; explanation: string; hint: string; points: number };
type QuizValues = { title: string; description: string; categoryId: string | null; tags: string[]; difficulty: 'beginner' | 'intermediate' | 'advanced'; language: string; coverImageUrl: string | null; timeLimitSeconds: number | null; passingScorePercent: number; entryFee: number; questions: QuizQuestion[] };
const optionSchema = z.object({ key: z.string().min(1), text: z.string().trim().min(1, 'Add answer text.').max(250) });
const questionSchema = z.object({
  type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer']),
  prompt: z.string().trim().min(4, 'Question needs at least 4 characters.').max(1000),
  options: z.array(optionSchema), correctAnswers: z.array(z.string()).min(1, 'Choose at least one correct answer.'),
  explanation: z.string().max(1000), hint: z.string().max(300), points: z.number().int().min(1).max(100),
}).superRefine((value, context) => {
  const choice = ['single_choice', 'multiple_choice', 'true_false'].includes(value.type);
  if (choice && value.options.length < 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Add at least two options.' });
  if (!choice && value.options.length > 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Text response questions do not have options.' });
  if (choice && value.correctAnswers.some((answer) => !value.options.some((option) => option.key === answer))) context.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Select a valid answer.' });
  if (value.type !== 'multiple_choice' && value.correctAnswers.length !== 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Choose exactly one correct answer.' });
});
const quizSchema = z.object({
  title: z.string().trim().min(4, 'Title needs at least 4 characters.').max(120),
  description: z.string().trim().max(2000),
  categoryId: z.string().nullable(), tags: z.array(z.string()), difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.string().min(2).max(12), coverImageUrl: z.string().nullable(), timeLimitSeconds: z.number().int().min(30).max(7200).nullable(),
  passingScorePercent: z.number().min(0).max(100), entryFee: z.number().int().min(0), questions: z.array(questionSchema).min(1).max(100),
});
const blankOption = (text: string) => ({ key: crypto.randomUUID(), text });
function blankQuestion(): QuizQuestion {
  const options = [blankOption(''), blankOption('')];
  return { type: 'single_choice', prompt: '', options, correctAnswers: [options[0].key], explanation: '', hint: '', points: 1 };
}

type FeeDetails = { fee: number; freeQuestionLimit: number; additionalQuestionFee: number; totalQuestions: number };
type Rules = { freeQuizQuestionLimit: number; additionalQuestionFee: number; maxQuizQuestions: number; maxQuizEntryFee: number };

export default function QuizEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const requestKey = useRef(crypto.randomUUID());
  const actionRef = useRef<'save' | 'submit'>('save');
  const [feePrompt, setFeePrompt] = useState<FeeDetails | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const form = useForm<QuizValues>({ resolver: zodResolver(quizSchema), defaultValues: { title: '', description: '', categoryId: null, tags: [], difficulty: 'beginner', language: 'en', coverImageUrl: null, timeLimitSeconds: null, passingScorePercent: 60, entryFee: 0, questions: [blankQuestion()] } });
  const questionArray = useFieldArray({ control: form.control, name: 'questions' });
  const questions = form.watch('questions');
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<{ items: Category[] }>('/explore/categories').then((result) => result.items.filter((category) => category.contentType === 'quiz' || category.contentType === 'both')) });
  const rules = useQuery({ queryKey: ['platform-rules'], queryFn: () => getData<Rules>('/platform/rules') });
  const draft = useQuery({ queryKey: ['creator-quiz', id], enabled: Boolean(id), queryFn: () => getData<{ item: any; questions: QuizQuestion[] }>(`/creator/quizzes/${id}`) });

  useEffect(() => {
    if (draft.data) {
      const item = draft.data.item;
      form.reset({ title: item.title, description: item.description ?? '', categoryId: item.categoryId ? String(item.categoryId) : null, tags: item.tags ?? [], difficulty: item.difficulty ?? 'beginner', language: item.language ?? 'en', coverImageUrl: item.coverImageUrl ?? null, timeLimitSeconds: item.timeLimitSeconds ?? null, passingScorePercent: item.passingScorePercent ?? 60, entryFee: item.entryFee ?? 0, questions: draft.data.questions.length ? draft.data.questions : [blankQuestion()] });
    }
  }, [draft.data, form]);

  const pricing = rules.data;
  const projectedFee = useMemo(() => pricing ? Math.max(0, (questions?.length ?? 0) - pricing.freeQuizQuestionLimit) * pricing.additionalQuestionFee : 0, [pricing, questions?.length]);
  const locked = isEditing && draft.data && !['draft', 'changes_requested', 'rejected'].includes(draft.data.item.status);
  const isLoading = (isEditing && draft.isLoading) || rules.isLoading;

  async function persist(values: QuizValues, confirmFee = false) {
    setSubmitError('');
    setFeePrompt(null);
    const payload = { ...values, categoryId: values.categoryId || null, tags: values.tags.filter(Boolean), coverImageUrl: values.coverImageUrl || null };
    try {
      const headers = !isEditing ? { 'Idempotency-Key': requestKey.current, ...(confirmFee ? { 'X-Confirm-QCoin-Fee': 'true' } : {}) } : undefined;
      const saved = isEditing ? await putData<{ item: { id: string } }>(`/creator/quizzes/${id}`, payload, headers) : await postData<{ item: { id: string } }>('/creator/quizzes', payload, headers);
      const contentId = saved.item.id;
      if (actionRef.current === 'submit') {
        await postData(`/creator/quizzes/${contentId}/submit`);
        toast('Quiz submitted for administrator review.');
      } else toast('Quiz draft saved.');
      navigate('/app/creator-studio');
    } catch (error) {
      if (apiErrorCode(error) === 'FEE_CONFIRMATION_REQUIRED') {
        setFeePrompt(apiErrorDetails(error) as FeeDetails);
        return;
      }
      setSubmitError(apiErrorMessage(error));
    }
  }
  const saveAction = (action: 'save' | 'submit', confirm = false) => {
    actionRef.current = action;
    void form.handleSubmit((values) => persist(values, confirm))();
  };

  if (isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (draft.isError) return <div className="page-container"><Card><EmptyState title="Quiz draft unavailable" description={apiErrorMessage(draft.error)} action={<Link to="/app/creator-studio" className="text-sm font-semibold text-brand-700">Back to Creator Studio</Link>} /></Card></div>;
  if (locked) return <div className="page-container"><Card><EmptyState title="This quiz can’t be edited right now" description="Published or in-review content must finish its review workflow before you can make changes." action={<Link to="/app/creator-studio" className="text-sm font-semibold text-brand-700">Return to Creator Studio</Link>} /></Card></div>;

  return <div className="page-container">
    <Link to="/app/creator-studio" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />Creator Studio</Link>
    <PageHeader title={isEditing ? 'Edit quiz draft' : 'Create a quiz'} description="Shape your questions, set participation rules, and save your work before review." eyebrow="Creator Studio" action={<Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye size={15} />Preview</Button>} />
    {draft.data?.item?.reviewFeedback && <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"><strong className="font-semibold">Review feedback:</strong> {draft.data.item.reviewFeedback}</div>}
    <form onSubmit={(event) => event.preventDefault()} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6"><SectionTitle title="Quiz details" step="01" /><div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Quiz title" error={form.formState.errors.title?.message} className="sm:col-span-2"><TextInput {...form.register('title')} placeholder="A clear, inviting title" /></Field>
          <Field label="Description" error={form.formState.errors.description?.message} className="sm:col-span-2"><TextArea {...form.register('description')} placeholder="What will participants learn or explore?" className="min-h-[100px]" /></Field>
          <Field label="Category"><SelectInput {...form.register('categoryId')}><option value="">Choose a category</option>{categories.data?.map((category) => <option key={category.id ?? category._id} value={category.id ?? category._id}>{category.name}</option>)}</SelectInput></Field>
          <Field label="Difficulty"><SelectInput {...form.register('difficulty')}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></SelectInput></Field>
          <Field label="Language"><TextInput {...form.register('language')} placeholder="en" /></Field>
          <Field label="Tags" hint="Separate tags with commas."><TextInput value={(form.watch('tags') ?? []).join(', ')} onChange={(event) => form.setValue('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean), { shouldDirty: true })} placeholder="science, history, fun" /></Field>
        </div></Card>

        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><SectionTitle title="Questions" step="02" /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{questionArray.fields.length} added</span></div>
          <div className="mt-5 space-y-4">{questionArray.fields.map((field, index) => <QuestionPanel key={field.id} index={index} form={form} total={questionArray.fields.length} move={questionArray.move} remove={questionArray.remove} insert={questionArray.insert} />)}</div>
          {form.formState.errors.questions?.message && <p className="mt-3 text-xs text-rose-600">{form.formState.errors.questions.message}</p>}
          <Button type="button" variant="outline" className="mt-4 w-full border-dashed" onClick={() => questionArray.append(blankQuestion())} disabled={questionArray.fields.length >= (pricing?.maxQuizQuestions ?? 100)}><Plus size={15} />Add a question</Button>
          {pricing && <p className="mt-3 text-[11px] leading-5 text-slate-400">Up to {pricing.freeQuizQuestionLimit} questions are free under the current platform policy. This quiz’s current estimated premium question fee is <strong className="text-slate-600">{projectedFee} QCoins</strong>.</p>}
        </Card>
      </div>
      <aside className="space-y-5">
        <Card className="p-5"><SectionTitle title="Participation" step="03" /><div className="mt-5 space-y-4">
          <Field label="Time limit (minutes)" hint="Leave blank for no time limit."><TextInput type="number" min="0.5" max="120" step="0.5" placeholder="No limit" value={form.watch('timeLimitSeconds') ? form.watch('timeLimitSeconds')! / 60 : ''} onChange={(event) => form.setValue('timeLimitSeconds', event.target.value ? Math.round(Number(event.target.value) * 60) : null, { shouldDirty: true })} /></Field>
          <Field label="Passing score" error={form.formState.errors.passingScorePercent?.message}><div className="relative"><TextInput type="number" min="0" max="100" {...form.register('passingScorePercent', { valueAsNumber: true })} className="pr-10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span></div></Field>
          <Field label="Quiz entry fee" hint={pricing ? `Maximum ${pricing.maxQuizEntryFee} QCoins. Participants see this before starting.` : 'Participants see the fee before starting.'}><div className="relative"><TextInput type="number" min="0" max={pricing?.maxQuizEntryFee} {...form.register('entryFee', { valueAsNumber: true })} className="pr-16" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">QCoins</span></div></Field>
        </div></Card>
        <Card className="p-5"><div className="flex items-start gap-2.5"><CircleHelpIcon /><div><h3 className="text-xs font-bold text-ink">Review checklist</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Make sure every question has a valid answer key. Your correct answers stay private and are only returned to the creator and eligible result view.</p></div></div></Card>
        <div className="space-y-2.5">
          {submitError && <p className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs text-rose-700">{submitError}</p>}
          <Button type="button" className="w-full" disabled={form.formState.isSubmitting || questionArray.fields.length === 0} onClick={() => saveAction('submit')}>{form.formState.isSubmitting ? 'Saving…' : 'Submit for review'}<FileCheck2 size={16} /></Button>
          <Button type="button" variant="outline" className="w-full" disabled={form.formState.isSubmitting} onClick={() => saveAction('save')}>Save as draft</Button>
          <p className="text-center text-[10px] leading-4 text-slate-400">You can edit your draft and submit it whenever it’s ready.</p>
        </div>
      </aside>
    </form>
    <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Private quiz preview" footer={<Button onClick={() => setPreviewOpen(false)}>Close preview</Button>}>
      <p className="mb-4 text-xs leading-5 text-slate-500">Only you can see this preview. Correct options are marked for creator review.</p>
      <div className="max-h-[55vh] space-y-4 overflow-y-auto">{questions?.map((question, index) => <div key={`${index}-${question.prompt}`} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-400">Question {index + 1} · {question.points} pt</p><p className="mt-2 text-sm font-semibold text-ink">{question.prompt || 'Your question prompt'}</p><div className="mt-3 space-y-2">{question.options.map((option) => <div key={option.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${question.correctAnswers.includes(option.key) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'}`}>{question.correctAnswers.includes(option.key) && <Check size={13} />}{option.text || 'Answer option'}</div>)}</div>{(question.type === 'fill_blank' || question.type === 'short_answer') && <p className="mt-2 text-xs text-emerald-700">Accepted answers: {question.correctAnswers.join(', ') || 'Not set'}</p>}</div>)}</div>
    </Modal>
    <Modal open={Boolean(feePrompt)} onClose={() => setFeePrompt(null)} title="Confirm creation fee" footer={<><Button variant="outline" onClick={() => setFeePrompt(null)}>Go back</Button><Button disabled={(user?.walletBalance ?? 0) < (feePrompt?.fee ?? 0)} onClick={() => saveAction(actionRef.current, true)}>Confirm {feePrompt?.fee ?? 0} QCoins</Button></>}>
      {feePrompt && <><p className="text-sm leading-6 text-slate-600">The current platform policy includes a premium fee for questions beyond the free limit. This charge is calculated and applied by the server.</p><div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-xs"><FeeLine label="Questions" value={String(feePrompt.totalQuestions)} /><FeeLine label="Included free" value={String(feePrompt.freeQuestionLimit)} /><FeeLine label="Additional question rate" value={`${feePrompt.additionalQuestionFee} QCoins`} /><div className="my-1 border-t border-slate-200" /><FeeLine label="Total due now" value={`${feePrompt.fee} QCoins`} bold /></div>{(user?.walletBalance ?? 0) < feePrompt.fee && <p className="mt-3 text-xs font-medium text-rose-600">Your current wallet balance is too low to confirm this fee.</p>}</>}
    </Modal>
  </div>;
}

function QuestionPanel({ index, form, total, move, remove, insert }: { index: number; form: ReturnType<typeof useForm<QuizValues>>; total: number; move: (from: number, to: number) => void; remove: (index: number) => void; insert: (index: number, value: QuizQuestion) => void }) {
  const type = form.watch(`questions.${index}.type` as const);
  const options = form.watch(`questions.${index}.options` as const) ?? [];
  const correct = form.watch(`questions.${index}.correctAnswers` as const) ?? [];
  const promptName = `questions.${index}.prompt` as const;
  const typeName = `questions.${index}.type` as const;
  const pointsName = `questions.${index}.points` as const;
  const explanationName = `questions.${index}.explanation` as const;
  const hintName = `questions.${index}.hint` as const;
  const optionsName = `questions.${index}.options` as const;
  const answersName = `questions.${index}.correctAnswers` as const;
  function changeType(next: QuizQuestion['type']) {
    form.setValue(typeName, next, { shouldDirty: true });
    if (['single_choice', 'multiple_choice', 'true_false'].includes(next)) {
      const nextOptions = next === 'true_false' ? [{ key: crypto.randomUUID(), text: 'True' }, { key: crypto.randomUUID(), text: 'False' }] : options.length >= 2 ? options : [blankOption(''), blankOption('')];
      form.setValue(optionsName, nextOptions, { shouldDirty: true });
      form.setValue(answersName, nextOptions[0] ? [nextOptions[0].key] : [], { shouldDirty: true });
    } else {
      form.setValue(optionsName, [], { shouldDirty: true });
      form.setValue(answersName, correct.length ? correct : [''], { shouldDirty: true });
    }
  }
  function toggleCorrect(key: string) {
    if (type === 'multiple_choice') form.setValue(answersName, correct.includes(key) ? correct.filter((answer) => answer !== key) : [...correct, key], { shouldDirty: true });
    else form.setValue(answersName, [key], { shouldDirty: true });
  }
  function duplicateQuestion() {
    const original = form.getValues(`questions.${index}`);
    const keyMap = new Map<string, string>();
    const copiedOptions = original.options.map((option) => { const key = crypto.randomUUID(); keyMap.set(option.key, key); return { ...option, key }; });
    const copiedAnswers = original.options.length ? original.correctAnswers.map((answer) => keyMap.get(answer) ?? answer) : [...original.correctAnswers];
    insert(index + 1, { ...original, options: copiedOptions, correctAnswers: copiedAnswers });
  }
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">{String(index + 1).padStart(2, '0')}</span><span className="text-xs font-semibold text-slate-600">Question</span></div><div className="flex items-center gap-1"><button type="button" onClick={() => move(index, Math.max(0, index - 1))} disabled={index === 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-700 disabled:opacity-30" aria-label="Move question up"><ArrowUp size={15} /></button><button type="button" onClick={() => move(index, Math.min(total - 1, index + 1))} disabled={index === total - 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-700 disabled:opacity-30" aria-label="Move question down"><ArrowDown size={15} /></button><button type="button" onClick={duplicateQuestion} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-700" aria-label="Duplicate question"><Copy size={14} /></button><button type="button" onClick={() => remove(index)} disabled={total <= 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" aria-label="Delete question"><Trash2 size={14} /></button></div></div>
    <div className="grid gap-3 sm:grid-cols-[1fr_190px]"><Field label="Question prompt" error={form.formState.errors.questions?.[index]?.prompt?.message} className="sm:col-span-2"><TextArea {...form.register(promptName)} placeholder="Write a clear question…" className="min-h-[78px] bg-white" /></Field><Field label="Question type"><SelectInput value={type} onChange={(event) => changeType(event.target.value as QuizQuestion['type'])}><option value="single_choice">Single choice</option><option value="multiple_choice">Multiple choice</option><option value="true_false">True / false</option><option value="fill_blank">Fill in the blank</option><option value="short_answer">Short answer · exact match</option></SelectInput></Field><Field label="Points"><TextInput type="number" min="1" max="100" {...form.register(pointsName, { valueAsNumber: true })} /></Field></div>
    {options.length > 0 ? <div className="mt-4"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">Answer options <span className="font-normal text-slate-400">· select the correct answer</span></p><p className="text-[10px] text-slate-400">{type === 'multiple_choice' ? 'Multiple correct' : 'One correct'}</p></div><div className="space-y-2">{options.map((option, optionIndex) => <div key={option.key} className="flex items-center gap-2"><button type="button" onClick={() => toggleCorrect(option.key)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${correct.includes(option.key) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'}`} aria-label={`Mark option ${optionIndex + 1} correct`} aria-pressed={correct.includes(option.key)}><Check size={12} /></button><TextInput value={option.text} onChange={(event) => form.setValue(`${optionsName}.${optionIndex}.text` as const, event.target.value, { shouldDirty: true })} placeholder={`Answer option ${optionIndex + 1}`} className="bg-white" /><button type="button" onClick={() => { const next = options.filter((_, i) => i !== optionIndex); form.setValue(optionsName, next, { shouldDirty: true }); form.setValue(answersName, correct.filter((key) => next.some((item) => item.key === key)), { shouldDirty: true }); }} disabled={options.length <= 2 || type === 'true_false'} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600 disabled:opacity-30" aria-label="Remove answer option"><X size={15} /></button></div>)}</div><Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => form.setValue(optionsName, [...options, blankOption('')], { shouldDirty: true })} disabled={options.length >= 8 || type === 'true_false'}><Plus size={13} />Add option</Button>{form.formState.errors.questions?.[index]?.options?.message && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.questions[index]?.options?.message as string}</p>}{form.formState.errors.questions?.[index]?.correctAnswers?.message && <p className="mt-1 text-xs text-rose-600">{form.formState.errors.questions[index]?.correctAnswers?.message as string}</p>}</div> : <Field className="mt-4" label="Accepted answers" hint="Enter one acceptable exact answer per line. Matching is case-insensitive."><TextArea value={correct.join('\n')} onChange={(event) => form.setValue(answersName, event.target.value.split('\n').map((answer) => answer.trim()).filter(Boolean), { shouldDirty: true })} placeholder="Answer one\nAnother acceptable answer" className="min-h-[74px] bg-white" /></Field>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Hint (optional)"><TextInput {...form.register(hintName)} placeholder="A nudge for participants" className="bg-white" /></Field><Field label="Explanation (optional)"><TextInput {...form.register(explanationName)} placeholder="Explain the answer" className="bg-white" /></Field></div>
  </div>;
}

function SectionTitle({ title, step }: { title: string; step: string }) { return <div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-700">{step}</span><h2 className="text-sm font-bold text-ink">{title}</h2></div>; }
function CircleHelpIcon() { return <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CircleHelp size={16} /></div>; }
function FeeLine({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) { return <div className={`flex justify-between ${bold ? 'text-sm font-bold text-ink' : 'text-slate-500'}`}><span>{label}</span><span>{value}</span></div>; }
