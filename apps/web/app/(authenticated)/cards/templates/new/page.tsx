'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Maximize2,
  Building2,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button, Input, Badge, cn } from '@hr/ui';
import { TemplatePresetId, LocaleFallbackPolicy } from '@hr/domain';
import { getPresetLayout } from '@hr/card-kit';
import { CardRenderer, SAMPLE_WORKER } from '../../../../components/cards/CardRenderer';
import { useActiveOrg } from '../../../../context/ActiveOrgContext';

const PRESET_OPTIONS = [
  {
    id: TemplatePresetId.CLASSIC_VERTICAL,
    name: 'Classic Vertical',
    description: 'Corporate dual-sided standard with top brand header & centered portrait photo.',
    dimensions: '60 × 90 mm',
    badge: 'Standard 60×90mm',
    highlightColor: 'border-teal-700 bg-teal-50/50',
  },
  {
    id: TemplatePresetId.MODERN_STRIPE,
    name: 'Modern Stripe',
    description: 'Left vertical color bar with bold tabular typography and compact photo box.',
    dimensions: '60 × 90 mm',
    badge: 'Modern',
    highlightColor: 'border-teal-700 bg-teal-50/50',
  },
  {
    id: TemplatePresetId.PHOTO_FOCUS,
    name: 'Photo Focus',
    description: 'Enlarged 30×40mm portrait frame with thick border for security gate verification.',
    dimensions: '60 × 90 mm',
    badge: 'Security Gate',
    highlightColor: 'border-teal-700 bg-teal-50/50',
  },
  {
    id: TemplatePresetId.FACTORY_INDUSTRIAL,
    name: 'Factory / Industrial',
    description: 'High-contrast black & amber theme with prominent blood group and ID numbers.',
    dimensions: '60 × 90 mm',
    badge: 'Floor Safety',
    highlightColor: 'border-amber-700 bg-amber-50/50',
  },
  {
    id: TemplatePresetId.CONTRACTOR,
    name: 'Contractor Badge',
    description: 'Distinct orange banner with clear vendor identification and bilingual notice.',
    dimensions: '60 × 90 mm',
    badge: 'Third-Party',
    highlightColor: 'border-orange-700 bg-orange-50/50',
  },
  {
    id: TemplatePresetId.VISITOR,
    name: 'Visitor Pass',
    description: 'Temporary pass layout with host escort contact, issue timestamp, and no photo requirement.',
    dimensions: '60 × 90 mm',
    badge: 'Temporary',
    highlightColor: 'border-indigo-700 bg-indigo-50/50',
  },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const { organizations, activeOrgId, activeOrg } = useActiveOrg();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<TemplatePresetId>(
    TemplatePresetId.CLASSIC_VERTICAL,
  );
  const [selectedOrgId, setSelectedOrgId] = useState<string | 'GLOBAL'>(
    activeOrgId || 'GLOBAL',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Preview State
  const [previewSide, setPreviewSide] = useState<'front' | 'back' | 'both'>('front');
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Derive Canonical Layout from card-kit
  const activeLayout = getPresetLayout(selectedPreset);
  const currentPresetInfo = PRESET_OPTIONS.find((p) => p.id === selectedPreset)!;

  // Selected Scope Name
  const targetOrg = organizations.find((o) => o.id === selectedOrgId);
  const scopeLabel = selectedOrgId === 'GLOBAL'
    ? 'All Organizations (Tenant-Wide)'
    : targetOrg?.displayName || targetOrg?.name || 'Selected Organization';

  const previewWorker = {
    ...SAMPLE_WORKER,
    orgName: selectedOrgId === 'GLOBAL' ? 'London Boy Apparel Ltd.' : targetOrg?.displayName || targetOrg?.name || 'London Boy Apparel Ltd.',
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          presetId: selectedPreset,
          organizationId: selectedOrgId === 'GLOBAL' ? undefined : selectedOrgId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create template.');
      }

      const data = await res.json();
      startTransition(() => {
        router.push(`/cards/templates/${data.template.id}`);
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error creating template.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-clip pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:px-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/cards/templates"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            aria-label="Back to template gallery"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-700" aria-hidden="true" />
              <span>Create Card Template</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Select an approved physical preset and configure layout boundaries before entering the visual studio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200/80 font-mono">
            <Shield className="w-3.5 h-3.5 text-teal-700" />
            <span>60 × 90 mm Master (300 DPI)</span>
          </span>
        </div>
      </div>

      {/* Error Callout */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-900 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-rose-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2-Pane Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Pane (7 Cols) */}
        <form onSubmit={handleCreate} className="lg:col-span-7 space-y-6">
          {/* General Properties Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">1. Template Identity & Scope</h2>

            <div className="space-y-1.5">
              <label htmlFor="template-name" className="block text-xs font-semibold text-slate-700">
                Template Name <span className="text-rose-600">*</span>
              </label>
              <Input
                id="template-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Factory Floor Standard Badge"
                className="h-10 text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="template-description" className="block text-xs font-semibold text-slate-700">
                Description (Optional)
              </label>
              <Input
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Standard bilingual badge with sewing unit line designation"
                className="h-10 text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="template-scope" className="block text-xs font-semibold text-slate-700">
                Organization Scope
              </label>
              <select
                id="template-scope"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              >
                <option value="GLOBAL">All Organizations (Tenant Default)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.displayName || org.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Scoped templates automatically resolve for workers enrolled under {scopeLabel}.
              </p>
            </div>
          </div>

          {/* Preset Picker Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">2. Select Starting Layout Preset</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each preset contains compliant English front and Bangla back layout definitions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Card Layout Presets">
              {PRESET_OPTIONS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <div
                    key={preset.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setSelectedPreset(preset.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedPreset(preset.id);
                      }
                    }}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
                      isSelected
                        ? 'border-teal-700 bg-teal-50/70 shadow-xs ring-1 ring-teal-700'
                        : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/60',
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {preset.name}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>{preset.dimensions}</span>
                      {isSelected && (
                        <span className="text-teal-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Selected</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Publishing Explanation & Submit Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-slate-900 block">
                Initial State: Draft Version v1
              </span>
              <p className="text-xs text-slate-500">
                You will be redirected into the visual studio to fine-tune field placements and publish the immutable version.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link href="/cards/templates">
                <Button type="button" variant="outline" size="md" className="text-xs font-semibold">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!name.trim() || isSubmitting || isPending}
                className="bg-teal-900 hover:bg-teal-800 text-white font-semibold text-xs px-5 shadow-xs"
              >
                <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" />
                <span>{isSubmitting ? 'Creating...' : 'Initialize & Open Studio'}</span>
              </Button>
            </div>
          </div>
        </form>

        {/* Right Sticky Preview Pane (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col space-y-4">
            {/* Header & Controls */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Live Layout Preview
                </h3>
                <span className="text-xs text-slate-500 font-mono block">
                  {currentPresetInfo.name} ({currentPresetInfo.dimensions})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsZoomModalOpen(true)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                aria-label="Enlarge card preview"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Non-PII Sample Banner */}
            <div className="px-3 py-1.5 rounded-lg bg-teal-50/80 border border-teal-200/70 text-xs text-teal-950 flex items-center justify-between gap-2">
              <span className="font-semibold">Sample Preview Data</span>
              <span className="text-slate-500 text-xs font-mono">Non-PII</span>
            </div>

            {/* Canonical CardRenderer Frame */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[360px]">
              <div className="transform scale-[0.75] sm:scale-[0.82] origin-center -my-6 transition-transform">
                <CardRenderer
                  layout={activeLayout}
                  worker={previewWorker}
                  side={previewSide}
                  allowFlip={false}
                />
              </div>

              {/* Side Switcher Control */}
              <div className="mt-4 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setPreviewSide('front')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition-all border',
                    previewSide === 'front'
                      ? 'bg-teal-900 text-white border-teal-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  English Front
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('back')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold transition-all border',
                    previewSide === 'back'
                      ? 'bg-teal-900 text-white border-teal-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  Bangla Back (বাংলা)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('both')}
                  className={cn(
                    'hidden sm:inline-block px-3 py-1 rounded-full text-xs font-semibold transition-all border',
                    previewSide === 'both'
                      ? 'bg-teal-900 text-white border-teal-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  Dual-Side
                </button>
              </div>
            </div>

            {/* Accessible Textual Summary of Layout Zones */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block">Accessibility Layout Summary</span>
              <div className="space-y-1 text-slate-600">
                <p>• <strong>Dimensions:</strong> 60 mm (W) × 90 mm (H), 3 mm bleed, 3 mm safe zone</p>
                <p>• <strong>Front Side:</strong> {activeLayout.front.header.showLogo ? 'Header Logo' : 'Text Header'}, {activeLayout.front.photo ? '24×32mm Portrait Photo' : 'No Photo'}, Barcode {activeLayout.front.barcode?.type || 'CODE128'}</p>
                <p>• <strong>Back Side:</strong> Bangla Native Name (বাংলা), Emergency Phone, Blood Group, Security Disclaimer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged Zoom Modal */}
      {isZoomModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enlarged Card Preview</h3>
                <span className="text-xs text-slate-500 font-mono">{currentPresetInfo.name} • 1:1 Scale Simulation</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsZoomModalOpen(false)}
                className="text-xs"
              >
                Close Preview
              </Button>
            </div>

            <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-50 rounded-xl p-4">
              <CardRenderer
                layout={activeLayout}
                worker={previewWorker}
                side="front"
                allowFlip={false}
              />
              <CardRenderer
                layout={activeLayout}
                worker={previewWorker}
                side="back"
                allowFlip={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
