'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Layers, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface MetricStripBentoProps {
  readyCount: number;
  attentionCount: number;
  queueCount: number;
  activeCount: number;
  isLoading?: boolean;
}

export function MetricStripBento({
  readyCount = 0,
  attentionCount = 0,
  queueCount = 0,
  activeCount = 0,
  isLoading = false,
}: MetricStripBentoProps) {
  const cards = [
    {
      label: 'Ready to Print',
      count: readyCount,
      desc: 'Workers with approved photos & valid bindings',
      href: '/people?readiness=READY',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200/60',
      hoverBorder: 'hover:border-emerald-300',
    },
    {
      label: 'Needs Attention',
      count: attentionCount,
      desc: 'Missing portrait photos or separated status',
      href: '/people?readiness=NEEDS_ATTENTION',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200/60',
      hoverBorder: 'hover:border-amber-300',
    },
    {
      label: 'In Print Queue',
      count: queueCount,
      desc: 'Batch print jobs rendering or pending sign-off',
      href: '/cards/queue',
      icon: Layers,
      color: 'text-[#0F766E]',
      bg: 'bg-teal-50/70',
      border: 'border-teal-200/60',
      hoverBorder: 'hover:border-teal-300',
    },
    {
      label: 'Total Active Badges',
      count: activeCount,
      desc: 'Currently issued live physical credentials',
      href: '/cards/issues',
      icon: ShieldCheck,
      color: 'text-[#134E4A]',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      hoverBorder: 'hover:border-slate-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.label}
            href={c.href}
            className={`p-4 sm:p-5 rounded-2xl bg-white border ${c.border} ${c.hoverBorder} shadow-sm hover:shadow-md transition-all flex flex-col justify-between group`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">{c.label}</span>
              <div className={`p-2 rounded-xl ${c.bg} ${c.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {isLoading ? '—' : c.count}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.desc}</p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-[#0F766E] group-hover:underline">
              <span>View Records</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
