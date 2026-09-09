'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Sliders,
  PlusCircle,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { PrintJobStatus, PrintJobItemStatus, OperatorPrintStatus } from '@hr/domain';
import { PrintJobDTO, PrintJobItemDTO } from '@hr/schemas';
import { OperatorConfirmationModal } from '../../../components/cards/OperatorConfirmationModal';

export default function PrintQueuePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading print queue...</div>}>
      <PrintQueueContent />
    </Suspense>
  );
}

function PrintQueueContent() {
  const searchParams = useSearchParams();
  const highlightedJobId = searchParams.get('jobId');

  const [printJobs, setPrintJobs] = useState<PrintJobDTO[]>([]);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(
    new Set(highlightedJobId ? [highlightedJobId] : []),
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedSignoffFilter, setSelectedSignoffFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmModalJob, setConfirmModalJob] = useState<PrintJobDTO | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadQueueData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (selectedStatusFilter !== 'ALL') params.set('status', selectedStatusFilter);
      if (selectedSignoffFilter !== 'ALL') params.set('operatorStatus', selectedSignoffFilter);

      const res = await fetch(`/api/cards/print-jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPrintJobs(data.items || []);
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to load print queue jobs.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueueData();
  }, [selectedStatusFilter, selectedSignoffFilter]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadQueueData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedStatusFilter, selectedSignoffFilter]);

  const toggleExpand = async (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });

    // If expanding and items not loaded, fetch single job with items
    const job = printJobs.find((j) => j.id === jobId);
    if (job && !job.items) {
      try {
        const res = await fetch(`/api/cards/print-jobs/${jobId}`);
        if (res.ok) {
          const fullJob = await res.json();
          setPrintJobs((prev) => prev.map((j) => (j.id === jobId ? fullJob : j)));
        }
      } catch (err) {
        console.error('Failed to load job items:', err);
      }
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this queued print job?')) return;
    try {
      const res = await fetch(`/api/cards/print-jobs/${jobId}/cancel`, { method: 'POST' });
      if (res.ok) {
        setFeedbackMessage({ type: 'success', text: 'Print job cancelled.' });
        loadQueueData();
      } else {
        const err = await res.json();
        setFeedbackMessage({ type: 'error', text: err.message || 'Failed to cancel job.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error cancelling job.' });
    }
  };

  const handleConfirmOutcome = async (data: {
    status: 'CONFIRMED_PRINTED' | 'REJECTED_DEFECT';
    notes?: string;
    defectiveItemIds?: string[];
    autoActivateIssues?: boolean;
  }) => {
    if (!confirmModalJob) return;

    const res = await fetch(`/api/cards/print-jobs/${confirmModalJob.id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setFeedbackMessage({
        type: 'success',
        text: `Operator sign-off recorded for Job #${confirmModalJob.id.substring(0, 8)}. Credentials updated!`,
      });
      loadQueueData();
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to submit operator confirmation.');
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
            <span className="text-xs font-bold text-[#0F766E]">Print Queue</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <Layers className="w-6 h-6 text-[#0F766E]" />
            <span>Persistent Batch Print Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor background render status, download exact-size physical print masters, and record
            physical operator confirmation.
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
          <Link href="/people">
            <Button type="button" variant="outline" size="md">
              <Printer className="w-4 h-4 mr-1.5" />
              Batch From Registry
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

      {/* Filter & Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            aria-label="Filter by job status"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Job Statuses</option>
            <option value={PrintJobStatus.QUEUED}>Queued</option>
            <option value={PrintJobStatus.PROCESSING}>Processing</option>
            <option value={PrintJobStatus.COMPLETED}>Completed</option>
            <option value={PrintJobStatus.FAILED}>Failed</option>
            <option value={PrintJobStatus.CANCELLED}>Cancelled</option>
          </select>

          <select
            aria-label="Filter by sign-off status"
            value={selectedSignoffFilter}
            onChange={(e) => setSelectedSignoffFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="ALL">All Sign-off Statuses</option>
            <option value={OperatorPrintStatus.UNCONFIRMED}>Unconfirmed / Pending Sign-off</option>
            <option value={OperatorPrintStatus.CONFIRMED_PRINTED}>Confirmed Printed</option>
            <option value={OperatorPrintStatus.REJECTED_DEFECT}>Rejected / Defect</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
            />
            <span>Auto-refresh (10s)</span>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadQueueData}
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Queue Jobs List */}
      <div className="space-y-4">
        {isLoading && printJobs.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0F766E]" />
            <span>Loading batch print jobs...</span>
          </div>
        ) : printJobs.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
            <Layers className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Print Queue Empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No batch print jobs match the selected filter criteria. Select workers in the registry
              to start a batch.
            </p>
            <Link href="/people">
              <Button type="button" variant="primary" size="sm" className="bg-[#134E4A] text-white">
                Go to People Registry
              </Button>
            </Link>
          </div>
        ) : (
          printJobs.map((job) => {
            const isExpanded = expandedJobIds.has(job.id);
            const isHighlighted = highlightedJobId === job.id;

            return (
              <div
                key={job.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isHighlighted
                    ? 'border-[#0F766E] ring-2 ring-teal-500/20 shadow-md'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {/* Job Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        JOB #{job.id.substring(0, 8)}
                      </span>
                      <Badge
                        variant={
                          job.status === PrintJobStatus.COMPLETED
                            ? 'success'
                            : job.status === PrintJobStatus.FAILED
                              ? 'error'
                              : 'primary'
                        }
                        size="sm"
                      >
                        {job.status}
                      </Badge>
                      <Badge
                        variant={
                          job.operatorStatus === OperatorPrintStatus.CONFIRMED_PRINTED
                            ? 'success'
                            : job.operatorStatus === OperatorPrintStatus.REJECTED_DEFECT
                              ? 'error'
                              : 'warning'
                        }
                        size="sm"
                      >
                        {job.operatorStatus}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Format: <strong className="text-slate-800">{job.outputFormat}</strong>
                      </span>
                      <span>
                        Sides: <strong className="text-slate-800">{job.side}</strong>
                      </span>
                      <span>
                        Items: <strong className="text-slate-800">{job.totalItems} badge(s)</strong>
                      </span>
                      <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 justify-end shrink-0">
                    <a
                      href={`/api/cards/print-jobs/${job.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="bg-[#134E4A] text-white"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download Master PDF
                      </Button>
                    </a>

                    {job.operatorStatus === OperatorPrintStatus.UNCONFIRMED && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setConfirmModalJob(job);
                          if (!job.items) toggleExpand(job.id);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Sign-off Outcome
                      </Button>
                    )}

                    {job.status === PrintJobStatus.QUEUED && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelJob(job.id)}
                        className="text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Cancel Job
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(job.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title={isExpanded ? 'Collapse Items' : 'Expand Items'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Badge Items Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 animate-in fade-in">
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="px-3.5 py-2.5">#</th>
                            <th className="px-3.5 py-2.5">Worker Name</th>
                            <th className="px-3.5 py-2.5">Employee ID</th>
                            <th className="px-3.5 py-2.5">Card Serial</th>
                            <th className="px-3.5 py-2.5">Item Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {!job.items ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-400">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-[#0F766E]" />
                                <span>Loading badge items...</span>
                              </td>
                            </tr>
                          ) : job.items.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-slate-400">
                                No items in this batch job.
                              </td>
                            </tr>
                          ) : (
                            job.items.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3.5 py-2.5 font-mono text-slate-400 text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                  {item.cardIssue?.person?.displayName || '—'}
                                </td>
                                <td className="px-3.5 py-2.5 font-mono text-slate-600">
                                  {item.cardIssue?.employment?.employeeNumber || '—'}
                                </td>
                                <td className="px-3.5 py-2.5 font-mono font-bold text-[#0F766E]">
                                  {item.cardIssue?.cardSerial || '—'}
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <Badge
                                    variant={
                                      item.status === PrintJobItemStatus.RENDERED
                                        ? 'success'
                                        : item.status === PrintJobItemStatus.FAILED
                                          ? 'error'
                                          : 'neutral'
                                    }
                                    size="sm"
                                  >
                                    {item.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Operator Confirmation Modal */}
      {confirmModalJob && (
        <OperatorConfirmationModal
          isOpen={Boolean(confirmModalJob)}
          onClose={() => setConfirmModalJob(null)}
          onConfirm={handleConfirmOutcome}
          jobId={confirmModalJob.id}
          totalItems={confirmModalJob.totalItems}
          items={confirmModalJob.items as any}
        />
      )}
    </div>
  );
}
