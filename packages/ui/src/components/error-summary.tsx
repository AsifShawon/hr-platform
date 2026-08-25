import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface FormFieldError {
  field?: string;
  message: string;
  fieldId?: string;
}

export interface ErrorSummaryProps {
  title?: string;
  errors: (string | FormFieldError)[];
  onDismiss?: () => void;
  className?: string;
}

export function ErrorSummary({
  title = 'There was a problem with your submission',
  errors,
  onDismiss,
  className = '',
}: ErrorSummaryProps) {
  if (!errors || errors.length === 0) return null;

  const handleFieldClick = (fieldId?: string) => {
    if (!fieldId) return;
    const el = document.getElementById(fieldId);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      role="alert"
      aria-labelledby="error-summary-title"
      tabIndex={-1}
      className={`p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm animate-in fade-in duration-150 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 id="error-summary-title" className="text-xs sm:text-sm font-bold text-rose-900">
              {title}
            </h4>
            <ul className="list-disc list-inside text-xs text-rose-800 space-y-0.5">
              {errors.map((err, idx) => {
                if (typeof err === 'string') {
                  return <li key={idx}>{err}</li>;
                }
                return (
                  <li key={idx}>
                    {err.fieldId ? (
                      <button
                        type="button"
                        onClick={() => handleFieldClick(err.fieldId)}
                        className="underline hover:text-rose-950 font-medium text-left"
                      >
                        {err.field ? `${err.field}: ` : ''}
                        {err.message}
                      </button>
                    ) : (
                      <span>
                        {err.field ? `${err.field}: ` : ''}
                        {err.message}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error message"
            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineError({ message, id }: { message?: string | null; id?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1"
    >
      <AlertCircle className="w-3 h-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
