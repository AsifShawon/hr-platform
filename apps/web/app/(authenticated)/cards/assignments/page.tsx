'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowLeft,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Shield,
  Briefcase,
  MapPin,
  Building,
  User,
  Trash2,
} from 'lucide-react';

import { Button, Input, Badge } from '@hr/ui';
import { TemplateAssignmentTarget, JobCategory } from '@hr/domain';

interface AssignmentItem {
  id: string;
  templateId: string;
  targetType: TemplateAssignmentTarget;
  targetId?: string | null;
  priority: number;
  template: {
    id: string;
    name: string;
    presetId: string;
    isArchived: boolean;
  };
  createdAt: string;
}

interface TemplateOption {
  id: string;
  name: string;
  presetId: string;
}

export default function TemplateAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Rule Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState<TemplateAssignmentTarget>(
    TemplateAssignmentTarget.JOB_CATEGORY,
  );
  const [targetValue, setTargetValue] = useState('');
  const [priority, setPriority] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [assignRes, tplRes] = await Promise.all([
        fetch('/api/templates/assignments'),
        fetch('/api/templates'),
      ]);

      if (!assignRes.ok || !tplRes.ok) {
        throw new Error('Failed to load assignments.');
      }

      const assignData = await assignRes.json();
      const tplData = await tplRes.json();

      setAssignments(assignData.assignments || []);
      setTemplates(tplData.templates || []);
      if (tplData.templates?.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(tplData.templates[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading assignment rules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch('/api/templates/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          targetType: selectedTargetType,
          targetId: targetValue.trim() || undefined,
          priority: Number(priority) || 50,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || 'Failed to create assignment.');
      }

      setIsCreateModalOpen(false);
      setModalError(null);
      fetchAssignments();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/cards/templates"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-[#0F766E]" />
              Template Assignment Rules
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure deterministic 6-level template resolution rules across job categories,
              locations, and departments.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Assignment Rule
        </Button>
      </div>

      {/* 6-Level Hierarchy Architecture Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Deterministic Priority Resolution Hierarchy
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>1. Worker Override</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 font-semibold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>2. Job Category</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>3. Org Unit</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>4. Location</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 font-semibold flex items-center gap-2">
            <Building className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>5. Org Default</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span>6. System Default</span>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Active Assignment Mappings</h3>
          <span className="text-xs text-slate-500">{assignments.length} Rules Defined</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Loading assignment rules...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p>No custom assignment rules configured yet.</p>
            <p className="text-slate-400">
              Cards will resolve to the tenant default template automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    {item.targetType === TemplateAssignmentTarget.JOB_CATEGORY && (
                      <Briefcase className="w-4 h-4 text-[#0F766E]" />
                    )}
                    {item.targetType === TemplateAssignmentTarget.LOCATION && (
                      <MapPin className="w-4 h-4 text-[#0F766E]" />
                    )}
                    {item.targetType === TemplateAssignmentTarget.ORG_UNIT && (
                      <Layers className="w-4 h-4 text-[#0F766E]" />
                    )}
                    {item.targetType === TemplateAssignmentTarget.ORGANIZATION && (
                      <Building className="w-4 h-4 text-[#0F766E]" />
                    )}
                    {item.targetType === TemplateAssignmentTarget.WORKER_OVERRIDE && (
                      <User className="w-4 h-4 text-[#0F766E]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {item.targetType.replace('_', ' ')}
                      </span>
                      {item.targetId && (
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {item.targetId}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Assigned to Template:{' '}
                      <strong className="text-slate-700">{item.template.name}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400">
                    Priority: {item.priority}
                  </span>
                  <Badge variant="neutral">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Assignment Rule Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#0F766E]" />
                Add Template Assignment Rule
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Map an employment criterion to an approved card template.
              </p>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              {modalError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Target Type *</label>
                <select
                  value={selectedTargetType}
                  onChange={(e: any) => setSelectedTargetType(e.target.value)}
                  className="w-full h-9 border border-slate-200 rounded-lg px-2.5 bg-white text-slate-800"
                >
                  <option value={TemplateAssignmentTarget.JOB_CATEGORY}>
                    Job Category (e.g. Contractor, Worker)
                  </option>
                  <option value={TemplateAssignmentTarget.LOCATION}>Location / Factory Site</option>
                  <option value={TemplateAssignmentTarget.ORG_UNIT}>
                    Organizational Unit / Division
                  </option>
                  <option value={TemplateAssignmentTarget.ORGANIZATION}>
                    Organization Default
                  </option>
                </select>
              </div>

              {selectedTargetType === TemplateAssignmentTarget.JOB_CATEGORY ? (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Category *</label>
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-lg px-2.5 bg-white text-slate-800"
                  >
                    <option value="">Select Category</option>
                    <option value={JobCategory.CONTRACTOR}>Contractor</option>
                    <option value={JobCategory.WORKER}>Worker / Operator</option>
                    <option value={JobCategory.STAFF}>Staff</option>
                    <option value={JobCategory.EXECUTIVE}>Executive</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Target Identifier (UUID) *
                  </label>
                  <Input
                    placeholder="e.g. loc-gazipur-plant"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Target Card Template *</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full h-9 border border-slate-200 rounded-lg px-2.5 bg-white text-slate-800"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.presetId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Priority (1 = Highest)</label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!selectedTemplateId || isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Create Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
