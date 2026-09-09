'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { Button, Badge, cn } from '@hr/ui';
import { TemplatePresetId, TemplateVersionStatus, CardLayoutSpecification } from '@hr/domain';
import { CardRenderer, SAMPLE_WORKER } from '../../../components/cards/CardRenderer';
import { getPresetLayout } from '@hr/card-kit';
import { useActiveOrg } from '../../../context/ActiveOrgContext';

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
    layout: CardLayoutSpecification;
    checksumSha256?: string | null;
    publishedAt?: string | null;
  }>;
  organization?: {
    id: string;
    name: string;
    displayName?: string | null;
    code?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function CardTemplatesPage() {
  const router = useRouter();
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cardSides, setCardSides] = useState<Record<string, 'front' | 'back'>>({});

  const fetchTemplates = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const url = activeOrgId
        ? `/api/templates?organizationId=${encodeURIComponent(activeOrgId)}`
        : '/api/templates';
      const headers: Record<string, string> = {};
      if (activeOrgId) headers['X-Organization-Id'] = activeOrgId;

      const res = await fetch(url, { headers });
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
  }, [activeOrgId]);

  const toggleCardSide = (templateId: string) => {
    setCardSides((prev) => ({
      ...prev,
      [templateId]: prev[templateId] === 'back' ? 'front' : 'back',
    }));
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-clip pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:px-6 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-teal-800" aria-hidden="true" />
            <span>Card Templates & Format Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Canonical dual-sided 60 × 90 mm card specifications with deterministic snapshot immutability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/cards/assignments">
            <Button variant="outline" size="md" className="text-xs font-semibold">
              <Layers className="w-4 h-4 mr-1.5 text-slate-500" aria-hidden="true" />
              <span>Assignment Rules</span>
            </Button>
          </Link>
          <Link href="/cards/templates/new">
            <Button
              variant="primary"
              size="md"
              className="bg-teal-900 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
              <span>New Template</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            className="text-xs font-semibold border-rose-300 text-rose-900"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200 p-6 h-80 animate-pulse"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-800">
            <CreditCard className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Card Templates Configured Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Initialize a production template from one of our factory-ready bilingual presets to enable physical card issuance.
            </p>
          </div>
          <Link href="/cards/templates/new">
            <Button variant="primary" size="md" className="bg-teal-900 hover:bg-teal-800 text-white font-semibold text-xs">
              <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
              <span>Create First Template</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => {
            const activeVersion =
              tpl.versions.find((v) => v.id === tpl.activeVersionId) || tpl.versions[0];
            const isPublished = activeVersion?.status === TemplateVersionStatus.PUBLISHED;
            const currentSide = cardSides[tpl.id] || 'front';

            // Resolve layout from version or preset fallback
            const layoutSpec: CardLayoutSpecification =
              (activeVersion?.layout as unknown as CardLayoutSpecification) ||
              getPresetLayout(tpl.presetId);

            const customWorker = {
              ...SAMPLE_WORKER,
              orgName: tpl.organization?.displayName || tpl.organization?.name || 'London Boy Apparel Ltd.',
            };

            return (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Top Info */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold block truncate">
                        {tpl.presetId.replace(/_/g, ' ')}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">{tpl.name}</h3>
                    </div>
                    <Badge variant={isPublished ? 'success' : 'neutral'} size="sm" className="shrink-0">
                      {isPublished ? 'PUBLISHED' : 'DRAFT'} v{activeVersion?.versionNumber || 1}
                    </Badge>
                  </div>

                  {tpl.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{tpl.description}</p>
                  )}
                </div>

                {/* Real Canonical CardRenderer Frame with Flip Affordance */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden min-h-[260px]">
                  <div className="transform scale-[0.62] origin-center -my-10 transition-transform">
                    <CardRenderer
                      layout={layoutSpec}
                      worker={customWorker}
                      side={currentSide}
                      allowFlip={false}
                    />
                  </div>

                  {/* Accessible Flip Button */}
                  <button
                    type="button"
                    onClick={() => toggleCardSide(tpl.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 bg-white px-3 py-1 rounded-full border border-teal-200/80 hover:border-teal-300 transition-colors shadow-2xs z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    aria-label={`Flip preview for ${tpl.name}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Flip to {currentSide === 'front' ? 'Bangla Back (বাংলা)' : 'English Front'}</span>
                  </button>
                </div>

                {/* Scope & Studio CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-mono truncate">
                    {tpl.organization ? tpl.organization.displayName || tpl.organization.name : 'Tenant Default'}
                  </span>

                  <Link
                    href={`/cards/templates/${tpl.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-950 hover:underline shrink-0"
                  >
                    <span>Open Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

