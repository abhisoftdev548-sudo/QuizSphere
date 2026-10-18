import React, { useState } from 'react';
import { Shield, Palette, LogOut, User, Bell } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, updateProfile, logout } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(user?.preferences || { theme: 'light' });
  const [showNotifications, setShowNotifications] = useState(true);

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
        <p className="text-[14px] text-textSecondary mt-1">Manage your account preferences. QCoins are earned only, not purchased.</p>
      </div>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Bell className="w-5 h-5" /><CardTitle>Notifications</CardTitle></div></CardHeader>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border">
            <div><p className="text-[14px] font-medium">In-App Notifications</p><p className="text-[12px] text-textSecondary">Receive notifications for quiz approvals, QCoins, ratings</p></div>
            <input type="checkbox" checked={showNotifications} onChange={e => setShowNotifications(e.target.checked)} className="w-5 h-5" />
          </label>
          <p className="text-[11px] text-textSecondary">Email notifications are not implemented yet. You will receive in-app notifications only.</p>
        </div>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Palette className="w-5 h-5" /><CardTitle>Appearance</CardTitle></div></CardHeader>
        <div className="grid grid-cols-2 gap-3">
          {['light', 'dark'].map(theme => (
            <button key={theme} onClick={() => setPrefs({ ...prefs, theme })} className={`p-4 rounded-xl border-2 text-left ${prefs.theme === theme ? 'border-primary bg-primary-light' : 'border-border bg-surface'}`}>
              <p className="font-medium capitalize">{theme}</p>
              <p className="text-[12px] text-textSecondary mt-1">{theme === 'light' ? 'Clean and bright (default)' : 'Dark mode (coming soon)'}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Shield className="w-5 h-5" /><CardTitle>Privacy & Security</CardTitle></div></CardHeader>
        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between p-3 rounded-xl bg-appBg border border-border"><span>Account Type</span><span className="capitalize font-medium">{user?.role}</span></div>
          <div className="flex justify-between p-3 rounded-xl bg-appBg border border-border"><span>Member Since</span><span>{new Date(user?.createdAt).toLocaleDateString()}</span></div>
          <div className="flex justify-between p-3 rounded-xl bg-appBg border border-border"><span>QCoin System</span><span className="text-success font-medium">Earn Only - No Purchase</span></div>
        </div>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><User className="w-5 h-5" /><CardTitle>Account</CardTitle></div></CardHeader>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-appBg border border-border text-[13px]">
            <p><strong>Username:</strong> {user?.username}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Points:</strong> {user?.points} • <strong>QCoins:</strong> {user?.qcoins}</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button onClick={handleSave}>Save Settings</Button>
        <Button variant="danger" leftIcon={<LogOut className="w-4 h-4" />} onClick={handleLogout}>Logout</Button>
      </div>
    </div>
  );
}
