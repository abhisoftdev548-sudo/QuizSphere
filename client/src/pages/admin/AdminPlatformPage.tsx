import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm as useCategoryForm } from 'react-hook-form';
import { Layers3, Plus, Save, SlidersHorizontal, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Card, EmptyState, Field, Modal, PageHeader, PageSkeleton, SelectInput, TextArea, TextInput } from '../../components/ui';
import { apiErrorMessage, getData, patchData, postData, putData } from '../../services/api';
import { useToast } from '../../context/ToastContext';

type PassProduct = { key: 'create' | 'vip' | 'pro' | 'legend' | 'premium'; name: string; kind: 'create' | 'participation'; price: number; buybackPrice: number; active: boolean };
type Config = { signupBonus: number; freeQuizQuestionLimit: number; specialEventRequiresCreatePass: boolean; maxQuizEntryFee: number; maxPollVoteFee: number; maxQuizQuestions: number; passProducts: PassProduct[] };
type Category = { _id: string; name: string; slug: string; contentType: 'quiz' | 'poll' | 'both'; description: string; isActive: boolean };
const configSchema = z.object({
  signupBonus: z.number().int().min(0),
  freeQuizQuestionLimit: z.number().int().min(1),
  specialEventRequiresCreatePass: z.boolean(),
  maxQuizEntryFee: z.number().int().min(0),
  maxPollVoteFee: z.number().int().min(0),
  maxQuizQuestions: z.number().int().min(1),
  passProducts: z.array(z.object({
    key: z.enum(['create', 'vip', 'pro', 'legend', 'premium']),
    name: z.string().trim().min(2).max(40),
    kind: z.enum(['create', 'participation']),
    price: z.number().int().min(0).max(100000),
    buybackPrice: z.number().int().min(0).max(100000),
    active: z.boolean(),
  })),
}).superRefine((value, context) => {
  if (value.freeQuizQuestionLimit > value.maxQuizQuestions) context.addIssue({ code: z.ZodIssueCode.custom, path: ['freeQuizQuestionLimit'], message: 'Free limit cannot exceed the maximum question count.' });
});
type ConfigValues = z.infer<typeof configSchema>;
const categorySchema = z.object({ name: z.string().trim().min(2).max(60), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), contentType: z.enum(['quiz', 'poll', 'both']), description: z.string().max(200) });
type CategoryValues = z.infer<typeof categorySchema>;

export default function AdminPlatformPage() {
  const client = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<'pricing' | 'categories'>('pricing');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const configQuery = useQuery({ queryKey: ['admin-config'], queryFn: () => getData<{ config: Config }>('/admin/config').then((value) => value.config) });
  const categoryQuery = useQuery({ queryKey: ['admin-categories'], queryFn: () => getData<{ items: Category[] }>('/admin/categories').then((value) => value.items) });
  const form = useForm<ConfigValues>({ resolver: zodResolver(configSchema), defaultValues: { signupBonus: 100, freeQuizQuestionLimit: 10, specialEventRequiresCreatePass: true, maxQuizEntryFee: 500, maxPollVoteFee: 100, maxQuizQuestions: 50, passProducts: [] } });
  const categoryForm = useCategoryForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: { name: '', slug: '', contentType: 'both', description: '' } });
  useEffect(() => { if (configQuery.data) form.reset(configQuery.data); }, [configQuery.data, form]);
  const saveConfig = useMutation({ mutationFn: (value: ConfigValues) => putData('/admin/config', value), onSuccess: async () => { toast('Platform configuration saved.'); await Promise.all([client.invalidateQueries({ queryKey: ['admin-config'] }), client.invalidateQueries({ queryKey: ['platform-rules'] })]); } });
  const addCategory = useMutation({ mutationFn: (value: CategoryValues) => postData('/admin/categories', value), onSuccess: async () => { toast('Category created.'); setCategoryOpen(false); categoryForm.reset(); await Promise.all([client.invalidateQueries({ queryKey: ['admin-categories'] }), client.invalidateQueries({ queryKey: ['categories'] })]); } });
  const toggleCategory = useMutation({ mutationFn: ({ category, isActive }: { category: Category; isActive: boolean }) => patchData(`/admin/categories/${category._id}`, { isActive }), onSuccess: async () => { toast('Category status updated.'); await Promise.all([client.invalidateQueries({ queryKey: ['admin-categories'] }), client.invalidateQueries({ queryKey: ['categories'] })]); } });

  if (configQuery.isLoading || categoryQuery.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (configQuery.isError || categoryQuery.isError || !configQuery.data || !categoryQuery.data) return <div className="page-container"><Card><EmptyState title="Platform setup unavailable" description={apiErrorMessage(configQuery.error ?? categoryQuery.error)} action={<Button variant="outline" onClick={() => { void configQuery.refetch(); void categoryQuery.refetch(); }}>Try again</Button>} /></Card></div>;
  return <div className="page-container"><PageHeader title="Platform Setup" description="Manage categories, QCoin pricing, and participation limits from the server-backed configuration." eyebrow="Business rules" />
    <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 sm:w-fit" role="tablist" aria-label="Platform settings"><button role="tab" aria-selected={tab === 'pricing'} onClick={() => setTab('pricing')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'pricing' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><SlidersHorizontal size={14} />Pricing & limits</button><button role="tab" aria-selected={tab === 'categories'} onClick={() => setTab('categories')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'categories' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Layers3 size={14} />Categories</button></div>
    {tab === 'pricing' ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <Card className="p-5 sm:p-6"><div className="mb-5"><h2 className="text-sm font-bold text-ink">QCoin economy rules</h2><p className="mt-1 text-xs text-slate-400">Backend values are authoritative. Existing ledger entries are never changed when pricing updates.</p></div><form onSubmit={form.handleSubmit((values) => saveConfig.mutate(values))} className="grid gap-4 sm:grid-cols-2">
        <Field label="Signup bonus (QCoins)" error={form.formState.errors.signupBonus?.message}><TextInput type="number" min="0" {...form.register('signupBonus', { valueAsNumber: true })} /></Field>
        <Field label="Free quiz question limit" error={form.formState.errors.freeQuizQuestionLimit?.message}><TextInput type="number" min="1" {...form.register('freeQuizQuestionLimit', { valueAsNumber: true })} /></Field>
        <label className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-xs font-medium text-slate-700 sm:col-span-2"><input type="checkbox" {...form.register('specialEventRequiresCreatePass')} />Require a Creator Pass for Special Event quizzes</label>
        <Field label="Maximum questions per quiz"><TextInput type="number" min="1" max="100" {...form.register('maxQuizQuestions', { valueAsNumber: true })} /></Field>
        <Field label="Maximum legacy quiz entry fee"><TextInput type="number" min="0" {...form.register('maxQuizEntryFee', { valueAsNumber: true })} /></Field>
        <Field label="Maximum poll voting fee"><TextInput type="number" min="0" {...form.register('maxPollVoteFee', { valueAsNumber: true })} /></Field>
        <div className="sm:col-span-2">
          <h3 className="mb-1 text-xs font-bold text-ink">Pass pricing</h3>
          <p className="mb-3 text-[11px] leading-5 text-slate-500">Set the QCoin purchase price and the fixed amount QuizSphere pays users when they sell a pass back. A zero price disables that action.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.watch('passProducts').map((product, index) => <div key={product.key} className="grid grid-cols-[minmax(0,1fr)_100px_110px_auto] items-end gap-2 rounded-xl border border-slate-100 p-3">
              <Field label={product.kind === 'create' ? 'Creator pass name' : 'Participation pass name'}>
                <TextInput {...form.register(`passProducts.${index}.name`)} />
              </Field>
              <Field label="Buy price">
                <TextInput type="number" min="0" {...form.register(`passProducts.${index}.price`, { valueAsNumber: true })} />
              </Field>
              <Field label="Sell-back price">
                <TextInput type="number" min="0" {...form.register(`passProducts.${index}.buybackPrice`, { valueAsNumber: true })} />
              </Field>
              <label className="flex h-10 items-center gap-1.5 text-[11px] font-medium text-slate-600">
                <input type="checkbox" {...form.register(`passProducts.${index}.active`)} />
                Active
              </label>
            </div>)}
          </div>
        </div>
        {saveConfig.isError && <p className="text-xs text-rose-600 sm:col-span-2">{apiErrorMessage(saveConfig.error)}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><p className="text-[11px] leading-5 text-slate-400">Pricing changes apply to new creation actions and future participation. Already recorded transactions remain unchanged.</p><Button type="submit" disabled={saveConfig.isPending}><Save size={14} />{saveConfig.isPending ? 'Saving…' : 'Save configuration'}</Button></div>
      </form></Card>
      <Card className="h-fit border-blue-100 bg-blue-50/60 p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600"><SlidersHorizontal size={17} /></span><div><h3 className="text-sm font-bold text-blue-950">Pricing behavior</h3><p className="mt-2 text-xs leading-5 text-blue-900/70">Quizzes over the free question limit or requiring a participation pass consume one Create Pass, regardless of quiz size. Each paid pass is bought with QCoins and charged once.</p><p className="mt-3 text-xs leading-5 text-blue-900/70">Signup bonus changes apply only to eligible accounts registered after the policy update. Existing balances and transactions are not rewritten.</p></div></div></Card>
    </div> : <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-ink">Content categories</h2><p className="mt-1 text-xs text-slate-400">Categories are optional and can be enabled for quizzes, polls, or both.</p></div><Button onClick={() => { categoryForm.reset({ name: '', slug: '', contentType: 'both', description: '' }); setCategoryError(''); setCategoryOpen(true); }}><Plus size={15} />Add category</Button></div>{categoryQuery.data.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left"><thead><tr className="table-head"><th className="px-5 py-3">Category</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Content type</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody>{categoryQuery.data.map((category) => <tr key={category._id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="text-sm font-semibold text-ink">{category.name}</p><p className="mt-1 text-xs text-slate-400">{category.description}</p></td><td className="table-cell font-mono text-xs">{category.slug}</td><td className="table-cell capitalize">{category.contentType}</td><td className="table-cell"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{category.isActive ? 'Active' : 'Disabled'}</span></td><td className="px-5 py-3.5 text-right"><Button size="sm" variant="outline" onClick={() => toggleCategory.mutate({ category, isActive: !category.isActive })} disabled={toggleCategory.isPending}>{category.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}{category.isActive ? 'Disable' : 'Enable'}</Button></td></tr>)}</tbody></table></div> : <EmptyState icon={Layers3} title="No categories configured" description="Create the first category to organize published quizzes and polls." />}</Card>}
    <Modal open={categoryOpen} onClose={() => !addCategory.isPending && setCategoryOpen(false)} title="Create a category" footer={<><Button variant="outline" onClick={() => setCategoryOpen(false)} disabled={addCategory.isPending}>Cancel</Button><Button disabled={addCategory.isPending} onClick={categoryForm.handleSubmit((values) => { setCategoryError(''); addCategory.mutate(values, { onError: (error) => setCategoryError(apiErrorMessage(error)) }); })}><Plus size={14} />Create category</Button></>}><div className="space-y-3"><Field label="Category name" error={categoryForm.formState.errors.name?.message}><TextInput {...categoryForm.register('name')} onChange={(event) => { categoryForm.setValue('name', event.target.value); if (!categoryForm.getValues('slug')) categoryForm.setValue('slug', slugify(event.target.value)); }} placeholder="e.g. Science" /></Field><Field label="URL slug" error={categoryForm.formState.errors.slug?.message}><TextInput {...categoryForm.register('slug')} placeholder="science" /></Field><Field label="Content type"><SelectInput {...categoryForm.register('contentType')}><option value="both">Quizzes and polls</option><option value="quiz">Quizzes</option><option value="poll">Polls</option></SelectInput></Field><Field label="Description"><TextArea {...categoryForm.register('description')} placeholder="Optional description" /></Field>{categoryError && <p className="text-xs text-rose-600">{categoryError}</p>}</div></Modal>
  </div>;
}
function slugify(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
