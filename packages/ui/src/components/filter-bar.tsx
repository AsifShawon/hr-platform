import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from './input.js';
import { Button } from './button.js';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: FilterOption[];
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  statusFilter,
  onStatusChange,
  statusOptions = [],
  hasActiveFilters = false,
  onResetFilters,
  children,
  className = '',
}: FilterBarProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10 pr-8 h-10 text-xs bg-slate-50 border-slate-200 focus:bg-white"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search text"
            className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Select Filters & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {statusOptions.length > 0 && onStatusChange && (
          <select
            value={statusFilter || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStatusChange(e.target.value)}
            aria-label="Filter by status"
            className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {children}

        {hasActiveFilters && onResetFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="text-xs text-slate-600 hover:text-slate-900 border-slate-200"
          >
            <RotateCcw className="w-3 h-3 mr-1 text-slate-400" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
