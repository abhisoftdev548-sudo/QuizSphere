import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      addToast('Passwords do not match', 'error');
      return;
    }
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      addToast('Account created! Welcome to QuizSphere', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 bg-surface">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <span className="text-[20px] font-bold">QuizSphere</span>
          </div>

          <h1 className="text-[24px] font-semibold">Create your account</h1>
          <p className="text-[14px] text-textSecondary mt-1 mb-8">Start your quiz journey in 30 seconds.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Username" placeholder="johndoe" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} leftIcon={<UserIcon className="w-4 h-4" />} required />
            <Input label="Email" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} leftIcon={<Mail className="w-4 h-4" />} required />
            <Input label="Password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} leftIcon={<Lock className="w-4 h-4" />} rightIcon={<button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} required />
            <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} leftIcon={<Lock className="w-4 h-4" />} required />

            <Button type="submit" fullWidth loading={isLoading}>Create Account</Button>

            <div className="text-center text-[13px] text-textSecondary">
              Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </div>

            <p className="text-[11px] text-textSecondary text-center">By signing up, you agree to our Terms and Privacy Policy. You'll receive 100 free QCoins.</p>
          </form>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 bg-appBg relative items-center justify-center p-12 border-l border-border">
        <div className="max-w-md">
          <h2 className="text-[28px] font-bold leading-tight">Join 10,000+ creators building better learning experiences</h2>
          <div className="mt-6 space-y-4">
            {[
              'Create unlimited quizzes with AI assistance',
              'Run live polls and get instant insights',
              'Earn QCoins and unlock premium features',
              'Moderation tools and audit logs included'
            ].map(t => (
              <div key={t} className="flex items-center gap-3 text-[14px]"><div className="w-6 h-6 rounded-full bg-success-light flex items-center justify-center"><span className="text-success">✓</span></div>{t}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
