import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Modal, PageHeader } from '../components/ui';
import { AlertTriangle, KeyRound, LogOut, ShieldCheck, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  async function signOut() { try { await logout(); } finally { toast('You have been signed out.', 'info'); navigate('/login'); } }
  return <div className="page-container"><PageHeader title="Settings" description="Review your account and session security." eyebrow="Account preferences" />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5"><Card className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={18} /></span><div><h2 className="text-sm font-bold text-ink">Account security</h2><p className="mt-1 text-xs leading-5 text-slate-500">QuizSphere stores a one-way password hash and rotates refresh sessions. Your active session is protected with secure, same-site cookies.</p></div></div><div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100"><SettingRow icon={KeyRound} label="Sign-in email" value={user?.email ?? '—'} /><SettingRow icon={ShieldCheck} label="Account role" value={user?.role === 'admin' ? 'Administrator' : 'User / Creator'} /><SettingRow icon={Smartphone} label="Account status" value={user?.status ?? '—'} /></div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Smartphone size={17} /></span><div><h2 className="text-sm font-bold text-ink">Session controls</h2><p className="mt-1 text-xs leading-5 text-slate-500">Sign out from this browser to revoke its refresh session. Password reset delivery can be enabled by configuring an email provider on the server.</p></div></div><Button variant="outline" className="mt-5" onClick={() => setConfirmOpen(true)}><LogOut size={15} />Sign out of this browser</Button></Card></div>
      <Card className="h-fit border-amber-100 bg-amber-50/60 p-5"><div className="flex gap-2.5"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" /><div><h2 className="text-sm font-bold text-amber-900">QCoin and account policy</h2><p className="mt-2 text-xs leading-5 text-amber-800/80">QCoins are internal virtual credits. They cannot be withdrawn as cash or transferred between ordinary users. Platform pricing and account eligibility are controlled by administrators.</p></div></div></Card>
    </div>
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Sign out?" footer={<><Button variant="outline" onClick={() => setConfirmOpen(false)}>Stay signed in</Button><Button variant="danger" onClick={() => void signOut()}><LogOut size={14} />Sign out</Button></>}><p className="text-sm leading-6 text-slate-600">This browser’s refresh session will be revoked. You can sign in again at any time.</p></Modal>
  </div>;
}
function SettingRow({ icon: Icon, label, value }: { icon: typeof KeyRound; label: string; value: string }) { return <div className="flex items-center gap-2.5 px-3.5 py-3"><Icon size={14} className="text-slate-400" /><span className="text-xs text-slate-500">{label}</span><span className="ml-auto truncate text-xs font-semibold text-ink">{value}</span></div>; }
