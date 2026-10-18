import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      addToast('Welcome back!', 'success');
      if (user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
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

          <h1 className="text-[24px] font-semibold">Welcome back</h1>
          <p className="text-[14px] text-textSecondary mt-1 mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} leftIcon={<Mail className="w-4 h-4" />} required />
            <Input label="Password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} leftIcon={<Lock className="w-4 h-4" />} rightIcon={<button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} required />

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded" /> Remember me</label>
              <Link to="#" className="text-primary hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" fullWidth loading={isLoading}>Sign In</Button>

            <div className="text-center text-[13px] text-textSecondary">
              Don't have an account? <Link to="/register" className="text-primary font-medium hover:underline">Sign up</Link>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-appBg border border-border text-[12px]">
              <p className="font-medium mb-1">Demo accounts:</p>
              <p>Admin: admin@quizsphere.com / admin123</p>
              <p>User: demo@quizsphere.com / demo123</p>
            </div>
          </form>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-[#4A22C0]" />
        <div className="relative z-10 max-w-md text-white">
          <h2 className="text-[32px] font-bold leading-tight">The most loved quiz platform for modern teams</h2>
          <p className="mt-4 text-white/80 text-[16px] leading-6">Create engaging quizzes in minutes, run live polls, reward learners with QCoins and watch your community climb the leaderboard.</p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><p className="text-2xl font-bold">10k+</p><p className="text-sm text-white/70">Active creators</p></div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4"><p className="text-2xl font-bold">500k+</p><p className="text-sm text-white/70">Quizzes completed</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
