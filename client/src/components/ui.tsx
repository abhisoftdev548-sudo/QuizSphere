import { forwardRef, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Inbox } from 'lucide-react';
import type { Status } from '../types/api';

export function Button({ className = '', variant = 'primary', size = 'md', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:opacity-50';
  const variants = {
    primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
    secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  const sizes = { sm: 'px-3 py-2 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function Card({ children, className = '', ...props }: { children: ReactNode; className?: string; [key: string]: unknown }) {
  return <section className={`rounded-2xl border border-slate-200/90 bg-white shadow-card ${className}`} {...props}>{children}</section>;
}

const statusConfig: Record<Status, { label: string; style: string }> = {
  draft: { label: 'Draft', style: 'bg-slate-100 text-slate-600 ring-slate-200' },
  pending_review: { label: 'Pending review', style: 'bg-amber-50 text-amber-700 ring-amber-200' },
  changes_requested: { label: 'Changes requested', style: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  approved: { label: 'Approved', style: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  published: { label: 'Published', style: 'bg-green-50 text-green-700 ring-green-200' },
  rejected: { label: 'Rejected', style: 'bg-rose-50 text-rose-700 ring-rose-200' },
  suspended: { label: 'Suspended by admin', style: 'bg-rose-50 text-rose-700 ring-rose-200' },
  closed: { label: 'Closed', style: 'bg-slate-100 text-slate-500 ring-slate-200' },
  archived: { label: 'Archived', style: 'bg-slate-100 text-slate-500 ring-slate-200' },
};
export function StatusBadge({ status, className = '' }: { status: Status | string; className?: string }) {
  const state = statusConfig[status as Status] ?? { label: status.replaceAll('_', ' '), style: 'bg-slate-100 text-slate-600 ring-slate-200' };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${state.style} ${className}`}>{state.label}</span>;
}

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: string; action?: ReactNode; eyebrow?: string }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.13em] text-brand-600">{eyebrow}</p>}
      <h1 className="text-[22px] font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }: { title: string; description: string; action?: ReactNode; icon?: typeof Inbox }) {
  return <div className="flex min-h-[230px] flex-col items-center justify-center px-5 py-12 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon size={22} strokeWidth={1.8} /></div>
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} aria-hidden="true" />;
}
export function PageSkeleton() {
  return <div className="animate-fade-up space-y-5" role="status" aria-label="Loading page"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-80 max-w-full" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-28" />)}</div><Skeleton className="h-64" /></div>;
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  return <AnimatePresence>
    {open && <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.18 }}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="modal-title" className="font-semibold text-ink">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close dialog"><X size={18} /></button></div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4">{footer}</div>}
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}

export function Field({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><label className="block text-xs font-semibold text-slate-700">{label}</label>{children}{error ? <p className="text-xs text-rose-600">{error}</p> : hint ? <p className="text-xs leading-5 text-slate-400">{hint}</p> : null}</div>;
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className = '', ...props }, ref) {
  return <input ref={ref} className={`input-base ${className}`} {...props} />;
});
export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`input-base min-h-[104px] resize-y ${className}`} {...props} />;
});
export const SelectInput = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function SelectInput({ className = '', children, ...props }, ref) {
  return <select ref={ref} className={`input-base ${className}`} {...props}>{children}</select>;
});
