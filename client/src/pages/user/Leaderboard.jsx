import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Tabs from '../../components/ui/Tabs';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function Leaderboard() {
  const [range, setRange] = useState('all-time');
  const [data, setData] = useState({ users: [], total: 0, currentUserRank: null });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/leaderboard', { params: { range, page, limit: 20 } });
        setData(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [range, page]);

  const top3 = data.users.slice(0, 3);
  const rest = data.users.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Leaderboard</h1>
        <p className="text-[14px] text-textSecondary mt-1">See who's leading the QuizSphere community.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs tabs={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'all-time', label: 'All Time' }]} activeTab={range} onChange={setRange} />
        {data.currentUserRank && (
          <Card className="py-3 px-4 flex items-center gap-3 bg-primary-light border-primary">
            <Avatar name={data.currentUserRank.username} size="sm" />
            <div><p className="text-[13px] font-medium">Your Rank: #{data.currentUserRank.rank}</p><p className="text-[11px] text-textSecondary">{data.currentUserRank.points} pts • {data.currentUserRank.attempts || 0} quizzes</p></div>
            <Trophy className="w-4 h-4 text-primary ml-2" />
          </Card>
        )}
      </div>

      {loading ? <SkeletonTable rows={10} /> : (
        <>
          {top3.length >= 3 && (
            <div className="grid md:grid-cols-3 gap-4 items-end">
              {/* 2nd */}
              <Card className="text-center order-2 md:order-1">
                <div className="relative mx-auto w-16 h-16 mb-3">
                  <Avatar name={top3[1].username} src={top3[1].avatar} size="xl" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gray-300 text-white flex items-center justify-center text-[12px] font-bold">2</div>
                </div>
                <p className="font-semibold text-[15px]">{top3[1].username}</p>
                <p className="text-[13px] text-textSecondary">{top3[1].points} pts</p>
                <Badge variant="default" className="mt-2"><Medal className="w-3 h-3 mr-1" /> Silver</Badge>
              </Card>
              {/* 1st */}
              <Card className="text-center order-1 md:order-2 border-warning bg-gradient-to-b from-warning-light to-surface">
                <Crown className="w-6 h-6 text-warning mx-auto mb-2" />
                <div className="relative mx-auto w-20 h-20 mb-3">
                  <Avatar name={top3[0].username} src={top3[0].avatar} size="xl" className="ring-4 ring-warning-light" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-warning text-white flex items-center justify-center text-[13px] font-bold">1</div>
                </div>
                <p className="font-bold text-[16px]">{top3[0].username}</p>
                <p className="text-[14px] text-textSecondary">{top3[0].points} pts</p>
                <Badge variant="warning" className="mt-2"><Trophy className="w-3 h-3 mr-1" /> Champion</Badge>
              </Card>
              {/* 3rd */}
              <Card className="text-center order-3">
                <div className="relative mx-auto w-16 h-16 mb-3">
                  <Avatar name={top3[2].username} src={top3[2].avatar} size="xl" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-orange-300 text-white flex items-center justify-center text-[12px] font-bold">3</div>
                </div>
                <p className="font-semibold text-[15px]">{top3[2].username}</p>
                <p className="text-[13px] text-textSecondary">{top3[2].points} pts</p>
                <Badge variant="default" className="mt-2"><Medal className="w-3 h-3 mr-1" /> Bronze</Badge>
              </Card>
            </div>
          )}

          <Card padding={false}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Full Rankings</h3>
              <span className="text-[12px] text-textSecondary">{data.total} users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-appBg border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">User</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Points</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Quizzes</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Avg Score</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-textSecondary uppercase">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.users.map((u) => {
                    const isCurrent = data.currentUserRank && data.currentUserRank._id === u._id;
                    return (
                      <tr key={u._id} className={`${isCurrent ? 'bg-primary-light' : 'hover:bg-appBg/50'} transition-colors`}>
                        <td className="px-4 py-3"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${u.rank <= 3 ? 'bg-primary text-white' : 'bg-appBg text-textSecondary'}`}>{u.rank}</span></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.username} src={u.avatar} size="sm" /><span className="font-medium text-[14px]">{u.username} {isCurrent && <span className="text-primary text-[11px]">(You)</span>}</span></div></td>
                        <td className="px-4 py-3 text-[14px] font-semibold">{u.points}</td>
                        <td className="px-4 py-3 text-[13px] text-textSecondary">{u.attempts || u.quizzesCompleted || 0}</td>
                        <td className="px-4 py-3 text-[13px]">{u.avgScore ? `${u.avgScore}%` : '-'}</td>
                        <td className="px-4 py-3"><Badge variant="primary">Lvl {u.level || 1}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
