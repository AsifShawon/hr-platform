'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Upload,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Database,
  Users,
  HardDrive,
  FileCheck,
  History,
} from 'lucide-react';
import { Badge, Button, Input, ShowHidePasswordInput } from '@hr/ui';
import { RestoreInspectionResultDTO } from '@hr/schemas';

export default function RestoreWizardPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmAwareness, setConfirmAwareness] = useState(false);

  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<RestoreInspectionResultDTO | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    message: string;
    preRestoreBackupId?: string;
    restoredCounts?: Record<string, number>;
  } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setInspectError('Please select a .hrbackup file to inspect.');
      return;
    }
    if (!passphrase) {
      setInspectError('Please enter the encryption passphrase.');
      return;
    }

    setIsInspecting(true);
    setInspectError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('passphrase', passphrase);

    try {
      const res = await fetch('/api/restore/inspect', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setInspectionResult(data);
        if (data.isValid) {
          setStep(2);
        } else {
          setInspectError(data.errors?.join('; ') || 'Inspection failed.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setInspectError(errData.message || 'Failed to inspect backup file.');
      }
    } catch {
      setInspectError('Network error while inspecting backup file.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !passphrase || !ownerPassword || !confirmAwareness) {
      setRestoreError('All fields and confirmation are required.');
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('passphrase', passphrase);
    formData.append('ownerPassword', ownerPassword);
    formData.append('confirmRollbackAwareness', 'true');

    try {
      const res = await fetch('/api/restore/execute', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setRestoreResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setRestoreError(errData.message || 'Restore execution failed.');
      }
    } catch {
      setRestoreError('Network error executing restore.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-100 text-teal-800">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Disaster Recovery & Restore Wizard
              </h1>
              <p className="text-sm text-slate-500">
                Safe 3-step restore workflow with pre-flight dry inspection and automatic rollback
                snapshots.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/admin/backups"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Backups
        </Link>
      </div>

      {/* Step Progress Indicators */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            step === 1
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : step > 1
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">
            1
          </span>
          <span>Upload & Passphrase</span>
        </div>

        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            step === 2
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : step > 2
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">
            2
          </span>
          <span>Dry Run Inspection</span>
        </div>

        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            step === 3
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">
            3
          </span>
          <span>Owner Authorization</span>
        </div>
      </div>

      {/* STEP 1: Upload & Passphrase */}
      {step === 1 && !restoreResult && (
        <form
          onSubmit={handleInspect}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Step 1: Select Backup Bundle & Enter Decryption Passphrase
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The archive will be decrypted in-memory for dry inspection. No persistent state will
              be altered in this step.
            </p>
          </div>

          {inspectError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{inspectError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Encrypted Backup File (.hrbackup) <span className="text-rose-500">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-teal-400 transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-slate-50/50">
                <input
                  type="file"
                  accept=".hrbackup,.zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-8 h-8 text-teal-700 mx-auto mb-2" />
                {file ? (
                  <p className="text-sm font-semibold text-slate-900 font-mono">{file.name}</p>
                ) : (
                  <p className="text-xs text-slate-600">
                    Drag and drop your <strong>.hrbackup</strong> file here, or click to browse
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Backup Decryption Passphrase <span className="text-rose-500">*</span>
              </label>
              <ShowHidePasswordInput
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter encryption passphrase..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isInspecting || !file || !passphrase}
              className="bg-teal-700 hover:bg-teal-800 flex items-center gap-2"
            >
              {isInspecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Inspecting Manifest...
                </>
              ) : (
                <>
                  Inspect & Validate <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: Dry Inspection Report */}
      {step === 2 && inspectionResult && !restoreResult && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                Step 2: Pre-Flight Dry Inspection Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review the decrypted backup metadata, record counts, and compatibility status before
                proceeding.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              {inspectionResult.compatibilityStatus}
            </span>
          </div>

          {inspectionResult.warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Migration Advisories:
              </span>
              <ul className="list-disc list-inside pl-1 space-y-0.5">
                {inspectionResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Counts & Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Target Company
              </span>
              <p className="text-sm font-bold text-slate-900">{inspectionResult.tenant.name}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Source App Version
              </span>
              <p className="text-sm font-mono font-bold text-slate-900">
                v{inspectionResult.appVersion}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                People Records
              </span>
              <p className="text-sm font-bold text-teal-800">
                {inspectionResult.counts.people} workers
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Media Assets
              </span>
              <p className="text-sm font-bold text-slate-900">
                {inspectionResult.counts.mediaAssets} (
                {(inspectionResult.mediaSizeBytes / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <span className="font-semibold text-slate-800">Detailed Entity Breakdown:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div>Organizations: {inspectionResult.counts.organizations}</div>
              <div>Locations: {inspectionResult.counts.locations}</div>
              <div>Org Units: {inspectionResult.counts.orgUnits}</div>
              <div>Employments: {inspectionResult.counts.employments}</div>
              <div>Identity Docs: {inspectionResult.counts.identityDocuments}</div>
              <div>Card Templates: {inspectionResult.counts.cardTemplates}</div>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Upload
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep(3)}
              className="bg-teal-700 hover:bg-teal-800"
            >
              Continue to Authorization <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Owner Authorization & Execution */}
      {step === 3 && !restoreResult && (
        <form
          onSubmit={handleExecuteRestore}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-teal-700" />
              Step 3: System Owner Authorization & Pre-Restore Snapshot
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Re-authenticate with your System Owner account password to authorize the database
              overwrite.
            </p>
          </div>

          {restoreError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}

          <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-950 text-xs space-y-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-teal-700" /> Pre-Restore Rollback Guarantee:
            </span>
            <p className="leading-relaxed">
              The system will automatically create a pre-restore safety snapshot before touching
              active database tables. If any failure occurs during restoration, your active database
              state will be automatically preserved.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                System Owner Password <span className="text-rose-500">*</span>
              </label>
              <ShowHidePasswordInput
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Enter current login password..."
                required
              />
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAwareness}
                onChange={(e) => setConfirmAwareness(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                I understand that executing this restore will replace current database personnel
                records with the backup bundle snapshot under tenant{' '}
                <strong>{inspectionResult?.tenant.name}</strong>.
              </span>
            </label>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(2)}
              disabled={isRestoring}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isRestoring || !ownerPassword || !confirmAwareness}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Restoring Records & Media...
                </>
              ) : (
                'Execute Verified Restore'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Restore Succeeded Screen */}
      {restoreResult && (
        <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-sm text-center space-y-6">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Restore Completed Successfully!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{restoreResult.message}</p>
          </div>

          {restoreResult.preRestoreBackupId && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 max-w-md mx-auto">
              Pre-restore safety snapshot created with ID: <br />
              <code className="font-mono text-slate-800 font-semibold">
                {restoreResult.preRestoreBackupId}
              </code>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/people"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              View People Registry
            </Link>
            <Link
              href="/admin/system"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              System Health Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
