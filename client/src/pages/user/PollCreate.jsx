import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { TextareaForward } from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function PollCreate() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    question: '',
    description: '',
    category: 'General',
    isMultipleChoice: false,
    options: [{ text: '' }, { text: '' }],
    tags: ''
  });

  const addOption = () => setForm({ ...form, options: [...form.options, { text: '' }] });
  const removeOption = (idx) => setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  const updateOption = (idx, val) => {
    const opts = [...form.options];
    opts[idx].text = val;
    setForm({ ...form, options: opts });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.options.some(o => !o.text.trim())) {
      addToast('All options must have text', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      await api.post('/polls', payload);
      addToast('Poll created and pending review', 'success');
      navigate('/polls');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h1 className="page-title">Create Poll</h1><p className="text-[14px] text-textSecondary mt-1">Polls go through admin review.</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <TextareaForward label="Question" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="What would you like to ask?" rows={2} required />
            <TextareaForward label="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add context..." rows={2} />
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Category" options={[{ value: 'General', label: 'General' }, { value: 'Technology', label: 'Technology' }, { value: 'Sports', label: 'Sports' }]} value={form.category} onChange={v => setForm({ ...form, category: v })} />
              <div className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.isMultipleChoice} onChange={e => setForm({ ...form, isMultipleChoice: e.target.checked })} /><label className="text-[13px]">Allow multiple choices</label></div>
            </div>
            <Input label="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="fun, opinion" />
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Poll Options</CardTitle><Button type="button" variant="secondary" size="sm" onClick={addOption} leftIcon={<Plus className="w-4 h-4" />}>Add Option</Button></CardHeader>
          <div className="space-y-3">
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={opt.text} onChange={e => updateOption(idx, e.target.value)} placeholder={`Option ${idx + 1}`} containerClassName="flex-1" required />
                {form.options.length > 2 && <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(idx)}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => navigate('/polls')}>Cancel</Button><Button type="submit" loading={loading}>Create Poll</Button></div>
      </form>
    </div>
  );
}
