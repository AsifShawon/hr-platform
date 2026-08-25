'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Printer,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCw,
  PlusCircle,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { CardIssueStatus, CardIssueReason, CardRevocationReason } from '@hr/domain';
import { CardReadinessResultDTO, CardIssueDTO } from '@hr/schemas';
import { ReprintReasonModal } from './ReprintReasonModal';
import { RevokeReasonModal } from './RevokeReasonModal';

interface CardOperationsPanelProps {
  personId: string;
  employmentId?: string;
  workerName: string;
  employeeNumber: string;
}

export function CardOperationsPanel({
  personId,
  employmentId,
  workerName,
  employeeNumber,
}: CardOperationsPanelProps) {
  const [readiness, setReadiness] = useState<CardReadinessResultDTO | null>(null);
  const [issuesHistory, setIssuesHistory] = useState<CardIssueDTO[]>([]);
  const [activeIssue, setActiveIssue] = useState<CardIssueDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIssuing, setIsIssuing] = useState(false);
  const [previewSide, setPreviewSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Modals state
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  const loadCardData = async () => {
    if (!employmentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [readinessRes, issuesRes] = await Promise.all([
        fetch(`/api/cards/readiness/${employmentId}`),
        fetch(`/api/cards/issues?employmentId=${employmentId}&limit=20`),
      ]);

      if (readinessRes.ok) {
        const rData = await readinessRes.json();
        setReadiness(rData);
      }

      if (issuesRes.ok) {
        const iData = await issuesRes.json();
        const items = iData.items || [];
        setIssuesHistory(items);
        const current = items.find(
          (i: CardIssueDTO) => i.isCurrent && i.status === CardIssueStatus.ISSUED,
        );
        setActiveIssue(current || items[0] || null);
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to load card operations data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCardData();
  }, [employmentId]);

  // Handle direct card issuance
  const handleIssueDirect = async () => {
    if (!employmentId) return;
    setIsIssuing(true);
    setFeedbackMessage(null);

    const idempotencyKey = `ISSUE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/cards/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employmentId,
          issueReason: CardIssueReason.INITIAL,
          idempotencyKey,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setFeedbackMessage({
          type: 'success',
          text: `ID Card successfully issued! Serial: ${created.cardSerial}`,
        });
        loadCardData();
      } else {
        const err = await res.json();
        setFeedbackMessage({
          type: 'error',
          text: err.message || err.error || 'Failed to issue card.',
        });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error issuing ID card.' });
    } finally {
      setIsIssuing(false);
    }
  };

  // Handle replacement reprint
  const handleConfirmReprint = async (reason: CardIssueReason, notes: string) => {
    if (!activeIssue) return;
    const idempotencyKey = `REPRINT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const res = await fetch(`/api/cards/issues/${activeIssue.id}/reprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        reasonNotes: notes,
        idempotencyKey,
      }),
    });

    if (res.ok) {
      const newIssue = await res.json();
      setFeedbackMessage({
        type: 'success',
        text: `Replacement badge issued! New Serial: ${newIssue.cardSerial} (Issue #${newIssue.issueNumber})`,
      });
      loadCardData();
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to reprint card.');
    }
  };

  // Handle revocation
  const handleConfirmRevoke = async (reason: CardRevocationReason, notes: string) => {
    if (!activeIssue) return;

    const res = await fetch(`/api/cards/issues/${activeIssue.id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        reasonNotes: notes,
      }),
    });

    if (res.ok) {
      setFeedbackMessage({
        type: 'success',
        text: `Card ${activeIssue.cardSerial} has been revoked and marked inactive.`,
      });
      loadCardData();
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to revoke card.');
    }
  };

  if (!employmentId) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
        No active employment assignment found for this person. Assign a position to manage
        credentials.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Card Status, Actions, & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Card & Preflight Readiness (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Card Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-sm font-bold text-slate-900">Current Active Credential</h3>
              </div>
              {activeIssue && (
                <Badge
                  variant={
                    activeIssue.status === CardIssueStatus.ISSUED
                      ? 'success'
                      : activeIssue.status === CardIssueStatus.REVOKED
                        ? 'error'
                        : 'neutral'
                  }
                  size="sm"
                >
                  {activeIssue.status}
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0F766E]" />
                <span>Loading credential status...</span>
              </div>
            ) : activeIssue && activeIssue.status === CardIssueStatus.ISSUED ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Card Serial
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {activeIssue.cardSerial}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Issue Sequence
                    </span>
                    <span className="font-semibold text-slate-800">
                      Issue #{activeIssue.issueNumber} ({activeIssue.issueReason})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Issued At
                    </span>
                    <span className="text-slate-700">
                      {activeIssue.issuedAt
                        ? new Date(activeIssue.issuedAt).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Bar */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <a
                    href={`/api/cards/issues/${activeIssue.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center"
                  >
                    <Button type="button" variant="outline" size="sm">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download Master PDF (100%)
                    </Button>
                  </a>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReprintModalOpen(true)}
                  >
                    <RotateCw className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Replacement / Reprint
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRevokeModalOpen(true)}
                    className="text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                    Revoke Badge
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-300">
                <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">No Active Badge Issued</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                    This worker does not have an active physical badge credential yet.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isIssuing}
                  onClick={handleIssueDirect}
                  disabled={!readiness?.isReady}
                  className="bg-[#134E4A] text-white font-bold"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Issue ID Card Now
                </Button>
              </div>
            )}
          </div>

          {/* Preflight Diagnostics Widget */}
          {readiness && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Card Readiness Diagnostic
                  </h4>
                </div>
                <Badge variant={readiness.isReady ? 'success' : 'error'} size="sm">
                  {readiness.isReady ? 'Ready to Print' : 'Needs Attention'}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                {readiness.blockers.map((b, i) => (
                  <div
                    key={i}
                    className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">{b.message}</span>
                      {b.suggestion && (
                        <span className="text-[11px] text-rose-700">{b.suggestion}</span>
                      )}
                    </div>
                  </div>
                ))}

                {readiness.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">{w.message}</span>
                      {w.suggestion && (
                        <span className="text-[11px] text-amber-700">{w.suggestion}</span>
                      )}
                    </div>
                  </div>
                ))}

                {readiness.blockers.length === 0 && readiness.warnings.length === 0 && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Worker record satisfies all physical badge schema and resolution requirements.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Card Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live Badge Preview
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewSide('FRONT')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewSide === 'FRONT' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Front (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('BACK')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewSide === 'BACK' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Back (বাংলা)
                </button>
              </div>
            </div>

            {/* Visual Preview Box (60x90 Aspect Ratio) */}
            <div className="w-full aspect-[2/3] max-w-[240px] mx-auto rounded-2xl bg-white border-2 border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between p-3 relative">
              {previewSide === 'FRONT' ? (
                <>
                  <div className="bg-[#134E4A] -m-3 p-2 text-white flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-wider uppercase">
                      COMPANY ID
                    </span>
                    <span className="text-[7px] px-1 py-0.5 bg-teal-800 rounded">60×90mm</span>
                  </div>

                  <div className="text-center py-2 space-y-1">
                    <div className="w-16 h-20 bg-teal-50 border border-teal-200 rounded-lg mx-auto overflow-hidden flex items-center justify-center font-bold text-[#0F766E]">
                      {workerName.charAt(0)}
                    </div>
                    <div className="font-bold text-xs text-slate-900 leading-tight pt-1 truncate">
                      {workerName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">{employeeNumber}</div>
                  </div>

                  <div className="border-t border-slate-200 pt-1 text-[8px] text-slate-400 flex justify-between">
                    <span>AUTH SIGN</span>
                    <span className="font-mono">{activeIssue?.cardSerial || 'PREVIEW'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[#134E4A] -m-3 p-2 text-white text-center">
                    <span className="text-[9px] font-bold">জরুরি নির্দেশিকা</span>
                  </div>

                  <div className="py-2 text-left space-y-1.5 text-[9px] text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[7px]">নাম</span>
                      <span className="font-bold text-slate-900">{workerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[7px]">ডিজিটাল যাচাইকরণ</span>
                      <div className="p-1 border border-slate-200 rounded bg-slate-50 font-mono text-[8px]">
                        QR CODE • {activeIssue?.cardSerial || 'CARD-SEC'}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-1 text-[7px] text-slate-400 text-center">
                    কার্ডটি প্রতিষ্ঠানের সম্পত্তি
                  </div>
                </>
              )}
            </div>

            <p className="text-[10px] text-center text-slate-400">
              Format: Standard Company Vertical (60.00 × 90.00 mm) • 300 DPI High-Resolution
            </p>
          </div>
        </div>
      </div>

      {/* Historical Lineage & Lifetime Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Credential Lifecycle & Lineage History ({issuesHistory.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Immutable audit snapshots</span>
        </div>

        {issuesHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            No lifetime card issuance events recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {issuesHistory.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{issue.cardSerial}</span>
                    <Badge
                      variant={
                        issue.status === CardIssueStatus.ISSUED
                          ? 'success'
                          : issue.status === CardIssueStatus.REPLACED
                            ? 'neutral'
                            : 'error'
                      }
                      size="sm"
                    >
                      {issue.status}
                    </Badge>
                    <span className="font-semibold text-slate-700">
                      Issue #{issue.issueNumber} ({issue.issueReason})
                    </span>
                  </div>

                  {issue.reasonNotes && (
                    <p className="text-[11px] text-slate-500 italic">“{issue.reasonNotes}”</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div className="text-[11px] text-slate-500">
                    <div>
                      {issue.issuedAt ? new Date(issue.issuedAt).toLocaleDateString() : '—'}
                    </div>
                  </div>

                  <a href={`/api/cards/issues/${issue.id}/pdf`} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" size="sm" className="text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Replacement Reprint Modal */}
      <ReprintReasonModal
        isOpen={reprintModalOpen}
        onClose={() => setReprintModalOpen(false)}
        onConfirm={handleConfirmReprint}
        cardSerial={activeIssue?.cardSerial}
        workerName={workerName}
      />

      {/* Revocation Modal */}
      <RevokeReasonModal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        onConfirm={handleConfirmRevoke}
        cardSerial={activeIssue?.cardSerial}
        workerName={workerName}
      />
    </div>
  );
}
