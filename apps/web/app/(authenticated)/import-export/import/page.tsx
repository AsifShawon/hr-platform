'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileSpreadsheet,
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  FileCheck,
  Layers,
  XCircle,
} from 'lucide-react';
import { Button, Badge, TableShell } from '@hr/ui';
import { ImportDuplicateStrategy, ImportCommitPolicy } from '@hr/domain';

export default function WorkerImportWizardPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Job Details State
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<ImportDuplicateStrategy>(
    ImportDuplicateStrategy.REJECT_DUPLICATES,
  );
  const [commitPolicy, setCommitPolicy] = useState<ImportCommitPolicy>(
    ImportCommitPolicy.ALL_OR_NOTHING,
  );

  const [isDryRunning, setIsDryRunning] = useState(false);
  const [dryRunReport, setDryRunReport] = useState<any>(null);

  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);

  // Step 1: Upload File
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV or ZIP file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/imports/workers', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setJobId(data.id);
        setJobDetails(data);
        if (data.columnMapping) {
          setColumnMapping(data.columnMapping);
        }
        setStep(2);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Failed to upload and parse file.');
      }
    } catch {
      setError('Network error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Configure Column Mapping & Dry Run
  const handleRunDryRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;

    setIsDryRunning(true);
    setError(null);

    try {
      // 1. Update mapping
      const mapRes = await fetch(`/api/imports/${jobId}/mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: jobDetails?.organizationId,
          columnMapping,
          duplicateStrategy,
        }),
      });

      if (!mapRes.ok) {
        const err = await mapRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save column mapping');
      }

      // 2. Trigger Dry Run
      const dryRes = await fetch(`/api/imports/${jobId}/dry-run`, {
        method: 'POST',
      });

      if (dryRes.ok) {
        const report = await dryRes.json();
        setDryRunReport(report.validationReport);
        setStep(3);
      } else {
        const err = await dryRes.json().catch(() => ({}));
        setError(err.message || 'Dry run simulation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error running dry run simulation.');
    } finally {
      setIsDryRunning(false);
    }
  };

  // Step 3: Commit Batch
  const handleCommitBatch = async () => {
    if (!jobId) return;

    setIsCommitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/imports/${jobId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitPolicy }),
      });

      if (res.ok) {
        const result = await res.json();
        setCommitResult(result);
        setStep(4);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Failed to commit worker import batch.');
      }
    } catch {
      setError('Network error committing batch.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-100 text-teal-800">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Batch Worker Ingestion Studio
              </h1>
              <p className="text-sm text-slate-500">
                4-step guided CSV / ZIP ingestion with schema validation, dry-run simulation, and
                atomic batch transactions.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/import-export"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Data Hub
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            step === 1
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : step > 1
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">
            1
          </span>
          <span>Upload File</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            step === 2
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : step > 2
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">
            2
          </span>
          <span>Column Mapping</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            step === 3
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : step > 3
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">
            3
          </span>
          <span>Dry Run Report</span>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            step === 4
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">
            4
          </span>
          <span>Commit Batch</span>
        </div>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <form
          onSubmit={handleUploadFile}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Step 1: Upload Workers CSV or ZIP Archive
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a UTF-8 encoded CSV file or a ZIP bundle containing <code>workers.csv</code>{' '}
              and portrait images.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select CSV / ZIP File <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-teal-400 transition-colors rounded-xl p-8 text-center cursor-pointer relative bg-slate-50/50">
              <input
                type="file"
                accept=".csv,.zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-10 h-10 text-teal-700 mx-auto mb-2" />
              {file ? (
                <p className="text-sm font-semibold text-slate-900 font-mono">{file.name}</p>
              ) : (
                <p className="text-xs text-slate-600">
                  Drag and drop your <strong>.csv</strong> or <strong>.zip</strong> file here, or
                  click to browse
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUploading || !file}
              className="bg-teal-700 hover:bg-teal-800 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Uploading & Parsing...
                </>
              ) : (
                <>
                  Upload & Inspect Columns <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: Mapping */}
      {step === 2 && (
        <form
          onSubmit={handleRunDryRun}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Step 2: Configure Column Mapping & Duplicate Policy
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify detected column mappings and choose duplicate resolution strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duplicate Handling Strategy
              </label>
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value={ImportDuplicateStrategy.REJECT_DUPLICATES}>
                  Reject Duplicates (Fail or Warn)
                </option>
                <option value={ImportDuplicateStrategy.SKIP_EXISTING}>Skip Existing Workers</option>
                <option value={ImportDuplicateStrategy.UPDATE_EXISTING}>
                  Update Existing Workers
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isDryRunning}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {isDryRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Simulating Dry Run...
                </>
              ) : (
                <>
                  Run Dry Run Simulation <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* STEP 3: Dry Run Report */}
      {step === 3 && dryRunReport && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                Step 3: Dry Run Validation Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulation completed. Zero database records were modified. Review validation results
                before committing.
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                dryRunReport.invalidRows === 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {dryRunReport.invalidRows === 0 ? 'All Valid' : `${dryRunReport.invalidRows} Issues`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Total Rows</span>
              <p className="text-base font-bold text-slate-900">{dryRunReport.totalRows}</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700">Valid Rows</span>
              <p className="text-base font-bold text-emerald-900">{dryRunReport.validRows}</p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-[11px] font-semibold text-rose-700">Invalid Rows</span>
              <p className="text-base font-bold text-rose-900">{dryRunReport.invalidRows}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-700">Duplicate Rows</span>
              <p className="text-base font-bold text-amber-900">{dryRunReport.duplicateRows}</p>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Adjust Mapping
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCommitBatch}
              disabled={isCommitting || dryRunReport.validRows === 0}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Committing Batch...
                </>
              ) : (
                'Commit Valid Workers to Database'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Completed */}
      {step === 4 && commitResult && (
        <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-sm text-center space-y-6">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Batch Ingestion Completed!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Successfully imported {commitResult.committedRows} worker records into the database.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/people"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              View People Registry
            </Link>
            <Link
              href="/cards/templates"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Issue Cards
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
