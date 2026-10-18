import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function QuizAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    api.get(`/quizzes/${id}/attempt-data`).then(res => {
      setQuiz(res.data.data.quiz);
      setTimeLeft(res.data.data.quiz.timeLimit * 60);
    }).catch(() => {
      // fallback to normal endpoint (for author)
      api.get(`/quizzes/${id}`).then(res => {
        setQuiz(res.data.data.quiz);
        setTimeLeft(res.data.data.quiz.timeLimit * 60);
      }).catch(() => addToast('Failed to load quiz', 'error'));
    });
  }, [id]);

  useEffect(() => {
    if (timeLeft <= 0 && quiz) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, quiz]);

  const toggleOption = (qId, optIdx, type) => {
    setAnswers(prev => {
      const currentAns = prev[qId] || { selected: [], text: '' };
      if (type === 'single-choice' || type === 'true-false') {
        return { ...prev, [qId]: { selected: [optIdx], text: '' } };
      } else {
        // multiple-choice
        const selected = currentAns.selected || [];
        const newSelected = selected.includes(optIdx) ? selected.filter(i => i !== optIdx) : [...selected, optIdx];
        return { ...prev, [qId]: { selected: newSelected, text: '' } };
      }
    });
  };

  const setTextAnswer = (qId, text) => {
    setAnswers(prev => ({ ...prev, [qId]: { selected: [], text } }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, ans]) => ({
          questionId,
          selectedOptionIndexes: ans.selected || [],
          textAnswer: ans.text || ''
        })),
        timeTaken: Math.floor((Date.now() - startTime) / 1000)
      };
      const res = await api.post(`/quizzes/${id}/attempt`, payload);
      addToast(`Quiz submitted! You scored ${res.data.data.attempt.percentage}%`, 'success');
      navigate(`/quizzes/${id}/results/${res.data.data.attempt._id}`);
    } catch (e) {
      addToast(e.response?.data?.message || 'Submit failed', 'error');
      setSubmitting(false);
    }
  };

  if (!quiz) return <div className="p-8 text-center">Loading quiz...</div>;

  const question = quiz.questions[current];
  const type = question.type;
  const currentAns = answers[question._id] || { selected: [], text: '' };
  const progress = ((current + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold">{quiz.title}</h1>
        <div className="flex items-center gap-2 text-[13px] bg-error-light text-error px-3 py-1.5 rounded-full"><Clock className="w-4 h-4" /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
      </div>

      <div className="w-full h-2 bg-border rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12px] text-textSecondary">Question {current + 1} of {quiz.questions.length} • {type.replace('-', ' ')} • {type === 'multiple-choice' ? 'Multiple correct' : type === 'single-choice' ? 'One correct' : type === 'true-false' ? 'True/False' : 'Fill blank'}</span>
          <span className="text-[12px] bg-appBg px-2 py-1 rounded-full">{question.points} pts</span>
        </div>
        <h2 className="text-[18px] font-medium mb-6">{question.text}</h2>

        {type === 'fill-blank' ? (
          <div className="space-y-3">
            <input
              type="text"
              value={currentAns.text}
              onChange={e => setTextAnswer(question._id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-12 px-4 rounded-xl border border-border bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[12px] text-textSecondary">Answer is case-insensitive. Be precise.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {question.options.map((opt, idx) => {
              const text = typeof opt === 'string' ? opt : opt.text;
              const selected = (currentAns.selected || []).includes(idx);
              return (
                <button key={idx} onClick={() => toggleOption(question._id, idx, type)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected ? 'border-primary bg-primary-light' : 'border-border hover:border-primary/50 bg-surface'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-primary bg-primary' : 'border-border'}`}>{selected && <div className="w-2 h-2 rounded-full bg-white" />}</div>
                    <span className="text-[14px]">{text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-8">
          <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)} leftIcon={<ChevronLeft className="w-4 h-4" />}>Previous</Button>
          {current < quiz.questions.length - 1 ? (
            <Button onClick={() => setCurrent(current + 1)} rightIcon={<ChevronRight className="w-4 h-4" />}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting}>Submit Quiz</Button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {quiz.questions.map((_, idx) => {
          const qId = quiz.questions[idx]._id;
          const ans = answers[qId];
          const hasAnswer = ans && (ans.text?.trim() || (ans.selected && ans.selected.length > 0));
          return (
            <button key={idx} onClick={() => setCurrent(idx)} className={`w-9 h-9 rounded-lg text-[13px] font-medium border ${current === idx ? 'bg-primary text-white border-primary' : hasAnswer ? 'bg-success-light border-success text-success' : 'bg-surface border-border'}`}>{idx + 1}</button>
          );
        })}
      </div>
    </div>
  );
}
