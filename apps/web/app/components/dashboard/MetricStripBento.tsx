'use client';

import React from 'react';
import Link from 'next/link';
import { Users, CheckCircle2, AlertTriangle, Layers, ArrowUpRight } from 'lucide-react';

interface MetricStripBentoProps {
  activeWorkersCount: number;
  readyCount: number;
  attentionCount: number;
  queueCount: number;
  issuedTodayCount?: number;
  isLoading?: boolean;
}

export function MetricStripBento({
  activeWorkersCount = 0,
  readyCount = 0,
  attentionCount = 0,
  queueCount = 0,
  issuedTodayCount = 0,
  isLoading = false,
}: MetricStripBentoProps) {
  const cards = [
    {
      label: 'Active Workers',
      count: activeWorkersCount,
      desc: 'Enrolled workforce in selected scope',
      href: '/people',
      icon: Users,
      badgeText: 'Total Enrolled',
      color: 'text-slate-700',
      bg: 'bg-slate-100',
      border: 'border-slate-200/80',
      hoverBorder: 'hover:border-slate-300',
      numColor: 'text-slate-900',
    },
    {
      label: 'Ready for Card',
      count: readyCount,
      desc: 'Valid photo & active employment',
      href: '/people?readiness=READY',
      icon: CheckCircle2,
      badgeText: 'Printable',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/70',
      hoverBorder: 'hover:border-emerald-300',
      numColor: 'text-emerald-900',
    },
    {
      label: 'Needs Attention',
      count: attentionCount,
      desc: attentionCount > 0 ? 'Missing photo or inactive status' : 'All workers ready for badge issue',
      href: '/people?readiness=NEEDS_ATTENTION',
      icon: AlertTriangle,
      badgeText: attentionCount > 0 ? 'Requires Action' : 'Clear',
      color: attentionCount > 0 ? 'text-amber-700' : 'text-slate-500',
      bg: attentionCount > 0 ? 'bg-amber-50' : 'bg-slate-50',
      border: attentionCount > 0 ? 'border-amber-200/80' : 'border-slate-200/80',
      hoverBorder: attentionCount > 0 ? 'hover:border-amber-300' : 'hover:border-slate-300',
      numColor: attentionCount > 0 ? 'text-amber-900' : 'text-slate-900',
      isWarning: attentionCount > 0,
    },
    {
      label: 'In Print Queue',
      count: queueCount,
      desc: `${issuedTodayCount} issued today`,
      href: '/cards/queue',
      icon: Layers,
      badgeText: queueCount > 0 ? 'Rendering' : 'Queue Empty',
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200/70',
      hoverBorder: 'hover:border-teal-300',
      numColor: 'text-teal-950',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.label}
            href={c.href}
            className={`p-4 sm:p-5 rounded-2xl bg-white border ${c.border} ${c.hoverBorder} shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">
                  {c.label}
                </span>
                <div className={`p-2 rounded-xl shrink-0 ${c.bg} ${c.color}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>

              <div>
                <div className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight tabular-nums ${c.numColor}`}>
                  {isLoading ? '—' : c.count}
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {c.desc}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-800 group-hover:text-teal-950">
              <span className="truncate">{c.badgeText}</span>
              <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

