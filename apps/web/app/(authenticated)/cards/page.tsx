'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  PlusCircle,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldCheck,
  Download,
  Sliders,
  Users,
  ArrowRight,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { CardIssueStatus, PrintJobStatus, OperatorPrintStatus } from '@hr/domain';
import { CardOperationsStatsDTO, PrintJobDTO, CardIssueDTO } from '@hr/schemas';

export default function CardsOverviewHubPage() {
  const [stats, setStats] = useState<CardOperationsStatsDTO | null>(null);
  const [recentJobs, setRecentJobs] = useState<PrintJobDTO[]>([]);
  const [recentIssues, setRecentIssues] = useState<CardIssueDTO[]>([]);
  const [blockedWorkers, setBlockedWorkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, jobsRes, issuesRes, blockedRes] = await Promise.all([
        fetch('/api/cards/stats'),
        fetch('/api/cards/print-jobs?limit=5'),
        fetch('/api/cards/issues?limit=5'),
        fetch('/api/people?hasPhoto=false&limit=5'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setRecentJobs(jobsData.items || []);
      }

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setRecentIssues(issuesData.items || []);
      }

      if (blockedRes.ok) {
        const blockedData = await blockedRes.json();
        setBlockedWorkers(blockedData.items || []);
      }
    } catch (err) {
      console.error('Failed to load card hub data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-16 overflow-x-clip">
      {/* 1. Header & Hero CTA Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#134E4A] to-[#0F766E] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-800/80 border border-teal-600 text-[11px] font-semibold text-teal-200">
              Card Production Hub
            </span>
            <span className="text-xs text-teal-200 font-medium">Exact 60×90mm Physical Master</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#14B8A6]" />
            <span>ID Card Operations & Batch Production</span>
          </h1>
          <p className="text-xs text-teal-100/90 max-w-xl leading-relaxed">
            Create employee ID credentials in seconds, manage batch print queues with physical
            operator sign-off, and track lifetime reprint lineage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/cards/new">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="bg-white text-[#134E4A] hover:bg-teal-50 font-bold border-none shadow-md"
            >
              <PlusCircle className="w-4 h-4 mr-2 text-[#0F766E]" />
              <span>Create Single ID</span>
            </Button>
          </Link>

          <Link href="/people">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="border-teal-400/60 text-white hover:bg-teal-800/50 font-bold"
            >
              <Printer className="w-4 h-4 mr-2" />
              <span>Batch From Registry</span>
            </Button>
          </Link>

          <Link href="/cards/calibration">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="border-teal-400/60 text-white hover:bg-teal-800/50 font-bold"
            >
              <Sliders className="w-4 h-4 mr-2" />
              <span>Calibration</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ready to Print */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Ready to Print</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? '—' : (stats?.readyToPrintCount ?? 0)}
          </div>
          <p className="text-[11px] text-slate-400">Workers with approved portraits</p>
        </div>

        {/* Needs Attention */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Needs Attention</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {isLoading ? '—' : (stats?.needsAttentionCount ?? 0)}
          </div>
          <p className="text-[11px] text-slate-400">Missing photo or broken bindings</p>
        </div>

        {/* In-Flight Batch Jobs */}
        <Link href="/cards/queue" className="block group">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 group-hover:border-[#0F766E] transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold group-hover:text-[#0F766E]">In-Flight Queue</span>
              <Layers className="w-4 h-4 text-[#0F766E]" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '—' : (stats?.queuedJobsCount ?? 0)}
            </div>
            <p className="text-[11px] text-slate-400">Batch jobs rendering/queued</p>
          </div>
        </Link>

        {/* Total Active Badges */}
        <Link href="/cards/issues" className="block group">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 group-hover:border-[#0F766E] transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold group-hover:text-[#0F766E]">Total Active Badges</span>
              <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '—' : (stats?.totalActiveBadgesCount ?? 0)}
            </div>
            <p className="text-[11px] text-slate-400">Live issued credentials</p>
          </div>
        </Link>
      </div>

      {/* 3. Navigation Shortcut Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/cards/queue"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-sm flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-[#0F766E]" />
            <span>Print Queue ({recentJobs.length})</span>
          </Link>

          <Link
            href="/cards/issues"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-sm flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-[#0F766E]" />
            <span>Issued Badges Ledger ({recentIssues.length})</span>
          </Link>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadDashboardData}
          isLoading={isLoading}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* 4. Two-Column Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Print Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent In-Flight & Completed Jobs
              </h3>
            </div>
            <Link
              href="/cards/queue"
              className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No recent print jobs.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentJobs.map((job) => (
                <div key={job.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        JOB #{job.id.substring(0, 8)}
                      </span>
                      <Badge
                        variant={job.status === PrintJobStatus.COMPLETED ? 'success' : 'primary'}
                        size="sm"
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {job.outputFormat} • {job.side} • {job.totalItems} badge(s)
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/cards/print-jobs/${job.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button type="button" variant="outline" size="sm" className="text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </a>
                    <Link href={`/cards/queue?jobId=${job.id}`}>
                      <Button type="button" variant="outline" size="sm" className="text-xs">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Workers Needing Attention */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Workers Needing Attention (Blocked)
              </h3>
            </div>
            <Link
              href="/people?hasPhoto=false"
              className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {blockedWorkers.length === 0 ? (
            <p className="text-xs text-emerald-700 italic py-6 text-center">
              All registered workers have photos and meet badge requirements!
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {blockedWorkers.map((worker) => (
                <div key={worker.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block">{worker.displayName}</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {worker.activeEmployment?.employeeNumber || 'Unassigned'} •{' '}
                      <span className="text-amber-700 font-semibold">Missing Photo</span>
                    </span>
                  </div>

                  <Link href={`/people/${worker.id}`}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs text-[#0F766E]"
                    >
                      <Camera className="w-3 h-3 mr-1" />
                      Take Photo
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
