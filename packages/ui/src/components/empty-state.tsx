import React from 'react';
import { cn } from '../index.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50',
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-teal-50 text-[#0F766E] flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-base font-bold text-slate-800">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
