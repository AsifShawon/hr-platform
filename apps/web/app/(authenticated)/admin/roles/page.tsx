'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';
import { Permission } from '@hr/domain';

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isBuiltIn: boolean;
  permissions: Permission[];
  assignedUserCount?: number;
}

interface PermissionGroup {
  name: string;
  description: string;
  permissions: { key: Permission; label: string; desc: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'People & Worker Records',
    description: 'View and edit employee identity records and profiles',
    permissions: [
      {
        key: Permission.PEOPLE_VIEW,
        label: 'View People',
        desc: 'Browse employee registry and view standard fields',
      },
      {
        key: Permission.PEOPLE_EDIT,
        label: 'Edit People',
        desc: 'Add, update, or import worker records and employment info',
      },
    ],
  },
  {
    name: 'Sensitive Identity & Privacy',
    description: 'Access and reveal government IDs and masked identity data',
    permissions: [
      {
        key: Permission.IDENTITY_REVEAL,
        label: 'Reveal Government ID',
        desc: 'Unmask and inspect sensitive National ID / Passport records',
      },
      {
        key: Permission.IDENTITY_EDIT,
        label: 'Edit Government ID',
        desc: 'Modify and update government identity numbers',
      },
    ],
  },
  {
    name: 'ID Cards & Production',
    description: 'Design templates, operate print queues, and issue cards',
    permissions: [
      {
        key: Permission.CARDS_DESIGN,
        label: 'Design Templates',
        desc: 'Configure card layouts, branding, and field placements',
      },
      {
        key: Permission.CARDS_PRINT,
        label: 'Print Cards',
        desc: 'Render and send card print jobs to physical printers',
      },
      {
        key: Permission.CARDS_ISSUE,
        label: 'Issue Cards',
        desc: 'Mark cards as officially issued and create immutable snapshots',
      },
      {
        key: Permission.CARDS_REVOKE,
        label: 'Revoke Cards',
        desc: 'Invalidate and revoke previously issued ID cards',
      },
    ],
  },
  {
    name: 'Organization & Structure',
    description: 'Manage company settings, locations, and organizational units',
    permissions: [
      {
        key: Permission.ORGANIZATION_MANAGE,
        label: 'Manage Organization',
        desc: 'Configure company branding, locations, and org tree',
      },
    ],
  },
  {
    name: 'Users & Roles Administration',
    description: 'Manage operator user accounts, roles, and scoped access',
    permissions: [
      {
        key: Permission.USERS_MANAGE,
        label: 'Manage Users',
        desc: 'Create, update, deactivate, and assign roles to users',
      },
      {
        key: Permission.ROLES_MANAGE,
        label: 'Manage Roles',
        desc: 'Create and configure custom roles and permission sets',
      },
    ],
  },
  {
    name: 'Audit, Backup & System',
    description: 'Inspect audit logs, export data, and manage local backups',
    permissions: [
      {
        key: Permission.EXPORTS_CREATE,
        label: 'Export Data',
        desc: 'Generate and download ZIP export bundles with worker data',
      },
      {
        key: Permission.AUDIT_VIEW,
        label: 'View Audit Logs',
        desc: 'Inspect immutable compliance audit trail',
      },
      {
        key: Permission.BACKUP_MANAGE,
        label: 'Manage Backups',
        desc: 'Create and restore encrypted system database backups',
      },
      {
        key: Permission.SYSTEM_MANAGE,
        label: 'System Administration',
        desc: 'Toggle LAN access and manage node-level settings',
      },
    ],
  },
];

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

  const loadRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load roles.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const openAddModal = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
    setSelectedPermissions(new Set([Permission.PEOPLE_VIEW]));
    setIsAddEditOpen(true);
  };

  const openEditModal = (role: RoleItem) => {
    if (role.isBuiltIn) return;
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setSelectedPermissions(new Set(role.permissions));
    setIsAddEditOpen(true);
  };

  const togglePermission = (perm: Permission) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPermissions.size === 0) {
      setMessage({ type: 'error', text: 'At least one permission must be selected for the role.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      permissions: Array.from(selectedPermissions),
    };

    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Role '${name}' ${editingRole ? 'updated' : 'created'} successfully.`,
        });
        setIsAddEditOpen(false);
        loadRoles();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save role.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saving role.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRole || deleteRole.isBuiltIn) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/roles/${deleteRole.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Role '${deleteRole.name}' deleted successfully.` });
        setDeleteRole(null);
        loadRoles();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete role.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error deleting role.' });
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-[#0F766E]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Roles & Permissions
            </h1>
            <p className="text-sm text-slate-500">
              Manage built-in roles and create custom authorization profiles via granular permission
              checklists.
            </p>
          </div>
        </div>

        <Button type="button" variant="primary" size="md" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Custom Role
        </Button>
      </div>

      {/* Status Feedback Message */}
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

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl border ${role.isBuiltIn ? 'bg-teal-50 border-teal-100 text-[#0F766E]' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                  >
                    {role.isBuiltIn ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <Shield className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                      {role.isBuiltIn ? (
                        <Badge variant="primary" size="sm">
                          Built-in
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {role.description || 'Custom organizational permission profile'}
                    </span>
                  </div>
                </div>

                {!role.isBuiltIn ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(role)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit Role"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteRole(role)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-1.5 text-slate-300" title="Protected System Role">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Permissions Checklist Summary */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Granted Permissions ({role.permissions.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-medium"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Assigned Users:{' '}
                <strong className="text-slate-800">{role.assignedUserCount || 0}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Custom Role Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingRole ? 'Edit Custom Role' : 'Create Custom Role'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Plant HR Officer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Manages factory workers and prints ID cards"
                  />
                </div>
              </div>

              {/* Permission Groups Checklist */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Permission Checklist ({selectedPermissions.size} selected)
                  </span>
                </div>

                {PERMISSION_GROUPS.map((group) => (
                  <div
                    key={group.name}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{group.name}</h4>
                      <p className="text-[11px] text-slate-500">{group.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {group.permissions.map((item) => {
                        const isChecked = selectedPermissions.has(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-teal-50/80 border-teal-200 text-slate-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(item.key)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                            />
                            <div>
                              <span className="text-xs font-bold block">{item.label}</span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {item.key}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

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
                  {isSubmitting ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Role Modal */}
      {deleteRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Delete Custom Role</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete custom role <strong>{deleteRole.name}</strong>?
            </p>

            {deleteRole.assignedUserCount && deleteRole.assignedUserCount > 0 ? (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This role is assigned to {deleteRole.assignedUserCount} user(s). You must reassign
                  those users to a different role before deleting.
                </span>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" size="md" onClick={() => setDeleteRole(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleDelete}
                disabled={
                  isSubmitting ||
                  (deleteRole.assignedUserCount ? deleteRole.assignedUserCount > 0 : false)
                }
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
