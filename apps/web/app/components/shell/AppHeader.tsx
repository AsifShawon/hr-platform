'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CreditCard,
  Menu,
  X,
  Building2,
  Search,
  Layers,
  Check,
  ChevronRight,
  AlertTriangle,
  Command,
} from 'lucide-react';
import { Button } from '@hr/ui';
import { UserAccountMenu } from './UserAccountMenu';
import { GlobalSearchDialog } from './GlobalSearchDialog';
import { useActiveOrg } from '../../context/ActiveOrgContext';

interface AppHeaderProps {
  user: any;
  queuePendingCount?: number;
  queueFailedCount?: number;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export function AppHeader({
  user,
  queuePendingCount = 0,
  queueFailedCount = 0,
  mobileMenuOpen,
  onToggleMobileMenu,
}: AppHeaderProps) {
  const pathname = usePathname();
  const { organizations, activeOrgId, activeOrg, setActiveOrgId } = useActiveOrg();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute breadcrumb title based on pathname
  const getBreadcrumbs = () => {
    if (pathname === '/dashboard') return [{ label: 'Workspace', href: '/dashboard' }, { label: 'Overview' }];
    if (pathname === '/cards/new') return [{ label: 'Workspace', href: '/dashboard' }, { label: 'Create ID Card' }];
    if (pathname === '/people') return [{ label: 'Workspace', href: '/dashboard' }, { label: 'Workers' }];
    if (pathname.startsWith('/people/')) return [{ label: 'Workers', href: '/people' }, { label: 'Worker Profile' }];
    if (pathname === '/cards/queue') return [{ label: 'Card Operations', href: '/cards/queue' }, { label: 'Print Queue' }];
    if (pathname === '/cards/issues') return [{ label: 'Card Operations', href: '/cards/issues' }, { label: 'Issued Cards' }];
    if (pathname === '/cards/templates') return [{ label: 'Card Operations', href: '/cards/templates' }, { label: 'Templates' }];
    if (pathname === '/cards/calibration') return [{ label: 'Card Operations', href: '/cards/templates' }, { label: 'Print Calibration' }];
    if (pathname === '/organization') return [{ label: 'Organization', href: '/organization' }, { label: 'Locations & Units' }];
    if (pathname.startsWith('/admin/company')) return [{ label: 'Organization', href: '/organization' }, { label: 'Companies' }];
    if (pathname.startsWith('/admin/locations')) return [{ label: 'Organization', href: '/organization' }, { label: 'Locations' }];
    if (pathname.startsWith('/import-export')) return [{ label: 'Data', href: '/import-export' }, { label: 'Import / Export' }];
    if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles')) return [{ label: 'Administration', href: '/admin/users' }, { label: 'Users & Roles' }];
    if (pathname.startsWith('/audit')) return [{ label: 'Administration', href: '/audit' }, { label: 'Audit Log' }];
    if (pathname.startsWith('/admin/system') || pathname.startsWith('/admin/backups') || pathname.startsWith('/admin/restore')) return [{ label: 'Administration', href: '/admin/system' }, { label: 'System & Backups' }];
    return [{ label: 'Workspace', href: '/dashboard' }, { label: 'Overview' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs select-none">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Left: Mobile Drawer Trigger & Breadcrumb Context */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-1.5 -ml-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Breadcrumb Navigation Context */}
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.label}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                      {isLast ? (
                        <span className="font-bold text-slate-900 truncate" aria-current="page">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href || '#'}
                          className="hover:text-teal-700 font-medium truncate transition-colors"
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>

              <span className="sm:hidden font-bold text-sm text-slate-900 truncate">
                {breadcrumbs[breadcrumbs.length - 1]?.label || 'HR ID Platform'}
              </span>
            </div>

            {/* Center: Global Worker Search Trigger */}
            <div className="flex-1 max-w-md mx-2 hidden md:block">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                aria-label="Search worker registry"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>Search worker by ID or name...</span>
                </div>
                <div className="flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                  <span>Ctrl</span>
                  <span>K</span>
                </div>
              </button>
            </div>

            {/* Right: Facility Switcher, Queue Pill, Create ID & Account Menu */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Mobile Search Icon */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Search worker registry"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Organization Switcher Dropdown */}
              {organizations.length > 1 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <select
                    value={activeOrgId || ''}
                    onChange={(e) => setActiveOrgId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                    aria-label="Active workspace organization"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.displayName || org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Authoritative Queue Activity Indicator */}
              {(queuePendingCount > 0 || queueFailedCount > 0) && (
                <Link
                  href="/cards/queue"
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors ${
                    queueFailedCount > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
                  }`}
                  title={`${queuePendingCount} jobs queued, ${queueFailedCount} defect alerts`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Queue:</span>
                  <span className="font-bold font-mono">{queuePendingCount}</span>
                  {queueFailedCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-600 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      {queueFailedCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Primary "Create ID" Action */}
              <Link href="/cards/new" className="hidden sm:block">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs px-3 py-1.5 h-auto rounded-xl flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Create ID</span>
                </Button>
              </Link>

              {/* User / Account Menu */}
              <UserAccountMenu
                user={user}
                organizations={organizations}
                activeOrgId={activeOrgId}
                onSelectOrg={setActiveOrgId}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Global Worker Search Dialog */}
      <GlobalSearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
