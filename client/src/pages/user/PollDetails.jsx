import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Vote, Share2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function PollDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    api.get(`/polls/${id}`).then(res => setData(res.data.data)).catch(() => addToast('Failed to load poll', 'error'));
  }, [id]);

  const handleVote = async () => {
    if (selected.length === 0) {
      addToast('Select at least one option', 'error');
      return;
    }
    try {
      const res = await api.post(`/polls/${id}/vote`, { optionIndexes: selected });
      setData({ poll: res.data.data.poll, userVote: res.data.data.vote });
      addToast('Vote recorded!', 'success');
    } catch (e) {
      addToast(e.response?.data?.message || 'Vote failed', 'error');
    }
  };

  if (!data) return <div className="p-8 text-center">Loading...</div>;
  const { poll, userVote } = data;
  const total = poll.totalVotes || 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/polls" className="inline-flex items-center gap-2 text-[14px] text-textSecondary hover:text-textPrimary"><ArrowLeft className="w-4 h-4" /> Back to Polls</Link>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <Badge>{poll.category}</Badge>
          <span className="text-[12px] text-textSecondary flex items-center gap-1"><Clock className="w-3 h-3" />Expires {new Date(poll.expiresAt).toLocaleDateString()}</span>
        </div>
        <h1 className="text-[22px] font-semibold">{poll.question}</h1>
        {poll.description && <p className="text-[14px] text-textSecondary mt-3">{poll.description}</p>}

        <div className="flex items-center gap-2 mt-4"><Avatar name={poll.author?.username} size="sm" /><span className="text-[13px] text-textSecondary">by {poll.author?.username} • {poll.totalVotes} votes</span></div>

        <div className="mt-6 space-y-3">
          {poll.options.map((opt, idx) => {
            const percent = Math.round((opt.votes / total) * 100);
            const isSelected = selected.includes(idx);
            const isVoted = userVote?.optionIndexes?.includes(idx);
            return (
              <div key={opt._id} className="relative">
                <button
                  onClick={() => {
                    if (userVote) return;
                    if (poll.isMultipleChoice) {
                      setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
                    } else {
                      setSelected([idx]);
                    }
                  }}
                  disabled={!!userVote}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden ${userVote ? 'cursor-default' : 'hover:border-primary'} ${isSelected || isVoted ? 'border-primary bg-primary-light' : 'border-border bg-surface'}`}
                >
                  {userVote && <div className="absolute left-0 top-0 h-full bg-primary-light border-r border-primary/20 transition-all" style={{ width: `${percent}%` }} />}
                  <div className="relative flex justify-between items-center">
                    <span className="text-[14px] font-medium">{opt.text}</span>
                    {userVote ? <span className="text-[13px] font-medium">{percent}% • {opt.votes}</span> : isSelected && <span className="text-primary">✓</span>}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {!userVote ? (
          <Button fullWidth className="mt-6" onClick={handleVote} leftIcon={<Vote className="w-4 h-4" />}>Vote {selected.length > 0 && `(${selected.length})`}</Button>
        ) : (
          <div className="mt-6 p-3 rounded-xl bg-success-light text-success text-[13px] text-center">You voted on this poll • {new Date(userVote.createdAt).toLocaleDateString()}</div>
        )}

        <div className="mt-6 flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Share2 className="w-4 h-4" />}>Share</Button>
          <span className="text-[12px] text-textSecondary flex items-center ml-auto">{poll.isMultipleChoice ? 'Multiple choices allowed' : 'Single choice'}</span>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-3">Poll Results</h3>
        <div className="space-y-3">
          {poll.options.map(opt => {
            const percent = Math.round((opt.votes / total) * 100);
            return (
              <div key={opt._id}>
                <div className="flex justify-between text-[13px] mb-1"><span>{opt.text}</span><span className="text-textSecondary">{percent}%</span></div>
                <div className="w-full h-2 bg-appBg rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
