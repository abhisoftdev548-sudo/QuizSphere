import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, BarChart3, Coins, Shield, Zap, Users, ArrowRight, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <span className="text-[18px] font-bold">QuizSphere</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-[14px] font-medium text-textSecondary hover:text-textPrimary px-4 py-2">Login</Link>
            <Link to="/register"><Button size="md">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary text-[12px] font-medium mb-6">
              <Zap className="w-3.5 h-3.5" /> Premium Quiz & Poll Platform
            </div>
            <h1 className="text-[40px] lg:text-[52px] font-bold leading-[1.1] tracking-tight text-textPrimary">
              Create, share & <span className="text-primary">compete</span> with quizzes that matter
            </h1>
            <p className="mt-6 text-[18px] leading-7 text-textSecondary max-w-xl">
              QuizSphere is a professional SaaS platform for educators, teams and communities. Build engaging quizzes, run live polls, earn QCoins and climb the leaderboard.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link to="/register"><Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>Start Creating Free</Button></Link>
              <Link to="/login"><Button variant="secondary" size="lg">View Demo</Button></Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-[13px] text-textSecondary">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> Free 100 QCoins</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> Cancel anytime</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative">
            <div className="bg-appBg rounded-[20px] p-3 shadow-modal border border-border">
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="h-10 bg-appBg border-b border-border flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Growth Circle Dashboard</h3>
                    <span className="text-[12px] px-2 py-1 rounded-full bg-success-light text-success">Live</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Points', value: '2,847', icon: Trophy },
                      { label: 'Quizzes', value: '24', icon: BarChart3 },
                      { label: 'QCoins', value: '1,240', icon: Coins }
                    ].map(c => (
                      <div key={c.label} className="bg-appBg rounded-xl p-3 border border-border">
                        <c.icon className="w-4 h-4 text-primary mb-2" />
                        <p className="text-[18px] font-bold">{c.value}</p>
                        <p className="text-[11px] text-textSecondary">{c.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-appBg rounded-full w-full"><div className="h-3 bg-primary rounded-full w-[72%]" /></div>
                    <div className="flex justify-between text-[11px] text-textSecondary"><span>Weekly Goal</span><span>72% completed</span></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-appBg border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Trophy, title: 'Competitive Leaderboard', desc: 'Weekly, monthly and all-time rankings with real-time points tracking and podium highlights.' },
              { icon: Coins, title: 'QCoin Economy', desc: 'Immutable ledger, earn by completing quizzes, polls and community activity — no purchases, only earn.' },
              { icon: Shield, title: 'Admin Moderation', desc: 'Approval workflows, audit logs, reports, user management and platform settings.' }
            ].map(f => (
              <div key={f.title} className="bg-surface rounded-xl border border-border p-6">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center mb-4"><f.icon className="w-5 h-5 text-primary" /></div>
                <h3 className="font-semibold text-[16px] mb-2">{f.title}</h3>
                <p className="text-[14px] text-textSecondary leading-6">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-[32px] font-bold tracking-tight">Ready to build your quiz empire?</h2>
        <p className="mt-3 text-textSecondary text-[16px]">Join thousands of creators and learners today.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/register"><Button size="lg">Create Free Account</Button></Link>
          <Link to="/login"><Button variant="secondary" size="lg">Login to Dashboard</Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-[13px] text-textSecondary">
        © 2026 QuizSphere — Premium Quiz & Poll SaaS Platform
      </footer>
    </div>
  );
}
