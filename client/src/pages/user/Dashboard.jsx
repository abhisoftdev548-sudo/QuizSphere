import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, BookOpen, Coins, BarChart3, Clock, Star, ArrowRight, TrendingUp, Users, Award } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, lbRes, quizzesRes, attemptsRes] = await Promise.all([
          api.get('/leaderboard/stats').catch(() => ({ data: { data: { stats: {} } } })),
          api.get('/leaderboard?limit=5').catch(() => ({ data: { data: { users: [] } } })),
          api.get('/quizzes?limit=6').catch(() => ({ data: { data: { quizzes: [] } } })),
          api.get('/quizzes/attempts?limit=5').catch(() => ({ data: { data: { attempts: [] } } }))
        ]);
        setStats(statsRes.data.data);
        setLeaderboard(lbRes.data.data.users || []);
        setRecentQuizzes(quizzesRes.data.data.quizzes || []);
        setRecentAttempts(attemptsRes.data.data.attempts || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Points', value: user?.points || 0, icon: Trophy, color: 'bg-primary-light text-primary', change: '+12% this week' },
    { label: 'Quizzes Completed', value: user?.quizzesCompleted || stats?.stats?.totalAttempts || 0, icon: BookOpen, color: 'bg-blue-50 text-blue-600', change: '+3 new' },
    { label: 'QCoins Balance', value: user?.qcoins || 0, icon: Coins, color: 'bg-warning-light text-warning', change: 'Earn more' },
    { label: 'Avg Score', value: `${stats?.stats?.avgPercentage || 0}%`, icon: BarChart3, color: 'bg-success-light text-success', change: '+5% improvement' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Good morning, {user?.username} 👋</h1>
          <p className="text-[14px] text-textSecondary mt-1">Here's what's happening with your quizzes today.</p>
        </div>
        <Link to="/quizzes/create"><Button>Create Quiz</Button></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-medium text-textSecondary uppercase tracking-wide">{s.label}</p>
                <p className="text-[24px] font-bold mt-2">{s.value}</p>
                <p className="text-[12px] text-success mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {s.change}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quizzes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Explore Quizzes</CardTitle>
            <Link to="/quizzes" className="text-[13px] text-primary font-medium flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          </CardHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            {recentQuizzes.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-textSecondary">No quizzes yet. Create your first quiz!</div>
            ) : recentQuizzes.map((quiz) => (
              <Link key={quiz._id} to={`/quizzes/${quiz._id}`} className="group border border-border rounded-xl p-4 hover:border-primary hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={quiz.difficulty === 'hard' ? 'error' : quiz.difficulty === 'medium' ? 'warning' : 'success'}>{quiz.difficulty}</Badge>
                  <span className="text-[12px] text-textSecondary flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.timeLimit}m</span>
                </div>
                <h4 className="font-semibold text-[14px] group-hover:text-primary line-clamp-1">{quiz.title}</h4>
                <p className="text-[12px] text-textSecondary mt-1 line-clamp-2">{quiz.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2"><Avatar name={quiz.author?.username} size="sm" /><span className="text-[12px] text-textSecondary">{quiz.author?.username}</span></div>
                  <div className="flex items-center gap-1 text-[12px] text-textSecondary"><Star className="w-3 h-3" /> {quiz.avgRating || 0}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Leaderboard & Recent Attempts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <Link to="/leaderboard" className="text-[13px] text-primary font-medium">View all</Link>
            </CardHeader>
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-[13px] text-textSecondary text-center py-6">No rankings yet</p>
              ) : leaderboard.map((u, idx) => (
                <div key={u._id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-appBg text-textSecondary'}`}>{idx + 1}</div>
                  <Avatar name={u.username} src={u.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{u.username}</p>
                    <p className="text-[11px] text-textSecondary">{u.points} pts</p>
                  </div>
                  {idx < 3 && <Trophy className={`w-4 h-4 ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-400'}`} />}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Attempts</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {recentAttempts.length === 0 ? (
                <p className="text-[13px] text-textSecondary text-center py-6">No attempts yet</p>
              ) : recentAttempts.map((a) => (
                <div key={a._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-appBg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.passed ? 'bg-success-light text-success' : 'bg-error-light text-error'}`}>
                    {a.percentage}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{a.quiz?.title}</p>
                    <p className="text-[11px] text-textSecondary">{new Date(a.createdAt).toLocaleDateString()} • {a.timeTaken}s</p>
                  </div>
                  <Badge variant={a.passed ? 'success' : 'error'}>{a.passed ? 'Pass' : 'Fail'}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Create Quiz', desc: 'Build a new quiz', icon: BookOpen, to: '/quizzes/create' },
            { label: 'Create Poll', desc: 'Ask your audience', icon: BarChart3, to: '/polls/create' },
            { label: 'Earn QCoins', desc: 'Complete quizzes & polls', icon: Coins, to: '/wallet' },
            { label: 'View Leaderboard', desc: 'See rankings', icon: Users, to: '/leaderboard' }
          ].map(action => (
            <Link key={action.label} to={action.to} className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary-light/50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-appBg group-hover:bg-surface flex items-center justify-center mb-3"><action.icon className="w-5 h-5 text-textSecondary group-hover:text-primary" /></div>
              <p className="font-medium text-[14px]">{action.label}</p>
              <p className="text-[12px] text-textSecondary mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
