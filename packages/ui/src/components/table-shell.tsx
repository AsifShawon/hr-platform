import React, { TableHTMLAttributes } from 'react';
import { cn } from '../index.js';

export interface TableShellProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

export const TableShell: React.FC<TableShellProps> = ({
  className,
  wrapperClassName,
  children,
  ...props
}) => {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Scrollable table container"
      className={cn(
        'w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-[#0F766E]',
        wrapperClassName,
      )}
    >
      <table className={cn('w-full text-left text-sm text-slate-600', className)} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <thead
    className={cn(
      'bg-slate-50 text-xs font-semibold uppercase text-slate-700 border-b border-slate-200',
      className,
    )}
    {...props}
  />
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => <tbody className={cn('divide-y divide-slate-100', className)} {...props} />;

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => <tr className={cn('hover:bg-teal-50/30 transition-colors', className)} {...props} />;

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => <th className={cn('px-4 py-3 font-semibold text-slate-700', className)} {...props} />;

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => <td className={cn('px-4 py-3 text-slate-700 align-middle', className)} {...props} />;
