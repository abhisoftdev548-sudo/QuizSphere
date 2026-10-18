import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Eye, Edit, Trash2, BarChart3, Users, Trophy, Coins, TrendingUp, Plus } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';

export default function MyQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, analyticsRes] = await Promise.all([
        api.get('/quizzes/my', { params: { status, limit: 50 } }),
        api.get('/quizzes/analytics').catch(() => ({ data: { data: null } }))
      ]);
      setQuizzes(myRes.data.data.quizzes);
      setAnalytics(analyticsRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [status]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this quiz?')) return;
    try {
      await api.delete(`/quizzes/${id}`);
      addToast('Deleted', 'success');
      fetchData();
    } catch (e) {
      addToast('Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">My Quizzes</h1>
          <p className="text-[14px] text-textSecondary mt-1">Manage your creations and view analytics.</p>
        </div>
        <Link to="/quizzes/create"><Button leftIcon={<Plus className="w-4 h-4" />}>Create Quiz</Button></Link>
      </div>

      {analytics && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="text-center"><BookOpen className="w-6 h-6 mx-auto text-primary" /><p className="text-[22px] font-bold mt-2">{analytics.stats.totalQuizzes}</p><p className="text-[11px] text-textSecondary uppercase">Total Quizzes</p></Card>
          <Card className="text-center"><Users className="w-6 h-6 mx-auto text-blue-500" /><p className="text-[22px] font-bold mt-2">{analytics.stats.totalAttempts}</p><p className="text-[11px] text-textSecondary uppercase">Total Attempts</p></Card>
          <Card className="text-center"><Trophy className="w-6 h-6 mx-auto text-success" /><p className="text-[22px] font-bold mt-2">{analytics.stats.avgScore}%</p><p className="text-[11px] text-textSecondary uppercase">Avg Score</p></Card>
          <Card className="text-center"><Coins className="w-6 h-6 mx-auto text-warning" /><p className="text-[22px] font-bold mt-2">{analytics.stats.totalQCoinsGiven}</p><p className="text-[11px] text-textSecondary uppercase">QCoins Given</p></Card>
        </div>
      )}

      {analytics?.attemptsByDay?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Attempts Last 7 Days</CardTitle></CardHeader>
          <div className="flex items-end gap-2 h-24">
            {analytics.attemptsByDay.map(d => {
              const max = Math.max(...analytics.attemptsByDay.map(x => x.count), 1);
              const h = (d.count / max) * 100;
              return (
                <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary rounded-t-lg" style={{ height: `${h}%`, minHeight: '6px' }} />
                  <span className="text-[10px] text-textSecondary">{d._id.slice(5)}</span>
                  <span className="text-[10px] font-medium">{d.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Tabs tabs={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} activeTab={status} onChange={setStatus} />

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : quizzes.length === 0 ? (
        <EmptyState title="No quizzes yet" description="Create your first quiz and earn QCoins when others attempt it." actionLabel="Create Quiz" onAction={() => window.location.href = '/quizzes/create'} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <Card key={quiz._id} hover>
              <div className="flex items-start justify-between mb-3">
                <Badge variant={quiz.status === 'pending' ? 'warning' : quiz.status === 'approved' ? 'success' : 'error'}>{quiz.status}</Badge>
                <span className="text-[11px] text-textSecondary">{new Date(quiz.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-semibold text-[15px] line-clamp-1">{quiz.title}</h3>
              <p className="text-[13px] text-textSecondary mt-1 line-clamp-2">{quiz.description}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="bg-appBg rounded-lg p-2"><p className="text-[14px] font-bold">{quiz.totalAttempts || 0}</p><p className="text-[10px] text-textSecondary">Attempts</p></div>
                <div className="bg-appBg rounded-lg p-2"><p className="text-[14px] font-bold">{quiz.avgScore ? Math.round(quiz.avgScore) : 0}%</p><p className="text-[10px] text-textSecondary">Avg</p></div>
                <div className="bg-appBg rounded-lg p-2"><p className="text-[14px] font-bold">{quiz.avgRating?.toFixed(1) || 0}</p><p className="text-[10px] text-textSecondary">Rating</p></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link to={`/quizzes/${quiz._id}`} className="flex-1"><Button variant="secondary" size="sm" fullWidth leftIcon={<Eye className="w-3 h-3" />}>View</Button></Link>
                <Link to={`/quizzes/${quiz._id}/edit`}><Button variant="secondary" size="sm"><Edit className="w-3 h-3" /></Button></Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(quiz._id)}><Trash2 className="w-3 h-3 text-error" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {analytics?.topQuizzes?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top Performing Quizzes</CardTitle></CardHeader>
          <div className="space-y-2">
            {analytics.topQuizzes.map(q => (
              <div key={q._id} className="flex items-center justify-between p-3 rounded-xl bg-appBg border border-border">
                <div><p className="text-[13px] font-medium">{q.title}</p><p className="text-[11px] text-textSecondary">{q.category} • {q.status}</p></div>
                <div className="text-right"><p className="text-[13px] font-bold">{q.totalAttempts} attempts</p><p className="text-[11px] text-textSecondary">{q.avgScore ? Math.round(q.avgScore) : 0}% avg</p></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
