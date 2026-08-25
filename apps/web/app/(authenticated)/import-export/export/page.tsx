'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Archive,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { Button, Badge, Dialog } from '@hr/ui';
import { EmploymentStatus, JobCategory } from '@hr/domain';

const AVAILABLE_FIELDS: Array<{ key: string; label: string; group: string; sensitive?: boolean }> =
  [
    // Core Identity
    { key: 'employeeNumber', label: 'Employee Number', group: 'Core Identification' },
    { key: 'displayName', label: 'Primary Display Name', group: 'Core Identification' },
    { key: 'displayNameLatin', label: 'English Name (Latin Script)', group: 'Core Identification' },
    {
      key: 'displayNameNative',
      label: 'Native Name (Bengali বাংলা Script)',
      group: 'Core Identification',
    },
    { key: 'givenName', label: 'Given / First Name', group: 'Core Identification' },
    { key: 'familyName', label: 'Family / Surname', group: 'Core Identification' },
    // Employment
    { key: 'jobTitle', label: 'Job Title / Designation', group: 'Employment Details' },
    { key: 'jobCategory', label: 'Job Category', group: 'Employment Details' },
    { key: 'joinDate', label: 'Join / Start Date', group: 'Employment Details' },
    { key: 'endDate', label: 'End / Separation Date', group: 'Employment Details' },
    { key: 'status', label: 'Employment Status', group: 'Employment Details' },
    { key: 'organizationName', label: 'Company / Organization Name', group: 'Employment Details' },
    { key: 'organizationCode', label: 'Organization Code', group: 'Employment Details' },
    { key: 'locationName', label: 'Location / Site Name', group: 'Employment Details' },
    { key: 'locationCode', label: 'Location Code', group: 'Employment Details' },
    { key: 'orgUnitName', label: 'Org Unit / Department Name', group: 'Employment Details' },
    { key: 'orgUnitCode', label: 'Org Unit Code', group: 'Employment Details' },
    // Demographics & Contact
    { key: 'gender', label: 'Gender', group: 'Demographics & Contact' },
    { key: 'bloodGroup', label: 'Blood Group', group: 'Demographics & Contact' },
    { key: 'primaryPhone', label: 'Primary Phone Number', group: 'Demographics & Contact' },
    { key: 'primaryEmail', label: 'Primary Email Address', group: 'Demographics & Contact' },
    { key: 'photoFile', label: 'Photo Relative Path (images/)', group: 'Demographics & Contact' },
    // Sensitive Identity (Protected)
    {
      key: 'dateOfBirth',
      label: 'Full Date of Birth',
      group: 'Sensitive Government Identity',
      sensitive: true,
    },
    {
      key: 'identityDocumentType',
      label: 'Government ID Type',
      group: 'Sensitive Government Identity',
      sensitive: true,
    },
    {
      key: 'identityDocumentNumber',
      label: 'Government ID / NID Number',
      group: 'Sensitive Government Identity',
      sensitive: true,
    },
  ];

export default function WorkerExportStudioPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'employeeNumber',
    'displayName',
    'displayNameLatin',
    'displayNameNative',
    'jobTitle',
    'jobCategory',
    'joinDate',
    'status',
    'primaryPhone',
    'primaryEmail',
    'photoFile',
  ]);

  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [showPrivilegedModal, setShowPrivilegedModal] = useState(false);
  const [privilegedAcknowledged, setPrivilegedAcknowledged] = useState(false);

  // Filters
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Execution State
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<{
    exportJobId: string;
    downloadUrl: string;
    totalWorkers: number;
    totalImages: number;
    fileSizeBytes: number;
    checksumSha256: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  const handleToggleField = (key: string) => {
    if (selectedFields.includes(key)) {
      setSelectedFields(selectedFields.filter((f) => f !== key));
    } else {
      setSelectedFields([...selectedFields, key]);
    }
  };

  const handleSelectPreset = (preset: 'basic' | 'card' | 'all') => {
    if (preset === 'basic') {
      setSelectedFields(['employeeNumber', 'displayName', 'jobTitle', 'joinDate', 'status']);
    } else if (preset === 'card') {
      setSelectedFields([
        'employeeNumber',
        'displayNameLatin',
        'displayNameNative',
        'jobTitle',
        'orgUnitName',
        'bloodGroup',
        'photoFile',
      ]);
    } else {
      setSelectedFields(AVAILABLE_FIELDS.filter((f) => !f.sensitive).map((f) => f.key));
    }
  };

  const handleToggleSensitive = (checked: boolean) => {
    if (checked) {
      setShowPrivilegedModal(true);
    } else {
      setIncludeSensitive(false);
      setPrivilegedAcknowledged(false);
    }
  };

  const confirmPrivilegedExport = () => {
    setIncludeSensitive(true);
    setPrivilegedAcknowledged(true);
    setShowPrivilegedModal(false);
    if (!selectedFields.includes('dateOfBirth')) {
      setSelectedFields((prev) => [
        ...prev,
        'dateOfBirth',
        'identityDocumentType',
        'identityDocumentNumber',
      ]);
    }
  };

  const handleGenerateExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const res = await fetch('/api/exports/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrgId || undefined,
          status: selectedStatus || undefined,
          jobCategory: selectedCategory || undefined,
          includedFields: selectedFields,
          includeSensitive,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to generate export bundle.');
      }

      const data = await res.json();
      setExportResult(data);
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const copyDownloadLink = () => {
    if (!exportResult) return;
    const fullUrl = `${window.location.origin}${exportResult.downloadUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const groupedFields = AVAILABLE_FIELDS.reduce(
    (acc, field) => {
      if (!acc[field.group]) acc[field.group] = [];
      acc[field.group]!.push(field);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_FIELDS>,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/import-export" className="hover:text-slate-800">
              Data Portability
            </Link>
            <span>/</span>
            <span className="text-[#0F766E]">Export Generator Studio</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Generate Portable Export Bundle
          </h1>
        </div>

        <Link href="/import-export">
          <Button variant="outline" size="sm">
            Cancel
          </Button>
        </Link>
      </div>

      {exportError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">Export Request Error</span>
            <span>{exportError}</span>
          </div>
        </div>
      )}

      {/* Export Result Success Card */}
      {exportResult && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-md space-y-6 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Export Archive Ready for Download
                </h2>
                <p className="text-xs text-slate-500">
                  Includes{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">workers.csv</code>,{' '}
                  {exportResult.totalImages} portrait images in{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">images/</code>,{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">manifest.json</code>,
                  and documentation.
                </p>
              </div>
            </div>
            <Badge variant="success" size="sm">
              Ready
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-400 block uppercase font-bold text-[10px]">
                Total Workers
              </span>
              <span className="text-base font-bold text-slate-800">
                {exportResult.totalWorkers}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-400 block uppercase font-bold text-[10px]">
                Embedded Photos
              </span>
              <span className="text-base font-bold text-slate-800">{exportResult.totalImages}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-400 block uppercase font-bold text-[10px]">
                Archive Size
              </span>
              <span className="text-base font-bold text-slate-800">
                {Math.round(exportResult.fileSizeBytes / 1024)} KB
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-slate-400 block uppercase font-bold text-[10px]">
                SHA-256 Digest
              </span>
              <span className="text-[11px] font-mono text-slate-600 truncate block">
                {exportResult.checksumSha256.slice(0, 12)}...
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>
                Download token expires in <strong>1 hour</strong>. Server artifact purged in 24
                hours.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={copyDownloadLink}>
                {copiedLink ? (
                  <Check className="w-4 h-4 mr-1 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                {copiedLink ? 'Link Copied' : 'Copy Download Link'}
              </Button>

              <a href={exportResult.downloadUrl} download>
                <Button variant="primary" size="sm" className="shadow-sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP Archive
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Scope Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">1. Filter Export Scope</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Status Filter</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900"
            >
              <option value="">All Statuses</option>
              {Object.values(EmploymentStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Job Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900"
            >
              <option value="">All Categories</option>
              {Object.values(JobCategory).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Field Selection Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">2. Select Export Fields</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose columns to include in{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">workers.csv</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSelectPreset('basic')}>
              Basic HR
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSelectPreset('card')}>
              Card Print Ready
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSelectPreset('all')}>
              Select All Standard
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedFields).map(([groupName, fields]) => (
            <div key={groupName} className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                {groupName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fields.map((field) => {
                  const isChecked = selectedFields.includes(field.key);
                  const isSensitiveField = field.sensitive;
                  return (
                    <label
                      key={field.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSensitiveField && !includeSensitive
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : isChecked
                            ? 'bg-teal-50/50 border-teal-200 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isSensitiveField && !includeSensitive}
                        checked={isChecked}
                        onChange={() => handleToggleField(field.key)}
                        className="mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <div>
                        <span className="font-semibold block">{field.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                          {field.key}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Privileged Sensitive Field Inclusion Box */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">Privileged Sensitive Identity Inclusion</span>
              <span className="text-amber-800 text-[11px] block mt-0.5">
                Government Smart NID, Passports, and unmasked birth dates are excluded by default
                for privacy compliance.
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-300 font-bold shrink-0">
            <input
              type="checkbox"
              checked={includeSensitive}
              onChange={(e) => handleToggleSensitive(e.target.checked)}
              className="text-amber-600 rounded focus:ring-amber-500"
            />
            <span>Include Sensitive Identity</span>
          </label>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link href="/import-export">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Hub
          </Button>
        </Link>

        <Button
          variant="primary"
          onClick={handleGenerateExport}
          disabled={isExporting || selectedFields.length === 0}
          className="shadow-sm"
        >
          {isExporting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating Portable ZIP Archive...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              <span>Generate Export Archive</span>
            </>
          )}
        </Button>
      </div>

      {/* Privileged Export Confirmation Modal */}
      {showPrivilegedModal && (
        <Dialog
          isOpen={showPrivilegedModal}
          onClose={() => setShowPrivilegedModal(false)}
          title="Privileged Sensitive Export Confirmation"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Audited Action Warning</span>
                <span>
                  Including unmasked government identifiers (Smart NID / Passport numbers) and birth
                  dates will be permanently logged as an immutable audit event (
                  <code className="font-mono text-[10px]">data.exported</code>) recording your user
                  account, timestamp, and IP address.
                </span>
              </div>
            </div>

            <p>
              Please confirm that you have an authorized operational reason to export unmasked
              identity credentials.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setShowPrivilegedModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmPrivilegedExport}
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
              >
                Confirm & Include Sensitive Identity
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
