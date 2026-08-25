'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Archive,
  ArrowRight,
  Shield,
  Eye,
} from 'lucide-react';
import { Button, Badge, Input, cn } from '@hr/ui';
import { TemplatePresetId, TemplateVersionStatus } from '@hr/domain';
import { CardRenderer, SAMPLE_WORKER } from '../../../components/cards/CardRenderer';
import { getPresetLayout } from '@hr/card-kit';

interface TemplateItem {
  id: string;
  name: string;
  description?: string | null;
  presetId: TemplatePresetId;
  activeVersionId?: string | null;
  isArchived: boolean;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: TemplateVersionStatus;
    checksumSha256?: string | null;
    publishedAt?: string | null;
  }>;
  organization?: {
    id: string;
    name: string;
    displayName?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

const PRESET_OPTIONS = [
  {
    id: TemplatePresetId.CLASSIC_VERTICAL,
    name: 'Classic Vertical',
    description: 'Traditional corporate badge with top brand bar and centered portrait photo.',
    badge: 'Standard 60×90mm',
  },
  {
    id: TemplatePresetId.MODERN_STRIPE,
    name: 'Modern Stripe',
    description: 'Contemporary design with left accent stripe and streamlined typography.',
    badge: 'Modern',
  },
  {
    id: TemplatePresetId.PHOTO_FOCUS,
    name: 'Photo Focus',
    description: 'Security-oriented layout with enlarged portrait framing for gate checkpoints.',
    badge: 'Security Gate',
  },
  {
    id: TemplatePresetId.FACTORY_INDUSTRIAL,
    name: 'Factory / Industrial',
    description: 'High-contrast, bold employee ID and blood group for manufacturing floors.',
    badge: 'High Contrast',
  },
  {
    id: TemplatePresetId.CONTRACTOR,
    name: 'Contractor Badge',
    description: 'Distinctive orange header badge for temporary vendors and contractor staff.',
    badge: 'Third-Party',
  },
  {
    id: TemplatePresetId.VISITOR,
    name: 'Visitor Pass',
    description: 'Temporary visitor pass with host contact and escort instructions.',
    badge: 'Temporary',
  },
];

export default function CardTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Template Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<TemplatePresetId>(
    TemplatePresetId.CLASSIC_VERTICAL,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to load card templates.');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to templates service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim() || undefined,
          presetId: selectedPreset,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create template.');
      }

      const data = await res.json();
      setIsCreateModalOpen(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      window.location.href = `/cards/templates/${data.template.id}`;
    } catch (err: any) {
      setModalError(err.message || 'Failed to create template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-[#0F766E]" />
            Card Templates & Format Studio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Design and manage constrained, physical 60 × 90 mm bilingual ID cards with immutable
            version snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/cards/assignments">
            <Button variant="outline" size="md">
              <Layers className="w-4 h-4 mr-2 text-slate-500" />
              Assignment Rules
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200 p-6 h-64 animate-pulse"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-[#0F766E]">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Card Templates Created Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Get started by creating your first physical card template from one of our
              factory-ready bilingual presets.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => {
            const activeVersion =
              tpl.versions.find((v) => v.id === tpl.activeVersionId) || tpl.versions[0];
            const isPublished = activeVersion?.status === TemplateVersionStatus.PUBLISHED;

            return (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                        {tpl.presetId.replace('_', ' ')}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{tpl.name}</h3>
                    </div>
                    <Badge variant={isPublished ? 'success' : 'neutral'}>
                      {isPublished ? 'PUBLISHED' : 'DRAFT'} v{activeVersion?.versionNumber || 1}
                    </Badge>
                  </div>

                  {tpl.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{tpl.description}</p>
                  )}

                  {/* Template Meta Pill */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
                      60 × 90 mm (Bilingual)
                    </span>
                    <span>
                      {tpl.versions.length} Version{tpl.versions.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/cards/templates/${tpl.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0F766E] text-xs font-semibold transition-colors"
                  >
                    <span>Open Customizer Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Template Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0F766E]" />
                Create New Card Template
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select a constrained preset to initialize your template layout with English front
                and Bangla back zones.
              </p>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-5">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Template Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Factory Floor Standard Badge"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Description (Optional)
                </label>
                <Input
                  placeholder="e.g. Standard bilingual badge for production and sewing staff"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Choose Starting Layout Preset *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_OPTIONS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(preset.id)}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between',
                        selectedPreset === preset.id
                          ? 'border-[#0F766E] bg-teal-50/50 ring-1 ring-[#0F766E]'
                          : 'border-slate-200 hover:border-slate-300 bg-white',
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  disabled={!newTemplateName.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Initialize & Customize'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
