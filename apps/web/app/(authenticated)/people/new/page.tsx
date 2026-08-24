'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus,
  Briefcase,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
  CreditCard,
  Building2,
  MapPin,
  FolderTree,
  Calendar,
  Phone,
  Mail,
  FileText,
  Eye,
  X,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';
import { Gender, EmploymentStatus, JobCategory, IdentityDocumentType } from '@hr/domain';
import { PhotoCaptureStudio } from '../../../components/photo-capture/PhotoCaptureStudio';
import { CropCoordinatesInput } from '@hr/schemas';

interface OrganizationItem {
  id: string;
  name: string;
  displayName?: string | null;
  code: string;
  employeeNumberRule?: { prefix: string; padLength: number; nextSequence: number } | null;
}

interface LocationItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
}

interface OrgUnitItem {
  id: string;
  organizationId: string;
  name: string;
  nameBangla?: string | null;
  code: string;
}

interface DuplicateWarning {
  type: string;
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  matchedPersonName?: string;
  matchedEmployeeNumber?: string;
}

export default function AddWorkerWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Metadata options
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnitItem[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Employment
    organizationId: '',
    locationId: '',
    orgUnitId: '',
    employeeNumber: 'EMP-1007',
    jobTitle: '',
    jobCategory: JobCategory.STAFF,
    joinDate: new Date().toISOString().split('T')[0]!,
    status: EmploymentStatus.ACTIVE,

    // Step 2: Person
    displayName: '',
    displayNameLatin: '',
    displayNameNative: '',
    givenName: '',
    familyName: '',
    dateOfBirth: '',
    gender: Gender.UNDISCLOSED,
    bloodGroup: '',
    primaryPhone: '',
    primaryEmail: '',
    addressStreet: '',
    addressCity: 'Dhaka',
    addressPostalCode: '',
    addressCountry: 'Bangladesh',

    // Optional Identity Document
    hasIdentityDoc: false,
    identityDocType: IdentityDocumentType.SMART_NID,
    identityDocCountry: 'BGD',
    identityDocNumber: '',
    identityDocExpiry: '',

    // Phase 5 Photo Attachment
    photoDataUrl: null as string | null,
    photoCrop: undefined as CropCoordinatesInput | undefined,
  });

  // Validation & Duplicate Warnings State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Organization, Location, OrgUnit metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const [orgsRes, locsRes, unitsRes] = await Promise.all([
          fetch('/api/organizations'),
          fetch('/api/locations'),
          fetch('/api/org-units'),
        ]);

        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          const orgList: OrganizationItem[] = orgsData.organizations || [];
          setOrganizations(orgList);
          if (orgList.length > 0) {
            setFormData((prev) => ({
              ...prev,
              organizationId: orgList[0]!.id,
            }));
          }
        }

        if (locsRes.ok) {
          const locsData = await locsRes.json();
          setLocations(locsData.locations || []);
        }

        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setOrgUnits(unitsData.orgUnits || []);
        }
      } catch {
        setErrorMessage('Failed to load organization hierarchy data.');
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  // Run dry-run duplicate detection when entering Review step
  const runDuplicateCheck = async () => {
    setIsValidating(true);
    setDuplicateWarnings([]);
    try {
      const res = await fetch('/api/people/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: formData.organizationId,
          employeeNumber: formData.employeeNumber,
          displayName: formData.displayName,
          dateOfBirth: formData.dateOfBirth || undefined,
          identityDocumentNumber: formData.hasIdentityDoc ? formData.identityDocNumber : undefined,
          primaryPhone: formData.primaryPhone || undefined,
          primaryEmail: formData.primaryEmail || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDuplicateWarnings(data.warnings || []);
      }
    } catch {
      // Best-effort check
    } finally {
      setIsValidating(false);
    }
  };

  const goToStep = async (targetStep: 1 | 2 | 3) => {
    setErrorMessage(null);
    if (targetStep === 2) {
      if (!formData.employeeNumber.trim()) {
        setErrorMessage('Employee number is required.');
        return;
      }
      if (!formData.jobTitle.trim()) {
        setErrorMessage('Job title is required.');
        return;
      }
      if (!formData.joinDate) {
        setErrorMessage('Join date is required.');
        return;
      }
    }

    if (targetStep === 3) {
      if (!formData.displayName.trim()) {
        setErrorMessage('Worker display name is required.');
        return;
      }
      try {
        await runDuplicateCheck();
      } catch {
        // Continue to review even if dry-run check is offline
      }
    }

    setStep(targetStep);
  };

  const handleSave = async (action: 'view' | 'another' | 'card') => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      displayName: formData.displayName.trim(),
      displayNameLatin: formData.displayNameLatin.trim() || formData.displayName.trim(),
      displayNameNative: formData.displayNameNative.trim() || undefined,
      givenName: formData.givenName.trim() || undefined,
      familyName: formData.familyName.trim() || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup.trim() || undefined,
      primaryPhone: formData.primaryPhone.trim() || undefined,
      primaryEmail: formData.primaryEmail.trim() || undefined,
      address: {
        street: formData.addressStreet.trim() || undefined,
        city: formData.addressCity.trim() || undefined,
        postalCode: formData.addressPostalCode.trim() || undefined,
        country: formData.addressCountry.trim() || undefined,
      },
      employment: {
        organizationId: formData.organizationId,
        locationId: formData.locationId || undefined,
        orgUnitId: formData.orgUnitId || undefined,
        employeeNumber: formData.employeeNumber.trim(),
        jobTitle: formData.jobTitle.trim(),
        jobCategory: formData.jobCategory,
        joinDate: formData.joinDate,
        status: formData.status,
      },
      identityDocument:
        formData.hasIdentityDoc && formData.identityDocNumber.trim()
          ? {
              documentType: formData.identityDocType,
              country: formData.identityDocCountry,
              documentNumber: formData.identityDocNumber.trim(),
              expiryDate: formData.identityDocExpiry || undefined,
            }
          : undefined,
    };

    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Failed to create worker record.');
        setIsSubmitting(false);
        return;
      }

      const newPersonId = data.person.id;

      // Attach & process photo if captured
      if (formData.photoDataUrl) {
        try {
          await fetch(`/api/people/${newPersonId}/photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photoBase64: formData.photoDataUrl,
              crop: formData.photoCrop,
            }),
          });
        } catch {
          // Photo attachment error logged
        }
      }

      if (action === 'another') {
        // Reset form for next worker
        setFormData((prev) => ({
          ...prev,
          employeeNumber: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          displayName: '',
          displayNameLatin: '',
          displayNameNative: '',
          givenName: '',
          familyName: '',
          dateOfBirth: '',
          identityDocNumber: '',
          photoDataUrl: null,
          photoCrop: undefined,
        }));
        setStep(1);
      } else if (action === 'card') {
        router.push(`/cards/issue?personId=${newPersonId}`);
      } else {
        router.push(`/people/${newPersonId}`);
      }
    } catch {
      setErrorMessage('Network error while saving worker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-[#0F766E]">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add Worker</h1>
            <p className="text-sm text-slate-500">
              Create a decoupled person record, initial employment assignment, and sensitive
              identity profile.
            </p>
          </div>
        </div>

        <Link href="/people">
          <Button type="button" variant="outline" size="sm">
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </Link>
      </div>

      {/* 3-Step Wizard Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-4">
          {/* Step 1 Tab */}
          <button
            type="button"
            onClick={() => goToStep(1)}
            className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
              step === 1
                ? 'bg-teal-50 border border-teal-200 text-[#0F766E]'
                : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 1 ? 'bg-[#0F766E] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Employment</div>
              <div className="text-[11px] text-slate-500">Role & Hierarchy</div>
            </div>
          </button>

          {/* Step 2 Tab */}
          <button
            type="button"
            onClick={() => goToStep(2)}
            className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
              step === 2
                ? 'bg-teal-50 border border-teal-200 text-[#0F766E]'
                : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 2 ? 'bg-[#0F766E] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Person & Identity</div>
              <div className="text-[11px] text-slate-500">Names & Govt ID</div>
            </div>
          </button>

          {/* Step 3 Tab */}
          <button
            type="button"
            onClick={() => goToStep(3)}
            className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
              step === 3
                ? 'bg-teal-50 border border-teal-200 text-[#0F766E]'
                : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 3 ? 'bg-[#0F766E] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Review & Save</div>
              <div className="text-[11px] text-slate-500">Duplicates & Readiness</div>
            </div>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs font-bold text-rose-800 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Wizard Step Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* STEP 1: EMPLOYMENT */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0F766E]" />
                Step 1: Employment Details & Organization Assignment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign worker to an organization, facility location, and department hierarchy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organization *
                </label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.displayName || org.name} ({org.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee Number (Unique ID) *
                </label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                  placeholder="e.g. EMP-1001"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / Facility
                </label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">Select Location</option>
                  {locations
                    .filter((l) => l.organizationId === formData.organizationId)
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department / Section / Line
                </label>
                <select
                  value={formData.orgUnitId}
                  onChange={(e) => setFormData({ ...formData, orgUnitId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="">Select Department / Unit</option>
                  {orgUnits
                    .filter((u) => u.organizationId === formData.organizationId)
                    .map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} {unit.nameBangla ? `(${unit.nameBangla})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g. Senior Production Manager"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Category *
                </label>
                <select
                  value={formData.jobCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, jobCategory: e.target.value as JobCategory })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value={JobCategory.MANAGEMENT}>Management</option>
                  <option value={JobCategory.STAFF}>Staff</option>
                  <option value={JobCategory.OPERATOR}>Operator</option>
                  <option value={JobCategory.WORKER}>Worker</option>
                  <option value={JobCategory.CONTRACTOR}>Contractor</option>
                  <option value={JobCategory.EXECUTIVE}>Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Join Date (YYYY-MM-DD) *
                </label>
                <Input
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as EmploymentStatus })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value={EmploymentStatus.ACTIVE}>Active</option>
                  <option value={EmploymentStatus.PREBOARDING}>Preboarding</option>
                  <option value={EmploymentStatus.ON_LEAVE}>On Leave</option>
                  <option value={EmploymentStatus.INACTIVE}>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="primary" size="md" onClick={() => goToStep(2)}>
                Next: Person Details
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PERSON & SENSITIVE IDENTITY */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0F766E]" />
                Step 2: Person Identity & Bilingual Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Support for Bangla native script, Western/non-Western name components, and encrypted
                government ID.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Display Name (English / Latin) *
                </label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Tanvir Ahmed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Native Script Name (বাংলা নাম)
                </label>
                <Input
                  id="displayNameNative"
                  value={formData.displayNameNative}
                  onChange={(e) => setFormData({ ...formData, displayNameNative: e.target.value })}
                  placeholder="e.g. তানভীর আহমেদ"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Given Name (Optional)
                </label>
                <Input
                  value={formData.givenName}
                  onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                  placeholder="e.g. Tanvir"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Family Name (Optional)
                </label>
                <Input
                  value={formData.familyName}
                  onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                  placeholder="e.g. Ahmed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date of Birth (YYYY-MM-DD, leap-day safe)
                </label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value={Gender.UNDISCLOSED}>Undisclosed</option>
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                <Input
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  placeholder="e.g. O+, A+, AB+"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                  placeholder="+880 1711-000000"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Email Address
                </label>
                <Input
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                  placeholder="worker@londonboyapparel.com"
                />
              </div>
            </div>

            {/* SENSITIVE GOVERNMENT IDENTITY SECTION */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                    Government Identity Document (Optional & Encrypted at Rest)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Stored via AES-256-GCM encryption with HMAC blind indexing. Masked by default.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0F766E]">
                  <input
                    type="checkbox"
                    checked={formData.hasIdentityDoc}
                    onChange={(e) => setFormData({ ...formData, hasIdentityDoc: e.target.checked })}
                    className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  <span>Include Identity Document</span>
                </label>
              </div>

              {formData.hasIdentityDoc && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Document Type *
                    </label>
                    <select
                      value={formData.identityDocType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          identityDocType: e.target.value as IdentityDocumentType,
                        })
                      }
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none"
                    >
                      <option value={IdentityDocumentType.SMART_NID}>
                        Smart NID (10/17 digits)
                      </option>
                      <option value={IdentityDocumentType.NID}>Traditional NID</option>
                      <option value={IdentityDocumentType.PASSPORT}>Passport</option>
                      <option value={IdentityDocumentType.BIRTH_CERTIFICATE}>
                        Birth Certificate
                      </option>
                      <option value={IdentityDocumentType.DRIVING_LICENSE}>Driving License</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Document Number *
                    </label>
                    <Input
                      value={formData.identityDocNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, identityDocNumber: e.target.value })
                      }
                      placeholder="e.g. 19882612345678901"
                      required={formData.hasIdentityDoc}
                      className="h-9"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Expiry Date
                    </label>
                    <Input
                      type="date"
                      value={formData.identityDocExpiry}
                      onChange={(e) =>
                        setFormData({ ...formData, identityDocExpiry: e.target.value })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* PHASE 5: EMPLOYEE PORTRAIT PHOTO CAPTURE STUDIO */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <PhotoCaptureStudio
                slotId={formData.employeeNumber || 'draft-worker'}
                currentPhotoUrl={formData.photoDataUrl}
                onPhotoChanged={(url: string | null, crop?: CropCoordinatesInput) =>
                  setFormData((prev) => ({
                    ...prev,
                    photoDataUrl: url,
                    photoCrop: crop,
                  }))
                }
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="md" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Employment
              </Button>
              <Button type="button" variant="primary" size="md" onClick={() => goToStep(3)}>
                Next: Review & Readiness
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW, DUPLICATE WARNINGS & SUBMISSION */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
                Step 3: Review, Duplicate Checks & Card Readiness
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect duplicate risk signals and verify record completeness before committing.
              </p>
            </div>

            {/* DUPLICATE WARNING PANEL */}
            {isValidating ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#134E4A] border-t-transparent" />
                <span>Running conservative duplicate checks...</span>
              </div>
            ) : duplicateWarnings.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    Conservative Duplicate Warning ({duplicateWarnings.length} signal detected)
                  </span>
                </div>
                <div className="space-y-1.5 pl-6">
                  {duplicateWarnings.map((warn, idx) => (
                    <div key={idx} className="text-xs text-amber-800">
                      • <strong>{warn.type.replace(/_/g, ' ')}</strong>: {warn.message}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-700 italic pl-6 pt-1">
                  Note: Auto-merge is strictly disabled. You can review existing records or proceed
                  if this is a distinct worker.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No duplicate collisions detected. Ready for registration.</span>
              </div>
            )}

            {/* SUMMARY CARD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Worker Name
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {formData.displayName}
                </span>
                {formData.displayNameNative && (
                  <span className="text-xs font-semibold text-[#0F766E]">
                    {formData.displayNameNative}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Employee Number & Job Title
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formData.employeeNumber}
                </span>
                <span className="text-slate-600 block">
                  {formData.jobTitle} ({formData.jobCategory})
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Join Date & Status
                </span>
                <span className="text-slate-800 font-semibold">{formData.joinDate}</span>
                <div className="mt-1">
                  <Badge variant="success" size="sm">
                    {formData.status}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Government ID
                </span>
                {formData.hasIdentityDoc && formData.identityDocNumber ? (
                  <span className="font-mono text-slate-700">
                    {formData.identityDocType}: ••••••••{formData.identityDocNumber.slice(-4)}
                  </span>
                ) : (
                  <span className="text-slate-400">None Provided</span>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="md" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Person Details
              </Button>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled={isSubmitting}
                  onClick={() => handleSave('another')}
                >
                  Save & Add Another
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={() => handleSave('card')}
                >
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  Save & Issue Card Later
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={() => handleSave('view')}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSubmitting ? 'Saving...' : 'Save Worker'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
