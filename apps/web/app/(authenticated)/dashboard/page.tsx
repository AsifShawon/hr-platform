'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Key,
  Users,
  CreditCard,
  History,
  Lock,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Laptop,
  Globe,
  ArrowUpRight,
  Building2,
  MapPin,
  Shield,
} from 'lucide-react';
import { Button, Badge, CardPreviewChrome, FormGroup, ShowHidePasswordInput, Dialog } from '@hr/ui';

interface SessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Password change form states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Ignore session loading error
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({ type: 'success', text: 'Session successfully revoked.' });
        fetchSessions();
      } else {
        setFeedbackMessage({ type: 'error', text: data.message || 'Failed to revoke session.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error while revoking session.' });
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/auth/sessions/revoke-others', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          type: 'success',
          text: `Revoked ${data.revokedCount} other active sessions.`,
        });
        fetchSessions();
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.message || 'Failed to revoke other sessions.',
        });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error while revoking other sessions.' });
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
        setPasswordSuccess(
          'Password successfully updated. All other active sessions have been revoked.',
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        fetchSessions();
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(null);
        }, 2000);
      } else {
        setPasswordError(data.message || 'Failed to change password.');
      }
    } catch {
      setPasswordError('Network error while updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-full overflow-x-clip">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#134E4A] to-[#0F766E] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-800/80 border border-teal-600 text-[11px] font-semibold text-teal-200">
              Phase 2 Operational
            </span>
            <span className="text-xs text-teal-200 font-medium">Local-First Air-Gapped Ready</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            System Security & Workspace Dashboard
          </h1>
          <p className="text-xs text-teal-100/90 max-w-2xl leading-relaxed">
            Authentication, session rotation, default-deny authorization, and immutable audit
            foundations are fully active. The initial bootstrap credentials have been replaced with
            Argon2id parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="bg-white text-[#134E4A] hover:bg-teal-50 border-none shadow-sm"
            onClick={() => setShowPasswordModal(true)}
          >
            <Key className="w-4 h-4 mr-2 text-[#0F766E]" />
            Change Password
          </Button>
          <Link href="/audit">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="border-teal-400/60 text-white hover:bg-teal-800/50"
            >
              <History className="w-4 h-4 mr-2" />
              View Audit Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          role="status"
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-teal-50 border border-teal-200 text-teal-900'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Navigation: Phase 3 Organization & Administration Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/organization"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#134E4A] group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
              Organization Tree
            </h3>
            <p className="text-xs text-slate-500 leading-snug">
              Divisions, departments, sections, and production lines hierarchy.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0F766E] flex items-center gap-1 mt-4">
            Explore Tree <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/company"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#134E4A] group-hover:text-white transition-colors">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
              Company Settings
            </h3>
            <p className="text-xs text-slate-500 leading-snug">
              Logo, brand colors, locale, timezone, and employee number rules.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0F766E] flex items-center gap-1 mt-4">
            Manage Branding <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/locations"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#134E4A] group-hover:text-white transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
              Locations
            </h3>
            <p className="text-xs text-slate-500 leading-snug">
              Corporate offices, manufacturing plants, sites, and warehouses.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0F766E] flex items-center gap-1 mt-4">
            Manage Sites <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/roles"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#134E4A] group-hover:text-white transition-colors">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors">
              Roles & Scopes
            </h3>
            <p className="text-xs text-slate-500 leading-snug">
              Built-in & custom permission checklists with site-level scoping.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#0F766E] flex items-center gap-1 mt-4">
            Configure Access <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* Grid: System Status & Security Invariants */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Core Authentication */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Authentication Layer</h2>
                <span className="text-[11px] text-slate-500">Argon2id & Opaque Sessions</span>
              </div>
            </div>
            <Badge variant="primary" size="sm">
              Active
            </Badge>
          </div>
          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span>Password Algorithm:</span>
              <span className="font-mono font-semibold text-slate-800">Argon2id (64 MiB)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Session Storage:</span>
              <span className="font-semibold text-slate-800">HttpOnly / SameSite Cookie</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Idle Expiration:</span>
              <span className="font-semibold text-slate-800">30 min sliding window</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Absolute Expiration:</span>
              <span className="font-semibold text-slate-800">24 hours hard ceiling</span>
            </div>
          </div>
        </div>

        {/* Card 2: Authorization & Roles */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Authorization & RBAC</h2>
                <span className="text-[11px] text-slate-500">Default-Deny Policy</span>
              </div>
            </div>
            <Badge variant="secondary" size="sm">
              Enforced
            </Badge>
          </div>
          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span>Policy Mode:</span>
              <span className="font-semibold text-slate-800">Strict Default-Deny</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tenant Scoping:</span>
              <span className="font-semibold text-slate-800">Server-Derived Session</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Built-in Roles:</span>
              <span className="font-semibold text-slate-800">6 Protected Roles</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last Owner Guard:</span>
              <span className="font-semibold text-emerald-700">Protected Invariant</span>
            </div>
          </div>
        </div>

        {/* Card 3: Network & Audit Health */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Installation State</h2>
                <span className="text-[11px] text-slate-500">Local Node Topology</span>
              </div>
            </div>
            <Badge variant="primary" size="sm">
              Activated
            </Badge>
          </div>
          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span>Bootstrap Credential:</span>
              <span className="font-semibold text-emerald-700">Destroyed</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Local Loopback:</span>
              <span className="font-mono font-semibold text-slate-800">127.0.0.1:3000</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Audit Redaction:</span>
              <span className="font-semibold text-emerald-700">Auto-Sanitized</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Audit Storage:</span>
              <span className="font-semibold text-slate-800">PostgreSQL Immutable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions Management Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active User Sessions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage logged-in devices and revoke sessions across your account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchSessions}
              isLoading={isLoadingSessions}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevokeAllOthers}
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Revoke All Other Sessions
            </Button>
          </div>
        </div>

        {/* Sessions Table */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Active user sessions table"
          className="overflow-x-auto border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
        >
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Device / User Agent</th>
                <th className="px-4 py-3">Client IP</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate max-w-xs font-mono text-[11px] text-slate-800">
                        {sess.userAgent || 'Unknown Device'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px]">
                    {sess.ipAddress || '127.0.0.1'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(sess.lastActiveAt).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {sess.isCurrent ? (
                      <Badge variant="primary" size="sm">
                        Current Session
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {!sess.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(sess.id)}
                        disabled={revokingId === sess.id}
                        className="text-rose-600 hover:text-rose-800 font-semibold hover:underline text-[11px]"
                      >
                        {revokingId === sess.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !isLoadingSessions && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No active sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Change Modal */}
      <Dialog
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Master Password"
        description="Updating your password will invalidate all other active sessions for your security."
      >
        <div className="space-y-4 pt-2">
          {passwordError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800"
            >
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800"
            >
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
                onClick={() => setShowPasswordModal(false)}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isChangingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
