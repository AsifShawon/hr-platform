'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '../components/shell/AppHeader';
import { AppSidebar } from '../components/shell/AppSidebar';
import { MobileBottomNav } from '../components/shell/MobileBottomNav';
import { ActiveOrgProvider } from '../context/ActiveOrgContext';
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
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';

interface UserProfile {
  username: string;
  email: string | null;
  roles: string[];
  permissions: string[];
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queueCounts, setQueueCounts] = useState({ pending: 0, failed: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, queueRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/cards/print-jobs?limit=5'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.system?.requiresActivation) {
            router.push('/activate');
            return;
          }
          setUser(meData.user);
        } else {
          router.push('/login');
          return;
        }

        if (queueRes.ok) {
          const qData = await queueRes.json();
          const items = qData.items || [];
          const pending = items.filter(
            (j: any) => j.status === 'QUEUED' || j.status === 'PROCESSING',
          ).length;
          const failed = items.filter(
            (j: any) => j.status === 'FAILED' || j.operatorStatus === 'REJECTED_DEFECT',
          ).length;
          setQueueCounts({ pending, failed });
        }
      } catch {
        // Handle network error
      }
    }
    loadData();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed
    } finally {
      router.push('/login');
    }
  };

  const permissions: string[] = user?.permissions || [];
  const hasPerm = (p?: string) => !p || permissions.includes(p) || permissions.includes('system.manage');

  const mobileNavGroups = [
    {
      title: 'Workspace',
      links: [
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/cards/new', label: 'Create ID Card', icon: CreditCard },
        { href: '/people', label: 'Workers', icon: Users },
      ],
    },
    {
      title: 'Card operations',
      links: [
        { href: '/cards/queue', label: 'Print queue', icon: Layers },
        { href: '/cards/issues', label: 'Issued cards', icon: FileCheck2 },
        { href: '/cards/templates', label: 'Templates', icon: Palette, perm: 'cards.design' },
      ],
    },
    {
      title: 'Organization & Data',
      links: [
        { href: '/admin/company', label: 'Companies', icon: Building2, perm: 'organization.manage' },
        { href: '/organization', label: 'Locations & units', icon: Building2, perm: 'organization.manage' },
        { href: '/import-export', label: 'Import / export', icon: ArrowUpDown, perm: 'people.view' },
      ],
    },
    {
      title: 'Administration',
      links: [
        { href: '/admin/users', label: 'Users & roles', icon: UserCheck, perm: 'users.manage' },
        { href: '/audit', label: 'Audit log', icon: Shield, perm: 'audit.view' },
        { href: '/admin/system', label: 'System & backups', icon: Settings, perm: 'system.manage' },
      ],
    },
  ];

  return (
    <ActiveOrgProvider>
      {/* Skip to main content link for assistive accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal-900 focus:text-white focus:rounded-xl focus:shadow-lg focus:ring-2 focus:ring-teal-400"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 selection:bg-teal-100 selection:text-teal-900 overflow-x-clip">
        {/* Desktop Sidebar Rail */}
        <AppSidebar
          user={user}
          queuePendingCount={queueCounts.pending}
          queueFailedCount={queueCounts.failed}
        />

        {/* Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Contextual Header */}
          <AppHeader
            user={user}
            queuePendingCount={queueCounts.pending}
            queueFailedCount={queueCounts.failed}
            mobileMenuOpen={mobileMenuOpen}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          {/* Accessible Mobile & Tablet Slide-Over Drawer */}
          {mobileMenuOpen && (
            <div
              className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Navigation drawer"
                className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* User Profile Header in Drawer */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">{user?.username}</span>
                      <span className="text-[11px] text-slate-500">{user?.roles[0] || 'Operator'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Grouped Links in Drawer */}
                <div className="space-y-4">
                  {mobileNavGroups.map((grp) => {
                    const visible = grp.links.filter((l) => hasPerm(l.perm));
                    if (visible.length === 0) return null;

                    return (
                      <div key={grp.title} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2">
                          {grp.title}
                        </span>
                        <div className="grid grid-cols-1 gap-0.5">
                          {visible.map((link) => {
                            const Icon = link.icon;
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors"
                              >
                                <Icon className="w-4 h-4 text-teal-700" />
                                <span>{link.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Drawer Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 py-1.5 px-2 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">Local Node Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Landmark */}
          <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8 focus:outline-none relative z-0">
            {children}
          </main>

          {/* Mobile Bottom Navigation (< 640px) */}
          <MobileBottomNav
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            queuePendingCount={queueCounts.pending}
            queueFailedCount={queueCounts.failed}
          />
        </div>
      </div>
    </ActiveOrgProvider>
  );
}
