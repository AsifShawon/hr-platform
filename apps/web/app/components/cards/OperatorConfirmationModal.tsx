'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertOctagon, Printer, AlertTriangle } from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { OperatorPrintStatus } from '@hr/domain';

interface PrintJobItemSummary {
  id: string;
  itemIndex: number;
  cardIssue?: {
    cardSerial: string;
    person?: { displayName: string };
    employment?: { employeeNumber: string };
  };
}

interface OperatorConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    status: 'CONFIRMED_PRINTED' | 'REJECTED_DEFECT';
    notes?: string;
    defectiveItemIds?: string[];
    autoActivateIssues?: boolean;
  }) => Promise<void>;
  jobId: string;
  totalItems: number;
  items?: PrintJobItemSummary[];
}

export function OperatorConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  jobId,
  totalItems,
  items = [],
}: OperatorConfirmationModalProps) {
  const [outcome, setOutcome] = useState<'CONFIRMED_PRINTED' | 'REJECTED_DEFECT'>(
    'CONFIRMED_PRINTED',
  );
  const [defectiveItemIds, setDefectiveItemIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [autoActivate, setAutoActivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDefectiveItem = (itemId: string) => {
    setDefectiveItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm({
        status: outcome,
        notes: notes.trim() || undefined,
        defectiveItemIds: Array.from(defectiveItemIds),
        autoActivateIssues: autoActivate,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit operator confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Operator Physical Print Sign-off</h3>
              <p className="text-[11px] text-slate-500 font-mono">Job #{jobId.substring(0, 8)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Physical Print Outcome *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOutcome('CONFIRMED_PRINTED')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  outcome === 'CONFIRMED_PRINTED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase">Success</span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold">Confirmed Printed</div>
                  <div className="text-[11px] text-slate-500">Badges inspected and passed QA</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('REJECTED_DEFECT')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  outcome === 'REJECTED_DEFECT'
                    ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span className="text-[10px] font-bold uppercase">Defects</span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold">Print Defect / Rejected</div>
                  <div className="text-[11px] text-slate-500">
                    Printer jammed, streak, misaligned
                  </div>
                </div>
              </button>
            </div>
          </div>

          {outcome === 'CONFIRMED_PRINTED' && items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Defective Badges (if any partial defects)
                </span>
                <span className="text-[11px] text-slate-400">
                  {defectiveItemIds.size} marked defective
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 p-1">
                {items.map((item) => {
                  const isDefective = defectiveItemIds.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-2 text-xs rounded-lg cursor-pointer ${
                        isDefective ? 'bg-rose-50 text-rose-900' : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isDefective}
                          onChange={() => toggleDefectiveItem(item.id)}
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className="font-mono font-bold text-[11px]">
                          {item.cardIssue?.cardSerial || `Item #${item.itemIndex + 1}`}
                        </span>
                        <span className="text-slate-700">
                          {item.cardIssue?.person?.displayName || ''}
                        </span>
                      </div>
                      {isDefective && (
                        <Badge variant="error" size="sm">
                          Defective
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {outcome === 'CONFIRMED_PRINTED' && (
            <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer p-3 bg-teal-50/60 rounded-xl border border-teal-100">
              <input
                type="checkbox"
                checked={autoActivate}
                onChange={(e) => setAutoActivate(e.target.checked)}
                className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
              />
              <span>
                <strong>Automatically Activate Non-Defective Badges</strong> (marks credentials
                active and supersedes older cards)
              </span>
            </label>
          )}

          <div>
            <label
              htmlFor="confirmation-notes-input"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Operator Sign-off Notes (Optional)
            </label>
            <textarea
              id="confirmation-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Printed on Tray 2 with 300g stock. Duplex alignment verified..."
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className={
                outcome === 'CONFIRMED_PRINTED'
                  ? 'bg-[#134E4A] text-white'
                  : 'bg-rose-600 text-white'
              }
            >
              Submit Sign-off
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
