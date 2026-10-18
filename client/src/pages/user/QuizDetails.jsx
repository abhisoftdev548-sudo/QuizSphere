import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, Star, BookOpen, Trophy, Coins, User, Edit, Trash2, Flag } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

export default function QuizDetails() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDesc, setReportDesc] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [review, setReview] = useState('');
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quizRes, ratingsRes, attemptsRes] = await Promise.all([
          api.get(`/quizzes/${id}`),
          api.get(`/ratings?targetType=quiz&targetId=${id}`).catch(() => ({ data: { data: { ratings: [], avgRating: 0 } } })),
          api.get(`/quizzes/attempts?quizId=${id}`).catch(() => ({ data: { data: { attempts: [] } } }))
        ]);
        setQuiz(quizRes.data.data.quiz);
        setRatings(ratingsRes.data.data.ratings || []);
        setAvgRating(ratingsRes.data.data.avgRating || 0);
        setAttempts(attemptsRes.data.data.attempts || []);
      } catch (e) {
        addToast('Failed to load quiz', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/quizzes/${id}`);
      addToast('Quiz deleted', 'success');
      navigate('/quizzes');
    } catch (e) {
      addToast(e.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleReport = async () => {
    try {
      await api.post('/reports', { targetType: 'quiz', targetId: id, reason: reportReason, description: reportDesc });
      addToast('Report submitted', 'success');
      setShowReport(false);
    } catch (e) {
      addToast(e.response?.data?.message || 'Report failed', 'error');
    }
  };

  const handleRating = async () => {
    try {
      await api.post('/ratings', { targetType: 'quiz', targetId: id, rating: ratingVal, review });
      addToast('Rating submitted', 'success');
      setShowRating(false);
      // refresh
      const res = await api.get(`/ratings?targetType=quiz&targetId=${id}`);
      setRatings(res.data.data.ratings);
      setAvgRating(res.data.data.avgRating);
    } catch (e) {
      addToast(e.response?.data?.message || 'Rating failed', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!quiz) return <div className="p-8 text-center">Quiz not found</div>;

  const isAuthor = user?._id === quiz.author?._id || user?.id === quiz.author?._id;
  const bestAttempt = attempts.length ? Math.max(...attempts.map(a => a.percentage)) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={quiz.difficulty === 'hard' ? 'error' : quiz.difficulty === 'medium' ? 'warning' : 'success'}>{quiz.difficulty}</Badge>
            <Badge variant="default">{quiz.category}</Badge>
            {quiz.status !== 'approved' && <Badge variant={quiz.status === 'pending' ? 'warning' : 'error'}>{quiz.status}</Badge>}
          </div>
          <h1 className="text-[24px] font-semibold">{quiz.title}</h1>
          <p className="text-[14px] text-textSecondary mt-2 max-w-3xl">{quiz.description}</p>
        </div>
        <div className="flex gap-2">
          {isAuthor ? (
            <>
              <Link to={`/quizzes/${id}/edit`}><Button variant="secondary" size="sm" leftIcon={<Edit className="w-4 h-4" />}>Edit</Button></Link>
              <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDelete(true)}>Delete</Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" leftIcon={<Flag className="w-4 h-4" />} onClick={() => setShowReport(true)}>Report</Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-[12px] text-textSecondary">Questions</p><p className="text-[20px] font-bold mt-1">{quiz.questions?.length || 0}</p></div>
              <div><p className="text-[12px] text-textSecondary">Time Limit</p><p className="text-[20px] font-bold mt-1">{quiz.timeLimit}m</p></div>
              <div><p className="text-[12px] text-textSecondary">Passing Score</p><p className="text-[20px] font-bold mt-1">{quiz.passingScore}%</p></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {quiz.tags?.map(tag => <span key={tag} className="px-2.5 py-1 rounded-full bg-appBg text-[12px]">{tag}</span>)}
            </div>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-appBg border border-border"><Trophy className="w-5 h-5 text-primary" /><div><p className="text-[12px] text-textSecondary">Reward</p><p className="font-semibold text-[14px]">{quiz.qcoinReward} QCoins</p></div></div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-appBg border border-border"><BookOpen className="w-5 h-5 text-primary" /><div><p className="text-[12px] text-textSecondary">Attempts</p><p className="font-semibold text-[14px]">{quiz.totalAttempts} total</p></div></div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Questions Preview</CardTitle><span className="text-[12px] text-textSecondary">{quiz.questions?.length} questions</span></CardHeader>
            <div className="space-y-3">
              {quiz.questions?.slice(0, 3).map((q, idx) => (
                <div key={q._id} className="p-3 rounded-xl border border-border bg-appBg">
                  <p className="text-[14px] font-medium">{idx + 1}. {q.text}</p>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {q.options?.map((opt, i) => <div key={i} className={`text-[13px] px-3 py-2 rounded-lg border ${opt.isCorrect ? 'bg-success-light border-success text-success' : 'bg-surface border-border'}`}>{opt.text} {opt.isCorrect && '✓'}</div>)}
                  </div>
                </div>
              ))}
              {quiz.questions?.length > 3 && <p className="text-[13px] text-textSecondary text-center">+ {quiz.questions.length - 3} more questions will appear during attempt</p>}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ratings & Reviews</CardTitle><Button size="sm" variant="secondary" onClick={() => setShowRating(true)}>Rate this quiz</Button></CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-[32px] font-bold">{avgRating.toFixed(1)}</div>
              <div><div className="flex"><Star className="w-4 h-4 fill-warning text-warning" /><Star className="w-4 h-4 fill-warning text-warning" /><Star className="w-4 h-4 fill-warning text-warning" /><Star className="w-4 h-4 fill-warning text-warning" /><Star className="w-4 h-4 text-border" /></div><p className="text-[12px] text-textSecondary mt-1">{ratings.length} reviews</p></div>
            </div>
            <div className="space-y-3">
              {ratings.length === 0 ? <p className="text-[13px] text-textSecondary">No reviews yet</p> : ratings.slice(0, 5).map(r => (
                <div key={r._id} className="p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-2"><Avatar name={r.user?.username} size="sm" /><span className="text-[13px] font-medium">{r.user?.username}</span><span className="text-[12px] text-warning">★ {r.rating}</span></div>
                  {r.review && <p className="text-[13px] text-textSecondary mt-2">{r.review}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={quiz.author?.username} src={quiz.author?.avatar} size="lg" />
              <div><p className="font-medium text-[14px]">{quiz.author?.username}</p><p className="text-[12px] text-textSecondary">{quiz.author?.bio || 'Quiz Creator'}</p></div>
            </div>
            <Link to={`/quizzes/${id}/attempt`}><Button fullWidth size="lg">Start Quiz — {quiz.qcoinReward} QCoins reward</Button></Link>
            {bestAttempt > 0 && <p className="text-[12px] text-center text-textSecondary mt-3">Your best: {bestAttempt}% {bestAttempt >= quiz.passingScore ? '✓ Passed' : ''}</p>}
            {quiz.qcoinCost > 0 && <p className="text-[12px] text-center text-warning mt-2">Costs {quiz.qcoinCost} QCoins to attempt</p>}
          </Card>

          <Card>
            <CardTitle className="mb-3">Your Attempts</CardTitle>
            {attempts.length === 0 ? <p className="text-[13px] text-textSecondary">No attempts yet</p> : (
              <div className="space-y-2">
                {attempts.slice(0, 5).map(a => (
                  <Link key={a._id} to={`/quizzes/${id}/results/${a._id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-appBg border border-transparent hover:border-border">
                    <div><p className="text-[13px] font-medium">{a.percentage}% • {a.passed ? 'Passed' : 'Failed'}</p><p className="text-[11px] text-textSecondary">{new Date(a.createdAt).toLocaleDateString()}</p></div>
                    <Badge variant={a.passed ? 'success' : 'error'}>{a.score}/{a.totalPoints}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-3">Quiz Info</CardTitle>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-textSecondary">Created</span><span>{new Date(quiz.createdAt).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-textSecondary">Avg Score</span><span>{Math.round(quiz.avgScore || 0)}%</span></div>
              <div className="flex justify-between"><span className="text-textSecondary">Rating</span><span>{quiz.avgRating?.toFixed(1) || 0} ({quiz.totalRatings || 0})</span></div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Quiz" description="Are you sure you want to delete this quiz? This action cannot be undone." confirmLabel="Delete" variant="danger" />

      <Modal isOpen={showReport} onClose={() => setShowReport(false)} title="Report Quiz" footer={<><Button variant="secondary" onClick={() => setShowReport(false)}>Cancel</Button><Button onClick={handleReport}>Submit Report</Button></>}>
        <div className="space-y-4">
          <div><label className="text-[13px] font-medium">Reason</label><select value={reportReason} onChange={e => setReportReason(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-border px-3"><option value="spam">Spam</option><option value="inappropriate">Inappropriate</option><option value="plagiarism">Plagiarism</option><option value="misinformation">Misinformation</option><option value="other">Other</option></select></div>
          <div><label className="text-[13px] font-medium">Description</label><textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border p-3 text-[14px]" placeholder="Describe the issue..." /></div>
        </div>
      </Modal>

      <Modal isOpen={showRating} onClose={() => setShowRating(false)} title="Rate this quiz" footer={<><Button variant="secondary" onClick={() => setShowRating(false)}>Cancel</Button><Button onClick={handleRating}>Submit Rating</Button></>}>
        <div className="space-y-4">
          <div><label className="text-[13px] font-medium">Rating</label><div className="flex gap-2 mt-2">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setRatingVal(n)} className={`w-10 h-10 rounded-xl border ${ratingVal >= n ? 'bg-warning-light border-warning text-warning' : 'border-border'}`}>{n}★</button>)}</div></div>
          <div><label className="text-[13px] font-medium">Review (optional)</label><textarea value={review} onChange={e => setReview(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border p-3 text-[14px]" placeholder="Share your experience..." /></div>
        </div>
      </Modal>
    </div>
  );
}
