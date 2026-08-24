import React, { forwardRef, useState, InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../index.js';
import { FOCUS_RING_CLASSES } from '../tokens.js';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  isRequired?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, isRequired, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-sm font-semibold text-slate-800 mb-1.5', className)}
      {...props}
    >
      {children}
      {isRequired && (
        <span className="text-rose-600 ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  ),
);
Label.displayName = 'Label';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
            hasError
              ? 'border-rose-300 text-rose-900 focus-visible:ring-rose-500 focus-visible:border-rose-500'
              : 'border-slate-300 hover:border-slate-400',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            FOCUS_RING_CLASSES,
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

export const ShowHidePasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showPasswordLabel = 'Show password',
      hidePasswordLabel = 'Hide password',
      disabled,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
            'hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
            FOCUS_RING_CLASSES,
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
ShowHidePasswordInput.displayName = 'ShowHidePasswordInput';

export interface FormGroupProps {
  label?: string;
  htmlFor?: string;
  isRequired?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  htmlFor,
  isRequired,
  error,
  helperText,
  children,
  className,
}) => {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const helperId = htmlFor ? `${htmlFor}-helper` : undefined;

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} isRequired={isRequired}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-600 mt-1" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
