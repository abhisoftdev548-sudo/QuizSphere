import { useEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowDown, ArrowUp, FileCheck2, Plus, Trash2, Vote } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, EmptyState, Field, PageHeader, PageSkeleton, SelectInput, TextArea, TextInput } from '../components/ui';
import { apiErrorMessage, getData, postData, putData } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Category } from '../types/api';

type PollValues = { title: string; description: string; categoryId: string | null; tags: string[]; options: Array<{ text: string }>; allowMultiple: boolean; anonymous: boolean; resultVisibility: 'after_vote' | 'after_close' | 'public'; allowVoteChange: boolean; startsAt: string; closesAt: string; votingFee: number };
const pollSchema = z.object({
  title: z.string().trim().min(4, 'Title needs at least 4 characters.').max(160), description: z.string().trim().max(2000),
  categoryId: z.string().nullable(), tags: z.array(z.string()), options: z.array(z.object({ text: z.string().trim().min(1, 'Option text is required.').max(160) })).min(2, 'Add at least two options.').max(10, 'A poll may have up to 10 options.'),
  allowMultiple: z.boolean(), anonymous: z.boolean(), resultVisibility: z.enum(['after_vote', 'after_close', 'public']), allowVoteChange: z.boolean(), startsAt: z.string(), closesAt: z.string(), votingFee: z.number().int().min(0),
}).superRefine((value, context) => {
  if (new Set(value.options.map((option) => option.text.trim().toLocaleLowerCase())).size !== value.options.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Poll options must be unique.' });
  if (value.startsAt && value.closesAt && new Date(value.closesAt) <= new Date(value.startsAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['closesAt'], message: 'Closing time must be after the start time.' });
});
type Rules = { maxPollVoteFee: number };

export default function PollEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const requestKey = useRef(crypto.randomUUID());
  const actionRef = useRef<'save' | 'submit'>('save');
  const form = useForm<PollValues>({ resolver: zodResolver(pollSchema), defaultValues: { title: '', description: '', categoryId: null, tags: [], options: [{ text: '' }, { text: '' }], allowMultiple: false, anonymous: true, resultVisibility: 'after_vote', allowVoteChange: false, startsAt: '', closesAt: '', votingFee: 0 } });
  const optionsArray = useFieldArray({ control: form.control, name: 'options' });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<{ items: Category[] }>('/explore/categories').then((result) => result.items.filter((category) => category.contentType === 'poll' || category.contentType === 'both')) });
  const rules = useQuery({ queryKey: ['platform-rules'], queryFn: () => getData<Rules>('/platform/rules') });
  const draft = useQuery({ queryKey: ['creator-poll', id], enabled: Boolean(id), queryFn: () => getData<{ item: any }>(`/creator/polls/${id}`) });

  useEffect(() => {
    if (draft.data?.item) {
      const item = draft.data.item;
      form.reset({ title: item.title, description: item.description ?? '', categoryId: item.categoryId ? String(item.categoryId) : null, tags: item.tags ?? [], options: item.options?.map((option: { text: string }) => ({ text: option.text })) ?? [{ text: '' }, { text: '' }], allowMultiple: item.allowMultiple, anonymous: item.anonymous, resultVisibility: item.resultVisibility, allowVoteChange: item.allowVoteChange, startsAt: toDateInput(item.startsAt), closesAt: toDateInput(item.closesAt), votingFee: item.votingFee ?? 0 });
    }
  }, [draft.data, form]);
  const isLoading = (editing && draft.isLoading) || rules.isLoading;
  const locked = editing && draft.data && !['draft', 'changes_requested', 'rejected'].includes(draft.data.item.status);

  async function persist(values: PollValues) {
    const payload = {
      ...values,
      categoryId: values.categoryId || null,
      tags: values.tags.filter(Boolean),
      options: values.options.map((option) => option.text.trim()),
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
      closesAt: values.closesAt ? new Date(values.closesAt).toISOString() : null,
    };
    try {
      const saved = editing ? await putData<{ item: { id: string } }>(`/creator/polls/${id}`, payload) : await postData<{ item: { id: string } }>('/creator/polls', payload, { 'Idempotency-Key': requestKey.current });
      if (actionRef.current === 'submit') {
        await postData(`/creator/polls/${saved.item.id}/submit`);
        toast('Poll submitted for administrator review.');
      } else toast('Poll draft saved.');
      navigate('/app/creator-studio');
    } catch (error) { form.setError('root', { message: apiErrorMessage(error) }); }
  }
  const saveAction = (action: 'save' | 'submit') => { actionRef.current = action; void form.handleSubmit(persist)(); };

  if (isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (draft.isError) return <div className="page-container"><Card><EmptyState title="Poll draft unavailable" description={apiErrorMessage(draft.error)} action={<Link to="/app/creator-studio" className="text-sm font-semibold text-brand-700">Back to Creator Studio</Link>} /></Card></div>;
  if (locked) return <div className="page-container"><Card><EmptyState title="This poll can’t be edited right now" description="Published or in-review content must finish its review workflow before changes can be made." action={<Link to="/app/creator-studio" className="text-sm font-semibold text-brand-700">Return to Creator Studio</Link>} /></Card></div>;

  return <div className="page-container">
    <Link to="/app/creator-studio" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />Creator Studio</Link>
    <PageHeader title={editing ? 'Edit poll draft' : 'Create a poll'} description="Ask a clear question, set your voting rules, and submit when everything is ready." eyebrow="Creator Studio" />
    {draft.data?.item?.reviewFeedback && <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"><strong className="font-semibold">Review feedback:</strong> {draft.data.item.reviewFeedback}</div>}
    <form onSubmit={(event) => event.preventDefault()} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6"><h2 className="text-sm font-bold text-ink">Poll question</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Question or title" error={form.formState.errors.title?.message} className="sm:col-span-2"><TextInput {...form.register('title')} placeholder="What would you like to ask?" /></Field>
          <Field label="Description" error={form.formState.errors.description?.message} className="sm:col-span-2"><TextArea {...form.register('description')} placeholder="Add context or instructions for voters." /></Field>
          <Field label="Category" hint={categories.isLoading ? 'Loading available categories…' : categories.isError ? apiErrorMessage(categories.error) : categories.data?.length ? 'Choose a category for this poll.' : 'No poll categories are configured yet.'}><SelectInput {...form.register('categoryId')} disabled={categories.isLoading || categories.isError || !categories.data?.length}><option value="">{categories.isError ? 'Categories unavailable' : categories.data?.length ? 'Choose a category' : 'No categories available'}</option>{categories.data?.map((category) => <option key={category.id ?? category._id} value={category.id ?? category._id}>{category.name}</option>)}</SelectInput></Field>
          <Field label="Tags" hint="Separate tags with commas."><TextInput value={(form.watch('tags') ?? []).join(', ')} onChange={(event) => form.setValue('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean), { shouldDirty: true })} placeholder="community, feedback" /></Field>
        </div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-ink">Answer options</h2><span className="text-xs text-slate-400">{optionsArray.fields.length} / 10</span></div><div className="mt-4 space-y-2.5">{optionsArray.fields.map((field, index) => <div key={field.id} className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">{String.fromCharCode(65 + index)}</span><TextInput {...form.register(`options.${index}.text` as const)} placeholder={`Option ${index + 1}`} /><button type="button" onClick={() => optionsArray.move(index, Math.max(0, index - 1))} disabled={index === 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30" aria-label="Move option up"><ArrowUp size={14} /></button><button type="button" onClick={() => optionsArray.move(index, Math.min(optionsArray.fields.length - 1, index + 1))} disabled={index === optionsArray.fields.length - 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30" aria-label="Move option down"><ArrowDown size={14} /></button><button type="button" onClick={() => optionsArray.remove(index)} disabled={optionsArray.fields.length <= 2} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" aria-label="Remove poll option"><Trash2 size={15} /></button></div>)}</div>{form.formState.errors.options?.message && <p className="mt-2 text-xs text-rose-600">{form.formState.errors.options.message}</p>}<Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => optionsArray.append({ text: '' })} disabled={optionsArray.fields.length >= 10}><Plus size={14} />Add option</Button></Card>
      </div>
      <aside className="space-y-5">
        <Card className="p-5"><h2 className="text-sm font-bold text-ink">Voting rules</h2><div className="mt-4 space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" {...form.register('allowMultiple')} className="mt-0.5 accent-brand-600" /><span><strong className="block text-xs font-semibold text-ink">Allow multiple selections</strong><small className="mt-1 block text-[11px] leading-4 text-slate-400">Voters may choose more than one option.</small></span></label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" {...form.register('anonymous')} className="mt-0.5 accent-brand-600" /><span><strong className="block text-xs font-semibold text-ink">Anonymous voting</strong><small className="mt-1 block text-[11px] leading-4 text-slate-400">Voter identities are not shown in public results.</small></span></label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" {...form.register('allowVoteChange')} className="mt-0.5 accent-brand-600" /><span><strong className="block text-xs font-semibold text-ink">Allow vote changes</strong><small className="mt-1 block text-[11px] leading-4 text-slate-400">A voter may update their selection before closing.</small></span></label>
          <Field label="Results visibility"><SelectInput {...form.register('resultVisibility')}><option value="after_vote">After a voter participates</option><option value="after_close">After the poll closes</option><option value="public">Public while open</option></SelectInput></Field>
          <Field label="Voting fee" hint={rules.data ? `Maximum ${rules.data.maxPollVoteFee} QCoins under current policy.` : 'Fee is limited by platform policy.'}><div className="relative"><TextInput type="number" min="0" max={rules.data?.maxPollVoteFee} {...form.register('votingFee', { valueAsNumber: true })} className="pr-16" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">QCoins</span></div></Field>
        </div></Card>
        <Card className="p-5"><h2 className="text-sm font-bold text-ink">Availability</h2><div className="mt-4 space-y-4"><Field label="Starts at"><TextInput type="datetime-local" {...form.register('startsAt')} /></Field><Field label="Closes at" error={form.formState.errors.closesAt?.message}><TextInput type="datetime-local" {...form.register('closesAt')} /></Field></div></Card>
        <Card className="p-4"><div className="flex gap-2.5"><Vote size={17} className="mt-0.5 shrink-0 text-brand-600" /><p className="text-xs leading-5 text-slate-500">Polls do not have objectively correct answers. Rewards are not enabled by this editor; voting fees and result visibility are shown to participants before they vote.</p></div></Card>
        {form.formState.errors.root && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{form.formState.errors.root.message}</p>}
        <div className="space-y-2.5"><Button type="button" className="w-full" disabled={form.formState.isSubmitting} onClick={() => saveAction('submit')}>{form.formState.isSubmitting ? 'Saving…' : 'Submit for review'}<FileCheck2 size={16} /></Button><Button type="button" variant="outline" className="w-full" disabled={form.formState.isSubmitting} onClick={() => saveAction('save')}>Save as draft</Button><p className="text-center text-[10px] leading-4 text-slate-400">Only reviewed and approved polls can be published.</p></div>
      </aside>
    </form>
  </div>;
}
function toDateInput(value: string | null | undefined) { if (!value) return ''; const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); }
