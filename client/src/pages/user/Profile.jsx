import React, { useEffect, useState } from 'react';
import { Edit, Trophy, BookOpen, BarChart3, Coins, Calendar } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { TextareaForward } from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';
import api from '../../lib/api';

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ username: user?.username || '', bio: user?.bio || '', avatar: user?.avatar || '' });
  const { addToast } = useToast();

  useEffect(() => {
    api.get('/leaderboard/stats').then(res => setStats(res.data.data)).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await updateProfile(form);
      addToast('Profile updated', 'success');
      setShowEdit(false);
    } catch (e) {
      addToast('Update failed', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary to-[#4A22C0]" />
        <div className="relative pt-12 flex flex-col md:flex-row gap-6">
          <Avatar name={user?.username} src={user?.avatar} size="xl" className="ring-4 ring-surface w-20 h-20 text-[24px]" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[22px] font-bold">{user?.username}</h1>
                <p className="text-[13px] text-textSecondary">{user?.email} • {user?.role} • Joined {new Date(user?.createdAt).toLocaleDateString()}</p>
                <p className="text-[14px] text-textSecondary mt-3 max-w-xl">{user?.bio || 'No bio yet. Tell us about yourself!'}</p>
                <div className="flex gap-2 mt-4">
                  <Badge variant="primary">{user?.points || 0} points</Badge>
                  <Badge variant="warning">{user?.qcoins || 0} QCoins</Badge>
                  <Badge variant="default">Level {user?.level || 1}</Badge>
                </div>
              </div>
              <Button variant="secondary" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => setShowEdit(true)}>Edit Profile</Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="text-center"><Trophy className="w-6 h-6 mx-auto text-primary" /><p className="text-[20px] font-bold mt-2">{user?.points || 0}</p><p className="text-[12px] text-textSecondary">Total Points</p></Card>
        <Card className="text-center"><BookOpen className="w-6 h-6 mx-auto text-blue-500" /><p className="text-[20px] font-bold mt-2">{user?.quizzesCompleted || 0}</p><p className="text-[12px] text-textSecondary">Quizzes Done</p></Card>
        <Card className="text-center"><BarChart3 className="w-6 h-6 mx-auto text-success" /><p className="text-[20px] font-bold mt-2">{user?.quizzesCreated || 0}</p><p className="text-[12px] text-textSecondary">Quizzes Created</p></Card>
        <Card className="text-center"><Coins className="w-6 h-6 mx-auto text-warning" /><p className="text-[20px] font-bold mt-2">{user?.qcoins || 0}</p><p className="text-[12px] text-textSecondary">QCoins</p></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Attempts</CardTitle></CardHeader>
          <div className="space-y-3">
            {stats?.recentAttempts?.length ? stats.recentAttempts.map(a => (
              <div key={a._id} className="flex items-center justify-between p-2 rounded-lg bg-appBg border border-border">
                <div><p className="text-[13px] font-medium">{a.quiz?.title}</p><p className="text-[11px] text-textSecondary">{new Date(a.createdAt).toLocaleDateString()}</p></div>
                <Badge variant={a.passed ? 'success' : 'error'}>{a.percentage}%</Badge>
              </div>
            )) : <p className="text-[13px] text-textSecondary">No attempts yet</p>}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'First Quiz', desc: 'Complete your first quiz', unlocked: (user?.quizzesCompleted || 0) > 0 },
              { title: 'Creator', desc: 'Create 5 quizzes', unlocked: (user?.quizzesCreated || 0) >= 5 },
              { title: 'Scholar', desc: 'Score 90%+ on 10 quizzes', unlocked: false },
              { title: 'Wealthy', desc: 'Earn 1000 QCoins', unlocked: (user?.qcoins || 0) >= 1000 }
            ].map(ach => (
              <div key={ach.title} className={`p-3 rounded-xl border text-center ${ach.unlocked ? 'bg-success-light border-success' : 'bg-appBg border-border opacity-60'}`}>
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${ach.unlocked ? 'bg-success text-white' : 'bg-border'}`}>🏆</div>
                <p className="text-[12px] font-medium mt-2">{ach.title}</p>
                <p className="text-[10px] text-textSecondary">{ach.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Profile" footer={<><Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button><Button onClick={handleSave}>Save Changes</Button></>}>
        <div className="space-y-4">
          <Input label="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <Input label="Avatar URL" value={form.avatar} onChange={e => setForm({ ...form, avatar: e.target.value })} placeholder="https://..." />
          <TextareaForward label="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Tell us about yourself..." />
        </div>
      </Modal>
    </div>
  );
}
