'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Download,
  Wifi,
  Lock,
  RefreshCw,
  AlertTriangle,
  FileArchive,
  ArrowRight,
  Smartphone,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Badge, Button } from '@hr/ui';
import { SystemDiagnosticsDTO } from '@hr/schemas';

export default function SystemHealthPage() {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLanToggling, setIsLanToggling] = useState(false);
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false);
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/system/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Failed to load system diagnostics.');
      }
    } catch {
      setError('Network error while connecting to system diagnostics API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleToggleLan = async () => {
    if (!diagnostics) return;
    setIsLanToggling(true);
    try {
      const res = await fetch('/api/system/lan-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !diagnostics.lanEnabled }),
      });
      if (res.ok) {
        await fetchDiagnostics();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to toggle LAN mode.');
      }
    } catch {
      alert('Network error while toggling LAN mode.');
    } finally {
      setIsLanToggling(false);
    }
  };

  const handleDownloadSupportBundle = async () => {
    setIsDownloadingBundle(true);
    try {
      const res = await fetch('/api/system/support-bundle', { method: 'POST' });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `support-bundle-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate diagnostic support bundle.');
      }
    } catch {
      alert('Network error downloading support bundle.');
    } finally {
      setIsDownloadingBundle(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Degraded
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" /> Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Unhealthy
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-100 text-teal-800">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Health</h1>
              <p className="text-sm text-slate-500">
                Core services, storage volume health, internal LAN TLS trust, and diagnostic
                telemetry.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDiagnostics}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadSupportBundle}
            disabled={isDownloadingBundle}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800"
          >
            <Download className="w-4 h-4" />
            Support Bundle
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Diagnostics Error:</span> {error}
          </div>
        </div>
      )}

      {/* System Status Overview Card */}
      {diagnostics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              System State
            </span>
            <div className="pt-1">{getStatusBadge(diagnostics.status)}</div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Uptime
            </span>
            <p className="text-base font-semibold text-slate-800">
              {Math.floor(diagnostics.uptimeSeconds / 3600)}h{' '}
              {Math.floor((diagnostics.uptimeSeconds % 3600) / 60)}m
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Application Version
            </span>
            <p className="text-base font-semibold text-slate-800 font-mono">
              v{diagnostics.appVersion}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Node Runtime
            </span>
            <p className="text-base font-semibold text-slate-800 font-mono">
              {diagnostics.nodeVersion}
            </p>
          </div>
        </div>
      )}

      {/* Component Matrix Grid */}
      {diagnostics && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-700" />
            Component Health Matrix
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Fastify API */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">API Server</h3>
                  <p className="text-xs text-slate-500">Fastify REST engine</p>
                </div>
              </div>
              <div>{getStatusBadge(diagnostics.components.api.status)}</div>
            </div>

            {/* 2. PostgreSQL Database */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">PostgreSQL DB</h3>
                  <p className="text-xs text-slate-500">
                    {diagnostics.components.database.latencyMs !== undefined
                      ? `${diagnostics.components.database.latencyMs} ms latency`
                      : 'Active transaction pool'}
                  </p>
                </div>
              </div>
              <div>{getStatusBadge(diagnostics.components.database.status)}</div>
            </div>

            {/* 3. Storage Volume */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Media Storage</h3>
                  <p className="text-xs text-slate-500">
                    {diagnostics.components.storage.writable ? 'Read / Write OK' : 'Read-only'}
                  </p>
                </div>
              </div>
              <div>{getStatusBadge(diagnostics.components.storage.status)}</div>
            </div>

            {/* 4. Background Worker */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Background Worker</h3>
                  <p className="text-xs text-slate-500">Job scheduler & renderer loop</p>
                </div>
              </div>
              <div>{getStatusBadge(diagnostics.components.worker.status)}</div>
            </div>

            {/* 5. Card Renderer Pool */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Chromium Renderer</h3>
                  <p className="text-xs text-slate-500">Isolated exact-mm engine</p>
                </div>
              </div>
              <div>{getStatusBadge(diagnostics.components.renderer.status)}</div>
            </div>

            {/* 6. Backup Engine */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Encrypted Backups</h3>
                  <p className="text-xs text-slate-500">
                    {diagnostics.components.backups.daysSinceLastBackup !== null &&
                    diagnostics.components.backups.daysSinceLastBackup !== undefined
                      ? `${diagnostics.components.backups.daysSinceLastBackup} days since last backup`
                      : 'No backup recorded'}
                  </p>
                </div>
              </div>
              <div>{getStatusBadge(diagnostics.components.backups.status)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Storage & Disk Space Widget */}
      {diagnostics && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-bold text-slate-900">Storage Volume Capacity</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {formatBytes(diagnostics.disk.usedBytes)} used of{' '}
              {formatBytes(diagnostics.disk.totalBytes)} ({diagnostics.disk.usedPercentage}%)
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                diagnostics.disk.isLowDisk
                  ? 'bg-rose-500'
                  : diagnostics.disk.usedPercentage > 80
                    ? 'bg-amber-500'
                    : 'bg-teal-600'
              }`}
              style={{ width: `${Math.min(diagnostics.disk.usedPercentage, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Free Disk Space: <strong>{formatBytes(diagnostics.disk.freeBytes)}</strong>
            </span>
            <span>
              Storage Path: <code className="font-mono text-slate-600">./storage/uploads</code>
            </span>
          </div>

          {diagnostics.disk.isLowDisk && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Low Disk Space Alert:</strong> Less than 2 GB or 10% disk capacity
                remaining. Perform an encrypted backup and purge unnecessary temporary files.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Local LAN Mode & Internal TLS Trust */}
      {diagnostics && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-teal-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Local Network & Internal HTTPS
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Control whether the platform is restricted to this PC or accessible by authorized
                mobile devices over the factory LAN.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  diagnostics.lanEnabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {diagnostics.lanEnabled ? 'LAN Mode Enabled' : 'This-PC (Loopback Only)'}
              </span>
              <Button
                variant={diagnostics.lanEnabled ? 'outline' : 'primary'}
                size="sm"
                onClick={handleToggleLan}
                disabled={isLanToggling}
                className={diagnostics.lanEnabled ? '' : 'bg-teal-700 hover:bg-teal-800'}
              >
                {diagnostics.lanEnabled ? 'Disable LAN Mode' : 'Enable LAN Mode'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Lock className="w-4 h-4 text-teal-700" />
                <span>Secure Context for Mobile Camera</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mobile browsers require trusted HTTPS to enable hardware camera access (
                <code>getUserMedia</code>). When accessing over factory Wi-Fi, install the Caddy
                root CA certificate once on the operator smartphone.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTrustModalOpen(true)}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                  View Mobile Certificate Guide
                </Button>
              </div>
            </div>

            <div className="p-4 bg-teal-50/60 border border-teal-100 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-900">
                <FileArchive className="w-4 h-4 text-teal-700" />
                <span>Disaster Recovery & Encrypted Backups</span>
              </div>
              <p className="text-xs text-teal-800/80 leading-relaxed">
                Regularly export verified AES-256-GCM encrypted backup bundles to an external
                storage drive to guard against hardware loss.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/backups"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900"
                >
                  Manage Encrypted Backups <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Trust Modal */}
      {isTrustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mobile Device CA Trust Setup</h3>
                  <p className="text-xs text-slate-500">
                    Step-by-step instructions for enabling HTTPS camera capture on iOS & Android
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTrustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="p-3.5 bg-teal-50/70 border border-teal-100 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-teal-950">1. Download Root Certificate</h4>
                  <p className="text-xs text-teal-800">
                    Download the internal Caddy certificate to your mobile device
                  </p>
                </div>
                <a
                  href="/api/system/tls/root-ca"
                  download="caddy-root-ca.crt"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download .crt
                </a>
              </div>

              {/* iOS Instructions */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <span>🍎 Apple iOS (iPhone & iPad)</span>
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1 leading-relaxed">
                  <li>Tap the Download button above in Safari on your iPhone.</li>
                  <li>
                    Open <strong>Settings → Profile Downloaded</strong> and tap{' '}
                    <strong>Install</strong>.
                  </li>
                  <li>
                    Navigate to{' '}
                    <strong>Settings → General → About → Certificate Trust Settings</strong>.
                  </li>
                  <li>
                    Under &quot;Enable full trust for root certificates&quot;, toggle on the
                    internal HR Certificate.
                  </li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <span>🤖 Google Android</span>
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1 leading-relaxed">
                  <li>
                    Download the <code>.crt</code> file onto your device.
                  </li>
                  <li>
                    Go to{' '}
                    <strong>
                      Settings → Security & privacy → More security settings → Encryption &
                      credentials
                    </strong>
                    .
                  </li>
                  <li>
                    Tap <strong>Install a certificate → CA certificate</strong>.
                  </li>
                  <li>Select the downloaded certificate and confirm installation with your PIN.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setIsTrustModalOpen(false)}>
                Close Guide
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
