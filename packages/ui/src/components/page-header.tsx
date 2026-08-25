import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  kicker?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  kicker,
  backHref,
  backLabel = 'Back',
  actions,
  badge,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 pb-6 border-b border-slate-200/80 ${className}`}>
      {backHref && (
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </a>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          {kicker && (
            <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider block">
              {kicker}
            </span>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
