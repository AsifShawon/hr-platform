'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CreditCard, Menu, X } from 'lucide-react';
import { Button } from '@hr/ui';
import { PrimaryNavLinks } from './PrimaryNavLinks';
import { MoreNavMenu } from './MoreNavMenu';
import { UserAccountMenu } from './UserAccountMenu';

interface AppHeaderProps {
  user: any;
  organizations: any[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
  queuePendingCount?: number;
  queueFailedCount?: number;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export function AppHeader({
  user,
  organizations,
  activeOrgId,
  onSelectOrg,
  queuePendingCount = 0,
  queueFailedCount = 0,
  mobileMenuOpen,
  onToggleMobileMenu,
}: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand & Primary Navigation */}
          <div className="flex items-center gap-4 lg:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#134E4A] text-white shadow-sm group-hover:bg-[#0F766E] transition-colors">
                <ShieldCheck className="h-5 w-5 text-[#14B8A6]" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
                  HR ID Platform
                </span>
                <span className="text-[10px] font-medium text-[#0F766E] block leading-tight">
                  Local-First Workspace
                </span>
              </div>
            </Link>

            {/* Primary Nav Links */}
            <PrimaryNavLinks
              queuePendingCount={queuePendingCount}
              queueFailedCount={queueFailedCount}
            />

            {/* More Menu Dropdown */}
            <div className="hidden lg:block">
              <MoreNavMenu permissions={user?.permissions || []} />
            </div>
          </div>

          {/* Right: Create ID Action & User Context */}
          <div className="flex items-center gap-3">
            <Link href="/cards/new" className="hidden sm:block">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold text-xs shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                <span>Create ID</span>
              </Button>
            </Link>

            {/* User Account & Workspace Menu */}
            <UserAccountMenu
              user={user}
              organizations={organizations}
              activeOrgId={activeOrgId}
              onSelectOrg={onSelectOrg}
            />

            {/* Mobile Drawer Button */}
            <div className="flex sm:hidden">
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
