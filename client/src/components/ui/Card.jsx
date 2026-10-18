import React from 'react';

export default function Card({ children, className = '', hover = false, padding = true, ...props }) {
  return (
    <div className={`bg-surface rounded-xl border border-border shadow-card ${hover ? 'hover:shadow-card-hover transition-shadow' : ''} ${padding ? 'p-5' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return <div className={`flex items-center justify-between mb-4 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = '', ...props }) {
  return <h3 className={`text-section-title ${className}`} {...props}>{children}</h3>;
}

export function CardContent({ children, className = '', ...props }) {
  return <div className={className} {...props}>{children}</div>;
}
