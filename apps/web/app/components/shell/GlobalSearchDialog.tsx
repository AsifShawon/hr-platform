'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Building2, ChevronRight, Loader2, X, ShieldAlert, BadgeCheck } from 'lucide-react';
import { useActiveOrg } from '../../context/ActiveOrgContext';

interface SearchResultItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  banglaName?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  employmentStatus?: string;
  hasPhoto?: boolean;
}

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchDialog({ isOpen, onClose }: GlobalSearchDialogProps) {
  const router = useRouter();
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query against /api/people
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          search: query.trim(),
          pageSize: '8',
        });
        if (activeOrgId) {
          params.append('organizationId', activeOrgId);
        }

        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['X-Organization-Id'] = activeOrgId;
        }

        const res = await fetch(`/api/people?${params.toString()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const items = (data.items || []).map((p: any) => ({
            id: p.id,
            employeeNumber: p.employeeNumber,
            firstName: p.firstName,
            lastName: p.lastName,
            banglaName: p.banglaName,
            departmentName: p.departmentName || p.department?.name || p.orgUnit?.name,
            designationName: p.designationName || p.designation?.title || p.positionTitle,
            employmentStatus: p.status || p.employmentStatus,
            hasPhoto: !!p.hasPhoto,
          }));
          setResults(items);
          setSelectedIndex(0);
        }
      } catch {
        // Network error handled
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeOrgId]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex].id);
    }
  };

  const handleSelect = (personId: string) => {
    onClose();
    router.push(`/people/${personId}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global worker search"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <Search className="w-5 h-5 text-teal-700 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search worker by ID, English or Bengali name..."
            aria-label="Search worker registry"
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-teal-700 animate-spin shrink-0" />}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/80 text-slate-600 font-semibold">
            ESC
          </span>
        </div>

        {/* Facility Scope Indicator */}
        <div className="px-4 py-2 bg-teal-50/50 border-b border-teal-100/60 flex items-center justify-between text-xs text-teal-900">
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>Scope: {activeOrg ? activeOrg.displayName || activeOrg.name : 'All Facilities'}</span>
          </div>
          <span className="text-[11px] text-teal-700">Safe field indexing • Masked government IDs</span>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 max-h-96">
          {!query.trim() ? (
            <div className="py-10 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Quick Worker & Identity Lookup</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Type an employee badge number, employee name, or department to instantly locate records.
              </p>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="py-10 text-center space-y-1.5">
              <p className="text-xs font-semibold text-slate-700">No workers matched &quot;{query}&quot;</p>
              <p className="text-[11px] text-slate-400">
                Check employee number spelling or ensure the worker is in this facility.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((person, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleSelect(person.id)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-teal-50/80 border border-teal-200/80 text-teal-950'
                        : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-teal-100/80 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                        {person.firstName?.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {person.firstName} {person.lastName}
                          </span>
                          {person.banglaName && (
                            <span className="text-xs text-slate-500 font-bengali truncate">
                              ({person.banglaName})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                            {person.employeeNumber}
                          </span>
                          {person.departmentName && (
                            <>
                              <span>•</span>
                              <span className="truncate">{person.departmentName}</span>
                            </>
                          )}
                          {person.designationName && (
                            <>
                              <span>•</span>
                              <span className="truncate">{person.designationName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                        {person.employmentStatus || 'ACTIVE'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] ml-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↵</kbd> to select
            </span>
          </div>
          <span className="text-slate-400">Employee # is authoritative identifier</span>
        </div>
      </div>
    </div>
  );
}
