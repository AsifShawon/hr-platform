'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Layers,
  FileCheck2,
  Palette,
  Building2,
  ArrowUpDown,
  UserCheck,
  Shield,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  HardDrive,
} from 'lucide-react';
import { useActiveOrg } from '../../context/ActiveOrgContext';

interface AppSidebarProps {
  user: any;
  queuePendingCount?: number;
  queueFailedCount?: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  permission?: string;
  badge?: React.ReactNode;
  highlight?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export function AppSidebar({
  user,
  queuePendingCount = 0,
  queueFailedCount = 0,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { activeOrg } = useActiveOrg();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Restore collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('hr_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleCollapsed = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('hr_sidebar_collapsed', String(nextState));
    } catch {
      // Ignore
    }
  };

  const permissions: string[] = user?.permissions || [];
  const hasPerm = (p?: string) => !p || permissions.includes(p) || permissions.includes('system.manage');

  const navGroups: NavGroup[] = [
    {
      id: 'workspace',
      title: 'Workspace',
      items: [
        {
          href: '/dashboard',
          label: 'Overview',
          icon: LayoutDashboard,
          isActive: (p) => p === '/dashboard',
        },
        {
          href: '/cards/new',
          label: 'Create ID',
          icon: CreditCard,
          isActive: (p) => p === '/cards/new',
          highlight: true,
        },
        {
          href: '/people',
          label: 'Workers',
          icon: Users,
          isActive: (p) => p === '/people' || (p.startsWith('/people') && !p.includes('/cards')),
        },
      ],
    },
    {
      id: 'card-operations',
      title: 'Card operations',
      items: [
        {
          href: '/cards/queue',
          label: 'Print queue',
          icon: Layers,
          isActive: (p) => p === '/cards/queue',
          badge:
            queueFailedCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                {queueFailedCount}
              </span>
            ) : queuePendingCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-300 text-[#134E4A]">
                {queuePendingCount}
              </span>
            ) : null,
        },
        {
          href: '/cards/issues',
          label: 'Issued cards',
          icon: FileCheck2,
          isActive: (p) => p === '/cards/issues',
        },
        {
          href: '/cards/templates',
          label: 'Templates',
          icon: Palette,
          isActive: (p) => p.startsWith('/cards/templates') || p === '/cards/calibration',
          permission: 'cards.design',
        },
      ],
    },
    {
      id: 'organization',
      title: 'Organization',
      items: [
        {
          href: '/admin/company',
          label: 'Companies',
          icon: Building2,
          isActive: (p) => p.startsWith('/admin/company'),
          permission: 'organization.manage',
        },
        {
          href: '/organization',
          label: 'Locations & units',
          icon: Building2,
          isActive: (p) => p === '/organization' || p.startsWith('/admin/locations'),
          permission: 'organization.manage',
        },
      ],
    },
    {
      id: 'data',
      title: 'Data',
      items: [
        {
          href: '/import-export',
          label: 'Import / export',
          icon: ArrowUpDown,
          isActive: (p) => p.startsWith('/import-export'),
          permission: 'people.view',
        },
      ],
    },
    {
      id: 'administration',
      title: 'Administration',
      items: [
        {
          href: '/admin/users',
          label: 'Users & roles',
          icon: UserCheck,
          isActive: (p) => p.startsWith('/admin/users') || p.startsWith('/admin/roles'),
          permission: 'users.manage',
        },
        {
          href: '/audit',
          label: 'Audit log',
          icon: Shield,
          isActive: (p) => p.startsWith('/audit'),
          permission: 'audit.view',
        },
        {
          href: '/admin/system',
          label: 'System & backups',
          icon: Settings,
          isActive: (p) => p.startsWith('/admin/system') || p.startsWith('/admin/backups') || p.startsWith('/admin/restore'),
          permission: 'system.manage',
        },
      ],
    },
  ];

  return (
    <aside
      aria-label="Workspace navigation"
      className={`hidden lg:flex flex-col bg-[#134E4A] text-white border-r border-teal-950/40 shrink-0 select-none transition-all duration-200 ease-in-out relative ${
        isCollapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-teal-800/60">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg p-1"
          aria-label="HR ID Platform Home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-800 text-teal-300 shadow-sm group-hover:bg-teal-700 transition-colors shrink-0">
            <ShieldCheck className="h-4 w-4 text-teal-400" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-xs font-bold tracking-tight text-white block leading-tight truncate">
                HR ID Platform
              </span>
              <span className="text-[10px] font-medium text-teal-300 block leading-tight truncate">
                Local Workspace
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="p-1 rounded-lg text-teal-400 hover:text-white hover:bg-teal-800/80 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar to rail'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Active Organization Context Pill */}
      {!isCollapsed && activeOrg && (
        <div className="mx-3 my-2.5 p-2 rounded-xl bg-teal-950/40 border border-teal-800/50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-teal-300/80 block leading-none">
              Active Facility
            </span>
            <span className="text-xs font-bold text-white truncate block mt-0.5">
              {activeOrg.displayName || activeOrg.name}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Groups Container */}
      <div className="flex-1 px-2.5 py-2 space-y-4 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group) => {
          // Filter items based on user permissions
          const visibleItems = group.items.filter((item) => hasPerm(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1">
              {!isCollapsed ? (
                <span className="px-2.5 text-[11px] font-bold uppercase tracking-wider text-teal-300/70 block mb-1">
                  {group.title}
                </span>
              ) : (
                <div className="h-px bg-teal-800/40 my-2 mx-1" />
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = item.isActive(pathname);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
                    } rounded-xl text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                      active
                        ? 'bg-teal-700 text-white shadow-sm ring-1 ring-teal-500/50'
                        : item.highlight
                          ? 'bg-teal-800/80 text-teal-100 hover:bg-teal-800 hover:text-white'
                          : 'text-teal-100/80 hover:bg-teal-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-teal-200' : 'text-teal-300/80'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Node Info */}
      <div className="p-3 border-t border-teal-800/60 flex items-center justify-between text-[11px] text-teal-300/70">
        {!isCollapsed ? (
          <>
            <span className="font-mono">Local Node</span>
            <span className="font-bold text-teal-200">v0.1.0</span>
          </>
        ) : (
          <span className="mx-auto font-mono text-[10px]">v0.1</span>
        )}
      </div>
    </aside>
  );
}
