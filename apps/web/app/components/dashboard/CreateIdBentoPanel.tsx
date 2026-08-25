'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Search,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Building2,
  Printer,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';

interface WorkerSearchResult {
  id: string;
  displayName: string;
  displayNameNative?: string | null;
  photoMediaId?: string | null;
  activeEmployment?: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
  } | null;
}

export function CreateIdBentoPanel() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<WorkerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [operatorMemory, setOperatorMemory] = useState<{
    lastOrgName?: string;
    lastUnitName?: string;
    lastTemplateName?: string;
  }>({});
  const searchRef = useRef<HTMLDivElement>(null);

  // Load operator memory from localStorage
  useEffect(() => {
    try {
      const memoryRaw = localStorage.getItem('hr_operator_card_memory');
      if (memoryRaw) {
        setOperatorMemory(JSON.parse(memoryRaw));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/people?search=${encodeURIComponent(searchTerm.trim())}&limit=5`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.items || []);
          setIsDropdownOpen(true);
        }
      } catch {
        // Ignore search errors
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to close
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
    if (worker.activeEmployment) {
      router.push(`/cards/new?employmentId=${worker.activeEmployment.id}`);
    } else {
      router.push(`/people/${worker.id}`);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200/60">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Create Employee ID Card
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Generate exact-size physical badges with live bilingual previews and photo capture.
          </p>
        </div>

        <Link href="/cards/new">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold shadow-sm whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>New Worker & Print</span>
          </Button>
        </Link>
      </div>

      {/* Live Worker Search Input */}
      <div className="relative" ref={searchRef}>
        <label
          htmlFor="dashboard-worker-search"
          className="block text-xs font-bold text-slate-700 mb-1.5"
        >
          Quick Print for Registered Worker
        </label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <Input
            id="dashboard-worker-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsDropdownOpen(true);
            }}
            placeholder="Type employee name, Bangla script, or ID number..."
            className="pl-10 h-10 text-xs bg-slate-50 border-slate-300 focus:bg-white"
          />
        </div>

        {/* Dropdown Results */}
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-400">Searching workers...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No workers found matching &ldquo;{searchTerm}&rdquo;.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {results.map((worker) => (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => handleSelectWorker(worker)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-teal-50/60 transition-colors flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#0F766E]">
                          {worker.displayName}
                        </span>
                        {worker.displayNameNative && (
                          <span className="text-[11px] text-[#0F766E] font-medium">
                            {worker.displayNameNative}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {worker.activeEmployment?.employeeNumber || 'Unassigned'} •{' '}
                        {worker.activeEmployment?.jobTitle || 'No Title'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0F766E] flex items-center gap-1">
                      <span>Select</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operator Memory Presets Footer */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Last Presets:{' '}
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
          className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Open Card Wizard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
