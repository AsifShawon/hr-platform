'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  MapPin,
  Building2,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';

interface ScopedRole {
  id: string;
  name: string;
  isBuiltIn: boolean;
  organizationId?: string | null;
  organizationName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
}

interface UserItem {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  isTemporaryBootstrap: boolean;
  mustChangePassword: boolean;
  roles: ScopedRole[];
  createdAt: string;
  lastLoginAt: string | null;
}

interface AvailableRole {
  id: string;
  name: string;
  isBuiltIn: boolean;
}

interface AvailableLocation {
  id: string;
  name: string;
  code: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [availableLocations, setAvailableLocations] = useState<AvailableLocation[]>([]);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const loadData = async () => {
    try {
      const [usersRes, rolesRes, orgsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/organizations'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setAvailableRoles(data.roles || []);
      }
      if (orgsRes.ok) {
        const data = await orgsRes.json();
        const firstOrg = data.organizations?.[0];
        if (firstOrg) {
          setOrganizationId(firstOrg.id);
          const locsRes = await fetch(`/api/locations?organizationId=${firstOrg.id}`);
          if (locsRes.ok) {
            const locsData = await locsRes.json();
            setAvailableLocations(locsData.locations || []);
          }
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load user management data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setInitialPassword('');
    setIsActive(true);
    setSelectedRoleId(availableRoles[0]?.id || '');
    setSelectedLocationId('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setUsername(user.username);
    setEmail(user.email || '');
    setInitialPassword('');
    setIsActive(user.isActive);
    setSelectedRoleId(user.roles[0]?.id || availableRoles[0]?.id || '');
    setSelectedLocationId(user.roles[0]?.locationId || '');
    setIsAddEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId) {
      setMessage({ type: 'error', text: 'You must assign at least one role.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const roleGrants = [
      {
        roleId: selectedRoleId,
        organizationId: organizationId || null,
        locationId: selectedLocationId || null,
      },
    ];

    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim() || null,
            isActive,
            roleGrants,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setMessage({
            type: 'success',
            text: `User '${editingUser.username}' updated successfully.`,
          });
          setIsAddEditOpen(false);
          loadData();
        } else {
          setMessage({ type: 'error', text: data.message || 'Failed to update user.' });
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim() || undefined,
            initialPassword,
            roleGrants,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setMessage({ type: 'success', text: `User '${username}' created successfully.` });
          setIsAddEditOpen(false);
          loadData();
        } else {
          setMessage({ type: 'error', text: data.message || 'Failed to create user.' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error processing user request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setDeleteUser(null);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete user.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error deleting user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#134E4A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-[#0F766E]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
            <p className="text-sm text-slate-500">
              Manage operator accounts and assign scoped organizational and site-level roles.
            </p>
          </div>
        </div>

        <Button type="button" variant="primary" size="md" onClick={openAddModal}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Create User
        </Button>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Assigned Roles & Scopes</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-xs font-bold text-[#0F766E]">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{u.username}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {u.email || 'No email attached'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((r, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Badge variant="primary" size="sm">
                            {r.name}
                          </Badge>
                          {r.locationName ? (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              {r.locationName}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-teal-50 text-[#0F766E] px-1.5 py-0.5 rounded font-medium">
                              Global
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                        <UserX className="w-3.5 h-3.5 text-slate-400" />
                        Deactivated
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never logged in'}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteUser(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit User & Permissions' : 'Create User Account'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jahanara"
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jahanara@company.com"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password (Min 10 characters) *
                  </label>
                  <Input
                    type="password"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Role *
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  required
                >
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isBuiltIn ? '(Built-in)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location Scope (Optional)
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">Global (All Locations / Company-wide)</option>
                  {availableLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Global scope allows permissions across all sites and facilities.
                </p>
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    id="userActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <label
                    htmlFor="userActiveToggle"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Account is Active (Uncheck to deactivate)
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsAddEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to permanently delete user account{' '}
              <strong>{deleteUser.username}</strong>?
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Note: The last active System Owner cannot be deleted or deactivated.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" size="md" onClick={() => setDeleteUser(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
