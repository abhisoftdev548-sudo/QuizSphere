import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Gift, History, WalletCards, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, PageSkeleton } from '../components/ui';
import { apiErrorMessage, getData, postData } from '../services/api';
import { useToast } from '../context/ToastContext';

type Wallet = { balance: number; totalEarned: number; totalSpent: number; signupBonus: number };
type Transaction = { id: string; date: string; type: string; amount: number; relatedType: string | null; relatedId: string | null; description: string; status: string };
type PassProduct = { key: string; name: string; kind: 'create' | 'participation'; price: number; buybackPrice: number; active: boolean; balance: number };
export default function WalletPage() {
  const [page, setPage] = useState(1);
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => getData<Wallet>('/users/me/wallet') });
  const transactions = useQuery({ queryKey: ['wallet-transactions', page], queryFn: () => getData<{ items: Transaction[]; pagination: { page: number; pages: number; total: number } }>('/users/me/wallet/transactions', { page, limit: 20 }) });
  const passes = useQuery({ queryKey: ['passes'], queryFn: () => getData<{ items: PassProduct[] }>('/passes') });
  const client = useQueryClient();
  const { toast } = useToast();
  const purchaseKey = useRef<string | null>(null);
  const sellOperation = useRef<{ passKey: string; requestKey: string } | null>(null);
  const purchase = useMutation({
    mutationFn: (passKey: string) => postData<{ passName: string; paid: number }>(`/passes/${passKey}/purchase`, {}, { 'Idempotency-Key': purchaseKey.current ?? crypto.randomUUID() }),
    onSuccess: async (result) => {
      purchaseKey.current = null;
      toast(`${result.passName} purchased for ${result.paid} QCoins.`);
      await Promise.all([client.invalidateQueries({ queryKey: ['passes'] }), client.invalidateQueries({ queryKey: ['wallet'] }), client.invalidateQueries({ queryKey: ['wallet-transactions'] }), client.invalidateQueries({ queryKey: ['auth', 'me'] })]);
    },
  });
  const sellPass = useMutation({
    mutationFn: (passKey: string) => {
      if (sellOperation.current?.passKey !== passKey) throw new Error('Pass sale operation changed. Please try again.');
      return postData<{ passName: string; paid: number }>('/passes/sell', { passKey }, { 'Idempotency-Key': sellOperation.current.requestKey });
    },
    onSuccess: async (result) => {
      sellOperation.current = null;
      toast(`${result.passName} sold to QuizSphere for ${result.paid} QCoins.`);
      await Promise.all([client.invalidateQueries({ queryKey: ['passes'] }), client.invalidateQueries({ queryKey: ['wallet'] }), client.invalidateQueries({ queryKey: ['wallet-transactions'] }), client.invalidateQueries({ queryKey: ['auth', 'me'] })]);
    },
  });
  if (wallet.isLoading) return <div className="page-container"><PageSkeleton /></div>;
  if (wallet.isError || !wallet.data) return <div className="page-container"><Card><EmptyState title="Wallet unavailable" description={apiErrorMessage(wallet.error)} action={<Button variant="outline" onClick={() => void wallet.refetch()}>Try again</Button>} /></Card></div>;
  const data = wallet.data;
  return <div className="page-container">
    <PageHeader title="QCoin Wallet" description="Review your balance and every recorded QCoin movement." eyebrow="Your economy" />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
      <Card className="relative overflow-hidden bg-[linear-gradient(120deg,#291465_0%,#6d3ff0_100%)] p-5 text-white sm:p-7"><div className="absolute -right-10 -top-12 h-44 w-44 rounded-full border border-white/10" /><div className="absolute -right-2 top-5 h-28 w-28 rounded-full border border-white/10" /><div className="relative"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-xs font-semibold text-white/70"><WalletCards size={15} />Available balance</span><Zap size={18} className="text-brand-200" fill="currentColor" /></div><p className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{data.balance.toLocaleString()}<span className="ml-2 text-sm font-semibold text-white/70">QCoins</span></p><p className="mt-3 text-xs text-white/65">QCoins are virtual credits for participation and eligible platform features. They have no cash value and cannot be withdrawn.</p><div className="mt-6 flex flex-wrap gap-3"><div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5"><p className="text-[10px] uppercase tracking-wider text-white/55">Total earned</p><p className="mt-1 text-sm font-bold">{data.totalEarned.toLocaleString()}</p></div><div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5"><p className="text-[10px] uppercase tracking-wider text-white/55">Total spent</p><p className="mt-1 text-sm font-bold">{data.totalSpent.toLocaleString()}</p></div><div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5"><p className="text-[10px] uppercase tracking-wider text-white/55">Signup bonus</p><p className="mt-1 text-sm font-bold">{data.signupBonus.toLocaleString()}</p></div></div></div></Card>
      <Card className="p-5"><div className="flex items-center gap-2"><CircleDollarSign size={17} className="text-brand-600" /><h2 className="text-sm font-bold text-ink">How QCoins work</h2></div><div className="mt-4 space-y-3.5"><WalletNote icon={Gift} title="Earn" text="Signup bonuses and eligible rewards are credited through the platform ledger." /><WalletNote icon={ArrowUpRight} title="Spend" text="Some quizzes, polls, or creator features may have a clearly disclosed fee." /><WalletNote icon={History} title="Traceable" text="Each balance change has a dated transaction entry. History is not silently edited." /></div><Link to="/app/explore" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800">Explore activities<ArrowUpRight size={14} /></Link></Card>
    </div>

    <Card className="mt-6 p-5 sm:p-6">
      <div className="mb-4"><h2 className="text-sm font-bold text-ink">Passes</h2><p className="mt-1 text-xs leading-5 text-slate-500">Buy passes with QCoins. A required participation pass transfers to the quiz creator when you start that quiz.</p></div>
      {passes.isLoading ? <div className="h-20 animate-pulse rounded-xl bg-slate-100" /> : passes.isError ? <EmptyState title="Passes unavailable" description={apiErrorMessage(passes.error)} action={<Button variant="outline" onClick={() => void passes.refetch()}>Try again</Button>} /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {passes.data?.items.map((pass) => <div key={pass.key} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-ink">{pass.name}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{pass.kind === 'create' ? 'Needed above the free question limit and for Special Events when enabled by admin.' : 'Transferred to the quiz creator when you start a quiz requiring this pass.'}</p></div><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">{pass.balance} owned</span></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-ink">{pass.price.toLocaleString()} QCoins</p><div className="flex gap-2"><Button size="sm" disabled={!pass.active || pass.price <= 0 || data.balance < pass.price || purchase.isPending} onClick={() => { purchaseKey.current ??= crypto.randomUUID(); purchase.mutate(pass.key); }}>{pass.price <= 0 ? 'Not priced' : data.balance < pass.price ? 'Not enough QCoins' : purchase.isPending ? 'Buying…' : 'Buy pass'}</Button>{pass.balance > 0 && <Button size="sm" variant="outline" disabled={pass.buybackPrice <= 0 || sellPass.isPending} onClick={() => { if (pass.buybackPrice > 0 && sellOperation.current?.passKey !== pass.key) sellOperation.current = { passKey: pass.key, requestKey: crypto.randomUUID() }; if (pass.buybackPrice > 0) sellPass.mutate(pass.key); }}>{pass.buybackPrice > 0 ? `Sell · ${pass.buybackPrice} QCoins` : 'Sell unavailable'}</Button>}</div></div>
          {pass.balance > 0 && pass.buybackPrice <= 0 && <p className="mt-2 text-[11px] text-slate-500">QuizSphere buy-back price has not been set by an admin yet.</p>}
          {purchase.isError && purchase.variables === pass.key && <p role="alert" className="mt-2 text-[11px] text-rose-600">{apiErrorMessage(purchase.error)}</p>}
          {sellPass.isError && sellPass.variables === pass.key && <p role="alert" className="mt-2 text-[11px] text-rose-600">{apiErrorMessage(sellPass.error)}</p>}
        </div>)}
      </div>}
    </Card>

    <Card className="mt-6 overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-ink">Transaction history</h2><p className="mt-1 text-xs text-slate-400">Immutable record of wallet credits and debits</p></div><History size={17} className="text-slate-400" /></div>
      {transactions.isLoading ? <div className="space-y-3 p-5"><div className="h-9 animate-pulse rounded-lg bg-slate-100" /><div className="h-9 animate-pulse rounded-lg bg-slate-100" /><div className="h-9 animate-pulse rounded-lg bg-slate-100" /></div> : transactions.isError ? <EmptyState title="Could not load transactions" description={apiErrorMessage(transactions.error)} action={<Button variant="outline" onClick={() => void transactions.refetch()}>Try again</Button>} /> : !transactions.data?.items.length ? <EmptyState title="No transactions yet" description="When QCoins are awarded or spent, each movement will be recorded here." /> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[750px] border-collapse text-left"><thead><tr className="table-head"><th className="px-5 py-3">Transaction</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody>{transactions.data.items.map((item) => <tr key={item.id} className="hover:bg-slate-50/70"><td className="max-w-[330px] px-5 py-4"><p className="truncate text-sm font-semibold text-ink">{item.description}</p><p className="mt-1 truncate text-[10px] text-slate-400">ID {item.id}</p></td><td className="table-cell whitespace-nowrap">{new Date(item.date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td className="table-cell">{formatType(item.type)}</td><td className="table-cell"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{item.status}</span></td><td className={`px-5 py-3.5 text-right text-sm font-bold ${item.amount > 0 ? 'text-emerald-700' : 'text-rose-600'}`}><span className="inline-flex items-center justify-end gap-1">{item.amount > 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}</span></td></tr>)}</tbody></table></div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-xs text-slate-400">{transactions.data.pagination.total} transactions</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page >= transactions.data.pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
      </>}
    </Card>
  </div>;
}
function WalletNote({ icon: Icon, title, text }: { icon: typeof Gift; title: string; text: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon size={15} /></span><div><p className="text-xs font-semibold text-ink">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p></div></div>; }
function formatType(type: string) { return type.replaceAll('_', ' ').replace(/\w/g, (letter) => letter.toUpperCase()); }
