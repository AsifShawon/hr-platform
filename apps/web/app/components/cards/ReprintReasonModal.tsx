'use client';

import React, { useState } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@hr/ui';
import { CardIssueReason } from '@hr/domain';

interface ReprintReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: CardIssueReason, notes: string) => Promise<void>;
  cardSerial?: string;
  workerName?: string;
}

export function ReprintReasonModal({
  isOpen,
  onClose,
  onConfirm,
  cardSerial,
  workerName,
}: ReprintReasonModalProps) {
  const [reason, setReason] = useState<CardIssueReason>(CardIssueReason.DAMAGED);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 3) {
      setError('Please provide a specific reason note explaining the card replacement.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to request card replacement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Request Replacement Reprint</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {cardSerial || 'Active Credential'}
              </p>
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

        {workerName && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            Worker: <strong className="text-slate-900">{workerName}</strong>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reprint-reason-select"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Replacement Reason *
            </label>
            <select
              id="reprint-reason-select"
              aria-label="Replacement Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as CardIssueReason)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value={CardIssueReason.DAMAGED}>Damaged / Worn Out Physical Badge</option>
              <option value={CardIssueReason.LOST}>Lost Physical Badge</option>
              <option value={CardIssueReason.STOLEN}>Stolen Badge</option>
              <option value={CardIssueReason.NAME_CHANGE}>Worker Name / Script Change</option>
              <option value={CardIssueReason.TITLE_CHANGE}>Designation / Department Change</option>
              <option value={CardIssueReason.PROMOTION}>Promotion</option>
              <option value={CardIssueReason.TRANSFER}>Location / Unit Transfer</option>
              <option value={CardIssueReason.EXPIRED}>Badge Validity Expired</option>
              <option value={CardIssueReason.OTHER}>Other Administrative Replacement</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="reprint-notes-input"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Audit Notes & Explanation *
            </label>
            <textarea
              id="reprint-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Employee reported cracked card casing on 2026-08-25..."
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              required
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
              className="bg-[#134E4A] text-white"
            >
              Generate Replacement Badge
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
