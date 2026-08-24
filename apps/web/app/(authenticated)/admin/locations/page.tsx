'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Building,
  Factory,
  Briefcase,
  Store,
  Warehouse,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button, Input, Badge, Dialog } from '@hr/ui';
import { LocationType } from '@hr/domain';

interface LocationItem {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  } | null;
  contactPhone?: string | null;
  isDefault: boolean;
  unitCount?: number;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationItem | null>(null);
  const [deleteLoc, setDeleteLoc] = useState<LocationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<LocationType>(LocationType.OFFICE);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [contactPhone, setContactPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const loadData = async () => {
    try {
      const orgsRes = await fetch('/api/organizations');
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        const firstOrg = orgsData.organizations?.[0];
        if (firstOrg) {
          setOrganizationId(firstOrg.id);
          const locsRes = await fetch(`/api/locations?organizationId=${firstOrg.id}`);
          if (locsRes.ok) {
            const locsData = await locsRes.json();
            setLocations(locsData.locations || []);
          }
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load locations.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingLoc(null);
    setName('');
    setCode('');
    setType(LocationType.OFFICE);
    setStreet('');
    setCity('');
    setPostalCode('');
    setCountry('Bangladesh');
    setContactPhone('');
    setIsDefault(false);
    setIsAddEditOpen(true);
  };

  const openEditModal = (loc: LocationItem) => {
    setEditingLoc(loc);
    setName(loc.name);
    setCode(loc.code);
    setType(loc.type);
    setStreet(loc.address?.street || '');
    setCity(loc.address?.city || '');
    setPostalCode(loc.address?.postalCode || '');
    setCountry(loc.address?.country || 'Bangladesh');
    setContactPhone(loc.contactPhone || '');
    setIsDefault(loc.isDefault);
    setIsAddEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      organizationId,
      name,
      code: code.toUpperCase().trim(),
      type,
      address: { street, city, postalCode, country },
      contactPhone: contactPhone || null,
      isDefault,
    };

    try {
      const url = editingLoc ? `/api/locations/${editingLoc.id}` : '/api/locations';
      const method = editingLoc ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Location '${name}' ${editingLoc ? 'updated' : 'created'} successfully.`,
        });
        setIsAddEditOpen(false);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save location.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saving location.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteLoc) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/locations/${deleteLoc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Location '${deleteLoc.name}' deleted successfully.` });
        setDeleteLoc(null);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete location.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error deleting location.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocationIcon = (locType: LocationType) => {
    switch (locType) {
      case LocationType.FACTORY:
        return <Factory className="w-5 h-5 text-amber-600" />;
      case LocationType.HEADQUARTERS:
        return <Building className="w-5 h-5 text-[#0F766E]" />;
      case LocationType.BRANCH:
        return <Store className="w-5 h-5 text-blue-600" />;
      case LocationType.WAREHOUSE:
        return <Warehouse className="w-5 h-5 text-purple-600" />;
      default:
        return <Briefcase className="w-5 h-5 text-slate-600" />;
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
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Location Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage corporate offices, manufacturing plants, regional sites, and warehouses.
            </p>
          </div>
        </div>

        <Button type="button" variant="primary" size="md" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Location
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

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    {getLocationIcon(loc.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{loc.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {loc.code}
                      </span>
                      <Badge variant="primary" size="sm">
                        {loc.type}
                      </Badge>
                      {loc.isDefault && (
                        <Badge variant="neutral" size="sm">
                          Primary HQ
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(loc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    aria-label="Edit Location"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteLoc(loc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    aria-label="Delete Location"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {loc.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      {[
                        loc.address.street,
                        loc.address.city,
                        loc.address.postalCode,
                        loc.address.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {loc.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{loc.contactPhone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Associated Units: <strong className="text-slate-800">{loc.unitCount || 0}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Location Dialog */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingLoc ? 'Edit Location' : 'Add New Location'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Gazipur Plant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Code (Uppercase) *
                  </label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GZP_PLANT"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as LocationType)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value={LocationType.HEADQUARTERS}>Headquarters</option>
                  <option value={LocationType.OFFICE}>Office</option>
                  <option value={LocationType.FACTORY}>Factory / Plant</option>
                  <option value={LocationType.BRANCH}>Branch</option>
                  <option value={LocationType.SITE}>Site</option>
                  <option value={LocationType.WAREHOUSE}>Warehouse</option>
                  <option value={LocationType.OTHER}>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Street Address
                </label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. Bypass Road, Joydebpur"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Gazipur"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Postal Code</label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="1700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Bangladesh"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+88029205678"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                />
                <label htmlFor="isDefault" className="text-xs font-semibold text-slate-700">
                  Set as Default / Headquarters Location
                </label>
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
                  {isSubmitting ? 'Saving...' : editingLoc ? 'Update Location' : 'Create Location'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Location Dialog */}
      {deleteLoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Delete Location</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete <strong>{deleteLoc.name}</strong> ({deleteLoc.code})?
              This action cannot be undone.
            </p>
            {deleteLoc.unitCount && deleteLoc.unitCount > 0 ? (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This location is assigned to {deleteLoc.unitCount} organizational unit(s). You
                  must reassign or remove those units before deleting.
                </span>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" size="md" onClick={() => setDeleteLoc(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleDelete}
                disabled={isSubmitting || (deleteLoc.unitCount ? deleteLoc.unitCount > 0 : false)}
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
