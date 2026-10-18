import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Vote } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';

export default function Polls() {
  const [polls, setPolls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/polls', { params: { page, limit: 12, category: category !== 'all' ? category : undefined } });
      setPolls(res.data.data.polls);
      setTotal(res.data.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolls(); }, [page, category]);

  const handleVote = async (pollId, optionIndexes) => {
    try {
      await api.post(`/polls/${pollId}/vote`, { optionIndexes });
      addToast('Vote recorded! +2 QCoins', 'success');
      fetchPolls();
    } catch (e) {
      addToast(e.response?.data?.message || 'Vote failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Explore Polls</h1>
          <p className="text-[14px] text-textSecondary mt-1">Vote and earn QCoins. Create your own polls in My Polls.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/my-polls"><Button variant="secondary">My Polls</Button></Link>
          <Link to="/polls/create"><Button leftIcon={<Plus className="w-4 h-4" />}>Create Poll</Button></Link>
        </div>
      </div>

      <Card padding={false} className="p-4 flex gap-3">
        <Select options={[{ value: 'all', label: 'All Categories' }, { value: 'General', label: 'General' }, { value: 'Technology', label: 'Technology' }, { value: 'Sports', label: 'Sports' }]} value={category} onChange={setCategory} containerClassName="w-[200px]" />
        <div className="text-[13px] text-textSecondary flex items-center">{total} polls found • +2 QCoins per vote</div>
      </Card>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : polls.length === 0 ? (
        <EmptyState title="No polls" description="Be the first to create a poll!" actionLabel="Create Poll" onAction={() => window.location.href = '/polls/create'} />
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {polls.map(poll => {
              const totalVotes = poll.totalVotes || 1;
              return (
                <Card key={poll._id} hover>
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="default">{poll.category}</Badge>
                    <span className="text-[11px] text-textSecondary flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(poll.expiresAt).toLocaleDateString()}</span>
                  </div>
                  <Link to={`/polls/${poll._id}`} className="hover:text-primary"><h3 className="font-semibold text-[15px] line-clamp-2">{poll.question}</h3></Link>
                  {poll.description && <p className="text-[13px] text-textSecondary mt-1 line-clamp-2">{poll.description}</p>}
                  <div className="mt-4 space-y-2">
                    {poll.options.map((opt, idx) => {
                      const percent = Math.round((opt.votes / totalVotes) * 100);
                      return (
                        <div key={opt._id} className="relative">
                          <button onClick={() => handleVote(poll._id, [idx])} className="w-full text-left p-3 rounded-xl border border-border hover:border-primary hover:bg-primary-light/30 transition-all relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full bg-primary-light transition-all" style={{ width: `${percent}%` }} />
                            <div className="relative flex justify-between"><span className="text-[13px] font-medium">{opt.text}</span><span className="text-[12px] text-textSecondary">{percent}% • {opt.votes} votes</span></div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2"><Avatar name={poll.author?.username} size="sm" /><span className="text-[12px] text-textSecondary">{poll.author?.username}</span></div>
                    <span className="text-[12px] text-textSecondary flex items-center gap-1"><Vote className="w-3 h-3" />{poll.totalVotes} votes • +2 QCoins</span>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={Math.ceil(total / 12)} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
