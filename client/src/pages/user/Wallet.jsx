import React, { useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown, ShoppingBag, Gift, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showPurchase, setShowPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, packagesRes] = await Promise.all([
          api.get('/qcoins/wallet'),
          api.get('/qcoins/packages')
        ]);
        setWallet(walletRes.data.data);
        setTransactions(walletRes.data.data.transactions);
        setPackages(packagesRes.data.data.packages);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePurchase = async (pkg) => {
    try {
      const amount = pkg.qcoins + (pkg.bonus || 0);
      await api.post('/qcoins/purchase', { amount, packageId: pkg.id });
      addToast(`Purchased ${amount} QCoins!`, 'success');
      setShowPurchase(null);
      const res = await api.get('/qcoins/wallet');
      setWallet(res.data.data);
      setTransactions(res.data.data.transactions);
    } catch (e) {
      addToast(e.response?.data?.message || 'Purchase failed', 'error');
    }
  };

  const filteredTx = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  if (loading) return <div className="p-8 text-center">Loading wallet...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="page-title">QCoin Wallet</h1>
        <p className="text-[14px] text-textSecondary mt-1">Manage your QCoins, view transactions and purchase more.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-primary to-[#4A22C0] text-white border-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-[13px] uppercase tracking-wide">Total Balance</p>
              <p className="text-[36px] font-bold mt-2 flex items-center gap-3"><Coins className="w-8 h-8" />{wallet?.user?.qcoins || 0}</p>
              <p className="text-white/70 text-[13px] mt-1">QCoins • 1 QCoin = $0.01</p>
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
          <CardTitle className="mb-4">Quick Actions</CardTitle>
          <div className="space-y-3">
            <Button fullWidth leftIcon={<ShoppingBag className="w-4 h-4" />} onClick={() => document.getElementById('packages')?.scrollIntoView()}>Buy QCoins</Button>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-appBg border border-border text-center"><Gift className="w-5 h-5 mx-auto text-success" /><p className="text-[12px] font-medium mt-2">Earn by quizzes</p><p className="text-[11px] text-textSecondary">+10 per completion</p></div>
              <div className="p-3 rounded-xl bg-appBg border border-border text-center"><TrendingUp className="w-5 h-5 mx-auto text-primary" /><p className="text-[12px] font-medium mt-2">Leaderboard bonus</p><p className="text-[11px] text-textSecondary">Top 10 weekly</p></div>
            </div>
          </div>
        </Card>
      </div>

      <div id="packages">
        <h2 className="section-title mb-4">QCoin Packages</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {packages.map(pkg => (
            <Card key={pkg.id} className={`relative ${pkg.popular ? 'border-primary ring-1 ring-primary' : ''}`}>
              {pkg.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full">POPULAR</div>}
              <h3 className="font-semibold">{pkg.name}</h3>
              <p className="text-[28px] font-bold mt-2">{pkg.qcoins + (pkg.bonus || 0)} <span className="text-[14px] font-normal text-textSecondary">QCoins</span></p>
              {pkg.bonus > 0 && <p className="text-[12px] text-success">+{pkg.bonus} bonus!</p>}
              <p className="text-[18px] font-bold mt-3">${pkg.price}</p>
              <Button fullWidth className="mt-4" variant={pkg.popular ? 'primary' : 'secondary'} onClick={() => setShowPurchase(pkg)}>Purchase</Button>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <Tabs tabs={[{ value: 'all', label: 'All' }, { value: 'earn', label: 'Earn' }, { value: 'spend', label: 'Spend' }, { value: 'purchase', label: 'Purchase' }]} activeTab={filter} onChange={setFilter} />
        </CardHeader>
        <div className="space-y-2">
          {filteredTx.length === 0 ? <p className="text-[13px] text-textSecondary text-center py-8">No transactions</p> : filteredTx.map(tx => (
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

      <Modal isOpen={!!showPurchase} onClose={() => setShowPurchase(null)} title="Confirm Purchase" footer={<><Button variant="secondary" onClick={() => setShowPurchase(null)}>Cancel</Button><Button onClick={() => handlePurchase(showPurchase)}>Confirm — ${showPurchase?.price}</Button></>}>
        {showPurchase && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-light flex items-center justify-center mb-4"><Coins className="w-8 h-8 text-primary" /></div>
            <h3 className="font-semibold text-[18px]">{showPurchase.name}</h3>
            <p className="text-[14px] text-textSecondary mt-1">You will receive {showPurchase.qcoins + (showPurchase.bonus || 0)} QCoins for ${showPurchase.price}</p>
            <p className="text-[12px] text-textSecondary mt-4">This is a simulated purchase. In production, this would integrate with Stripe/PayPal.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
