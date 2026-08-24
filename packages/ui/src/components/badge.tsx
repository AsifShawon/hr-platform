import React, { HTMLAttributes } from 'react';
import { cn } from '../index.js';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full tracking-wide transition-colors';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] leading-tight',
    md: 'px-2.5 py-1 text-xs leading-none',
  };

  const variantStyles = {
    primary: 'bg-teal-100 text-[#134E4A] border border-teal-200/80',
    secondary: 'bg-teal-50 text-[#0F766E] border border-teal-100',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    error: 'bg-rose-50 text-rose-700 border border-rose-200',
    outline: 'border border-slate-300 text-slate-700 bg-white',
  };

  return (
    <span
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};
