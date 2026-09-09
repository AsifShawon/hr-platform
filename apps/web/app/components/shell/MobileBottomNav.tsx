'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, Users, Layers, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
  queuePendingCount?: number;
  queueFailedCount?: number;
}

export function MobileBottomNav({
  onOpenMobileMenu,
  queuePendingCount = 0,
  queueFailedCount = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      href: '/people',
      label: 'Workers',
      icon: Users,
      isActive:
        pathname === '/people' || (pathname.startsWith('/people') && !pathname.includes('/cards')),
    },
    {
      href: '/cards/new',
      label: 'Create ID',
      icon: CreditCard,
      isActive: pathname === '/cards/new',
      highlight: true,
    },
    {
      href: '/cards/queue',
      label: 'Queue',
      icon: Layers,
      isActive: pathname === '/cards/queue',
      badge:
        queueFailedCount > 0 ? (
          <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full text-[9px] font-bold bg-rose-600 text-white flex items-center justify-center animate-pulse">
            {queueFailedCount}
          </span>
        ) : queuePendingCount > 0 ? (
          <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full text-[9px] font-bold bg-teal-700 text-white flex items-center justify-center">
            {queuePendingCount}
          </span>
        ) : null,
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1 shadow-lg flex items-center justify-around"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-1 py-1 rounded-xl transition-colors relative ${
              item.isActive
                ? 'text-teal-800 font-bold bg-teal-50/80'
                : item.highlight
                  ? 'text-teal-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className={`w-5 h-5 ${item.isActive ? 'text-teal-800' : 'text-slate-400'}`} />
            <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            {item.badge}
          </Link>
        );
      })}

      {/* More Button to trigger labeled Drawer */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-1 py-1 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
        aria-label="Open full navigation drawer"
      >
        <Menu className="w-5 h-5 text-slate-400" />
        <span className="text-[10px] mt-0.5 leading-tight">More</span>
      </button>
    </nav>
  );
}
