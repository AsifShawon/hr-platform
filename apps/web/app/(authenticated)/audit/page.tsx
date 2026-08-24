'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  RefreshCw,
  Clock,
  User,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Badge, Input } from '@hr/ui';

interface AuditEvent {
  id: string;
  tenantId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditTrailPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const fetchAuditLogs = async (currentPage = page) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
      });
      if (actionFilter.trim()) {
        queryParams.set('action', actionFilter.trim());
      }

      const res = await fetch(`/api/audit-events?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      }
    } catch {
      // Ignore network error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(page);
  }, [page]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs(1);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('failure')) return 'outline';
    if (action.includes('activated') || action.includes('success')) return 'primary';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Trail</h1>
            <Badge variant="primary" size="sm">
              Immutable Log
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Read-only ledger of authentication events, credential modifications, and administrative
            operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchAuditLogs(page)}
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Log
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="flex-1 w-full">
          <Input
            id="audit-action-filter"
            type="text"
            placeholder="Filter by action (e.g. user.login_success, system.activated)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button type="submit" variant="primary" size="md" className="w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filter
          </Button>
          {actionFilter && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setActionFilter('');
                setPage(1);
                fetchAuditLogs(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Events Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5">Actor</th>
                <th className="px-4 py-3.5">Sanitized Details</th>
                <th className="px-4 py-3.5">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Badge variant={getActionBadgeVariant(evt.action)} size="sm">
                      {evt.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800">
                    {evt.entityType}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-[11px] truncate max-w-[120px]">
                        {evt.actorId ? evt.actorId.substring(0, 8) + '...' : 'System'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                    {evt.details ? JSON.stringify(evt.details) : '—'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                    {evt.ipAddress || '127.0.0.1'}
                  </td>
                </tr>
              ))}
              {events.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-xs">
                    No audit records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing page <strong className="text-slate-800">{page}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong> ({totalCount} total entries)
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
