'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@hr/ui';
import { SelectedWorkerSummary } from './useCardCreationState';

interface ExistingWorkerSelectorProps {
  selectedWorker: SelectedWorkerSummary | null;
  onSelectWorker: (worker: SelectedWorkerSummary) => void;
  onClearWorker: () => void;
}

export const ExistingWorkerSelector: React.FC<ExistingWorkerSelectorProps> = ({
  selectedWorker,
  onSelectWorker,
  onClearWorker,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!searchTerm.trim() || selectedWorker) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);
      try {
        const res = await fetch(
          `/api/people?search=${encodeURIComponent(searchTerm.trim())}&limit=8`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.items || data.people || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Worker search failed:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, selectedWorker]);

  if (selectedWorker) {
    return (
      <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-14 rounded-lg bg-white border border-teal-200 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
            {selectedWorker.photoUrl ? (
              <img
                src={selectedWorker.photoUrl}
                alt={selectedWorker.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-teal-700" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">{selectedWorker.displayName}</h4>
              <Badge variant="primary" size="sm">
                Selected
              </Badge>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {selectedWorker.jobTitle} • {selectedWorker.orgUnitName || 'General Staff'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              ID: {selectedWorker.employeeNumber} • {selectedWorker.organizationName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onClearWorker();
            setSearchTerm('');
          }}
          className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline px-2 py-1 rounded"
        >
          Change Worker
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search worker by name, employee number, or department..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent text-sm bg-white shadow-sm"
          autoFocus
        />
        {isSearching && (
          <Loader2 className="w-4 h-4 text-[#0F766E] animate-spin absolute right-3.5 top-3" />
        )}
      </div>

      {/* Results Dropdown / List */}
      {results.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-md divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {results.map((person) => {
            const emp = person.activeEmployment || (person.employments && person.employments[0]);
            if (!emp) return null;

            return (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onSelectWorker({
                    personId: person.id,
                    employmentId: emp.id,
                    displayName: person.displayName,
                    displayNameLatin: person.displayNameLatin,
                    displayNameNative: person.displayNameNative,
                    employeeNumber: emp.employeeNumber,
                    jobTitle: emp.jobTitle,
                    jobCategory: emp.jobCategory,
                    organizationId: emp.organizationId,
                    organizationName: emp.organization?.name || 'Company',
                    orgUnitName: emp.orgUnit?.name,
                    locationName: emp.location?.name,
                    bloodGroup: person.bloodGroup,
                    emergencyContact: person.primaryPhone,
                    photoUrl: person.photoMedia
                      ? `/api/media/assets/${person.photoMedia.id}`
                      : null,
                    status: emp.status,
                  });
                }}
                className="w-full p-3 text-left hover:bg-teal-50/50 flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-11 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-400 group-hover:text-[#0F766E]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#0F766E] block">
                      {person.displayName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      {emp.employeeNumber} • {emp.jobTitle}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-[#0F766E] opacity-0 group-hover:opacity-100 transition-opacity">
                  Select →
                </span>
              </button>
            );
          })}
        </div>
      )}

      {hasSearched && !isSearching && results.length === 0 && searchTerm.trim() && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
          No active worker records match &quot;{searchTerm}&quot;. Check spelling or switch to
          &quot;Add New Worker&quot;.
        </div>
      )}
    </div>
  );
};
