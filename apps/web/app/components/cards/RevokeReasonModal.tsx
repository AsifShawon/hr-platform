'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@hr/ui';
import { CardRevocationReason } from '@hr/domain';

interface RevokeReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: CardRevocationReason, notes: string) => Promise<void>;
  cardSerial?: string;
  workerName?: string;
}

export function RevokeReasonModal({
  isOpen,
  onClose,
  onConfirm,
  cardSerial,
  workerName,
}: RevokeReasonModalProps) {
  const [reason, setReason] = useState<CardRevocationReason>(CardRevocationReason.SEPARATION);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 3) {
      setError('Please provide specific revocation notes for audit compliance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke credential.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revoke Issued Credential</h3>
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

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
          <strong>Security Notice:</strong> Revoking a badge deactivates it immediately across
          physical security checkpoints. Historical issue records and audit lineage are permanently
          preserved.
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="revoke-reason-select"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Revocation Reason *
            </label>
            <select
              id="revoke-reason-select"
              aria-label="Revocation Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as CardRevocationReason)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value={CardRevocationReason.SEPARATION}>
                Employee Separation / Termination
              </option>
              <option value={CardRevocationReason.SUSPENSION}>Security Suspension</option>
              <option value={CardRevocationReason.LOST_STOLEN}>
                Reported Lost / Stolen (Permanent Revocation)
              </option>
              <option value={CardRevocationReason.SECURITY_REVOCATION}>
                Security Breach / Badge Invalidated
              </option>
              <option value={CardRevocationReason.ADMINISTRATIVE_CORRECTION}>
                Administrative Error / Duplicate Correction
              </option>
              <option value={CardRevocationReason.OTHER}>Other Reason</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="revoke-notes-input"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Revocation Notes & Authority *
            </label>
            <textarea
              id="revoke-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Contract terminated on 2026-08-25. Badge surrendered and destroyed..."
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              variant="destructive"
              size="sm"
              isLoading={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Revocation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
