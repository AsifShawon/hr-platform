'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  History,
  Shield,
  Layers,
  Sparkles,
  Sliders,
  Type,
  Palette,
  QrCode,
  FileText,
  User,
  AlertTriangle,
  RotateCcw,
  Printer,
  Download,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';
import {
  CardLayoutSpecification,
  TemplateVersionStatus,
  CardOrientation,
  BarcodeType,
  BarcodePayloadType,
  LocaleFallbackPolicy,
} from '@hr/domain';
import {
  CardRenderer,
  CardWorkerData,
  SAMPLE_WORKER,
} from '../../../../components/cards/CardRenderer';
import {
  COMPANY_VERTICAL_60X90_DIMENSIONS,
  ISO_ID1_HORIZONTAL_DIMENSIONS,
  ISO_ID1_VERTICAL_DIMENSIONS,
  normalizeToMm,
} from '@hr/card-kit';

const STRESS_WORKERS: Record<string, CardWorkerData> = {
  standard: SAMPLE_WORKER,
  long_names: {
    displayName: 'Mohammad Saifur Rahman Chowdhury Majumder',
    displayNameLatin: 'Mohammad Saifur Rahman Chowdhury Majumder',
    displayNameNative: 'মুহাম্মদ সাইফুর রহমান চৌধুরী মজুমদার',
    jobTitle: 'Chief Compliance & Factory Operations Executive Director',
    department: 'Quality Assurance & Social Compliance Division',
    employeeNumber: 'EMP-990812',
    bloodGroup: 'AB+',
    joinDate: '2018-11-01',
    emergencyContact: '+880 1711-999888',
    orgName: 'Apex Industrial Apparel & Textile Manufacturing Group Ltd.',
    orgNameBangla: 'এপেক্স ইন্ডাস্ট্রিয়াল অ্যাপারেল অ্যান্ড টেক্সটাইল ম্যানুফ্যাকচারিং গ্রুপ লি.',
    serialNumber: 'APX-CARD-LONG-9988-SEC',
  },
  missing_native: {
    ...SAMPLE_WORKER,
    displayName: 'Farhana Akter',
    displayNameLatin: 'Farhana Akter',
    displayNameNative: '', // Missing native script
  },
  missing_photo: {
    ...SAMPLE_WORKER,
    photoUrl: null,
  },
};

export default function TemplateStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<any>(null);
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [layout, setLayout] = useState<CardLayoutSpecification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  // Preview options
  const [previewSide, setPreviewSide] = useState<'both' | 'front' | 'back'>('both');
  const [stressMode, setStressMode] = useState<
    'standard' | 'long_names' | 'missing_native' | 'missing_photo'
  >('standard');
  const [showBleed, setShowBleed] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);

  // Active customizer tab
  const [activeTab, setActiveTab] = useState<
    'geometry' | 'theme' | 'header' | 'photo' | 'fields' | 'security' | 'backside'
  >('geometry');

  // History dialog
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Render export state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  useEffect(() => {
    async function loadTemplate() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/templates/${templateId}`);
        if (!res.ok) throw new Error('Template not found.');
        const data = await res.json();
        setTemplate(data.template);

        const activeVer =
          data.template.versions.find((v: any) => v.id === data.template.activeVersionId) ||
          data.template.versions[0];
        setActiveVersion(activeVer);
        setLayout(activeVer.layout as CardLayoutSpecification);
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    loadTemplate();
  }, [templateId]);

  if (feedback?.type === 'error' && !template) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-lg mx-auto text-center space-y-4 shadow-sm my-12">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Failed to Load Card Template</h3>
          <p className="text-xs text-slate-500 mt-1">{feedback.message}</p>
        </div>
        <Link href="/cards/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Templates Gallery
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !layout || !template) {
    return (
      <div className="p-12 text-center text-slate-500 animate-pulse">
        Loading Card Customizer Studio...
      </div>
    );
  }

  const isPublished = activeVersion?.status === TemplateVersionStatus.PUBLISHED;

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/templates/${templateId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save draft.');
      }

      const data = await res.json();
      setTemplate(data.template);
      const updatedVer = data.template.versions.find(
        (v: any) => v.id === data.template.activeVersionId,
      );
      setActiveVersion(updatedVer);
      setFeedback({ type: 'success', message: 'Draft version successfully saved.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!activeVersion || activeVersion.status === TemplateVersionStatus.PUBLISHED) return;

    setIsPublishing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/templates/${templateId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftVersionId: activeVersion.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to publish version.');
      }

      const data = await res.json();
      setActiveVersion(data.version);
      setFeedback({
        type: 'success',
        message: `Version v${data.version.versionNumber} published with SHA-256 digest: ${data.version.checksumSha256.substring(0, 12)}...`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await fetch('/api/cards/render/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout,
          worker: STRESS_WORKERS[stressMode],
          side: previewSide === 'both' ? 'duplex' : previewSide,
          includeBleed: showBleed,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate print PDF.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}-print-master.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error exporting print PDF.' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportPng = async () => {
    setIsExportingPng(true);
    try {
      const res = await fetch('/api/cards/render/preview-png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout,
          worker: STRESS_WORKERS[stressMode],
          side: previewSide === 'back' ? 'back' : 'front',
          dpi: 300,
          includeBleed: showBleed,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate PNG.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}-300dpi.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error exporting PNG.' });
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/cards/templates"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{template.name}</h1>
              <Badge variant={isPublished ? 'success' : 'neutral'}>
                {isPublished ? 'PUBLISHED' : 'DRAFT'} v{activeVersion?.versionNumber}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Preset: {layout.presetId.replace('_', ' ')} • {layout.dimensions.widthMm} ×{' '}
              {layout.dimensions.heightMm} mm
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-500" />
            {isExportingPdf ? 'Rendering PDF...' : 'Print PDF (Exact)'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleExportPng}
            disabled={isExportingPng}
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            {isExportingPng ? 'Exporting...' : 'PNG (300 DPI)'}
          </Button>

          <Button type="button" variant="outline" size="md" onClick={() => setIsHistoryOpen(true)}>
            <History className="w-4 h-4 mr-1.5 text-slate-500" />
            History ({template.versions?.length || 1})
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-1.5 text-slate-500" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handlePublish}
            disabled={isPublished || isPublishing}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            {isPublished ? 'Published' : isPublishing ? 'Publishing...' : 'Publish Version'}
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Constrained Customizer Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('geometry')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'geometry'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Geometry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'theme'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theme & Colors
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('header')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'header'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Header
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('photo')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'photo'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fields')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'fields'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fields & Labels
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'security'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              QR & Barcode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backside')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'backside'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Back Terms
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            {/* 1. Geometry Tab */}
            {activeTab === 'geometry' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#0F766E]" />
                    Physical Dimensions & Bleed
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Stored in mm</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setLayout({
                        ...layout,
                        dimensions: { ...COMPANY_VERTICAL_60X90_DIMENSIONS },
                      })
                    }
                    className={`p-3 rounded-xl border text-left text-xs ${
                      layout.dimensions.widthMm === 60 && layout.dimensions.heightMm === 90
                        ? 'border-[#0F766E] bg-teal-50/50 font-bold text-[#0F766E]'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold">Company Vertical</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      60 × 90 mm (Default)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLayout({
                        ...layout,
                        dimensions: { ...ISO_ID1_HORIZONTAL_DIMENSIONS },
                      })
                    }
                    className={`p-3 rounded-xl border text-left text-xs ${
                      layout.dimensions.widthMm === 85.6 && layout.dimensions.heightMm === 53.98
                        ? 'border-[#0F766E] bg-teal-50/50 font-bold text-[#0F766E]'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold">ISO ID-1 Horizontal</span>
                    <span className="text-[10px] text-slate-500 font-normal">85.6 × 53.98 mm</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">Width (mm)</label>
                    <Input
                      type="number"
                      value={layout.dimensions.widthMm}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          dimensions: { ...layout.dimensions, widthMm: Number(e.target.value) },
                        })
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Height (mm)
                    </label>
                    <Input
                      type="number"
                      value={layout.dimensions.heightMm}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          dimensions: { ...layout.dimensions, heightMm: Number(e.target.value) },
                        })
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Bleed Area (mm)
                    </label>
                    <Input
                      type="number"
                      value={layout.dimensions.bleedMm}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          dimensions: { ...layout.dimensions, bleedMm: Number(e.target.value) },
                        })
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Safe Margin (mm)
                    </label>
                    <Input
                      type="number"
                      value={layout.dimensions.safeAreaMm}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          dimensions: { ...layout.dimensions, safeAreaMm: Number(e.target.value) },
                        })
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Theme & Brand Colors Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#0F766E]" />
                  Brand Color Palette & Typography
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Primary Header
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layout.theme.primaryColor}
                        onChange={(e) =>
                          setLayout({
                            ...layout,
                            theme: { ...layout.theme, primaryColor: e.target.value },
                          })
                        }
                        className="w-8 h-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={layout.theme.primaryColor}
                        onChange={(e) =>
                          setLayout({
                            ...layout,
                            theme: { ...layout.theme, primaryColor: e.target.value },
                          })
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Secondary Accent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layout.theme.secondaryColor}
                        onChange={(e) =>
                          setLayout({
                            ...layout,
                            theme: { ...layout.theme, secondaryColor: e.target.value },
                          })
                        }
                        className="w-8 h-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={layout.theme.secondaryColor}
                        onChange={(e) =>
                          setLayout({
                            ...layout,
                            theme: { ...layout.theme, secondaryColor: e.target.value },
                          })
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Card Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={layout.theme.backgroundColor}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          theme: { ...layout.theme, backgroundColor: e.target.value },
                        })
                      }
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={layout.theme.backgroundColor}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          theme: { ...layout.theme, backgroundColor: e.target.value },
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Bundled Fonts
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Latin (Front)</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Noto Sans (Self-Hosted)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Bangla (Back)</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Noto Sans Bengali
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Header Tab */}
            {activeTab === 'header' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Header Zone Settings</h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layout.front.header.showLogo}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          front: {
                            ...layout.front,
                            header: { ...layout.front.header, showLogo: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span>Show Organization Logo</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layout.front.header.showOrgName}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          front: {
                            ...layout.front,
                            header: { ...layout.front.header, showOrgName: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span>Show Organization Name</span>
                  </label>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Custom Banner Badge (Optional)
                    </label>
                    <Input
                      placeholder="e.g. ID-2026 or STAFF"
                      value={layout.front.header.customTitle || ''}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          front: {
                            ...layout.front,
                            header: { ...layout.front.header, customTitle: e.target.value || null },
                          },
                        })
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Photo Tab */}
            {activeTab === 'photo' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Photo Treatment & Framing</h3>

                {layout.front.photo ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 block">
                          Width (mm)
                        </label>
                        <Input
                          type="number"
                          value={layout.front.photo.widthMm}
                          onChange={(e) =>
                            setLayout({
                              ...layout,
                              front: {
                                ...layout.front,
                                photo: { ...layout.front.photo!, widthMm: Number(e.target.value) },
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 block">
                          Height (mm)
                        </label>
                        <Input
                          type="number"
                          value={layout.front.photo.heightMm}
                          onChange={(e) =>
                            setLayout({
                              ...layout,
                              front: {
                                ...layout.front,
                                photo: { ...layout.front.photo!, heightMm: Number(e.target.value) },
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-semibold text-slate-600 block">
                        Border Radius (mm)
                      </label>
                      <Input
                        type="number"
                        value={layout.front.photo.borderRadiusMm}
                        onChange={(e) =>
                          setLayout({
                            ...layout,
                            front: {
                              ...layout.front,
                              photo: {
                                ...layout.front.photo!,
                                borderRadiusMm: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    This preset does not include a portrait photo frame.
                  </p>
                )}
              </div>
            )}

            {/* 5. Fields Tab */}
            {activeTab === 'fields' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Enabled Fields & Custom Labels</h3>

                <div className="space-y-2.5">
                  {['jobTitle', 'department', 'employeeNumber', 'bloodGroup'].map((field) => (
                    <label
                      key={field}
                      className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={layout.front.details.enabledFields.includes(field)}
                        onChange={(e) => {
                          const current = layout.front.details.enabledFields;
                          const next = e.target.checked
                            ? [...current, field]
                            : current.filter((f) => f !== field);
                          setLayout({
                            ...layout,
                            front: {
                              ...layout.front,
                              details: { ...layout.front.details, enabledFields: next },
                            },
                          });
                        }}
                        className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                      />
                      <span className="capitalize font-medium">
                        {field.replace(/([A-Z])/g, ' $1')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#0F766E]" />
                  QR Code & Barcode Security
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  In compliance with security rules, QR codes encode strictly opaque card serial
                  tokens. Zero sensitive PII is stored.
                </p>

                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        layout.back.barcode && layout.back.barcode.type !== BarcodeType.NONE,
                      )}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          back: {
                            ...layout.back,
                            barcode: e.target.checked
                              ? {
                                  type: BarcodeType.QR_CODE,
                                  payloadType: BarcodePayloadType.OPAQUE_CARD_SERIAL,
                                }
                              : null,
                          },
                        })
                      }
                      className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span>Include Opaque Digital Verification QR on Back</span>
                  </label>
                </div>
              </div>
            )}

            {/* 7. Backside Tab */}
            {activeTab === 'backside' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F766E]" />
                  Back-Side Bengali Instructions & Terms
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Property & Return Policy Notice (বাংলা)
                  </label>
                  <textarea
                    rows={3}
                    value={layout.back.footer.instructionsText || ''}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        back: {
                          ...layout.back,
                          footer: { ...layout.back.footer, instructionsText: e.target.value },
                        },
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={layout.back.footer.showSignatureLine}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        back: {
                          ...layout.back,
                          footer: { ...layout.back.footer, showSignatureLine: e.target.checked },
                        },
                      })
                    }
                    className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span>Show Cardholder Signature Line on Back</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live Physical Card Preview & Stress Tests */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preview Controls Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Front / Back / Both Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewSide('both')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  previewSide === 'both' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600'
                }`}
              >
                Both Sides
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('front')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  previewSide === 'front' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600'
                }`}
              >
                Front Only
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('back')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  previewSide === 'back' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600'
                }`}
              >
                Back Only
              </button>
            </div>

            {/* Stress Test Fixture Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Fixture:</span>
              <select
                value={stressMode}
                onChange={(e: any) => setStressMode(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white text-slate-800"
              >
                <option value="standard">Standard Bilingual Worker</option>
                <option value="long_names">Long Name Stress Test</option>
                <option value="missing_native">Missing Native Script</option>
                <option value="missing_photo">Missing Photo Avatar</option>
              </select>
            </div>

            {/* Bleed & Safe Area Overlay Toggles */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={showBleed}
                  onChange={(e) => setShowBleed(e.target.checked)}
                  className="rounded text-rose-500"
                />
                <span>Bleed (3mm)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={showSafeArea}
                  onChange={(e) => setShowSafeArea(e.target.checked)}
                  className="rounded text-emerald-500"
                />
                <span>Safe Area</span>
              </label>
            </div>
          </div>

          {/* Interactive Card Canvas */}
          <div className="bg-slate-100 rounded-2xl border border-slate-200 p-8 flex items-center justify-center min-h-[460px] shadow-inner">
            <CardRenderer
              layout={layout}
              worker={STRESS_WORKERS[stressMode]}
              side={previewSide}
              showBleed={showBleed}
              showSafeArea={showSafeArea}
            />
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-[#0F766E]" />
                Template Version History
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {template.versions?.map((ver: any) => (
                <div
                  key={ver.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Version {ver.versionNumber}</span>
                      <Badge
                        variant={
                          ver.status === TemplateVersionStatus.PUBLISHED ? 'success' : 'neutral'
                        }
                      >
                        {ver.status}
                      </Badge>
                    </div>
                    {ver.checksumSha256 && (
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                        SHA-256: {ver.checksumSha256.substring(0, 16)}...
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(ver.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
