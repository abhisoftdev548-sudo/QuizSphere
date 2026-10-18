import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, hint, leftIcon, rightIcon, className = '', containerClassName = '', ...props }, ref) => {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && <label className="block text-[13px] font-medium text-textPrimary">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">{leftIcon}</div>}
        <input
          ref={ref}
          className={`w-full h-10 px-3 rounded-lg border bg-surface text-[14px] placeholder:text-textSecondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all
            ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-error focus:ring-error focus:border-error' : 'border-border'}
            ${className}`}
          {...props}
        />
        {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary">{rightIcon}</div>}
      </div>
      {error && <p className="text-[12px] text-error">{error}</p>}
      {hint && !error && <p className="text-[12px] text-textSecondary">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;

export function Textarea({ label, error, hint, className = '', containerClassName = '', ...props }, ref) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && <label className="block text-[13px] font-medium text-textPrimary">{label}</label>}
      <textarea
        ref={ref}
        className={`w-full px-3 py-2.5 rounded-lg border bg-surface text-[14px] placeholder:text-textSecondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none
          ${error ? 'border-error focus:ring-error' : 'border-border'} ${className}`}
        {...props}
      />
      {error && <p className="text-[12px] text-error">{error}</p>}
      {hint && !error && <p className="text-[12px] text-textSecondary">{hint}</p>}
    </div>
  );
}

export const TextareaForward = forwardRef(Textarea);
