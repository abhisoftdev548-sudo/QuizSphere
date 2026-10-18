import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/api';
import { Button, Field, TextInput } from '../components/ui';

const loginSchema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') });
const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Use at least 2 characters.').max(80),
  username: z.string().trim().min(3, 'Use at least 3 characters.').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, and underscores only.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.').max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return <div className="min-h-screen bg-white lg:grid lg:grid-cols-[.95fr_1.05fr]">
    <div className="relative hidden overflow-hidden bg-[#281763] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
      <div className="absolute -right-40 top-10 h-[480px] w-[480px] rounded-full border border-white/10" /><div className="absolute -right-24 top-28 h-[320px] w-[320px] rounded-full border border-white/10" /><div className="absolute -bottom-40 -left-32 h-[440px] w-[440px] rounded-full bg-brand-700/40 blur-3xl" />
      <Link to="/" className="relative flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-700"><Zap size={18} fill="currentColor" /></span><span className="text-base font-extrabold tracking-[-0.05em]">QuizSphere</span></Link>
      <div className="relative max-w-lg py-16"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-brand-100"><Sparkles size={14} />A community for curious minds</div><h1 className="text-4xl font-bold leading-tight tracking-[-0.04em] xl:text-5xl">Create, take part, and <span className="text-brand-200">keep growing.</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-white/65">Your quizzes, polls, attempts, and creator insights come together in one considered space.</p><div className="mt-8 flex items-center gap-3 text-xs text-white/70"><ShieldCheck size={16} className="text-emerald-300" />Every public submission is reviewed before publication.</div></div>
      <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/45"><span>QuizSphere · Learn together</span><span>QCoins are virtual and have no cash value.</span></div>
    </div>
    <div className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between lg:justify-end"><Link to="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-ink lg:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Zap size={16} fill="currentColor" /></span>QuizSphere</Link><Link to="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-brand-700"><ArrowLeft size={14} />Back to home</Link></div>
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-10">
        <div className="mb-7"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Zap size={20} fill="currentColor" /></div><h2 className="text-2xl font-bold tracking-tight text-ink">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="mt-1.5 text-sm text-slate-500">{mode === 'login' ? 'Sign in to continue your QuizSphere journey.' : 'Join the community and start creating.'}</p></div>
        {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        <p className="mt-7 text-center text-sm text-slate-500">{mode === 'login' ? 'New to QuizSphere?' : 'Already have an account?'}{' '}<Link to={mode === 'login' ? '/register' : '/login'} className="font-semibold text-brand-700 hover:text-brand-800">{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p>
        {mode === 'register' && <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">By creating an account, you agree to use QuizSphere responsibly. Signup QCoins are awarded once per eligible account and cannot be withdrawn as cash.</p>}
      </div>
      <div className="pb-2 text-center text-[11px] text-slate-400">Protected by secure, server-managed sessions</div>
    </div>
  </div>;
}

function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  async function onSubmit(values: LoginValues) {
    try {
      await login(values);
      toast('Signed in successfully.');
      const next = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(next?.startsWith('/app') ? next : '/app/overview', { replace: true });
    } catch (error) { form.setError('root', { message: apiErrorMessage(error) }); }
  }
  return <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
    <Field label="Email address" error={form.formState.errors.email?.message}><TextInput {...form.register('email')} type="email" autoComplete="email" placeholder="you@example.com" /></Field>
    <Field label="Password" error={form.formState.errors.password?.message}><div className="relative"><TextInput {...form.register('password')} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="pr-11" /><button type="button" onClick={() => setShowPassword((show) => !show)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
    {form.formState.errors.root && <p className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{form.formState.errors.root.message}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={16} /></Button>
  </form>;
}

function RegisterForm() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { displayName: '', username: '', email: '', password: '', confirmPassword: '' } });
  async function onSubmit(values: RegisterValues) {
    const { confirmPassword: _confirmPassword, ...payload } = values;
    try {
      const result = await register(payload);
      toast(result.signupBonus > 0 ? `Account created — ${result.signupBonus} QCoins added to your wallet.` : 'Your account is ready.');
      navigate('/app/overview', { replace: true });
    } catch (error) { form.setError('root', { message: apiErrorMessage(error) }); }
  }
  return <form className="space-y-3.5" onSubmit={form.handleSubmit(onSubmit)}>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Display name" error={form.formState.errors.displayName?.message}><TextInput {...form.register('displayName')} autoComplete="name" placeholder="Your name" /></Field><Field label="Username" error={form.formState.errors.username?.message}><TextInput {...form.register('username')} autoComplete="username" placeholder="curious_mind" /></Field></div>
    <Field label="Email address" error={form.formState.errors.email?.message}><TextInput {...form.register('email')} type="email" autoComplete="email" placeholder="you@example.com" /></Field>
    <Field label="Password" error={form.formState.errors.password?.message} hint="At least 10 characters."><div className="relative"><TextInput {...form.register('password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a secure password" className="pr-11" /><button type="button" onClick={() => setShowPassword((show) => !show)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
    <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}><TextInput {...form.register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Enter your password again" /></Field>
    {form.formState.errors.root && <p className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{form.formState.errors.root.message}</p>}
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Creating account…' : 'Create account'}<ArrowRight size={16} /></Button>
  </form>;
}
