import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-sm',
  secondary: 'bg-surface border border-border text-textPrimary hover:bg-appBg focus:ring-primary',
  ghost: 'bg-transparent text-textSecondary hover:bg-primary-light hover:text-primary focus:ring-primary',
  danger: 'bg-error text-white hover:bg-red-600 focus:ring-error shadow-sm',
  success: 'bg-success text-white hover:bg-emerald-600 focus:ring-success'
};

const sizes = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-11 px-6 text-[15px]'
};

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props 
}) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
  
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {leftIcon && !loading && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </motion.button>
  );
}
