import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { TextareaForward } from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

const defaultQuestion = () => ({ text: '', type: 'multiple-choice', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }], correctAnswer: '', explanation: '', points: 10 });

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice (multiple correct)' },
  { value: 'single-choice', label: 'Single Choice (one correct)' },
  { value: 'true-false', label: 'True / False' },
  { value: 'fill-blank', label: 'Fill in the Blank' }
];

export default function QuizCreate() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    difficulty: 'medium',
    timeLimit: 10,
    passingScore: 60,
    qcoinReward: 10,
    tags: '',
    questions: [defaultQuestion()]
  });

  React.useEffect(() => {
    if (isEdit) {
      api.get(`/quizzes/${id}`).then(res => {
        const q = res.data.data.quiz;
        setForm({
          title: q.title,
          description: q.description,
          category: q.category,
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
          passingScore: q.passingScore,
          qcoinReward: q.qcoinReward,
          tags: q.tags?.join(', ') || '',
          questions: q.questions?.map(qq => ({
            text: qq.text,
            type: qq.type,
            options: qq.type === 'fill-blank' ? [] : (qq.options || [{ text: '', isCorrect: true }, { text: '', isCorrect: false }]),
            correctAnswer: qq.correctAnswer || '',
            explanation: qq.explanation || '',
            points: qq.points
          })) || [defaultQuestion()]
        });
      }).catch(() => addToast('Failed to load quiz', 'error'));
    }
  }, [id]);

  const addQuestion = () => setForm({ ...form, questions: [...form.questions, defaultQuestion()] });
  const removeQuestion = (idx) => setForm({ ...form, questions: form.questions.filter((_, i) => i !== idx) });
  const updateQuestion = (idx, field, value) => {
    const qs = [...form.questions];
    // If type changes, reset options appropriately
    if (field === 'type') {
      if (value === 'true-false') {
        qs[idx].options = [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }];
        qs[idx].correctAnswer = '';
      } else if (value === 'fill-blank') {
        qs[idx].options = [];
        qs[idx].correctAnswer = qs[idx].correctAnswer || '';
      } else if (qs[idx].type === 'fill-blank' && value !== 'fill-blank') {
        qs[idx].options = [{ text: '', isCorrect: true }, { text: '', isCorrect: false }];
      }
    }
    qs[idx][field] = value;
    setForm({ ...form, questions: qs });
  };
  const updateOption = (qIdx, oIdx, field, value) => {
    const qs = [...form.questions];
    qs[qIdx].options[oIdx][field] = value;
    setForm({ ...form, questions: qs });
  };
  const addOption = (qIdx) => {
    const qs = [...form.questions];
    if (qs[qIdx].options.length >= 6) {
      addToast('Max 6 options', 'error');
      return;
    }
    qs[qIdx].options.push({ text: '', isCorrect: false });
    setForm({ ...form, questions: qs });
  };
  const removeOption = (qIdx, oIdx) => {
    const qs = [...form.questions];
    if (qs[qIdx].options.length <= 2) {
      addToast('At least 2 options required', 'error');
      return;
    }
    qs[qIdx].options = qs[qIdx].options.filter((_, i) => i !== oIdx);
    setForm({ ...form, questions: qs });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.text.trim()) {
        addToast(`Question ${i + 1}: text required`, 'error');
        return;
      }
      if (q.type === 'fill-blank') {
        if (!q.correctAnswer.trim()) {
          addToast(`Question ${i + 1}: correct answer required for fill in blank`, 'error');
          return;
        }
      } else {
        if (q.options.some(o => !o.text.trim())) {
          addToast(`Question ${i + 1}: all options must have text`, 'error');
          return;
        }
        if (!q.options.some(o => o.isCorrect)) {
          addToast(`Question ${i + 1}: at least one correct answer`, 'error');
          return;
        }
        if (q.type === 'single-choice' || q.type === 'true-false') {
          const correctCount = q.options.filter(o => o.isCorrect).length;
          if (correctCount !== 1) {
            addToast(`Question ${i + 1}: ${q.type} must have exactly one correct answer`, 'error');
            return;
          }
        }
      }
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        timeLimit: parseInt(form.timeLimit),
        passingScore: parseInt(form.passingScore),
        qcoinReward: parseInt(form.qcoinReward),
        questions: form.questions.map((q, idx) => ({
          text: q.text,
          type: q.type,
          options: q.type === 'fill-blank' ? [] : q.options,
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          points: parseInt(q.points) || 10,
          order: idx
        }))
      };
      if (isEdit) {
        await api.put(`/quizzes/${id}`, payload);
        addToast('Quiz updated and pending review', 'success');
      } else {
        await api.post('/quizzes', payload);
        addToast('Quiz created and pending review', 'success');
      }
      navigate('/my-quizzes');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save quiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">{isEdit ? 'Edit Quiz' : 'Create New Quiz'}</h1>
        <p className="text-[14px] text-textSecondary mt-1">Quizzes go through admin review. Earn QCoins only — no purchase.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Quiz Details</CardTitle></CardHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., JavaScript Fundamentals" required /></div>
            <div className="md:col-span-2"><TextareaForward label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what this quiz covers..." rows={3} required /></div>
            <Select label="Category" options={[{ value: 'General', label: 'General' }, { value: 'Science', label: 'Science' }, { value: 'Technology', label: 'Technology' }, { value: 'History', label: 'History' }, { value: 'Sports', label: 'Sports' }, { value: 'Entertainment', label: 'Entertainment' }]} value={form.category} onChange={v => setForm({ ...form, category: v })} />
            <Select label="Difficulty" options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} value={form.difficulty} onChange={v => setForm({ ...form, difficulty: v })} />
            <Input label="Time Limit (minutes)" type="number" min={1} max={180} value={form.timeLimit} onChange={e => setForm({ ...form, timeLimit: e.target.value })} />
            <Input label="Passing Score (%)" type="number" min={0} max={100} value={form.passingScore} onChange={e => setForm({ ...form, passingScore: e.target.value })} />
            <Input label="QCoin Reward (earned by solvers)" type="number" min={0} value={form.qcoinReward} onChange={e => setForm({ ...form, qcoinReward: e.target.value })} hint="Reward given to users who pass" />
            <Input label="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="js, programming, beginner" />
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="section-title">Questions ({form.questions.length}) - Supports 4 types</h2>
          <Button type="button" variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={addQuestion}>Add Question</Button>
        </div>

        {form.questions.map((q, qIdx) => (
          <Card key={qIdx} className="relative">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="flex items-center gap-2"><GripVertical className="w-4 h-4 text-textSecondary" /><span className="font-medium">Question {qIdx + 1}</span></div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <Select options={questionTypes} value={q.type} onChange={v => updateQuestion(qIdx, 'type', v)} containerClassName="w-[260px]" />
                <Input type="number" value={q.points} onChange={e => updateQuestion(qIdx, 'points', e.target.value)} className="w-20" placeholder="Points" />
                {form.questions.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)}><Trash2 className="w-4 h-4 text-error" /></Button>}
              </div>
            </div>
            <TextareaForward value={q.text} onChange={e => updateQuestion(qIdx, 'text', e.target.value)} placeholder={q.type === 'fill-blank' ? "Enter question with blank, e.g., 'The capital of France is ____'" : "Enter question text..."} rows={2} required />

            {q.type === 'fill-blank' ? (
              <div className="mt-4 space-y-2">
                <Input label="Correct Answer (case-insensitive check)" value={q.correctAnswer} onChange={e => updateQuestion(qIdx, 'correctAnswer', e.target.value)} placeholder="e.g., Paris" required />
                <p className="text-[11px] text-textSecondary">For fill in blank, user will type answer. Comparison is case-insensitive and trimmed.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <label className="text-[13px] font-medium">
                  Options {q.type === 'multiple-choice' ? '(check all correct)' : q.type === 'single-choice' ? '(check one correct)' : '(True/False - check correct)'}
                </label>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    {q.type === 'single-choice' || q.type === 'true-false' ? (
                      <input type="radio" name={`q-${qIdx}-correct`} checked={opt.isCorrect} onChange={() => {
                        const qs = [...form.questions];
                        qs[qIdx].options = qs[qIdx].options.map((o, idx) => ({ ...o, isCorrect: idx === oIdx }));
                        setForm({ ...form, questions: qs });
                      }} className="w-4 h-4" />
                    ) : (
                      <input type="checkbox" checked={opt.isCorrect} onChange={e => updateOption(qIdx, oIdx, 'isCorrect', e.target.checked)} className="w-4 h-4 rounded" />
                    )}
                    <Input value={opt.text} onChange={e => updateOption(qIdx, oIdx, 'text', e.target.value)} placeholder={`Option ${oIdx + 1}`} containerClassName="flex-1" required disabled={q.type === 'true-false'} />
                    {q.type !== 'true-false' && q.options.length > 2 && <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(qIdx, oIdx)}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                ))}
                {q.type !== 'true-false' && q.options.length < 6 && <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qIdx)}>+ Add option</Button>}
              </div>
            )}
            <TextareaForward label="Explanation (shown after attempt)" value={q.explanation} onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)} placeholder="Explain the correct answer..." rows={2} containerClassName="mt-4" />
          </Card>
        ))}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/my-quizzes')}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Update Quiz' : 'Create Quiz'}</Button>
        </div>
      </form>
    </div>
  );
}
