import { ArrowRight, BookOpenCheck, CircleDollarSign, Compass, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  return <div className="min-h-screen overflow-hidden bg-white">
    <header className="relative z-10 mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
      <Link to="/" className="flex items-center gap-2.5" aria-label="QuizSphere home">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Zap size={18} fill="currentColor" /></span>
        <span className="text-[16px] font-extrabold tracking-[-0.05em] text-ink">Quiz<span className="text-brand-600">Sphere</span></span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-3">
        <Link to="/explore" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-ink sm:inline-flex">Explore</Link>
        {user ? <Link to="/app/overview" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700">Open workspace<ArrowRight size={15} /></Link> : <>
          <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-ink">Sign in</Link>
          <Link to="/register" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">Get started</Link>
        </>}
      </nav>
    </header>

    <main>
      <section className="relative isolate mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 md:grid-cols-[1.06fr_.94fr] md:pb-28 md:pt-16">
        <div className="pointer-events-none absolute -left-32 -top-8 -z-10 h-[420px] w-[420px] rounded-full bg-brand-50 blur-3xl" />
        <div className="animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/80 px-3 py-1.5 text-xs font-semibold text-brand-700"><Sparkles size={14} />Curiosity is better shared</div>
          <h1 className="max-w-2xl text-[42px] font-extrabold leading-[1.08] tracking-[-0.055em] text-ink sm:text-[54px] lg:text-[62px]">Make every question a chance to <span className="text-brand-600">connect.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">QuizSphere brings quizzes and polls into one thoughtful space. Create something worth sharing, take part in your community, and follow your progress.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/explore" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/15 transition hover:-translate-y-0.5 hover:bg-brand-700">Explore the community<ArrowRight size={16} /></Link>
            <Link to={user ? '/app/creator-studio' : '/register'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/60">Create your first quiz</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600" />Reviewed before publishing</span>
            <span className="inline-flex items-center gap-1.5"><CircleDollarSign size={14} className="text-brand-600" />QCoins are virtual, not cash</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[500px] animate-fade-up [animation-delay:100ms]">
          <div className="absolute -right-5 -top-6 h-32 w-32 rounded-full bg-brand-100/70 blur-2xl" />
          <div className="relative rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_30px_90px_-38px_rgba(64,35,155,.33)] sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><BookOpenCheck size={20} /></div><div><p className="text-sm font-bold text-ink">Your next big idea</p><p className="mt-0.5 text-xs text-slate-400">A small look at the creation flow</p></div></div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Draft</span>
            </div>
            <div className="py-5">
              <div className="mb-3 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Build · Review · Publish</span><span className="text-xs font-semibold text-brand-600">01 / 03</span></div>
              <div className="h-1.5 rounded-full bg-slate-100"><div className="h-full w-1/3 rounded-full bg-brand-600" /></div>
              <div className="mt-7 rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500">A good quiz starts with a question.</p>
                <div className="mt-3 h-3 w-4/5 rounded-md bg-slate-100" /><div className="mt-2 h-3 w-3/5 rounded-md bg-slate-100" />
                <div className="mt-5 grid gap-2">
                  {[0, 1, 2].map((i) => <div key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${i === 1 ? 'border-brand-200 bg-brand-50/70' : 'border-slate-100 bg-slate-50/60'}`}><span className={`h-4 w-4 rounded-full border ${i === 1 ? 'border-brand-600 bg-brand-600 ring-2 ring-brand-100' : 'border-slate-300 bg-white'}`} /><span className={`h-2 rounded ${i === 1 ? 'w-2/3 bg-brand-200' : 'w-3/5 bg-slate-200'}`} /></div>)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs text-slate-400">Every submission gets a review</span><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700">Creator Studio<ArrowRight size={13} /></span></div>
          </div>
          <div className="absolute -bottom-5 -left-4 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Trophy size={18} /></span><span><b className="block text-xs text-ink">Progress that matters</b><small className="mt-0.5 block text-[10px] text-slate-400">Your activity, all in one place</small></span></div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/70">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:px-8 md:grid-cols-3 md:py-16">
          <Feature icon={Compass} number="01" title="Find your next question" text="Browse one shared space for community quizzes and polls, with clear details on availability and participation." />
          <Feature icon={BookOpenCheck} number="02" title="Create with care" text="Build a quiz or poll, save your work, and send it through a transparent review before it goes live." />
          <Feature icon={Trophy} number="03" title="Keep your progress close" text="Track your attempts, creator activity, and QCoin transactions from one simple workspace." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20">
        <div className="rounded-3xl bg-[#251559] px-6 py-10 text-center text-white sm:px-12 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-200">Your community starts with one question</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">Ready to make curiosity a shared experience?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65">Join QuizSphere to build thoughtful quizzes and polls, take part, and see how you grow.</p>
          <Link to={user ? '/app/overview' : '/register'} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50">{user ? 'Go to your workspace' : 'Create your account'}<ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
    <footer className="border-t border-slate-100 px-5 py-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} QuizSphere. Built for curious communities.</footer>
  </div>;
}

function Feature({ icon: Icon, number, title, text }: { icon: typeof Compass; number: string; title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon size={19} /></span><span className="text-xs font-bold tracking-[0.12em] text-slate-300">{number}</span></div><h3 className="mt-5 text-sm font-bold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>;
}
