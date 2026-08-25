'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MoreHorizontal,
  ChevronDown,
  Printer,
  ArrowUpDown,
  Building2,
  History,
  Shield,
  Users,
  Settings,
  Sliders,
} from 'lucide-react';
import { Permission } from '@hr/domain';

interface MoreNavMenuProps {
  permissions: string[];
}

export function MoreNavMenu({ permissions = [] }: MoreNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const hasPerm = (p: string) => permissions.includes(p) || permissions.includes('system.manage');

  const menuItems = [
    {
      href: '/cards/templates',
      label: 'Card Templates',
      desc: 'Bilingual presets, layout versions & bindings',
      icon: Printer,
      visible: hasPerm(Permission.CARDS_DESIGN) || hasPerm(Permission.CARDS_PRINT),
    },
    {
      href: '/cards/calibration',
      label: 'Print Calibration',
      desc: '100% scale check, 50mm ruler & duplex offsets',
      icon: Sliders,
      visible: hasPerm(Permission.CARDS_PRINT),
    },
    {
      href: '/import-export',
      label: 'Import & Export',
      desc: 'Bulk worker ingestion and portable backup bundles',
      icon: ArrowUpDown,
      visible: hasPerm(Permission.EXPORTS_CREATE) || hasPerm(Permission.PEOPLE_EDIT),
    },
    {
      href: '/organization',
      label: 'Organization Tree',
      desc: 'Divisions, departments, sections & units',
      icon: Building2,
      visible: hasPerm(Permission.ORGANIZATION_MANAGE) || hasPerm(Permission.PEOPLE_VIEW),
    },
    {
      href: '/audit',
      label: 'Audit Trail',
      desc: 'Immutable chronological event ledger',
      icon: History,
      visible: hasPerm(Permission.AUDIT_VIEW),
    },
    {
      href: '/admin/roles',
      label: 'Roles & Scopes',
      desc: 'Permission checklists & location scoping',
      icon: Shield,
      visible: hasPerm(Permission.ROLES_MANAGE),
    },
    {
      href: '/admin/users',
      label: 'Users & Operators',
      desc: 'Operator accounts & scoped role grants',
      icon: Users,
      visible: hasPerm(Permission.USERS_MANAGE),
    },
    {
      href: '/admin/system',
      label: 'System & Health',
      desc: 'Node health, LAN network & diagnostic telemetry',
      icon: Settings,
      visible: hasPerm(Permission.SYSTEM_MANAGE) || hasPerm(Permission.BACKUP_MANAGE),
    },
  ].filter((item) => item.visible);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (menuItems.length === 0) return null;

  const isAnyActive = menuItems.some((item) => pathname.startsWith(item.href));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="More navigation options"
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
          isAnyActive
            ? 'bg-teal-50 text-[#0F766E] ring-1 ring-teal-200'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <MoreHorizontal className="w-4 h-4 text-slate-400" />
        <span>More</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 focus:outline-none">
          <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Additional Modules & Tools
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start gap-3 px-3.5 py-2.5 text-xs transition-colors hover:bg-slate-50 ${
                    isActive ? 'bg-teal-50/60 text-[#0F766E]' : 'text-slate-700'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isActive ? 'bg-teal-100 text-[#0F766E]' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">{item.label}</span>
                    <span className="text-[11px] text-slate-500 font-normal block leading-snug">
                      {item.desc}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
