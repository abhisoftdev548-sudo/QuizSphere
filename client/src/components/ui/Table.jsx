import React from 'react';

export default function Table({ children, className = '', ...props }) {
  return (
    <div className={`bg-surface rounded-xl border border-border shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left" {...props}>{children}</table>
      </div>
    </div>
  );
}

export function TableHeader({ children, ...props }) {
  return <thead className="bg-appBg border-b border-border" {...props}>{children}</thead>;
}

export function TableRow({ children, className = '', ...props }) {
  return <tr className={`border-b border-border last:border-0 hover:bg-appBg/50 transition-colors ${className}`} {...props}>{children}</tr>;
}

export function TableHead({ children, className = '', ...props }) {
  return <th className={`px-4 py-3 text-[12px] font-medium text-textSecondary uppercase tracking-wider ${className}`} {...props}>{children}</th>;
}

export function TableCell({ children, className = '', ...props }) {
  return <td className={`px-4 py-3 text-[14px] text-textPrimary ${className}`} {...props}>{children}</td>;
}
