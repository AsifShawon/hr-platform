'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  FolderTree,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Layers,
  MapPin,
  MoveRight,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  List,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';
import { OrgUnitType } from '@hr/domain';
import { useActiveOrg } from '../../context/ActiveOrgContext';

interface OrgUnitItem {
  id: string;
  tenantId: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  nameBangla: string | null;
  code: string;
  type: OrgUnitType;
  locationId?: string | null;
  locationName?: string;
  isArchived: boolean;
  sortOrder: number;
  breadcrumbPath?: string;
  childrenCount: number;
  workerCount: number;
}

interface LocationSummary {
  id: string;
  name: string;
  code: string;
}

export default function OrganizationTreePage() {
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [units, setUnits] = useState<OrgUnitItem[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrgUnitItem | null>(null);
  const [parentForNewUnit, setParentForNewUnit] = useState<string | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingUnit, setMovingUnit] = useState<OrgUnitItem | null>(null);
  const [archiveUnit, setArchiveUnit] = useState<OrgUnitItem | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<OrgUnitItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formNameBangla, setFormNameBangla] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<OrgUnitType>(OrgUnitType.DEPARTMENT);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formLocationId, setFormLocationId] = useState<string>('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [newParentIdForMove, setNewParentIdForMove] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const orgsRes = await fetch('/api/organizations');
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        const orgList = orgsData.organizations || [];
        const currentOrg = (activeOrgId ? orgList.find((o: any) => o.id === activeOrgId) : null) || orgList[0];

        if (currentOrg) {
          setOrganizationId(currentOrg.id);
          setOrganizationName(currentOrg.displayName || currentOrg.name);

          const [unitsRes, locsRes] = await Promise.all([
            fetch(`/api/org-units?organizationId=${currentOrg.id}&includeArchived=true`),
            fetch(`/api/locations?organizationId=${currentOrg.id}`),
          ]);

          if (unitsRes.ok) {
            const unitsData = await unitsRes.json();
            setUnits(unitsData.units || []);
          }
          if (locsRes.ok) {
            const locsData = await locsRes.json();
            setLocations(locsData.locations || []);
          }
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load organization tree.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrgId]);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open Add Modal
  const openAddModal = (parentId: string | null = null) => {
    setEditingUnit(null);
    setParentForNewUnit(parentId);
    setFormParentId(parentId);
    setFormName('');
    setFormNameBangla('');
    setFormCode('');
    setFormType(parentId ? OrgUnitType.DEPARTMENT : OrgUnitType.DIVISION);
    setFormLocationId(locations[0]?.id || '');
    setFormSortOrder(0);
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (unit: OrgUnitItem) => {
    setEditingUnit(unit);
    setFormParentId(unit.parentId);
    setFormName(unit.name);
    setFormNameBangla(unit.nameBangla || '');
    setFormCode(unit.code);
    setFormType(unit.type);
    setFormLocationId(unit.locationId || '');
    setFormSortOrder(unit.sortOrder);
    setIsAddEditOpen(true);
  };

  // Open Move Modal
  const openMoveModal = (unit: OrgUnitItem) => {
    setMovingUnit(unit);
    setNewParentIdForMove(unit.parentId);
  };

  // Handle Add/Edit Submit
  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      organizationId,
      parentId: formParentId || null,
      name: formName.trim(),
      nameBangla: formNameBangla.trim() || null,
      code: formCode.toUpperCase().trim(),
      type: formType,
      locationId: formLocationId || null,
      sortOrder: Number(formSortOrder),
    };

    try {
      const url = editingUnit ? `/api/org-units/${editingUnit.id}` : '/api/org-units';
      const method = editingUnit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Unit '${formName}' ${editingUnit ? 'updated' : 'created'} successfully.`,
        });
        setIsAddEditOpen(false);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save organizational unit.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saving organizational unit.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Move Submit
  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingUnit) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/org-units/${movingUnit.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newParentId: newParentIdForMove || null }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: data.message || `Moved '${movingUnit.name}' successfully.`,
        });
        setMovingUnit(null);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to move unit.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error moving unit.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Archive / Restore
  const handleArchiveToggle = async (unit: OrgUnitItem) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/org-units/${unit.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !unit.isArchived }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setArchiveUnit(null);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update archive status.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error updating archive status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteUnit) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/org-units/${deleteUnit.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setDeleteUnit(null);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete unit.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error deleting unit.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Find all descendant IDs of a unit to prevent cycle creation in the UI
  const getDescendantIds = (targetId: string): Set<string> => {
    const descendants = new Set<string>([targetId]);
    const queue = [targetId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = units.filter((u) => u.parentId === current);
      children.forEach((c) => {
        descendants.add(c.id);
        queue.push(c.id);
      });
    }
    return descendants;
  };

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (!showArchived && u.isArchived) return false;
      if (typeFilter !== 'ALL' && u.type !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(query);
        const matchBangla = u.nameBangla?.toLowerCase().includes(query);
        const matchCode = u.code.toLowerCase().includes(query);
        if (!matchName && !matchBangla && !matchCode) return false;
      }
      return true;
    });
  }, [units, showArchived, typeFilter, searchQuery]);

  // Build tree from filtered units
  const unitTree = useMemo(() => {
    const map = new Map<string, OrgUnitItem & { children: any[] }>();
    filteredUnits.forEach((u) => map.set(u.id, { ...u, children: [] }));

    const roots: (OrgUnitItem & { children: any[] })[] = [];
    filteredUnits.forEach((u) => {
      const node = map.get(u.id)!;
      if (u.parentId && map.has(u.parentId)) {
        map.get(u.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [filteredUnits]);

  // Render Recursive Tree Node
  const renderTreeNode = (node: OrgUnitItem & { children: any[] }, depth = 0) => {
    const isCollapsed = collapsedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
            node.isArchived
              ? 'bg-slate-50 border-slate-200 opacity-60'
              : 'bg-white border-slate-200 hover:border-teal-200 hover:shadow-sm'
          }`}
          style={{ marginLeft: `${Math.min(depth * 24, 96)}px` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node.id)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Toggle Sub-Units"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{node.name}</span>
                {node.nameBangla && (
                  <Badge variant="primary" size="sm">
                    {node.nameBangla}
                  </Badge>
                )}
                <Badge variant="neutral" size="sm">
                  {node.type}
                </Badge>
                <span className="text-xs font-mono font-semibold text-slate-400">{node.code}</span>
                {node.isArchived && (
                  <Badge variant="error" size="sm">
                    Archived
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                {node.locationName && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{node.locationName}</span>
                  </div>
                )}
                <span>
                  Sub-Units: <strong className="text-slate-700">{node.childrenCount}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
            <button
              type="button"
              onClick={() => openAddModal(node.id)}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-[#0F766E] hover:bg-teal-50 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Child</span>
            </button>
            <button
              type="button"
              onClick={() => openEditModal(node)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Edit Unit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openMoveModal(node)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-teal-50 transition-colors"
              title="Move Unit"
            >
              <MoveRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setArchiveUnit(node)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              title={node.isArchived ? 'Restore Unit' : 'Archive Unit'}
            >
              {node.isArchived ? (
                <ArchiveRestore className="w-3.5 h-3.5" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeleteUnit(node)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Unit"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Children nodes */}
        {!isCollapsed && hasChildren && (
          <div className="space-y-2">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#134E4A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-[#0F766E]">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Tree</h1>
            <p className="text-sm text-slate-500">
              Explore hierarchy, divisions, departments, sections, teams, and production lines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'tree'
                  ? 'bg-[#134E4A] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Tree View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#134E4A] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>

          <Button type="button" variant="primary" size="md" onClick={() => openAddModal(null)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Root Unit
          </Button>
        </div>
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

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, Bangla, or code..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value="ALL">All Unit Types</option>
              <option value={OrgUnitType.DIVISION}>Divisions</option>
              <option value={OrgUnitType.DEPARTMENT}>Departments</option>
              <option value={OrgUnitType.SECTION}>Sections</option>
              <option value={OrgUnitType.TEAM}>Teams</option>
              <option value={OrgUnitType.LINE}>Production Lines</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <input
              type="checkbox"
              id="showArchived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
            />
            <label htmlFor="showArchived" className="text-xs font-semibold text-slate-600">
              Show Archived
            </label>
          </div>
        </div>
      </div>

      {/* Main Hierarchy Container */}
      {units.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E]">
            <FolderTree className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Organizational Units Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Structure your company by adding top-level divisions, departments, and manufacturing
              sections.
            </p>
          </div>
          <Button type="button" variant="primary" size="md" onClick={() => openAddModal(null)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Unit
          </Button>
        </div>
      ) : viewMode === 'tree' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0F766E]" />
              <span className="text-xs font-bold text-slate-900">{organizationName}</span>
            </div>
            <span className="text-xs text-slate-400">Total Units: {filteredUnits.length}</span>
          </div>

          <div className="space-y-3 pt-2">
            {unitTree.map((rootNode) => renderTreeNode(rootNode, 0))}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Unit Name</th>
                  <th className="py-3 px-4">Bangla Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Hierarchy Path</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 font-medium text-[#0F766E]">{u.nameBangla || '—'}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-500">{u.code}</td>
                    <td className="py-3 px-4">
                      <Badge variant="primary" size="sm">
                        {u.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.locationName || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {u.breadcrumbPath || u.name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openMoveModal(u)}
                          className="p-1 rounded text-slate-400 hover:text-[#0F766E]"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteUnit(u)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
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
      )}

      {/* Add / Edit Unit Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingUnit ? 'Edit Organizational Unit' : 'Add Organizational Unit'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Parent Unit (Optional)
                </label>
                <select
                  value={formParentId || ''}
                  onChange={(e) => setFormParentId(e.target.value || null)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">(None - Top Level Division)</option>
                  {units
                    .filter((u) => (editingUnit ? u.id !== editingUnit.id : true))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.breadcrumbPath || u.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit Name (Latin) *
                  </label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Garments Production"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bangla Name (বাংলা)
                  </label>
                  <Input
                    value={formNameBangla}
                    onChange={(e) => setFormNameBangla(e.target.value)}
                    placeholder="যেমন: পোশাক প্রস্তুতকরণ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Code (Uppercase) *
                  </label>
                  <Input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GARMENTS_PROD"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as OrgUnitType)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value={OrgUnitType.DIVISION}>Division</option>
                    <option value={OrgUnitType.DEPARTMENT}>Department</option>
                    <option value={OrgUnitType.SECTION}>Section</option>
                    <option value={OrgUnitType.TEAM}>Team</option>
                    <option value={OrgUnitType.LINE}>Production Line</option>
                    <option value={OrgUnitType.OTHER}>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Location
                  </label>
                  <select
                    value={formLocationId}
                    onChange={(e) => setFormLocationId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="">(No specific location)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sort Order Priority
                  </label>
                  <Input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  />
                </div>
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
                  {isSubmitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Create Unit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Unit Modal with Cycle Prevention */}
      {movingUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Move Organizational Unit</h3>
            <p className="text-xs text-slate-600 mt-1">
              Select a new parent unit for <strong>{movingUnit.name}</strong> ({movingUnit.code}).
            </p>

            <form onSubmit={handleMoveSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Parent Unit
                </label>
                <select
                  value={newParentIdForMove || ''}
                  onChange={(e) => setNewParentIdForMove(e.target.value || null)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">(Root - Top Level Division)</option>
                  {units.map((u) => {
                    const isSelfOrDescendant = getDescendantIds(movingUnit.id).has(u.id);
                    return (
                      <option
                        key={u.id}
                        value={u.id}
                        disabled={isSelfOrDescendant}
                        className={isSelfOrDescendant ? 'text-slate-300 bg-slate-50' : ''}
                      >
                        {u.breadcrumbPath || u.name}{' '}
                        {isSelfOrDescendant ? '(Invalid: creates cycle)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Self and all descendant sub-units are disabled to prevent cyclic dependencies.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setMovingUnit(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
                  {isSubmitting ? 'Moving...' : 'Confirm Move'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Unit Confirmation Modal */}
      {archiveUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">
              {archiveUnit.isArchived ? 'Restore Unit' : 'Archive Unit'}
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              {archiveUnit.isArchived
                ? `Restore '${archiveUnit.name}' to the active organizational tree?`
                : `Archive '${archiveUnit.name}'? Archived units are hidden from active tree selections but preserved in history and audit trails.`}
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setArchiveUnit(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => handleArchiveToggle(archiveUnit)}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Updating...'
                  : archiveUnit.isArchived
                    ? 'Confirm Restore'
                    : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Unit Confirmation Modal */}
      {deleteUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Delete Unit</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to permanently delete <strong>{deleteUnit.name}</strong> (
              {deleteUnit.code})?
            </p>

            {deleteUnit.childrenCount > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  This unit has {deleteUnit.childrenCount} sub-unit(s). You must move, delete, or
                  archive those sub-units first.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" size="md" onClick={() => setDeleteUnit(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleDelete}
                disabled={isSubmitting || deleteUnit.childrenCount > 0}
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
