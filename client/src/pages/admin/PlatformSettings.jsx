import React, { useEffect, useState } from 'react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function PlatformSettings() {
  const [settings, setSettings] = useState([]);
  const [form, setForm] = useState({ key: '', value: '', description: '' });
  const { addToast } = useToast();

  useEffect(() => {
    api.get('/admin/settings').then(res => setSettings(res.data.data.settings)).catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let parsedValue;
      try { parsedValue = JSON.parse(form.value); } catch { parsedValue = form.value; }
      await api.put('/admin/settings', { key: form.key, value: parsedValue, description: form.description });
      addToast('Setting saved', 'success');
      const res = await api.get('/admin/settings');
      setSettings(res.data.data.settings);
      setForm({ key: '', value: '', description: '' });
    } catch (err) {
      addToast('Failed to save', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div><h1 className="page-title">Platform Settings</h1><p className="text-[14px] text-textSecondary mt-1">Configure global platform settings.</p></div>

      <Card>
        <CardHeader><CardTitle>Add / Update Setting</CardTitle></CardHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Key" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="e.g., site_name" required />
            <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this for?" />
          </div>
          <div><label className="text-[13px] font-medium">Value (JSON or string)</label><textarea value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-border p-3 text-[14px] font-mono" placeholder='e.g., "QuizSphere" or {"enabled": true}' required /></div>
          <Button type="submit">Save Setting</Button>
        </form>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current Settings ({settings.length})</CardTitle></CardHeader>
        <div className="space-y-3">
          {settings.length === 0 ? <p className="text-[13px] text-textSecondary">No settings yet</p> : settings.map(s => (
            <div key={s._id} className="p-3 rounded-xl border border-border bg-appBg flex justify-between gap-4">
              <div><p className="font-medium text-[13px]">{s.key}</p><p className="text-[12px] text-textSecondary mt-1">{s.description}</p><pre className="mt-2 text-[11px] bg-surface p-2 rounded-lg border border-border overflow-auto max-w-[400px]">{JSON.stringify(s.value, null, 2)}</pre></div>
              <div className="text-right"><p className="text-[11px] text-textSecondary">{new Date(s.updatedAt).toLocaleDateString()}</p><Button variant="secondary" size="sm" className="mt-2" onClick={() => setForm({ key: s.key, value: typeof s.value === 'string' ? s.value : JSON.stringify(s.value), description: s.description })}>Edit</Button></div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Default Configuration</CardTitle>
        <div className="space-y-2 text-[13px]">
          <div className="flex justify-between p-2 rounded-lg bg-appBg border border-border"><span>Default QCoin Reward</span><span>10 QCoins per quiz</span></div>
          <div className="flex justify-between p-2 rounded-lg bg-appBg border border-border"><span>Quiz Approval</span><span>Required (admin review)</span></div>
          <div className="flex justify-between p-2 rounded-lg bg-appBg border border-border"><span>Rate Limit</span><span>100 req / 15 min</span></div>
        </div>
      </Card>
    </div>
  );
}
