'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { Badge } from '@hr/ui';

interface SystemHealthData {
  status: 'ok' | 'degraded' | 'error' | 'maintenance';
  timestamp: string;
  uptimeSeconds: number;
  appVersion: string;
  components: {
    database: { status: string; latencyMs?: number };
    storage: { status: string; writable: boolean };
    renderer: { status: string; poolReady: boolean };
    backups?: {
      status: string;
      lastBackupAt: string | null;
      daysSinceLastBackup: number | null;
      isWarning?: boolean;
    };
  };
}

export function SystemHealthBentoPanel() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await fetch('/api/system/health');
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        } else {
          // Fallback to degraded if status code != 200
          setHealth({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            uptimeSeconds: 0,
            appVersion: '0.1.0',
            components: {
              database: { status: 'error' },
              storage: { status: 'ok', writable: true },
              renderer: { status: 'ok', poolReady: true },
            },
          });
        }
      } catch {
        // Network failure
        setHealth({
          status: 'error',
          timestamp: new Date().toISOString(),
          uptimeSeconds: 0,
          appVersion: '0.1.0',
          components: {
            database: { status: 'error' },
            storage: { status: 'error', writable: false },
            renderer: { status: 'error', poolReady: false },
          },
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadHealth();
  }, []);

  const isHealthy = health?.status === 'ok';
  const isDegraded = health?.status === 'degraded';
  const isError = health?.status === 'error';

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200/60">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Local Node State</h3>
            <span className="text-[11px] text-slate-500">Live operational diagnostics</span>
          </div>
        </div>

        {isLoading ? (
          <span className="text-xs text-slate-400">Checking...</span>
        ) : isHealthy ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Healthy</span>
          </span>
        ) : isDegraded ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Degraded</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Attention Needed</span>
          </span>
        )}
      </div>

      {/* Components Matrix */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <Database className="w-3.5 h-3.5 mx-auto text-slate-500" />
          <span className="text-[11px] font-bold block text-slate-800">Database</span>
          <span className="text-[10px] font-mono text-slate-500 block">
            {health?.components.database.status === 'ok'
              ? `${health.components.database.latencyMs ?? 2}ms`
              : 'Error'}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <HardDrive className="w-3.5 h-3.5 mx-auto text-slate-500" />
          <span className="text-[11px] font-bold block text-slate-800">Storage</span>
          <span className="text-[10px] font-mono text-slate-500 block">
            {health?.components.storage.writable ? 'Writable' : 'Read-Only'}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <Cpu className="w-3.5 h-3.5 mx-auto text-slate-500" />
          <span className="text-[11px] font-bold block text-slate-800">Renderer</span>
          <span className="text-[10px] font-mono text-slate-500 block">
            {health?.components.renderer.poolReady ? 'Ready' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Backups Summary Footer */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {health?.components.backups?.lastBackupAt
              ? `Last backup: ${new Date(health.components.backups.lastBackupAt).toLocaleDateString()}`
              : 'Encrypted Backups Active'}
          </span>
        </div>

        <Link
          href="/admin/system"
          className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Diagnostics</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
