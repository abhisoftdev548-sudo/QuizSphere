import React, { useState } from 'react';
import { Bell, Shield, Palette, LogOut } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, updateProfile, logout } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(user?.preferences || { emailNotifications: true, theme: 'light' });

  const handleSave = async () => {
    try {
      await updateProfile({ preferences: prefs });
      addToast('Settings saved', 'success');
    } catch {
      addToast('Failed to save', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-[14px] text-textSecondary mt-1">Manage your account preferences.</p>
      </div>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Bell className="w-5 h-5" /><CardTitle>Notifications</CardTitle></div></CardHeader>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border">
            <div><p className="text-[14px] font-medium">Email Notifications</p><p className="text-[12px] text-textSecondary">Receive email updates about quizzes and rewards</p></div>
            <input type="checkbox" checked={prefs.emailNotifications} onChange={e => setPrefs({ ...prefs, emailNotifications: e.target.checked })} className="w-5 h-5" />
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Palette className="w-5 h-5" /><CardTitle>Appearance</CardTitle></div></CardHeader>
        <div className="grid grid-cols-2 gap-3">
          {['light', 'dark'].map(theme => (
            <button key={theme} onClick={() => setPrefs({ ...prefs, theme })} className={`p-4 rounded-xl border-2 text-left ${prefs.theme === theme ? 'border-primary bg-primary-light' : 'border-border bg-surface'}`}>
              <p className="font-medium capitalize">{theme}</p>
              <p className="text-[12px] text-textSecondary mt-1">{theme === 'light' ? 'Clean and bright' : 'Easy on eyes (coming soon)'}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Shield className="w-5 h-5" /><CardTitle>Privacy & Security</CardTitle></div></CardHeader>
        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between p-3 rounded-xl bg-appBg border border-border"><span>Two-factor authentication</span><span className="text-textSecondary">Not enabled</span></div>
          <div className="flex justify-between p-3 rounded-xl bg-appBg border border-border"><span>Login sessions</span><span className="text-primary cursor-pointer">Manage</span></div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button onClick={handleSave}>Save Settings</Button>
        <Button variant="danger" leftIcon={<LogOut className="w-4 h-4" />} onClick={handleLogout}>Logout</Button>
      </div>
    </div>
  );
}
