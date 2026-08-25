'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '../components/shell/AppHeader';
import { MobileBottomNav } from '../components/shell/MobileBottomNav';
import { MoreNavMenu } from '../components/shell/MoreNavMenu';
import { LogOut, X } from 'lucide-react';

interface UserProfile {
  username: string;
  email: string | null;
  roles: string[];
  permissions: string[];
}

interface OrganizationSummary {
  id: string;
  name: string;
  displayName: string | null;
  code: string;
  isDefault: boolean;
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queueCounts, setQueueCounts] = useState({ pending: 0, failed: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, orgsRes, queueRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/organizations'),
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

        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          const orgList: OrganizationSummary[] = orgsData.organizations || [];
          setOrganizations(orgList);
          if (orgList.length > 0) {
            const defaultOrg = orgList.find((o) => o.isDefault) || orgList[0];
            setActiveOrgId(defaultOrg?.id || null);
          }
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 selection:bg-teal-100 selection:text-teal-900 overflow-x-clip">
      {/* Top Header */}
      <AppHeader
        user={user}
        organizations={organizations}
        activeOrgId={activeOrgId}
        onSelectOrg={(id) => setActiveOrgId(id)}
        queuePendingCount={queueCounts.pending}
        queueFailedCount={queueCounts.failed}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Mobile Drawer (When hamburger or Mobile Bottom More is clicked) */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-sm font-bold text-slate-900 block">{user?.username}</span>
                <span className="text-xs text-slate-500">{user?.roles[0] || 'Operator'}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Additional Modules & Management
              </span>
              <MoreNavMenu permissions={user?.permissions || []} />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 py-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
              <span className="text-[10px] font-mono text-slate-400">Local-First Workspace</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (< 640px) */}
      <MobileBottomNav
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        queuePendingCount={queueCounts.pending}
        queueFailedCount={queueCounts.failed}
      />
    </div>
  );
}
