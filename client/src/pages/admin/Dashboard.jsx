import React, { useEffect, useState } from 'react';
import { Users, BookOpen, BarChart3, Flag, Coins, TrendingUp, Clock } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(res => setStats(res.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading admin stats...</div>;
  if (!stats) return <div className="p-8 text-center">Failed to load</div>;

  const totals = stats.totals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-[14px] text-textSecondary mt-1">Overview of platform activity and moderation queue.</p>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="text-center"><Users className="w-6 h-6 mx-auto text-primary" /><p className="text-[22px] font-bold mt-2">{totals.totalUsers}</p><p className="text-[11px] text-textSecondary uppercase">Users</p></Card>
        <Card className="text-center"><BookOpen className="w-6 h-6 mx-auto text-blue-500" /><p className="text-[22px] font-bold mt-2">{totals.totalQuizzes}</p><p className="text-[11px] text-textSecondary uppercase">Quizzes</p></Card>
        <Card className="text-center"><BarChart3 className="w-6 h-6 mx-auto text-success" /><p className="text-[22px] font-bold mt-2">{totals.totalPolls}</p><p className="text-[11px] text-textSecondary uppercase">Polls</p></Card>
        <Card className="text-center border-warning"><Clock className="w-6 h-6 mx-auto text-warning" /><p className="text-[22px] font-bold mt-2">{totals.pendingQuizzes + totals.pendingPolls}</p><p className="text-[11px] text-textSecondary uppercase">Pending</p></Card>
        <Card className="text-center"><TrendingUp className="w-6 h-6 mx-auto text-primary" /><p className="text-[22px] font-bold mt-2">{totals.totalAttempts}</p><p className="text-[11px] text-textSecondary uppercase">Attempts</p></Card>
        <Card className="text-center border-error"><Flag className="w-6 h-6 mx-auto text-error" /><p className="text-[22px] font-bold mt-2">{totals.pendingReports}</p><p className="text-[11px] text-textSecondary uppercase">Reports</p></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Users</CardTitle><Link to="/admin/users" className="text-[12px] text-primary">View all</Link></CardHeader>
          <div className="space-y-3">
            {stats.recentUsers?.map(u => (
              <div key={u._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-appBg">
                <div><p className="text-[13px] font-medium">{u.username}</p><p className="text-[11px] text-textSecondary">{u.email}</p></div>
                <div className="text-right"><Badge variant={u.role === 'admin' ? 'primary' : 'default'}>{u.role}</Badge><p className="text-[11px] text-textSecondary mt-1">{new Date(u.createdAt).toLocaleDateString()}</p></div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Quizzes</CardTitle><Link to="/admin/approvals" className="text-[12px] text-primary">Review queue</Link></CardHeader>
          <div className="space-y-3">
            {stats.recentQuizzes?.map(q => (
              <div key={q._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-appBg">
                <div><p className="text-[13px] font-medium line-clamp-1">{q.title}</p><p className="text-[11px] text-textSecondary">by {q.author?.username} • {q.category}</p></div>
                <Badge variant={q.status === 'pending' ? 'warning' : q.status === 'approved' ? 'success' : 'error'}>{q.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Attempts Last 7 Days</CardTitle></CardHeader>
          <div className="flex items-end gap-2 h-32">
            {(stats.attemptsByDay || []).map(d => {
              const max = Math.max(...stats.attemptsByDay.map(x => x.count), 1);
              const h = (d.count / max) * 100;
              return (
                <div key={d._id} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-primary rounded-t-lg" style={{ height: `${h}%`, minHeight: '8px' }} />
                  <span className="text-[10px] text-textSecondary">{d._id.slice(5)}</span>
                </div>
              );
            })}
            {(!stats.attemptsByDay || stats.attemptsByDay.length === 0) && <p className="text-[13px] text-textSecondary">No data</p>}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>QCoin Stats</CardTitle></CardHeader>
          <div className="space-y-2">
            {stats.qcoinStats?.map(s => (
              <div key={s._id} className="flex justify-between p-2 rounded-lg bg-appBg border border-border text-[13px]"><span className="capitalize">{s._id}</span><span className="font-bold">{s.total}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
