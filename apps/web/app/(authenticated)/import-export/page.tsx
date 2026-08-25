'use client';

import React from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  Archive,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';

export default function ImportExportHubPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Data Portability Hub
            </h1>
            <Badge variant="primary" size="sm">
              Phase 9
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Safe bulk worker ingestion, column mapping, dry-run simulation, and portable ZIP exports
            with portrait photos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/import-export/import">
            <Button variant="primary" size="md" className="shadow-sm">
              <UploadCloud className="w-4 h-4 mr-2" />
              Import Workers
            </Button>
          </Link>
          <Link href="/import-export/export">
            <Button variant="outline" size="md">
              <Download className="w-4 h-4 mr-2" />
              Export Archive
            </Button>
          </Link>
        </div>
      </div>

      {/* Two Main Cards: Import & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-teal-400/60 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E] border border-teal-100">
                <UploadCloud className="h-6 w-6" />
              </div>
              <Badge variant="success" size="sm">
                CSV & ZIP Packages
              </Badge>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Worker Ingestion Wizard</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Upload standalone UTF-8 CSVs or comprehensive ZIP packages containing CSV data and
                relative portrait image files (
                <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded font-mono">
                  images/EMP-0001.webp
                </code>
                ).
              </p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Encoding & Delimiter Detection:</strong> Auto-detects comma, semicolon,
                  tab, and pipe delimiters with live confirmation.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Zero-Guess Date Policy:</strong> Strict ISO 8601 validation (
                  <code className="text-[11px] font-mono">YYYY-MM-DD</code>) rejecting ambiguous
                  formats.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Full Dry-Run Simulation:</strong> 100% row check, hierarchy resolution,
                  duplicate alerts with zero DB mutations until committed.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <Link href="/import-export/import" className="w-full block">
              <Button variant="primary" className="w-full justify-between group">
                <span>Launch Ingestion Wizard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Export Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-teal-400/60 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E] border border-teal-100">
                <Download className="h-6 w-6" />
              </div>
              <Badge variant="neutral" size="sm">
                Portable Bundle
              </Badge>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Portable Archive Generator</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Generate deterministic, self-contained ZIP export bundles containing sanitized{' '}
                <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded font-mono">
                  workers.csv
                </code>
                , high-resolution portrait photos, cryptographic manifest, and README instructions.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Formula Injection Immunity:</strong> Dangerous prefixes (
                  <code className="text-[11px] font-mono">=, +, -, @</code>) are escaped for
                  spreadsheet safety.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Privileged Privacy Safeguards:</strong> Government IDs and full birth
                  dates are excluded by default; inclusion requires explicit audit.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Cryptographic Manifest:</strong> Includes SHA-256 integrity digests for
                  all records and images in the bundle.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <Link href="/import-export/export" className="w-full block">
              <Button variant="outline" className="w-full justify-between group">
                <span>Configure & Generate Export</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Guidelines & Invariants Box */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">
              Data Security & Tenancy Invariants
            </h3>
            <p className="text-xs text-slate-400">
              Strict platform safeguards governing data migration and portable archives.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
          <div className="space-y-1.5 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <span className="font-bold text-teal-300 block">1. Zero Auto-Merge Policy</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Potential worker duplicate matches are flagged for human operator review and never
              merged silently without explicit instruction.
            </p>
          </div>
          <div className="space-y-1.5 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <span className="font-bold text-teal-300 block">2. Decompression Bomb Defense</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ZIP archives are strictly bounded to 100MB uncompressed size, 2,000 files, and a 100:1
              compression ratio ceiling to prevent memory attacks.
            </p>
          </div>
          <div className="space-y-1.5 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
            <span className="font-bold text-teal-300 block">3. 24-Hour Artifact Lifecycle</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Temporary import folders and export archive files are automatically deleted after 24
              hours, and download links expire after 1 hour.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
