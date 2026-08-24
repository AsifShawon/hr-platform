'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  MapPin,
  Shield,
  Users,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  CreditCard,
  Printer,
} from 'lucide-react';
import { Badge, Button } from '@hr/ui';

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
  logoPath: string | null;
  primaryColor: string;
  isDefault: boolean;
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, orgsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/organizations'),
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
      } catch {
        // Handle network error
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed to login anyway
    } finally {
      router.push('/login');
    }
  };

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0];

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/people', label: 'People Registry', icon: Users },
    { href: '/cards/templates', label: 'Card Templates', icon: CreditCard },
    { href: '/organization', label: 'Organization Tree', icon: Building2 },
    { href: '/audit', label: 'Audit Trail', icon: History },
  ];

  const adminLinks = [
    {
      href: '/admin/company',
      label: 'Company Settings',
      icon: Building2,
      desc: 'Branding, logo, locale & employee number rules',
    },
    {
      href: '/admin/locations',
      label: 'Locations',
      icon: MapPin,
      desc: 'Sites, factories, branches & offices',
    },
    {
      href: '/cards/calibration',
      label: 'Print Calibration',
      icon: Printer,
      desc: '100% scale check, 50mm ruler & duplex offsets',
    },
    {
      href: '/admin/roles',
      label: 'Roles & Permissions',
      icon: Shield,
      desc: 'Built-in & custom permission checklists',
    },
    {
      href: '/admin/users',
      label: 'User Management',
      icon: Users,
      desc: 'Scoped role assignments & operator accounts',
    },
  ];

  const isAdminActive = pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-teal-100 selection:text-teal-900 overflow-x-clip">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm overflow-x-clip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Company Indicator */}
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#134E4A] text-white shadow-sm group-hover:bg-[#0F766E] transition-colors">
                  <ShieldCheck className="h-5 w-5 text-[#14B8A6]" />
                </div>
                <div>
                  <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
                    HR ID Platform
                  </span>
                  <span className="text-[10px] font-medium text-[#0F766E] block leading-tight">
                    Local-First Workspace
                  </span>
                </div>
              </Link>

              {/* Organization Indicator / Switcher */}
              {activeOrg && (
                <div className="relative pl-3 border-l border-slate-200 hidden sm:block">
                  {organizations.length > 1 ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
                      >
                        <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                        <span>{activeOrg.displayName || activeOrg.name}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      {orgDropdownOpen && (
                        <div className="absolute left-3 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Select Organization
                          </div>
                          {organizations.map((org) => (
                            <button
                              key={org.id}
                              onClick={() => {
                                setActiveOrgId(org.id);
                                setOrgDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                                org.id === activeOrg.id
                                  ? 'font-bold text-[#0F766E] bg-teal-50/50'
                                  : 'text-slate-700'
                              }`}
                            >
                              <span>{org.displayName || org.name}</span>
                              {org.isDefault && (
                                <Badge variant="neutral" size="sm">
                                  Default
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-teal-50/60 border border-teal-100 text-xs text-[#0F766E]">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="font-bold">{activeOrg.displayName || activeOrg.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop Nav Links */}
              <nav className="hidden lg:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-[#0F766E]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${isActive ? 'text-[#0F766E]' : 'text-slate-400'}`}
                      />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}

                {/* Administration Menu Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      adminLinks.some((l) => pathname === l.href)
                        ? 'bg-teal-50 text-[#0F766E]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Administration</span>
                    <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400" />
                  </button>

                  {adminDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        Company & Security Admin
                      </div>
                      {adminLinks.map((adminLink) => {
                        const Icon = adminLink.icon;
                        const isLinkActive = pathname === adminLink.href;
                        return (
                          <Link
                            key={adminLink.href}
                            href={adminLink.href}
                            onClick={() => setAdminDropdownOpen(false)}
                            className={`flex items-start gap-3 px-3 py-2 text-xs transition-colors hover:bg-slate-50 ${
                              isLinkActive ? 'bg-teal-50/60 text-[#0F766E]' : 'text-slate-700'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 mt-0.5 ${isLinkActive ? 'text-[#0F766E]' : 'text-slate-400'}`}
                            />
                            <div>
                              <span className="font-bold block">{adminLink.label}</span>
                              <span className="text-[11px] text-slate-500 font-normal block leading-snug">
                                {adminLink.desc}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Right: Node Status & User Profile */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">Local Node Active</span>
              </div>

              {user && (
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{user.username}</span>
                      <Badge variant="primary" size="sm">
                        {user.roles[0] || 'Member'}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      {user.email || 'Local Operator'}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-xs ml-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
            <div className="py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{user?.username}</span>
                <Badge variant="primary" size="sm">
                  {user?.roles[0] || 'Member'}
                </Badge>
              </div>
              <span className="text-[11px] text-slate-500">{user?.email || 'Local Operator'}</span>
            </div>

            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-teal-50 text-[#0F766E]' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <div className="pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Administration
              </div>

              {adminLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-teal-50 text-[#0F766E]' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
