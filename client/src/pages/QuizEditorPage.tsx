import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowDown, ArrowLeft, ArrowUp, Check, CircleHelp, Copy, Eye, FileCheck2, Plus, Trash2, Upload, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, EmptyState, Field, Modal, PageHeader, PageSkeleton, SelectInput, TextArea, TextInput } from '../components/ui';
import { apiErrorMessage, getData, postData, putData } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { Category } from '../types/api';

type QuizQuestion = { type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'; prompt: string; options: Array<{ key: string; text: string }>; correctAnswers: string[]; explanation: string; hint: string; points: number };
type PrizeRule = { rank: number; sharePercent: number };
type PassProduct = { key: string; name: string; kind: 'create' | 'participation'; price: number; active: boolean };
type QuizValues = { title: string; description: string; categoryId: string | null; tags: string[]; quizType: 'general' | 'special_event'; difficulty: 'beginner' | 'intermediate' | 'advanced'; language: string; coverImageUrl: string | null; timeLimitSeconds: number | null; startsAt: string | null; closesAt: string | null; passingScorePercent: number; requiredPassKey: string | null; creatorFundedPrize: number; rewardPerWinner: number; prizeRules: PrizeRule[]; questions: QuizQuestion[] };
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
  quizType: z.enum(['general', 'special_event']), startsAt: z.string().datetime().nullable(), closesAt: z.string().datetime().nullable(),
  passingScorePercent: z.number().min(0).max(100), requiredPassKey: z.enum(['vip', 'pro', 'legend', 'premium']).nullable(),
  creatorFundedPrize: z.number().int().min(0).max(1_000_000), rewardPerWinner: z.number().int().min(0).max(1_000_000), prizeRules: z.array(z.object({ rank: z.number().int().min(1).max(100), sharePercent: z.number().int().min(1).max(100) })),
  questions: z.array(questionSchema).min(1).max(100),
}).superRefine((value, context) => {
  const ranks = value.prizeRules.map((rule) => rule.rank);
  if (new Set(ranks).size !== ranks.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['prizeRules'], message: 'Each prize rank must be unique.' });
  if (ranks.some((rank, index) => rank !== index + 1)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['prizeRules'], message: 'Prize ranks must be consecutive starting at first place.' });
  const share = value.prizeRules.reduce((sum, rule) => sum + rule.sharePercent, 0);
  if (value.quizType === 'special_event' && value.creatorFundedPrize > 0 && share !== 100) context.addIssue({ code: z.ZodIssueCode.custom, path: ['prizeRules'], message: 'Prize shares must add up to 100%.' });
  if (value.creatorFundedPrize === 0 && value.prizeRules.length > 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ['creatorFundedPrize'], message: 'Add a QCoin prize pool or remove prize ranks.' });
  if (value.quizType === 'general' && (value.startsAt || value.closesAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['quizType'], message: 'General quizzes do not have a start or close time.' });
  if (value.quizType === 'special_event' && (!value.startsAt || !value.closesAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['startsAt'], message: 'Special Event quizzes need both start and close times.' });
  if (value.quizType === 'special_event' && value.startsAt && new Date(value.startsAt).getTime() <= Date.now()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['startsAt'], message: 'Event start time must be in the future.' });
  if (value.quizType === 'special_event' && value.startsAt && value.closesAt && new Date(value.closesAt) <= new Date(value.startsAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['closesAt'], message: 'Quiz closing time must be after its start time.' });
  if (value.quizType === 'general' && value.prizeRules.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['prizeRules'], message: 'General quizzes use fixed rewards per passing participant.' });
  if (value.quizType === 'general' && value.creatorFundedPrize > 0 && value.rewardPerWinner < 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rewardPerWinner'], message: 'Set a reward for each passing participant.' });
  if (value.quizType === 'general' && value.creatorFundedPrize > 0 && value.rewardPerWinner > value.creatorFundedPrize) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rewardPerWinner'], message: 'Per-participant reward cannot exceed the prize pool.' });
  if (value.quizType === 'general' && value.creatorFundedPrize === 0 && value.rewardPerWinner > 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ['creatorFundedPrize'], message: 'Set a prize pool before configuring rewards.' });
  if (value.quizType === 'special_event' && value.rewardPerWinner > 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rewardPerWinner'], message: 'Special Event quizzes use rank-based prize shares.' });
  if (value.closesAt && new Date(value.closesAt).getTime() <= Date.now()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['closesAt'], message: 'Quiz closing time must be in the future.' });
});
const blankOption = (text: string) => ({ key: crypto.randomUUID(), text });
const sampleQuestionsJson = JSON.stringify([
  {
    type: 'single_choice',
    prompt: 'What is the brain of a computer?',
    options: ['CPU', 'Motherboard', 'RAM'],
    correctAnswer: 'CPU',
    points: 1,
  },
  {
    type: 'multiple_choice',
    prompt: 'Which of these are input devices?',
    options: ['Keyboard', 'Mouse', 'Monitor'],
    correctAnswers: ['Keyboard', 'Mouse'],
    points: 2,
  },
], null, 2);
function blankQuestion(): QuizQuestion {
  const options = [blankOption(''), blankOption('')];
  return { type: 'single_choice', prompt: '', options, correctAnswers: [options[0].key], explanation: '', hint: '', points: 1 };
}

function firstErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const entry = value as Record<string, unknown>;
  if (typeof entry.message === 'string') return entry.message;
  for (const [key, child] of Object.entries(entry)) {
    if (key === 'ref' || key === 'types') continue;
    const message = firstErrorMessage(child);
    if (message) return message;
  }
  return undefined;
}

function normalizeImportedQuestion(value: unknown, index: number): QuizQuestion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Question ${index + 1} must be a JSON object.`);
  }
  const source = value as Record<string, unknown>;
  const rawAnswers = source.correctAnswers
    ?? source.correctAnswer
    ?? source.answer
    ?? source.answerKey
    ?? source.correct_option
    ?? source.correct_option_text;
  const answerValues = Array.isArray(rawAnswers) ? rawAnswers : rawAnswers == null ? [] : [rawAnswers];
  const typeName = String(source.type ?? (answerValues.length > 1 ? 'multiple_choice' : 'single_choice'))
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const typeAliases: Record<string, QuizQuestion['type']> = {
    single: 'single_choice',
    single_choice: 'single_choice',
    multiple: 'multiple_choice',
    multiple_choice: 'multiple_choice',
    true_false: 'true_false',
    fill_in_the_blank: 'fill_blank',
    fill_blank: 'fill_blank',
    short_answer: 'short_answer',
  };
  const questionType = typeAliases[typeName];
  if (!questionType) {
    throw new Error(`Question ${index + 1} has an unsupported type.`);
  }
  const rawOptions = source.options ?? (questionType === 'true_false' ? ['True', 'False'] : []);
  if (!Array.isArray(rawOptions)) throw new Error(`Question ${index + 1} options must be an array.`);

  const options = rawOptions.map((option, optionIndex) => {
    if (typeof option === 'string') return { key: `option-${optionIndex + 1}`, text: option };
    if (option && typeof option === 'object' && !Array.isArray(option)) {
      const item = option as Record<string, unknown>;
      return {
        key: typeof item.key === 'string' && item.key.trim()
          ? item.key.trim()
          : typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `option-${optionIndex + 1}`,
        text: item.text ?? item.label ?? item.value,
        isCorrect: item.isCorrect === true || item.correct === true,
      };
    }
    throw new Error(`Question ${index + 1}, option ${optionIndex + 1} must be text or an object with text/label.`);
  });

  const correctAnswers = (answerValues.length
    ? answerValues
    : options.filter((option) => 'isCorrect' in option && option.isCorrect).map((option) => option.key)
  ).map((answer) => {
    if (typeof answer !== 'string') return answer as string;
    const matchedOption = options.find((option) =>
      option.key === answer
      || (typeof option.text === 'string' && option.text.trim().toLowerCase() === answer.trim().toLowerCase())
    );
    if (matchedOption) return matchedOption.key;
    const letterIndex = /^[a-h]$/i.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : -1;
    return letterIndex >= 0 && options[letterIndex] ? options[letterIndex].key : answer;
  });

  const parsed = questionSchema.safeParse({
    type: questionType,
    prompt: source.prompt ?? source.question ?? source.questionText,
    options: questionType === 'fill_blank' || questionType === 'short_answer'
      ? []
      : options.map(({ key, text }) => ({ key, text })),
    correctAnswers,
    explanation: source.explanation ?? '',
    hint: source.hint ?? '',
    points: source.points ?? 1,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Question ${index + 1}${issue.path.length ? ` (${issue.path.join('.')})` : ''}: ${issue.message}`);
  }
  return parsed.data;
}

type Rules = { freeQuizQuestionLimit: number; specialEventRequiresCreatePass: boolean; maxQuizQuestions: number; passProducts: PassProduct[] };
type PassInventory = { items: Array<PassProduct & { balance: number }> };

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function QuizEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const client = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const requestKey = useRef(crypto.randomUUID());
  const actionRef = useRef<'save' | 'publish'>('save');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const form = useForm<QuizValues>({ resolver: zodResolver(quizSchema), defaultValues: { title: '', description: '', categoryId: null, tags: [], quizType: 'general', difficulty: 'beginner', language: 'en', coverImageUrl: null, timeLimitSeconds: 600, startsAt: null, closesAt: null, passingScorePercent: 60, requiredPassKey: null, creatorFundedPrize: 0, rewardPerWinner: 0, prizeRules: [], questions: [blankQuestion()] } });
  const questionArray = useFieldArray({ control: form.control, name: 'questions' });
  const questions = form.watch('questions');
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<{ items: Category[] }>('/explore/categories').then((result) => result.items.filter((category) => category.contentType === 'quiz' || category.contentType === 'both')) });
  const rules = useQuery({ queryKey: ['platform-rules'], queryFn: () => getData<Rules>('/platform/rules') });
  const passes = useQuery({ queryKey: ['passes'], queryFn: () => getData<PassInventory>('/passes') });
  const draft = useQuery({ queryKey: ['creator-quiz', id], enabled: Boolean(id), queryFn: () => getData<{ item: any; questions: QuizQuestion[] }>(`/creator/quizzes/${id}`) });

  useEffect(() => {
    if (draft.data) {
      const item = draft.data.item;
      form.reset({ title: item.title, description: item.description ?? '', categoryId: item.categoryId ? String(item.categoryId) : null, tags: item.tags ?? [], quizType: item.quizType ?? (item.closesAt ? 'special_event' : 'general'), difficulty: item.difficulty ?? 'beginner', language: item.language ?? 'en', coverImageUrl: item.coverImageUrl ?? null, timeLimitSeconds: item.timeLimitSeconds ?? null, startsAt: item.startsAt ?? null, closesAt: item.closesAt ?? null, passingScorePercent: item.passingScorePercent ?? 60, requiredPassKey: item.requiredPassKey ?? null, creatorFundedPrize: item.creatorFundedPrize ?? 0, rewardPerWinner: item.rewardPerWinner ?? 0, prizeRules: item.prizeRules ?? [], questions: draft.data.questions.length ? draft.data.questions : [blankQuestion()] });
    }
  }, [draft.data, form]);

  const pricing = rules.data;
  const createPass = passes.data?.items.find((pass) => pass.key === 'create');
  const quizType = form.watch('quizType');
  const needsCreatePass = Boolean(pricing && ((questions?.length ?? 0) > pricing.freeQuizQuestionLimit || (quizType === 'special_event' && pricing.specialEventRequiresCreatePass)));
  const createPassAlreadyUsed = Boolean(draft.data?.item?.createPassConsumed);
  const createPassBalance = createPass?.balance ?? 0;
  const locked = isEditing && draft.data && !['draft', 'changes_requested', 'rejected', 'suspended'].includes(draft.data.item.status);
  const isLoading = (isEditing && draft.isLoading) || rules.isLoading;

  async function persist(values: QuizValues) {
    setSubmitError('');
    const payload = { ...values, categoryId: values.categoryId || null, tags: values.tags.filter(Boolean), coverImageUrl: values.coverImageUrl || null };
    try {
      const headers = !isEditing ? { 'Idempotency-Key': requestKey.current } : undefined;
      const saved = isEditing ? await putData<{ item: { id: string } }>(`/creator/quizzes/${id}`, payload, headers) : await postData<{ item: { id: string } }>('/creator/quizzes', payload, headers);
      const contentId = saved.item.id;
      if (actionRef.current === 'publish') {
        await postData(`/creator/quiz/${contentId}/publish`);
        toast('Your quiz is now published.');
      } else toast('Quiz draft saved.');
      await Promise.all([client.invalidateQueries({ queryKey: ['passes'] }), client.invalidateQueries({ queryKey: ['auth', 'me'] }), client.invalidateQueries({ queryKey: ['creator-content'] }), client.invalidateQueries({ queryKey: ['wallet'] })]);
      navigate('/app/creator-studio');
    } catch (error) {
      setSubmitError(apiErrorMessage(error));
    }
  }
  const saveAction = (action: 'save' | 'publish') => {
    actionRef.current = action;
    void form.handleSubmit(
      (values) => persist(values),
      (errors) => setSubmitError(`Please fix the quiz details before saving. ${firstErrorMessage(errors) ?? 'Check the highlighted fields.'}`),
    )();
  };
  const loadQuestionsFile = async (file?: File) => {
    if (!file) return;
    setImportError('');
    try {
      const contents = await file.text();
      setImportJson(contents);
      importQuestions(false, contents);
    } catch {
      setImportError('Could not read this file. Select a valid JSON file and try again.');
    }
  };
  const importQuestions = (replaceExisting: boolean, jsonText = importJson) => {
    setImportError('');
    try {
      const input: unknown = JSON.parse(jsonText);
      const rawQuestions = Array.isArray(input)
        ? input
        : input && typeof input === 'object' && 'questions' in input
          ? (input as { questions: unknown }).questions
          : [input];
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error('Provide a question object, a non-empty question array, or an object with a questions array.');
      }
      const imported = rawQuestions.map((question, index) => normalizeImportedQuestion(question, index));
      const currentQuestions = form.getValues('questions');
      const hasOnlyBlankStarter = currentQuestions.length === 1
        && !currentQuestions[0].prompt.trim()
        && currentQuestions[0].options.every((option) => !option.text.trim())
        && !currentQuestions[0].explanation.trim()
        && !currentQuestions[0].hint.trim();
      const total = replaceExisting || hasOnlyBlankStarter ? imported.length : currentQuestions.length + imported.length;
      const maxQuestions = Math.min(pricing?.maxQuizQuestions ?? 100, 100);
      if (total > maxQuestions) {
        throw new Error(`This quiz can have at most ${maxQuestions} questions. Importing these would make ${total}.`);
      }
      if (replaceExisting || hasOnlyBlankStarter) questionArray.replace(imported);
      else questionArray.append(imported);
      form.clearErrors('questions');
      setImportJson('');
      toast(`${imported.length} question${imported.length === 1 ? '' : 's'} ${replaceExisting ? 'imported' : 'added'}.`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not import this JSON.');
    }
  };

  if (isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (draft.isError) return <div className="page-container"><Card><EmptyState title="Quiz draft unavailable" description={apiErrorMessage(draft.error)} action={<Link to="/app/creator-studio" className="text-sm font-semibold text-brand-700">Back to Creator Studio</Link>} /></Card></div>;
  if (locked) return <div className="page-container"><Card><EmptyState title="This quiz can’t be edited right now" description="Published or in-review content must finish its review workflow before you can make changes." action={<Link to="/app/creator-studio" className="text-sm font-semibold text-brand-700">Return to Creator Studio</Link>} /></Card></div>;

  return <div className="page-container">
    <Link to="/app/creator-studio" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />Creator Studio</Link>
    <PageHeader title={isEditing ? 'Edit quiz draft' : 'Create a quiz'} description="Shape your questions, set participation rules, save a draft, and publish when it is ready." eyebrow="Creator Studio" action={<Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye size={15} />Preview</Button>} />
    {draft.data?.item?.reviewFeedback && <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"><strong className="font-semibold">Review feedback:</strong> {draft.data.item.reviewFeedback}</div>}
    {draft.data?.item?.suspensionReason && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><strong className="font-semibold">Suspended by admin:</strong> {draft.data.item.suspensionReason} Edit the quiz and publish again when ready.</div>}
    <form onSubmit={(event) => event.preventDefault()} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6"><SectionTitle title="Quiz details" step="01" /><div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Quiz title" error={form.formState.errors.title?.message} className="sm:col-span-2"><TextInput {...form.register('title')} placeholder="A clear, inviting title" /></Field>
          <Field label="Description" error={form.formState.errors.description?.message} className="sm:col-span-2"><TextArea {...form.register('description')} placeholder="What will participants learn or explore?" className="min-h-[100px]" /></Field>
          <Field label="Quiz format" hint={quizType === 'general' ? 'Always available; no event start or closing date.' : 'Scheduled event with rankings finalized after it closes.'}>
            <SelectInput value={quizType} onChange={(event) => {
              const nextType = event.target.value as QuizValues['quizType'];
              form.setValue('quizType', nextType, { shouldDirty: true });
              form.setValue('startsAt', null, { shouldDirty: true });
              form.setValue('closesAt', null, { shouldDirty: true });
              form.setValue('rewardPerWinner', 0, { shouldDirty: true });
              form.setValue('prizeRules', [], { shouldDirty: true });
            }}><option value="general">General Quiz</option><option value="special_event">Special Event Quiz</option></SelectInput>
          </Field>
          <Field label="Category"><SelectInput {...form.register('categoryId')}><option value="">Choose a category</option>{categories.data?.map((category) => <option key={category.id ?? category._id} value={category.id ?? category._id}>{category.name}</option>)}</SelectInput></Field>
          <Field label="Difficulty"><SelectInput {...form.register('difficulty')}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></SelectInput></Field>
          <Field label="Language"><TextInput {...form.register('language')} placeholder="en" /></Field>
          <Field label="Tags" hint="Separate tags with commas."><TextInput value={(form.watch('tags') ?? []).join(', ')} onChange={(event) => form.setValue('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean), { shouldDirty: true })} placeholder="science, history, fun" /></Field>
        </div></Card>

        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><SectionTitle title="Questions" step="02" /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{questionArray.fields.length} added</span></div>
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
            <Field label="Import multiple questions from JSON" hint='Paste a JSON array of question objects, or an object with a "questions" array. Each item needs question/prompt, options, and answer/correctAnswers.'>
              <TextArea value={importJson} onChange={(event) => { setImportJson(event.target.value); setImportError(''); }} placeholder="Paste your JSON here, or load an example below." className="mt-2 min-h-[150px] bg-white font-mono text-xs" />
            </Field>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Upload size={14} />Choose a .json file
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(event) => { void loadQuestionsFile(event.target.files?.[0]); event.target.value = ''; }} />
            </label>
            {importError && <p role="alert" className="mt-2 text-xs text-rose-600">{importError}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setImportJson(sampleQuestionsJson); setImportError(''); }}>Load array example</Button>
              <Button type="button" size="sm" onClick={() => importQuestions(false)} disabled={!importJson.trim()}><Upload size={14} />Add imported questions</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => importQuestions(true)} disabled={!importJson.trim()}>Replace current questions</Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Choosing a .json file imports it immediately. Pasted JSON is imported when you click Add. A blank starter question is replaced automatically.</p>
          </div>
          <div className="mt-5 space-y-4">{questionArray.fields.map((field, index) => <QuestionPanel key={field.id} index={index} form={form} total={questionArray.fields.length} move={questionArray.move} remove={questionArray.remove} insert={questionArray.insert} />)}</div>
          {form.formState.errors.questions?.message && <p className="mt-3 text-xs text-rose-600">{form.formState.errors.questions.message}</p>}
          <Button type="button" variant="outline" className="mt-4 w-full border-dashed" onClick={() => questionArray.append(blankQuestion())} disabled={questionArray.fields.length >= (pricing?.maxQuizQuestions ?? 100)}><Plus size={15} />Add a question</Button>
          {pricing && <p className="mt-3 text-[11px] leading-5 text-slate-400">Up to {pricing.freeQuizQuestionLimit} questions are free. Larger quizzes use one Create Pass. Special Events may also require one, based on the admin setting.</p>}
        </Card>
      </div>
      <aside className="space-y-5">
        <Card className="p-5"><SectionTitle title="Participation" step="03" /><div className="mt-5 space-y-4">
          <Field label="Time limit (minutes)" hint="New quizzes default to 10 minutes. Clear the field for no limit."><TextInput type="number" min="0.5" max="120" step="0.5" placeholder="No limit" value={form.watch('timeLimitSeconds') ? form.watch('timeLimitSeconds')! / 60 : ''} onChange={(event) => form.setValue('timeLimitSeconds', event.target.value ? Math.round(Number(event.target.value) * 60) : null, { shouldDirty: true })} /></Field>
          {quizType === 'special_event' && <>
            <Field label="Event starts at" error={form.formState.errors.startsAt?.message}><TextInput type="datetime-local" value={toDateTimeLocal(form.watch('startsAt'))} onChange={(event) => form.setValue('startsAt', event.target.value ? new Date(event.target.value).toISOString() : null, { shouldDirty: true })} /></Field>
            <Field label="Event closes at" hint="Attempts and final ranking close at this time." error={form.formState.errors.closesAt?.message}><TextInput type="datetime-local" value={toDateTimeLocal(form.watch('closesAt'))} onChange={(event) => form.setValue('closesAt', event.target.value ? new Date(event.target.value).toISOString() : null, { shouldDirty: true })} /></Field>
          </>}
          <Field label="Passing score" error={form.formState.errors.passingScorePercent?.message}><div className="relative"><TextInput type="number" min="0" max="100" {...form.register('passingScorePercent', { valueAsNumber: true })} className="pr-10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span></div></Field>
          <Field label="Required participation pass" hint="Participants transfer one owned pass of this type to you when they start an attempt.">
            <SelectInput value={form.watch('requiredPassKey') ?? ''} onChange={(event) => form.setValue('requiredPassKey', event.target.value || null, { shouldDirty: true })}>
              <option value="">No pass required</option>
              {pricing?.passProducts.filter((pass) => pass.kind === 'participation' && pass.active && pass.price > 0).map((pass) => <option key={pass.key} value={pass.key}>{pass.name} · {pass.price} QCoins</option>)}
            </SelectInput>
          </Field>
        </div></Card>
        <Card className="p-5"><SectionTitle title="QCoin prize" step="04" />
          <div className="mt-4 space-y-4">
            <Field label={quizType === 'general' ? 'Maximum reward pool' : 'Creator-funded prize pool'} hint="This amount is reserved from your wallet when you publish the quiz." error={form.formState.errors.creatorFundedPrize?.message}>
              <div className="relative"><TextInput type="number" min="0" {...form.register('creatorFundedPrize', { valueAsNumber: true })} className="pr-16" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">QCoins</span></div>
            </Field>
            {quizType === 'general' && form.watch('creatorFundedPrize') > 0 && <Field label="Fixed reward per passing participant" hint="Paid immediately from the reserved pool; rewards stop when the pool cannot cover the full amount." error={form.formState.errors.rewardPerWinner?.message}>
              <div className="relative"><TextInput type="number" min="1" {...form.register('rewardPerWinner', { valueAsNumber: true })} className="pr-16" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">QCoins</span></div>
            </Field>}
            {quizType === 'special_event' && form.watch('creatorFundedPrize') > 0 && <div className="space-y-3">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">Prize rank shares</p><p className="text-[10px] text-slate-400">{form.watch('prizeRules').reduce((sum, rule) => sum + (Number(rule.sharePercent) || 0), 0)}% / 100%</p></div>
              {form.watch('prizeRules').map((rule, index) => <div key={rule.rank} className="flex items-end gap-2">
                <Field label={`Rank ${rule.rank}`} className="flex-1">
                  <TextInput disabled value={`Place ${rule.rank}`} />
                </Field>
                <Field label="Share (%)" className="w-24">
                  <TextInput type="number" min="1" max="100" {...form.register(`prizeRules.${index}.sharePercent`, { valueAsNumber: true })} />
                </Field>
                <Button type="button" size="sm" variant="ghost" aria-label={`Remove rank ${rule.rank}`} onClick={() => form.setValue('prizeRules', form.getValues('prizeRules').filter((_, i) => i !== index).map((entry, i) => ({ ...entry, rank: i + 1 })), { shouldDirty: true })}><X size={15} /></Button>
              </div>)}
              <Button type="button" size="sm" variant="outline" disabled={form.watch('prizeRules').length >= 5} onClick={() => form.setValue('prizeRules', [...form.getValues('prizeRules'), { rank: form.getValues('prizeRules').length + 1, sharePercent: 10 }], { shouldDirty: true })}><Plus size={14} />Add rank</Button>
              {form.formState.errors.prizeRules?.message && <p className="text-xs text-rose-600">{form.formState.errors.prizeRules.message}</p>}
            </div>}
            {form.watch('creatorFundedPrize') > (user?.walletBalance ?? 0) && <p className="text-xs text-rose-600">Your wallet balance is below the configured prize. Add QCoins before publishing.</p>}
          </div>
        </Card>
        {needsCreatePass && !createPassAlreadyUsed && <Card className="border-amber-200 bg-amber-50/70 p-4">
          <h3 className="text-xs font-bold text-amber-900">Create Pass required</h3>
          <p className="mt-1 text-xs leading-5 text-amber-800">This quiz is over the free question limit or is a Special Event that requires a Creator Pass. One pass covers the whole quiz.</p>
          <p className="mt-2 text-xs font-semibold text-amber-900">Available: {createPassBalance} · Price: {createPass?.price ?? 0} QCoins</p>
          {createPassBalance === 0 && <Link to="/app/wallet" className="mt-2 inline-block text-xs font-bold text-brand-700">Buy a Create Pass in your wallet</Link>}
        </Card>}
        {passes.isError && <p role="alert" className="text-xs text-rose-600">Pass balances could not be loaded: {apiErrorMessage(passes.error)}</p>}
        <Card className="p-5"><div className="flex items-start gap-2.5"><CircleHelpIcon /><div><h3 className="text-xs font-bold text-ink">Review checklist</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Make sure every question has a valid answer key. Your correct answers stay private and are only returned to the creator and eligible result view.</p></div></div></Card>
        <div className="space-y-2.5">
          {submitError && <p className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs text-rose-700">{submitError}</p>}
          <Button type="button" className="w-full" disabled={form.formState.isSubmitting || questionArray.fields.length === 0} onClick={() => saveAction('publish')}>{form.formState.isSubmitting ? actionRef.current === 'publish' ? 'Publishing…' : 'Saving…' : 'Publish quiz'}<FileCheck2 size={16} /></Button>
          <Button type="button" variant="outline" className="w-full" disabled={form.formState.isSubmitting} onClick={() => saveAction('save')}>Save as draft</Button>
          <p className="text-center text-[10px] leading-4 text-slate-400">You can edit your draft and submit it whenever it’s ready.</p>
        </div>
      </aside>
    </form>
    <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Private quiz preview" footer={<Button onClick={() => setPreviewOpen(false)}>Close preview</Button>}>
      <p className="mb-4 text-xs leading-5 text-slate-500">Only you can see this preview. Correct options are marked for creator review.</p>
      <div className="max-h-[55vh] space-y-4 overflow-y-auto">{questions?.map((question, index) => <div key={`${index}-${question.prompt}`} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-400">Question {index + 1} · {question.points} pt</p><p className="mt-2 text-sm font-semibold text-ink">{question.prompt || 'Your question prompt'}</p><div className="mt-3 space-y-2">{question.options.map((option) => <div key={option.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${question.correctAnswers.includes(option.key) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'}`}>{question.correctAnswers.includes(option.key) && <Check size={13} />}{option.text || 'Answer option'}</div>)}</div>{(question.type === 'fill_blank' || question.type === 'short_answer') && <p className="mt-2 text-xs text-emerald-700">Accepted answers: {question.correctAnswers.join(', ') || 'Not set'}</p>}</div>)}</div>
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
