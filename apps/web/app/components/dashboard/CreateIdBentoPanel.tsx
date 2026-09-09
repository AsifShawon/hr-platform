'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Search,
  Plus,
  ArrowRight,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Camera,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';

interface WorkerSearchResult {
  id: string;
  displayName: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  photoMediaId?: string | null;
  photoUrl?: string | null;
  activeEmployment?: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
    organizationName?: string;
    orgUnitName?: string;
    status: string;
  } | null;
  isReadyForCard?: boolean;
  blockingReason?: string;
}

export function CreateIdBentoPanel() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<WorkerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [operatorMemory, setOperatorMemory] = useState<{
    lastOrgName?: string;
    lastUnitName?: string;
    lastTemplateName?: string;
  }>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load operator memory from localStorage
  useEffect(() => {
    try {
      const memoryRaw = localStorage.getItem('hr_operator_card_memory');
      if (memoryRaw) {
        setOperatorMemory(JSON.parse(memoryRaw));
      }
    } catch {
      // Safe fallback
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/people?search=${encodeURIComponent(searchTerm.trim())}&limit=6`,
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: WorkerSearchResult[] = (data.items || []).map((w: any) => {
            const hasPhoto = Boolean(w.photoMediaId || w.photoMedia || w.photoUrl);
            const isReady = hasPhoto && w.activeEmployment?.status === 'ACTIVE';
            let reason = undefined;
            if (!hasPhoto) reason = 'Missing portrait photo';
            else if (w.activeEmployment?.status !== 'ACTIVE') reason = 'Employment inactive';

            return {
              id: w.id,
              displayName: w.displayName,
              displayNameLatin: w.displayNameLatin,
              displayNameNative: w.displayNameNative,
              photoMediaId: w.photoMediaId,
              photoUrl: w.photoUrl || (w.photoMediaId ? `/api/media/${w.photoMediaId}` : null),
              activeEmployment: w.activeEmployment,
              isReadyForCard: isReady,
              blockingReason: reason,
            };
          });
          setResults(mapped);
          setIsDropdownOpen(true);
          setHighlightedIndex(mapped.length > 0 ? 0 : -1);
        }
      } catch {
        // Safe fallback
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectWorker = (worker: WorkerSearchResult) => {
    setIsDropdownOpen(false);
    setSearchTerm('');
    if (worker.activeEmployment?.id) {
      router.push(`/cards/new?employmentId=${worker.activeEmployment.id}`);
    } else {
      router.push(`/people/${worker.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[highlightedIndex];
      if (selected) {
        handleSelectWorker(selected);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-5 h-full relative overflow-hidden">
      {/* Visual Accent Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-800 via-teal-600 to-teal-500" />

      {/* Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-900 text-white shadow-2xs">
              <CreditCard className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Create Employee ID Card
              </h2>
              <p className="text-xs text-slate-500">
                Single-pass bilingual card issuance with real-time layout validation
              </p>
            </div>
          </div>
        </div>

        <Link href="/cards/new" className="shrink-0">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto bg-teal-900 hover:bg-teal-800 text-white font-semibold shadow-xs whitespace-nowrap text-sm px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>New Worker & Print</span>
          </Button>
        </Link>
      </div>

      {/* Search Input with Accessible Combobox */}
      <div className="relative" ref={searchRef}>
        <label
          htmlFor="dashboard-worker-combobox"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          Quick Print for Registered Worker (Name or Employee Number)
        </label>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            ref={inputRef}
            id="dashboard-worker-combobox"
            type="text"
            role="combobox"
            aria-expanded={isDropdownOpen}
            aria-autocomplete="list"
            aria-controls="dashboard-worker-results"
            aria-activedescendant={
              highlightedIndex >= 0 ? `worker-result-${results[highlightedIndex]?.id}` : undefined
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search by worker name, Bangla script, or employee number..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
          />
        </div>

        {/* Combobox Dropdown Results */}
        {isDropdownOpen && (
          <div
            id="dashboard-worker-results"
            role="listbox"
            className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-30 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          >
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-500">Searching worker registry...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No workers found matching &ldquo;{searchTerm}&rdquo;.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {results.map((worker, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={worker.id}
                      id={`worker-result-${worker.id}`}
                      role="option"
                      aria-selected={isHighlighted}
                      onClick={() => handleSelectWorker(worker)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isHighlighted ? 'bg-teal-50/80 text-teal-950' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      {/* Photo Thumbnail + Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {worker.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={worker.photoUrl}
                              alt={worker.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              {worker.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold truncate">
                              {worker.displayName}
                            </span>
                            {worker.displayNameNative && (
                              <span className="text-xs text-teal-700 font-medium hidden sm:inline truncate">
                                {worker.displayNameNative}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5 truncate">
                            <span>{worker.activeEmployment?.employeeNumber || 'NO-ID'}</span>
                            <span>•</span>
                            <span className="truncate">{worker.activeEmployment?.jobTitle || 'Worker'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Readiness Status & CTA */}
                      <div className="flex items-center gap-2 shrink-0">
                        {worker.isReadyForCard ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                            <span>Ready</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" aria-hidden="true" />
                            <span>{worker.blockingReason || 'Attention'}</span>
                          </span>
                        )}

                        <span className="text-xs font-semibold text-teal-800 flex items-center gap-0.5 group-hover:underline">
                          <span>{worker.isReadyForCard ? 'Print' : 'Open'}</span>
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Safe Operator Preset Context Footer */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Recent Context:{' '}
            <strong className="text-slate-900">
              {operatorMemory.lastOrgName || 'Default Facility'}
            </strong>{' '}
            •{' '}
            <span className="text-slate-700">
              {operatorMemory.lastTemplateName || 'Classic Vertical (60×90mm)'}
            </span>
          </span>
        </div>

        <Link
          href="/cards/new"
          className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Advanced Card Wizard</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

