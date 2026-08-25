'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  PlusCircle,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ShieldAlert,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button, Badge, Input } from '@hr/ui';
import { CardIssueStatus, CardIssueReason, CardRevocationReason } from '@hr/domain';
import { CardIssueDTO } from '@hr/schemas';
import { ReprintReasonModal } from '../../../components/cards/ReprintReasonModal';
import { RevokeReasonModal } from '../../../components/cards/RevokeReasonModal';

export default function CardIssuesPage() {
  const [issues, setIssues] = useState<CardIssueDTO[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCurrentFilter, setIsCurrentFilter] = useState<string>('ALL');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Modals state
  const [reprintModalIssue, setReprintModalIssue] = useState<CardIssueDTO | null>(null);
  const [revokeModalIssue, setRevokeModalIssue] = useState<CardIssueDTO | null>(null);

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));

      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (isCurrentFilter !== 'ALL')
        params.set('isCurrent', isCurrentFilter === 'CURRENT' ? 'true' : 'false');

      const res = await fetch(`/api/cards/issues?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data.items || []);
        if (data.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          }));
        }
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to load card issue records.' });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, statusFilter, isCurrentFilter]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleConfirmReprint = async (reason: CardIssueReason, notes: string) => {
    if (!reprintModalIssue) return;
    const idempotencyKey = `REPRINT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const res = await fetch(`/api/cards/issues/${reprintModalIssue.id}/reprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, reasonNotes: notes, idempotencyKey }),
    });

    if (res.ok) {
      const newIssue = await res.json();
      setFeedbackMessage({
        type: 'success',
        text: `Replacement badge issued! New Serial: ${newIssue.cardSerial} (Issue #${newIssue.issueNumber})`,
      });
      fetchIssues();
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to reprint card.');
    }
  };

  const handleConfirmRevoke = async (reason: CardRevocationReason, notes: string) => {
    if (!revokeModalIssue) return;

    const res = await fetch(`/api/cards/issues/${revokeModalIssue.id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, reasonNotes: notes }),
    });

    if (res.ok) {
      setFeedbackMessage({
        type: 'success',
        text: `Card ${revokeModalIssue.cardSerial} has been revoked.`,
      });
      fetchIssues();
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to revoke card.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/cards"
              className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Card Production Hub
            </Link>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-bold text-[#0F766E]">Issued Badges</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <CreditCard className="w-6 h-6 text-[#0F766E]" />
            <span>Issued Badges & Lineage Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable physical credentials ledger, reprint reasons, revocation history, and master
            PDF downloads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/cards/new">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="bg-[#134E4A] text-white font-bold"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Create ID Card
            </Button>
          </Link>
          <Link href="/cards/queue">
            <Button type="button" variant="outline" size="md">
              <Printer className="w-4 h-4 mr-1.5" />
              View Print Queue
            </Button>
          </Link>
        </div>
      </div>

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

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Search by serial, worker, or ID..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <select
            aria-label="Filter by card status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Statuses</option>
            <option value={CardIssueStatus.ISSUED}>Issued (Active)</option>
            <option value={CardIssueStatus.REPLACED}>Replaced / Superseded</option>
            <option value={CardIssueStatus.REVOKED}>Revoked</option>
            <option value={CardIssueStatus.EXPIRED}>Expired</option>
          </select>

          <select
            aria-label="Filter by active status"
            value={isCurrentFilter}
            onChange={(e) => {
              setIsCurrentFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Versions</option>
            <option value="CURRENT">Current Badges Only</option>
            <option value="HISTORICAL">Historical Badges Only</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchIssues}
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Issues Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Card Serial</th>
                <th className="px-4 py-3.5">Worker Name</th>
                <th className="px-4 py-3.5">Employee ID</th>
                <th className="px-4 py-3.5">Sequence & Reason</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Issued Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 text-[#0F766E] animate-spin mx-auto mb-2" />
                    <span>Loading credential records...</span>
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 space-y-3">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-700">No issued credentials found</p>
                    <p className="text-xs text-slate-400">
                      Create your first card or adjust filters.
                    </p>
                  </td>
                </tr>
              ) : (
                issues.map((issue) => {
                  const isCurrentActive =
                    issue.isCurrent && issue.status === CardIssueStatus.ISSUED;

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        {issue.cardSerial}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <Link
                          href={`/people/${issue.personId}`}
                          className="hover:text-[#0F766E] transition-colors"
                        >
                          {issue.person?.displayName || '—'}
                        </Link>
                        {issue.person?.displayNameNative && (
                          <span className="text-[11px] font-medium text-[#0F766E] block">
                            {issue.person.displayNameNative}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {issue.employment?.employeeNumber || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block">
                          Issue #{issue.issueNumber} ({issue.issueReason})
                        </span>
                        {issue.reasonNotes && (
                          <span className="text-[10px] text-slate-400 italic block truncate max-w-xs">
                            {issue.reasonNotes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
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
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        {issue.issuedAt ? new Date(issue.issuedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/api/cards/issues/${issue.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button type="button" variant="outline" size="sm" className="text-xs">
                              <Download className="w-3 h-3 mr-1" />
                              PDF
                            </Button>
                          </a>

                          {isCurrentActive && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setReprintModalIssue(issue)}
                                className="text-xs text-amber-700 hover:bg-amber-50 border-amber-200"
                              >
                                <RotateCw className="w-3 h-3 mr-1" />
                                Reprint
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRevokeModalIssue(issue)}
                                className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                              >
                                <ShieldAlert className="w-3 h-3 mr-1" />
                                Revoke
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{issues.length}</strong> of{' '}
            <strong className="text-slate-900">{pagination.total}</strong> credentials
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 font-semibold text-slate-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Replacement Reprint Modal */}
      {reprintModalIssue && (
        <ReprintReasonModal
          isOpen={Boolean(reprintModalIssue)}
          onClose={() => setReprintModalIssue(null)}
          onConfirm={handleConfirmReprint}
          cardSerial={reprintModalIssue.cardSerial}
          workerName={reprintModalIssue.person?.displayName}
        />
      )}

      {/* Revocation Modal */}
      {revokeModalIssue && (
        <RevokeReasonModal
          isOpen={Boolean(revokeModalIssue)}
          onClose={() => setRevokeModalIssue(null)}
          onConfirm={handleConfirmRevoke}
          cardSerial={revokeModalIssue.cardSerial}
          workerName={revokeModalIssue.person?.displayName}
        />
      )}
    </div>
  );
}
