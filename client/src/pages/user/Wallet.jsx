import React, { useEffect, useState } from 'react';
import { Coins, TrendingUp, Gift, ArrowUpRight, ArrowDownRight, Trophy, BarChart3, Star, Flame, BookOpen, Vote } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import api from '../../lib/api';

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [earnInfo, setEarnInfo] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, earnRes] = await Promise.all([
          api.get('/qcoins/wallet'),
          api.get('/qcoins/earn-info')
        ]);
        setWallet(walletRes.data.data);
        setTransactions(walletRes.data.data.transactions);
        setEarnInfo(earnRes.data.data.earnMethods);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTx = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const iconMap = {
    trophy: Trophy,
    star: Star,
    flame: Flame,
    book: BookOpen,
    vote: Vote
  };

  if (loading) return <div className="p-8 text-center">Loading wallet...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="page-title">QCoin Wallet</h1>
        <p className="text-[14px] text-textSecondary mt-1">QCoins can only be earned by creating and participating — no purchases.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-primary to-[#4A22C0] text-white border-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-[13px] uppercase tracking-wide">Total Balance</p>
              <p className="text-[36px] font-bold mt-2 flex items-center gap-3"><Coins className="w-8 h-8" />{wallet?.user?.qcoins || 0}</p>
              <p className="text-white/70 text-[13px] mt-1">Earned QCoins • Cannot be purchased</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <p className="text-[12px] text-white/70">Total Points</p>
              <p className="text-[20px] font-bold">{wallet?.user?.points || 0}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {wallet?.stats?.map(s => (
              <div key={s._id} className="bg-white/10 rounded-xl p-3">
                <p className="text-[11px] text-white/70 uppercase">{s._id}</p>
                <p className="text-[16px] font-bold mt-1">{s.total > 0 ? '+' : ''}{s.total}</p>
                <p className="text-[11px] text-white/60">{s.count} txns</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">How to Earn</CardTitle>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-success-light border border-success/20">
              <p className="text-[13px] font-medium text-success">No Purchase Needed</p>
              <p className="text-[12px] text-textSecondary mt-1">QCoins are earned only by quizzes, polls and community activity.</p>
            </div>
            <div className="space-y-2">
              {earnInfo.slice(0, 3).map(m => {
                const Icon = iconMap[m.icon] || Trophy;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-appBg border border-border">
                    <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center"><Icon className="w-4 h-4 text-primary" /></div>
                    <div className="flex-1"><p className="text-[12px] font-medium">{m.title}</p><p className="text-[11px] text-textSecondary">{m.qcoins} QCoins</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="section-title mb-4">Ways to Earn QCoins</h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {earnInfo.map(method => {
            const Icon = iconMap[method.icon] || Trophy;
            return (
              <Card key={method.id} className="text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-primary-light flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-primary" /></div>
                <h3 className="font-semibold text-[13px]">{method.title}</h3>
                <p className="text-[11px] text-textSecondary mt-1 line-clamp-2">{method.description}</p>
                <Badge variant="success" className="mt-3">{method.qcoins}</Badge>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <Tabs tabs={[{ value: 'all', label: 'All' }, { value: 'earn', label: 'Earned' }, { value: 'spend', label: 'Spent' }, { value: 'bonus', label: 'Bonus' }]} activeTab={filter} onChange={setFilter} />
        </CardHeader>
        <div className="space-y-2">
          {filteredTx.length === 0 ? <p className="text-[13px] text-textSecondary text-center py-8">No transactions yet. Complete a quiz to earn QCoins!</p> : filteredTx.map(tx => (
            <div key={tx._id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-appBg">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-success-light text-success' : 'bg-error-light text-error'}`}>
                {tx.amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{tx.description}</p>
                <p className="text-[11px] text-textSecondary">{new Date(tx.createdAt).toLocaleString()} • {tx.type} • Balance: {tx.balanceAfter}</p>
              </div>
              <span className={`font-bold text-[14px] ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
