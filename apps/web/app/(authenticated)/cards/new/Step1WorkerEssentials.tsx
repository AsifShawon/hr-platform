'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  Building2,
  MapPin,
  FolderTree,
  Briefcase,
  User,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button, Input, FormGroup, Badge } from '@hr/ui';
import { JobCategory, Gender, IdentityDocumentType } from '@hr/domain';
import { ExistingWorkerSelector } from './ExistingWorkerSelector';
import { PhotoCaptureStudio } from '../../../components/photo-capture/PhotoCaptureStudio';
import {
  OrganizationItem,
  LocationItem,
  OrgUnitItem,
  TemplateItem,
  SelectedWorkerSummary,
} from './useCardCreationState';

interface Step1WorkerEssentialsProps {
  workerMode: 'NEW_WORKER' | 'EXISTING_WORKER';
  setWorkerMode: (mode: 'NEW_WORKER' | 'EXISTING_WORKER') => void;
  selectedWorker: SelectedWorkerSummary | null;
  onSelectWorker: (worker: SelectedWorkerSummary) => void;
  onClearWorker: () => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  fieldErrors: Record<string, string>;
  organizations: OrganizationItem[];
  locations: LocationItem[];
  orgUnits: OrgUnitItem[];
  templates: TemplateItem[];
  onOrganizationChange: (orgId: string) => void;
  onLocationChange: (locId: string) => void;
  onOrgUnitChange: (unitId: string) => void;
  onTemplateChange: (tplId: string) => void;
  onJobCategoryChange: (cat: JobCategory) => void;
  onSubmit: () => Promise<boolean>;
  isSubmitting: boolean;
}

export const Step1WorkerEssentials: React.FC<Step1WorkerEssentialsProps> = ({
  workerMode,
  setWorkerMode,
  selectedWorker,
  onSelectWorker,
  onClearWorker,
  formData,
  setFormData,
  fieldErrors,
  organizations,
  locations,
  orgUnits,
  templates,
  onOrganizationChange,
  onLocationChange,
  onOrgUnitChange,
  onTemplateChange,
  onJobCategoryChange,
  onSubmit,
  isSubmitting,
}) => {
  const [showExtendedFields, setShowExtendedFields] = useState(false);

  const filteredLocations = locations.filter(
    (l) => !formData.organizationId || l.organizationId === formData.organizationId,
  );
  const filteredUnits = orgUnits.filter(
    (u) => !formData.organizationId || u.organizationId === formData.organizationId,
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit();
      }}
      className="space-y-6"
    >
      {/* 1. Worker Selection Mode Switcher */}
      <div className="p-1.5 rounded-2xl bg-slate-100 border border-slate-200 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setWorkerMode('NEW_WORKER')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            workerMode === 'NEW_WORKER'
              ? 'bg-white text-[#134E4A] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4 text-[#0F766E]" />
          <span>Add New Worker</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkerMode('EXISTING_WORKER')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            workerMode === 'EXISTING_WORKER'
              ? 'bg-white text-[#134E4A] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-[#0F766E]" />
          <span>Select Existing Worker</span>
        </button>
      </div>

      {/* 2. Worker Mode View */}
      {workerMode === 'EXISTING_WORKER' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F766E]" />
              <span>Search Registered Employee</span>
            </h3>
            <p className="text-xs text-slate-500">
              Lookup any active worker in this workspace by name, employee number, or department.
            </p>

            <ExistingWorkerSelector
              selectedWorker={selectedWorker}
              onSelectWorker={onSelectWorker}
              onClearWorker={onClearWorker}
            />

            {fieldErrors.worker && (
              <p className="text-xs font-semibold text-rose-600 mt-1">{fieldErrors.worker}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Essentials Section */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0F766E]" />
                <span>Worker Identity & Organization Essentials</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">* Required for ID Card</span>
            </div>

            {/* Names: English Front & Bangla Back */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormGroup label="Full Name (English) *" error={fieldErrors.displayName}>
                <Input
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      displayName: e.target.value,
                      displayNameLatin: e.target.value,
                    }))
                  }
                  placeholder="e.g. Shahidul Islam"
                  className="font-medium"
                />
              </FormGroup>

              <div>
                <FormGroup label="Name in Bangla (বাংলা)">
                  <Input
                    value={formData.displayNameNative}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, displayNameNative: e.target.value }))
                    }
                    placeholder="e.g. শহিদুল ইসলাম"
                    className="font-medium"
                  />
                </FormGroup>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Used on card back for bilingual display (Recommended)
                </span>
              </div>
            </div>

            {/* Company, Location & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <FormGroup label="Company / Org *" error={fieldErrors.organizationId}>
                <select
                  value={formData.organizationId}
                  onChange={(e) => onOrganizationChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">Select Organization...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.displayName || org.name}
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Work Location">
                <select
                  value={formData.locationId}
                  onChange={(e) => onLocationChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">Select Location...</option>
                  {filteredLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Department / Unit">
                <select
                  value={formData.orgUnitId}
                  onChange={(e) => onOrgUnitChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">Select Department...</option>
                  {filteredUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.nameBangla ? `(${u.nameBangla})` : ''}
                    </option>
                  ))}
                </select>
              </FormGroup>
            </div>

            {/* Job Title, Category, ID Number & Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div className="sm:col-span-2">
                <FormGroup label="Job Title / Designation *" error={fieldErrors.jobTitle}>
                  <Input
                    value={formData.jobTitle}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, jobTitle: e.target.value }))
                    }
                    placeholder="e.g. Senior Sewing Operator"
                  />
                </FormGroup>
              </div>

              <div>
                <FormGroup label="Employee ID No *" error={fieldErrors.employeeNumber}>
                  <Input
                    value={formData.employeeNumber}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, employeeNumber: e.target.value }))
                    }
                    placeholder="EMP-1001"
                    className="font-mono font-bold text-slate-900"
                  />
                </FormGroup>
              </div>

              <div>
                <FormGroup label="Blood Group">
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, bloodGroup: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-rose-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value="">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </FormGroup>
              </div>
            </div>
          </div>

          {/* 3. Photo Capture Studio */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              <span>Portrait Photo Studio</span>
            </h3>
            <p className="text-xs text-slate-500">
              Capture webcam photo, upload image from disk, or pair a smartphone for instant floor
              capture.
            </p>

            <PhotoCaptureStudio
              slotId={formData.employeeNumber || 'temp-worker-slot'}
              currentPhotoUrl={formData.photoDataUrl}
              onPhotoChanged={(dataUrl, cropParams) => {
                setFormData((prev: any) => ({
                  ...prev,
                  photoDataUrl: dataUrl,
                  photoCropParams: cropParams,
                }));
              }}
            />
          </div>

          {/* 4. Collapsed Additional HR Info (Optional) */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowExtendedFields(!showExtendedFields)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Additional HR Information (Optional)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    National ID, Date of Birth, Emergency Contact, Address (Masked by default)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>{showExtendedFields ? 'Hide' : 'Expand'}</span>
                {showExtendedFields ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showExtendedFields && (
              <div className="p-5 bg-white border-t border-slate-200 space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormGroup label="National ID / Govt ID (Masked)">
                    <Input
                      value={formData.identityDocumentNumber}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          identityDocumentNumber: e.target.value,
                        }))
                      }
                      placeholder="e.g. 19882612345678901"
                      className="font-mono text-xs"
                    />
                  </FormGroup>

                  <FormGroup label="Date of Birth">
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, dateOfBirth: e.target.value }))
                      }
                      className="text-xs"
                    />
                  </FormGroup>

                  <FormGroup label="Emergency Contact Phone">
                    <Input
                      value={formData.emergencyContact}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, emergencyContact: e.target.value }))
                      }
                      placeholder="+880 1711-000000"
                      className="font-mono text-xs"
                    />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <FormGroup label="Primary Email">
                    <Input
                      type="email"
                      value={formData.primaryEmail}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, primaryEmail: e.target.value }))
                      }
                      placeholder="worker@company.com"
                      className="text-xs"
                    />
                  </FormGroup>

                  <FormGroup label="Present Address Street / City">
                    <Input
                      value={formData.addressStreet}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, addressStreet: e.target.value }))
                      }
                      placeholder="e.g. House 12, Road 4, Sector 7, Uttara, Dhaka"
                      className="text-xs"
                    />
                  </FormGroup>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <span className="text-xs text-slate-500 font-medium">Step 1 of 3: Worker & Photo</span>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="bg-[#134E4A] hover:bg-[#0F766E] text-white px-6 font-bold shadow-md"
        >
          <span>Continue to Preview</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </form>
  );
};
