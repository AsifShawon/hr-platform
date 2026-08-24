'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  FolderTree,
  SlidersHorizontal,
  ArrowUpDown,
  CreditCard,
  X,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';
import { EmploymentStatus, JobCategory } from '@hr/domain';

interface PersonRow {
  id: string;
  displayName: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  gender: string;
  bloodGroup?: string | null;
  primaryPhone?: string | null;
  primaryEmail?: string | null;
  photoMediaId?: string | null;
  version: number;
  activeEmployment?: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
    jobCategory: JobCategory;
    joinDate: string;
    endDate?: string | null;
    status: EmploymentStatus;
    organizationName: string;
    locationName?: string | null;
    orgUnitName?: string | null;
    orgUnitNameBangla?: string | null;
  } | null;
  identityDocument?: {
    id: string;
    documentType: string;
    documentNumberMasked: string;
    isVerified: boolean;
  } | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function PeopleRegistryPage() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [hasPhotoFilter, setHasPhotoFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'employeeNumber' | 'displayName' | 'updatedAt'>(
    'employeeNumber',
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Multi-row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<EmploymentStatus>(EmploymentStatus.ACTIVE);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    employeeNumber: true,
    name: true,
    title: true,
    organization: true,
    status: true,
    identity: true,
    actions: true,
  });
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  const fetchPeople = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));
      params.set('sortBy', sortBy);
      params.set('sortDirection', sortDirection);

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('jobCategory', categoryFilter);
      if (hasPhotoFilter !== 'ALL') params.set('hasPhoto', hasPhotoFilter);

      const res = await fetch(`/api/people?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPeople(data.items || []);
        setPagination(data.pagination || pagination);
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to load worker registry.' });
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchQuery,
    statusFilter,
    categoryFilter,
    hasPhotoFilter,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const toggleSelectAll = () => {
    if (selectedIds.size === people.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(people.map((p) => p.activeEmployment?.id).filter(Boolean) as string[]),
      );
    }
  };

  const toggleSelectRow = (empId?: string) => {
    if (!empId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const handleBulkStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    setIsBulkSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/people/bulk/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employmentIds: Array.from(selectedIds),
          newStatus: bulkNewStatus,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({ type: 'success', text: data.message });
        setSelectedIds(new Set());
        setBulkModalOpen(false);
        fetchPeople();
      } else {
        setFeedbackMessage({ type: 'error', text: data.message || 'Bulk status update failed.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error performing bulk update.' });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const getStatusBadge = (status?: EmploymentStatus) => {
    switch (status) {
      case EmploymentStatus.ACTIVE:
        return (
          <Badge variant="success" size="sm">
            Active
          </Badge>
        );
      case EmploymentStatus.PREBOARDING:
        return (
          <Badge variant="warning" size="sm">
            Preboarding
          </Badge>
        );
      case EmploymentStatus.ON_LEAVE:
        return (
          <Badge variant="primary" size="sm">
            On Leave
          </Badge>
        );
      case EmploymentStatus.SEPARATED:
        return (
          <Badge variant="error" size="sm">
            Separated
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status || 'Inactive'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-[#0F766E]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">People Registry</h1>
            <p className="text-sm text-slate-500">
              Manage worker profiles, employment records, sensitive identity documents, and card
              readiness.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/people/new">
            <Button type="button" variant="primary" size="md">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Worker
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Search by name, বাংলা, ID, or title..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Statuses</option>
              <option value={EmploymentStatus.ACTIVE}>Active</option>
              <option value={EmploymentStatus.PREBOARDING}>Preboarding</option>
              <option value={EmploymentStatus.ON_LEAVE}>On Leave</option>
              <option value={EmploymentStatus.SEPARATED}>Separated</option>
              <option value={EmploymentStatus.INACTIVE}>Inactive</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Categories</option>
              <option value={JobCategory.MANAGEMENT}>Management</option>
              <option value={JobCategory.STAFF}>Staff</option>
              <option value={JobCategory.OPERATOR}>Operator</option>
              <option value={JobCategory.WORKER}>Worker</option>
              <option value={JobCategory.CONTRACTOR}>Contractor</option>
            </select>

            {/* Column Picker Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnPickerOpen(!columnPickerOpen)}
                className="h-9 px-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                title="Customize Table Columns"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Columns</span>
              </button>

              {columnPickerOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 space-y-2 animate-in fade-in zoom-in-95">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Toggle Columns
                  </span>
                  {Object.entries(visibleColumns).map(([col, isVis]) => (
                    <label
                      key={col}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isVis}
                        onChange={() =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col]: !prev[col as keyof typeof prev],
                          }))
                        }
                        className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                      />
                      <span className="capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Row Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-4 animate-in fade-in">
            <span className="text-xs font-bold text-[#134E4A]">
              {selectedIds.size} worker(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setBulkModalOpen(true)}
              >
                Change Status
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={people.length > 0 && selectedIds.size === people.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                </th>
                {visibleColumns.employeeNumber && <th className="py-3.5 px-4">Employee ID</th>}
                {visibleColumns.name && <th className="py-3.5 px-4">Worker Name</th>}
                {visibleColumns.title && <th className="py-3.5 px-4">Job Title & Category</th>}
                {visibleColumns.organization && <th className="py-3.5 px-4">Site & Hierarchy</th>}
                {visibleColumns.status && <th className="py-3.5 px-4">Status</th>}
                {visibleColumns.identity && <th className="py-3.5 px-4">Government ID</th>}
                {visibleColumns.actions && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#134E4A] border-t-transparent mx-auto mb-2" />
                    <span>Loading worker records...</span>
                  </td>
                </tr>
              ) : people.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-3">
                    <Users className="w-10 h-10 mx-auto text-slate-300" />
                    <div>
                      <p className="text-sm font-bold text-slate-700">No worker records found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Add your first worker or refine search filters.
                      </p>
                    </div>
                    <Link href="/people/new">
                      <Button type="button" variant="primary" size="sm">
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Add Worker
                      </Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                people.map((person) => {
                  const emp = person.activeEmployment;
                  const isSelected = emp ? selectedIds.has(emp.id) : false;

                  return (
                    <tr
                      key={person.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(emp?.id)}
                          className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                        />
                      </td>

                      {visibleColumns.employeeNumber && (
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {emp?.employeeNumber || '—'}
                          </span>
                        </td>
                      )}

                      {visibleColumns.name && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-xs font-bold text-[#0F766E] shrink-0">
                              {person.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <Link
                                href={`/people/${person.id}`}
                                className="font-bold text-slate-900 hover:text-[#0F766E] transition-colors block"
                              >
                                {person.displayName}
                              </Link>
                              {person.displayNameNative && (
                                <span className="text-[11px] font-medium text-[#0F766E] block leading-tight">
                                  {person.displayNameNative}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {visibleColumns.title && (
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">
                            {emp?.jobTitle || '—'}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {emp?.jobCategory || 'STAFF'}
                          </span>
                        </td>
                      )}

                      {visibleColumns.organization && (
                        <td className="py-3.5 px-4">
                          {emp?.locationName && (
                            <div className="flex items-center gap-1 text-slate-700">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{emp.locationName}</span>
                            </div>
                          )}
                          {emp?.orgUnitName && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <FolderTree className="w-3 h-3 text-slate-400" />
                              <span>{emp.orgUnitName}</span>
                            </div>
                          )}
                        </td>
                      )}

                      {visibleColumns.status && (
                        <td className="py-3.5 px-4">{getStatusBadge(emp?.status)}</td>
                      )}

                      {visibleColumns.identity && (
                        <td className="py-3.5 px-4">
                          {person.identityDocument ? (
                            <div className="space-y-0.5">
                              <span className="font-mono text-slate-700 font-semibold block">
                                {person.identityDocument.documentNumberMasked}
                              </span>
                              <Badge variant="neutral" size="sm">
                                {person.identityDocument.documentType}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Unregistered</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.actions && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/people/${person.id}`}>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title="View Record"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                            <Link href={`/people/${person.id}/edit`}>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-teal-50 transition-colors"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      )}
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
            Showing <strong className="text-slate-900">{people.length}</strong> of{' '}
            <strong className="text-slate-900">{pagination.totalCount}</strong> workers
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pagination.limit}
              onChange={(e) =>
                setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))
              }
              className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={!pagination.hasPrevPage}
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
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Status Update Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Bulk Update Employment Status</h3>
            <p className="text-xs text-slate-600 mt-1">
              Apply a new status to all <strong>{selectedIds.size}</strong> selected worker(s).
            </p>

            <form onSubmit={handleBulkStatusChange} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Status *
                </label>
                <select
                  value={bulkNewStatus}
                  onChange={(e) => setBulkNewStatus(e.target.value as EmploymentStatus)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value={EmploymentStatus.ACTIVE}>Active</option>
                  <option value={EmploymentStatus.PREBOARDING}>Preboarding</option>
                  <option value={EmploymentStatus.ON_LEAVE}>On Leave</option>
                  <option value={EmploymentStatus.SEPARATED}>Separated</option>
                  <option value={EmploymentStatus.INACTIVE}>Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setBulkModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={isBulkSubmitting}>
                  {isBulkSubmitting ? 'Updating...' : 'Confirm Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
