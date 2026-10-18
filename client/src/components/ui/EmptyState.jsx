import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({ icon: Icon = Inbox, title = 'No data found', description = 'There is nothing to show here yet.', actionLabel, onAction, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center bg-surface rounded-xl border border-border ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-appBg flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-textSecondary" />
      </div>
      <h3 className="text-[16px] font-semibold text-textPrimary mb-1">{title}</h3>
      <p className="text-[14px] text-textSecondary max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
