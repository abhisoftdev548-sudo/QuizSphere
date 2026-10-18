import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, CheckCircle, XCircle, Clock, Coins, ArrowLeft } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import api from '../../lib/api';

export default function QuizResults() {
  const { id, attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/quizzes/attempts/${attemptId}`).then(res => setAttempt(res.data.data.attempt)).catch(console.error).finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="p-8 text-center">Loading results...</div>;
  if (!attempt) return <div className="p-8 text-center">Attempt not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to={`/quizzes/${id}`} className="inline-flex items-center gap-2 text-[14px] text-textSecondary hover:text-textPrimary"><ArrowLeft className="w-4 h-4" /> Back to Quiz</Link>

      <Card className="text-center">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${attempt.passed ? 'bg-success-light text-success' : 'bg-error-light text-error'}`}>
          {attempt.passed ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
        </div>
        <h1 className="text-[28px] font-bold">{attempt.percentage}%</h1>
        <p className={`text-[14px] font-medium mt-1 ${attempt.passed ? 'text-success' : 'text-error'}`}>{attempt.passed ? 'Congratulations! You passed' : 'Keep practicing, you can do better'}</p>
        <div className="grid grid-cols-3 gap-4 mt-8 text-center">
          <div><p className="text-[12px] text-textSecondary">Score</p><p className="text-[18px] font-bold mt-1">{attempt.score}/{attempt.totalPoints}</p></div>
          <div><p className="text-[12px] text-textSecondary">Time</p><p className="text-[18px] font-bold mt-1">{attempt.timeTaken}s</p></div>
          <div><p className="text-[12px] text-textSecondary">QCoins</p><p className="text-[18px] font-bold mt-1 flex items-center justify-center gap-1"><Coins className="w-4 h-4 text-warning" />{attempt.qcoinsEarned}</p></div>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to={`/quizzes/${id}/attempt`}><Button variant="secondary">Retake Quiz</Button></Link>
          <Link to="/quizzes"><Button>Explore More</Button></Link>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Answer Review</CardTitle><Badge variant={attempt.passed ? 'success' : 'error'}>{attempt.passed ? 'Passed' : 'Failed'}</Badge></CardHeader>
        <div className="space-y-4">
          {attempt.answers?.map((ans, idx) => {
            const q = ans.question;
            if (!q) return null;
            return (
              <div key={idx} className={`p-4 rounded-xl border ${ans.isCorrect ? 'border-success-light bg-success-light/30' : 'border-error-light bg-error-light/30'}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-[14px] flex-1">{idx + 1}. {q.text}</p>
                  {ans.isCorrect ? <CheckCircle className="w-5 h-5 text-success flex-shrink-0" /> : <XCircle className="w-5 h-5 text-error flex-shrink-0" />}
                </div>
                <div className="mt-3 grid gap-2">
                  {q.options?.map((opt, oIdx) => {
                    const isSelected = ans.selectedOptionIndexes?.includes(oIdx);
                    const isCorrect = opt.isCorrect;
                    return (
                      <div key={oIdx} className={`px-3 py-2 rounded-lg text-[13px] border flex items-center justify-between ${isCorrect ? 'bg-success-light border-success text-success' : isSelected ? 'bg-error-light border-error text-error' : 'bg-surface border-border'}`}>
                        <span>{opt.text}</span>
                        <span className="text-[11px]">{isCorrect ? 'Correct' : isSelected ? 'Your answer' : ''}</span>
                      </div>
                    );
                  })}
                </div>
                {q.explanation && <p className="mt-3 text-[12px] text-textSecondary bg-surface p-2 rounded-lg border border-border"><strong>Explanation:</strong> {q.explanation}</p>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
