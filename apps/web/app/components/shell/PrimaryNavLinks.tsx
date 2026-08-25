'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, Users, Layers, FileCheck2 } from 'lucide-react';
import { Badge } from '@hr/ui';

interface PrimaryNavLinksProps {
  queuePendingCount?: number;
  queueFailedCount?: number;
}

export function PrimaryNavLinks({
  queuePendingCount = 0,
  queueFailedCount = 0,
}: PrimaryNavLinksProps) {
  const pathname = usePathname();

  const links = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      href: '/cards/new',
      label: 'Create ID',
      icon: CreditCard,
      isActive: pathname === '/cards/new',
    },
    {
      href: '/people',
      label: 'Workers',
      icon: Users,
      isActive:
        pathname === '/people' || (pathname.startsWith('/people') && !pathname.includes('/cards')),
    },
    {
      href: '/cards/queue',
      label: 'Print Queue',
      icon: Layers,
      isActive: pathname === '/cards/queue',
      badge:
        queueFailedCount > 0 ? (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
            {queueFailedCount}
          </span>
        ) : queuePendingCount > 0 ? (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-700 text-white">
            {queuePendingCount}
          </span>
        ) : null,
    },
    {
      href: '/cards/issues',
      label: 'Issued Cards',
      icon: FileCheck2,
      isActive: pathname === '/cards/issues',
    },
  ];

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              link.isActive
                ? 'bg-teal-50 text-[#0F766E] shadow-sm ring-1 ring-teal-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className={`w-4 h-4 ${link.isActive ? 'text-[#0F766E]' : 'text-slate-400'}`} />
            <span>{link.label}</span>
            {link.badge}
          </Link>
        );
      })}
    </nav>
  );
}
