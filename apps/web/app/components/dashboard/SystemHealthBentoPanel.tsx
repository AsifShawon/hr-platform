'use client';

import React from 'react';
import Link from 'next/link';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';

export interface SystemHealthData {
  status: 'ok' | 'degraded' | 'error' | 'maintenance' | 'unknown';
  database: { status: string; latencyMs?: number };
  storage: { status: string; writable: boolean };
  renderer: { status: string; poolReady: boolean };
  backups: {
    status: string;
    lastBackupAt: string | null;
    daysSinceLastBackup: number | null;
    hasWarning: boolean;
  };
}

interface SystemHealthBentoPanelProps {
  health: SystemHealthData | null;
  isLoading?: boolean;
}

export function SystemHealthBentoPanel({
  health,
  isLoading = false,
}: SystemHealthBentoPanelProps) {
  const isHealthy = health?.status === 'ok';
  const isDegraded = health?.status === 'degraded';

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/60 shrink-0">
            <Server className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Local Node State</h3>
            <span className="text-xs text-slate-500 block truncate">Operational subsystem diagnostics</span>
          </div>
        </div>

        {isLoading ? (
          <span className="text-xs text-slate-500">Checking...</span>
        ) : isHealthy ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
            <span>Healthy</span>
          </span>
        ) : isDegraded ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600" aria-hidden="true" />
            <span>Degraded</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-500" aria-hidden="true" />
            <span>Diagnostic Standby</span>
          </span>
        )}
      </div>

      {/* Components Matrix */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <Database className="w-4 h-4 mx-auto text-slate-600" aria-hidden="true" />
          <span className="text-xs font-bold block text-slate-900">Database</span>
          <span className="text-xs font-mono text-slate-600 block">
            {health?.database?.status === 'ok'
              ? `${health.database.latencyMs ?? 2}ms`
              : 'Active'}
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <HardDrive className="w-4 h-4 mx-auto text-slate-600" aria-hidden="true" />
          <span className="text-xs font-bold block text-slate-900">Storage</span>
          <span className="text-xs font-mono text-slate-600 block">
            {health?.storage?.writable ? 'Writable' : 'Read-Only'}
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <Cpu className="w-4 h-4 mx-auto text-slate-600" aria-hidden="true" />
          <span className="text-xs font-bold block text-slate-900">Renderer</span>
          <span className="text-xs font-mono text-slate-600 block">
            {health?.renderer?.poolReady ? 'Ready' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Backups Status Footer */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-3">
        <div className="flex items-center gap-1.5 text-slate-600 min-w-0 pr-2 truncate">
          {health?.backups?.lastBackupAt ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Backup:{' '}
                {new Date(health.backups.lastBackupAt).toLocaleDateString()}
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span className="text-amber-900 font-semibold truncate">
                No backup records verified
              </span>
            </>
          )}
        </div>

        <Link
          href="/admin/system"
          className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Diagnostics</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

