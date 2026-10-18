import React from 'react';

const variants = {
  default: 'bg-appBg text-textSecondary',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-error-light text-error',
  info: 'bg-blue-50 text-blue-600'
};

export default function Badge({ children, variant = 'default', className = '', dot = false, ...props }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${variants[variant]} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${variant === 'success' ? 'bg-success' : variant === 'error' ? 'bg-error' : variant === 'warning' ? 'bg-warning' : 'bg-primary'}`} />}
      {children}
    </span>
  );
}
