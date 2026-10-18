import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarDays, CheckCircle2, Save, UserRound } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../layouts/DashboardLayout';
import { Button, Card, Field, PageHeader, TextArea, TextInput } from '../components/ui';
import { apiErrorMessage, patchData } from '../services/api';

const profileSchema = z.object({ displayName: z.string().trim().min(2).max(80), bio: z.string().trim().max(300) });
type ProfileValues = z.infer<typeof profileSchema>;
export default function ProfilePage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { toast } = useToast();
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { displayName: user?.displayName ?? '', bio: user?.bio ?? '' } });
  useEffect(() => { form.reset({ displayName: user?.displayName ?? '', bio: user?.bio ?? '' }); }, [user?.displayName, user?.bio, form]);
  async function onSubmit(values: ProfileValues) {
    try {
      const result = await patchData<{ user: typeof user }>('/users/me/profile', values);
      client.setQueryData(['auth', 'me'], result.user);
      toast('Profile updated.');
    } catch (error) { form.setError('root', { message: apiErrorMessage(error) }); }
  }
  return <div className="page-container"><PageHeader title="My Profile" description="Manage the public details attached to your QuizSphere account." eyebrow="Account" />
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="p-5"><div className="flex flex-col items-center text-center"><Avatar name={user?.displayName ?? 'Member'} url={user?.avatarUrl} size="lg" /><h2 className="mt-3 text-base font-bold text-ink">{user?.displayName}</h2><p className="mt-1 text-xs text-slate-400">@{user?.username}</p><div className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-emerald-700"><CheckCircle2 size={12} />{user?.status}</div></div><div className="mt-5 space-y-3 border-t border-slate-100 pt-4"><ProfileMeta icon={UserRound} label="Account role" value={user?.role === 'admin' ? 'Administrator' : 'User / Creator'} /><ProfileMeta icon={CalendarDays} label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'} /></div></Card>
      <Card className="p-5 sm:p-6"><div className="mb-5"><h2 className="text-sm font-bold text-ink">Profile details</h2><p className="mt-1 text-xs text-slate-400">Your display name and bio can be seen alongside published creations.</p></div><form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4"><Field label="Display name" error={form.formState.errors.displayName?.message}><TextInput {...form.register('displayName')} /></Field><Field label="Email address" hint="Email changes require verification. This address is currently read-only."><TextInput value={user?.email ?? ''} readOnly disabled /></Field><Field label="Bio" error={form.formState.errors.bio?.message} hint="Up to 300 characters."><TextArea {...form.register('bio')} placeholder="A short introduction for your community." /></Field>{form.formState.errors.root && <p className="text-xs text-rose-600">{form.formState.errors.root.message}</p>}<Button type="submit" disabled={form.formState.isSubmitting}><Save size={15} />{form.formState.isSubmitting ? 'Saving…' : 'Save profile'}</Button></form></Card>
    </div>
  </div>;
}
function ProfileMeta({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) { return <div className="flex items-center gap-2.5"><Icon size={15} className="text-slate-400" /><span className="text-xs text-slate-500">{label}</span><span className="ml-auto text-xs font-semibold text-ink">{value}</span></div>; }
