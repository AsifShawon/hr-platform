import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../index.js';
import { FOCUS_RING_CLASSES } from '../tokens.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none rounded-lg';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[32px]',
      md: 'px-4 py-2 text-sm gap-2 min-h-[40px]',
      lg: 'px-5 py-2.5 text-base gap-2.5 min-h-[48px]',
    };

    const variantStyles = {
      primary: 'bg-[#134E4A] text-white hover:bg-[#115E59] active:bg-[#0F766E] shadow-sm',
      secondary: 'bg-[#0F766E] text-white hover:bg-[#115E59] active:bg-[#134E4A] shadow-sm',
      outline:
        'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-sm',
      ghost: 'text-slate-700 hover:bg-teal-50/60 hover:text-[#0F766E] active:bg-teal-100/60',
      destructive: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
      link: 'text-[#0F766E] hover:text-[#134E4A] underline-offset-4 hover:underline p-0 min-h-0',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          FOCUS_RING_CLASSES,
          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
