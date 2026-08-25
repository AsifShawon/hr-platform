'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Key, Building2, LogOut, ChevronDown, Shield, Settings, Check } from 'lucide-react';
import { Badge, Button, Dialog, FormGroup, ShowHidePasswordInput } from '@hr/ui';

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

interface UserAccountMenuProps {
  user: UserProfile | null;
  organizations: OrganizationSummary[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
}

export function UserAccountMenu({
  user,
  organizations = [],
  activeOrgId,
  onSelectOrg,
}: UserAccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0];

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

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed anyway
    } finally {
      router.push('/login');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsChangingPassword(true);

    if (newPassword.length < 10) {
      setPasswordError('New password must be at least 10 characters long.');
      setIsChangingPassword(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      setIsChangingPassword(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/password-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordSuccess('Password successfully updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccess(null);
        }, 1500);
      } else {
        setPasswordError(data.message || 'Failed to update password.');
      }
    } catch {
      setPasswordError('Network error while updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
      >
        <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#0F766E] border border-teal-200 flex items-center justify-center text-xs font-bold shrink-0">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
            <span>{user.username}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-medium block leading-none mt-0.5">
            {activeOrg ? activeOrg.displayName || activeOrg.name : user.roles[0] || 'Operator'}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 focus:outline-none">
          {/* User Details Header */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{user.username}</span>
              <Badge variant="primary" size="sm">
                {user.roles[0] || 'Operator'}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500 block truncate mt-0.5">
              {user.email || 'Local Node Operator'}
            </span>
          </div>

          {/* Organization Switcher (if multiple) */}
          {organizations.length > 1 && (
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Active Organization
              </span>
              <div className="space-y-1">
                {organizations.map((org) => {
                  const isSelected = org.id === activeOrg?.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => {
                        onSelectOrg(org.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-teal-50 text-[#0F766E] font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{org.displayName || org.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu Actions */}
          <div className="p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsPasswordModalOpen(true);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Key className="w-4 h-4 text-slate-400" />
              <span>Change Password</span>
            </button>

            {user.permissions?.includes('system.manage') && (
              <Link
                href="/admin/system"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>System Administration</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Password Change Dialog */}
      <Dialog
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Operator Password"
        description="Updating your password will invalidate all other active sessions for your security."
      >
        <div className="space-y-4 pt-2">
          {passwordError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 font-semibold">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <FormGroup label="Current Password" htmlFor="curr-pass" isRequired>
              <ShowHidePasswordInput
                id="curr-pass"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </FormGroup>

            <FormGroup label="New Password" htmlFor="new-pass" isRequired>
              <ShowHidePasswordInput
                id="new-pass"
                required
                placeholder="Min 10 characters with letters & numbers"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FormGroup>

            <FormGroup label="Confirm New Password" htmlFor="confirm-new-pass" isRequired>
              <ShowHidePasswordInput
                id="confirm-new-pass"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </FormGroup>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isChangingPassword}
                className="bg-[#134E4A] text-white font-bold"
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
