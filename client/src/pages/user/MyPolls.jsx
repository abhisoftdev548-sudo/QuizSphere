import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';

export default function MyPolls() {
  const [polls, setPolls] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, analyticsRes] = await Promise.all([
        api.get('/polls/my', { params: { status, limit: 50 } }),
        api.get('/polls/analytics').catch(() => ({ data: { data: null } }))
      ]);
      setPolls(myRes.data.data.polls);
      setAnalytics(analyticsRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [status]);

  const handleDelete = async (id) => {
    if (!confirm('Delete poll?')) return;
    try {
      await api.delete(`/polls/${id}`);
      addToast('Deleted', 'success');
      fetchData();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">My Polls</h1><p className="text-[14px] text-textSecondary mt-1">Track your polls and engagement.</p></div>
        <Link to="/polls/create"><Button leftIcon={<Plus className="w-4 h-4" />}>Create Poll</Button></Link>
      </div>

      {analytics && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="text-center"><BarChart3 className="w-6 h-6 mx-auto text-primary" /><p className="text-[22px] font-bold mt-2">{analytics.stats.totalPolls}</p><p className="text-[11px] text-textSecondary uppercase">Total Polls</p></Card>
          <Card className="text-center"><Users className="w-6 h-6 mx-auto text-success" /><p className="text-[22px] font-bold mt-2">{analytics.stats.totalVotes}</p><p className="text-[11px] text-textSecondary uppercase">Total Votes</p></Card>
          <Card className="text-center"><span className="text-[22px]">📊</span><p className="text-[22px] font-bold mt-2">{analytics.stats.totalPolls ? Math.round(analytics.stats.totalVotes / analytics.stats.totalPolls) : 0}</p><p className="text-[11px] text-textSecondary uppercase">Avg Votes</p></Card>
        </div>
      )}

      <Tabs tabs={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} activeTab={status} onChange={setStatus} />

      {loading ? <p className="text-center p-8">Loading...</p> : polls.length === 0 ? (
        <EmptyState title="No polls yet" description="Create a poll to gather opinions and earn QCoins." actionLabel="Create Poll" onAction={() => window.location.href = '/polls/create'} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {polls.map(poll => (
            <Card key={poll._id} hover>
              <div className="flex justify-between mb-2"><Badge variant={poll.status === 'pending' ? 'warning' : poll.status === 'approved' ? 'success' : 'error'}>{poll.status}</Badge><span className="text-[11px] text-textSecondary">{new Date(poll.createdAt).toLocaleDateString()}</span></div>
              <h3 className="font-semibold text-[14px] line-clamp-2">{poll.question}</h3>
              <div className="mt-3 flex gap-2 text-[12px]"><span className="bg-appBg px-2 py-1 rounded-full">{poll.totalVotes} votes</span><span className="bg-appBg px-2 py-1 rounded-full">{poll.category}</span></div>
              <div className="mt-4 flex gap-2">
                <Link to={`/polls/${poll._id}`} className="flex-1"><Button variant="secondary" size="sm" fullWidth leftIcon={<Eye className="w-3 h-3" />}>View</Button></Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(poll._id)}><Trash2 className="w-3 h-3 text-error" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {analytics?.topPolls?.length > 0 && (
        <Card><CardHeader><CardTitle>Top Polls</CardTitle></CardHeader>
          <div className="space-y-2">{analytics.topPolls.map(p => (
            <div key={p._id} className="flex justify-between p-3 rounded-xl bg-appBg border border-border"><span className="text-[13px] font-medium line-clamp-1 flex-1">{p.question}</span><span className="text-[12px] font-bold ml-3">{p.totalVotes} votes</span></div>
          ))}</div>
        </Card>
      )}
    </div>
  );
}
