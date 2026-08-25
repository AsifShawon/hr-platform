'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Gender,
  EmploymentStatus,
  JobCategory,
  CardLayoutSpecification,
  CardReadinessResult,
  PrintOutputFormat,
  PrintJobSide,
} from '@hr/domain';
import { CropCoordinatesInput } from '@hr/schemas';

const LOCAL_STORAGE_KEY_ORG = 'hr_last_used_org_id';
const LOCAL_STORAGE_KEY_LOC = 'hr_last_used_location_id';
const LOCAL_STORAGE_KEY_UNIT = 'hr_last_used_org_unit_id';
const LOCAL_STORAGE_KEY_TPL = 'hr_last_used_template_id';
const LOCAL_STORAGE_KEY_CAT = 'hr_last_used_job_category';

export interface OrganizationItem {
  id: string;
  name: string;
  displayName?: string | null;
  code: string;
  logoPath?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  employeeNumberRule?: { prefix: string; padLength: number; nextSequence: number } | null;
}

export interface LocationItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
}

export interface OrgUnitItem {
  id: string;
  organizationId: string;
  name: string;
  nameBangla?: string | null;
  code: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  presetId: string;
  activeVersionId?: string | null;
  activeVersionNumber?: number;
  layout?: CardLayoutSpecification;
}

export interface SelectedWorkerSummary {
  personId: string;
  employmentId: string;
  displayName: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  employeeNumber: string;
  jobTitle: string;
  jobCategory: JobCategory;
  organizationId: string;
  organizationName: string;
  orgUnitName?: string | null;
  locationName?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  photoUrl?: string | null;
  status: EmploymentStatus;
}

export function useCardCreationState(initialEmploymentId?: string | null) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Metadata Lists
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnitItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Mode: NEW_WORKER vs EXISTING_WORKER
  const [workerMode, setWorkerMode] = useState<'NEW_WORKER' | 'EXISTING_WORKER'>('NEW_WORKER');
  const [selectedWorker, setSelectedWorker] = useState<SelectedWorkerSummary | null>(null);

  // New Worker Form Data
  const [formData, setFormData] = useState({
    // Essential Card Fields
    organizationId: '',
    locationId: '',
    orgUnitId: '',
    templateId: '',
    displayName: '',
    displayNameLatin: '',
    displayNameNative: '',
    employeeNumber: '',
    jobTitle: '',
    jobCategory: JobCategory.STAFF,
    bloodGroup: 'B+',
    joinDate: new Date().toISOString().split('T')[0]!,
    status: EmploymentStatus.ACTIVE,

    // Photo
    photoDataUrl: null as string | null,
    photoCropParams: undefined as CropCoordinatesInput | undefined,
    photoMediaId: null as string | null,

    // Collapsed Optional HR Data
    dateOfBirth: '',
    gender: Gender.UNDISCLOSED,
    identityDocumentNumber: '',
    identityDocumentType: 'NATIONAL_ID',
    primaryPhone: '',
    emergencyContact: '',
    primaryEmail: '',
    addressStreet: '',
    addressCity: 'Dhaka',
  });

  // UI state & validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Step 2 Preflight & Preview State
  const [activeEmploymentId, setActiveEmploymentId] = useState<string | null>(
    initialEmploymentId || null,
  );
  const [preflightResult, setPreflightResult] = useState<CardReadinessResult | null>(null);
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(false);
  const [activeTemplateLayout, setActiveTemplateLayout] = useState<CardLayoutSpecification | null>(
    null,
  );

  // Step 3 Print Dispatch Options
  const [printOptions, setPrintOptions] = useState({
    outputMode: 'PRINT_NOW' as 'PRINT_NOW' | 'QUEUE',
    outputFormat: PrintOutputFormat.INDIVIDUAL_PDF,
    side: PrintJobSide.DUPLEX,
    copiesPerCard: 1,
  });

  // Step 4 Completion Result
  const [completionData, setCompletionData] = useState<{
    cardIssueId?: string;
    cardSerial?: string;
    printJobId?: string;
    pdfDownloadUrl?: string;
    isConfirmedPrinted: boolean;
  } | null>(null);

  // Load Organization, Location, Unit, and Template Metadata
  useEffect(() => {
    async function loadMetadata() {
      setIsLoadingMeta(true);
      try {
        const [orgsRes, locsRes, unitsRes, tplsRes] = await Promise.all([
          fetch('/api/organizations'),
          fetch('/api/locations'),
          fetch('/api/org-units'),
          fetch('/api/templates'),
        ]);

        let loadedOrgs: OrganizationItem[] = [];
        if (orgsRes.ok) {
          const data = await orgsRes.json();
          loadedOrgs = data.organizations || [];
          setOrganizations(loadedOrgs);
        }

        let loadedLocs: LocationItem[] = [];
        if (locsRes.ok) {
          const data = await locsRes.json();
          loadedLocs = data.locations || [];
          setLocations(loadedLocs);
        }

        let loadedUnits: OrgUnitItem[] = [];
        if (unitsRes.ok) {
          const data = await unitsRes.json();
          loadedUnits = data.orgUnits || [];
          setOrgUnits(loadedUnits);
        }

        let loadedTpls: TemplateItem[] = [];
        if (tplsRes.ok) {
          const data = await tplsRes.json();
          loadedTpls = data.templates || [];
          setTemplates(loadedTpls);
        }

        // Apply LocalStorage Memory
        const savedOrgId = localStorage.getItem(LOCAL_STORAGE_KEY_ORG);
        const savedLocId = localStorage.getItem(LOCAL_STORAGE_KEY_LOC);
        const savedUnitId = localStorage.getItem(LOCAL_STORAGE_KEY_UNIT);
        const savedTplId = localStorage.getItem(LOCAL_STORAGE_KEY_TPL);
        const savedCat = localStorage.getItem(LOCAL_STORAGE_KEY_CAT) as JobCategory | null;

        const effectiveOrgId =
          loadedOrgs.find((o) => o.id === savedOrgId)?.id ||
          loadedOrgs.find((o) => (o as any).isDefault)?.id ||
          loadedOrgs[0]?.id ||
          '';

        const matchingLocs = loadedLocs.filter((l) => l.organizationId === effectiveOrgId);
        const effectiveLocId =
          matchingLocs.find((l) => l.id === savedLocId)?.id || matchingLocs[0]?.id || '';

        const matchingUnits = loadedUnits.filter((u) => u.organizationId === effectiveOrgId);
        const effectiveUnitId =
          matchingUnits.find((u) => u.id === savedUnitId)?.id || matchingUnits[0]?.id || '';

        const effectiveTplId =
          loadedTpls.find((t) => t.id === savedTplId)?.id || loadedTpls[0]?.id || '';

        // Auto-generate employee number sequence if rule is present
        const selectedOrg = loadedOrgs.find((o) => o.id === effectiveOrgId);
        let autoEmpNumber = 'EMP-1001';
        if (selectedOrg?.employeeNumberRule) {
          const { prefix, padLength, nextSequence } = selectedOrg.employeeNumberRule;
          autoEmpNumber = `${prefix}${String(nextSequence).padStart(padLength, '0')}`;
        }

        setFormData((prev) => ({
          ...prev,
          organizationId: effectiveOrgId,
          locationId: effectiveLocId,
          orgUnitId: effectiveUnitId,
          templateId: effectiveTplId,
          jobCategory: savedCat || JobCategory.STAFF,
          employeeNumber: prev.employeeNumber || autoEmpNumber,
        }));

        if (effectiveTplId) {
          const tpl = loadedTpls.find((t) => t.id === effectiveTplId);
          if (tpl?.layout) {
            setActiveTemplateLayout(tpl.layout);
          }
        }
      } catch (err) {
        console.error('Failed to load card creation metadata:', err);
      } finally {
        setIsLoadingMeta(false);
      }
    }

    loadMetadata();
  }, []);

  // Update filtered locations & units and auto-sequence employee number when organization changes
  const handleOrganizationChange = (newOrgId: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ORG, newOrgId);

    const matchingLocs = locations.filter((l) => l.organizationId === newOrgId);
    const matchingUnits = orgUnits.filter((u) => u.organizationId === newOrgId);

    const selectedOrg = organizations.find((o) => o.id === newOrgId);
    let autoEmpNumber = formData.employeeNumber;
    if (selectedOrg?.employeeNumberRule) {
      const { prefix, padLength, nextSequence } = selectedOrg.employeeNumberRule;
      autoEmpNumber = `${prefix}${String(nextSequence).padStart(padLength, '0')}`;
    }

    setFormData((prev) => ({
      ...prev,
      organizationId: newOrgId,
      locationId: matchingLocs[0]?.id || '',
      orgUnitId: matchingUnits[0]?.id || '',
      employeeNumber: autoEmpNumber,
    }));
  };

  const handleLocationChange = (newLocId: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_LOC, newLocId);
    setFormData((prev) => ({ ...prev, locationId: newLocId }));
  };

  const handleOrgUnitChange = (newUnitId: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_UNIT, newUnitId);
    setFormData((prev) => ({ ...prev, orgUnitId: newUnitId }));
  };

  const handleTemplateChange = (newTplId: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_TPL, newTplId);
    const tpl = templates.find((t) => t.id === newTplId);
    setFormData((prev) => ({ ...prev, templateId: newTplId }));
    if (tpl?.layout) {
      setActiveTemplateLayout(tpl.layout);
    }
  };

  const handleJobCategoryChange = (newCat: JobCategory) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_CAT, newCat);
    setFormData((prev) => ({ ...prev, jobCategory: newCat }));
  };

  // Run Preflight for a specific employmentId
  const runPreflightCheck = useCallback(async (employmentId: string) => {
    setIsLoadingPreflight(true);
    try {
      const res = await fetch(`/api/cards/readiness/${employmentId}`);
      if (res.ok) {
        const data: CardReadinessResult = await res.json();
        setPreflightResult(data);
        if (data.resolvedTemplate?.layout) {
          setActiveTemplateLayout(
            data.resolvedTemplate.layout as unknown as CardLayoutSpecification,
          );
        }
        return data;
      } else {
        const errData = await res.json();
        setToastMessage({
          type: 'error',
          text: errData.error || 'Failed to evaluate card preflight.',
        });
        return null;
      }
    } catch {
      setToastMessage({ type: 'error', text: 'Network connection failed during preflight check.' });
      return null;
    } finally {
      setIsLoadingPreflight(false);
    }
  }, []);

  // Step 1 Validation & Submission (Creates Worker if in New Worker mode)
  const submitStep1 = async (): Promise<boolean> => {
    setFieldErrors({});

    if (workerMode === 'EXISTING_WORKER') {
      if (!selectedWorker) {
        setFieldErrors({ worker: 'Please select an employee to continue.' });
        return false;
      }
      setActiveEmploymentId(selectedWorker.employmentId);
      const readiness = await runPreflightCheck(selectedWorker.employmentId);
      if (readiness) {
        setCurrentStep(2);
        return true;
      }
      return false;
    }

    // Validate New Worker Essentials
    const errors: Record<string, string> = {};
    if (!formData.displayName.trim()) {
      errors.displayName = 'Full English name is required.';
    }
    if (!formData.organizationId) {
      errors.organizationId = 'Please select a company/organization.';
    }
    if (!formData.employeeNumber.trim()) {
      errors.employeeNumber = 'Employee number is required.';
    }
    if (!formData.jobTitle.trim()) {
      errors.jobTitle = 'Designation/Job title is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setToastMessage({
        type: 'error',
        text: 'Please fill in all required fields highlighted in red.',
      });
      return false;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload photo if newly captured/cropped dataUrl
      let photoMediaId = formData.photoMediaId;
      if (formData.photoDataUrl && !formData.photoMediaId) {
        try {
          const blobRes = await fetch(formData.photoDataUrl);
          const blob = await blobRes.blob();
          const uploadForm = new FormData();
          uploadForm.append('file', blob, 'portrait.jpg');

          const uploadRes = await fetch('/api/media/upload', {
            method: 'POST',
            body: uploadForm,
          });

          if (uploadRes.ok) {
            const mediaData = await uploadRes.json();
            photoMediaId = mediaData.asset?.id || mediaData.mediaAsset?.id || mediaData.id;
          }
        } catch (uploadErr) {
          console.warn('Photo upload non-fatal, proceeding with placeholder:', uploadErr);
        }
      }

      // 2. Create Person & Employment record
      const payload: any = {
        displayName: formData.displayName.trim(),
        displayNameLatin: formData.displayNameLatin.trim() || formData.displayName.trim(),
        displayNameNative: formData.displayNameNative.trim() || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup || undefined,
        primaryPhone: formData.primaryPhone.trim() || undefined,
        primaryEmail: formData.primaryEmail.trim() || undefined,
        photoMediaId: photoMediaId || undefined,
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
      };

      if (formData.identityDocumentNumber.trim()) {
        payload.identityDocument = {
          documentType: formData.identityDocumentType,
          documentNumber: formData.identityDocumentNumber.trim(),
          country: 'BGD',
        };
      }

      const createRes = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await createRes.json();

      if (!createRes.ok) {
        if (resData.fieldErrors) {
          setFieldErrors(resData.fieldErrors);
        }
        setToastMessage({
          type: 'error',
          text: resData.message || resData.error || 'Failed to create worker profile.',
        });
        return false;
      }

      const createdEmploymentId = resData.person?.activeEmployment?.id || resData.employment?.id;
      setActiveEmploymentId(createdEmploymentId);

      // Preflight the newly created worker
      await runPreflightCheck(createdEmploymentId);
      setCurrentStep(2);
      setToastMessage({
        type: 'success',
        text: 'Worker profile created. Reviewing preflight & live card preview.',
      });
      return true;
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Error creating worker profile.' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 Execution: Direct Issue or Print Queue
  const executePrintSubmission = async (): Promise<boolean> => {
    if (!activeEmploymentId) {
      setToastMessage({ type: 'error', text: 'Missing active employment ID.' });
      return false;
    }

    setIsSubmitting(true);
    try {
      if (printOptions.outputMode === 'PRINT_NOW') {
        // Direct issuance & master PDF generation
        const res = await fetch('/api/cards/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employmentId: activeEmploymentId,
            templateId: formData.templateId || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setToastMessage({ type: 'error', text: data.error || 'Failed to generate card master.' });
          return false;
        }

        setCompletionData({
          cardIssueId: data.id,
          cardSerial: data.cardSerial,
          isConfirmedPrinted: false,
        });

        setCurrentStep(4);
        setToastMessage({
          type: 'success',
          text: `Card ${data.cardSerial} issued! Ready for physical print.`,
        });
        return true;
      } else {
        // Batch queue creation
        const res = await fetch('/api/cards/print-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employmentIds: [activeEmploymentId],
            outputFormat: printOptions.outputFormat,
            side: printOptions.side,
            copiesPerCard: printOptions.copiesPerCard,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setToastMessage({
            type: 'error',
            text: data.error || 'Failed to enqueue batch print job.',
          });
          return false;
        }

        setCompletionData({
          printJobId: data.id,
          isConfirmedPrinted: false,
        });

        setCurrentStep(4);
        setToastMessage({ type: 'success', text: 'Card enqueued into batch print queue.' });
        return true;
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Error executing print submission.' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for "Create Another Card" while preserving company & template memory
  const resetForNextCard = () => {
    setCurrentStep(1);
    setWorkerMode('NEW_WORKER');
    setSelectedWorker(null);
    setActiveEmploymentId(null);
    setPreflightResult(null);
    setCompletionData(null);
    setFieldErrors({});

    const selectedOrg = organizations.find((o) => o.id === formData.organizationId);
    let nextSeqEmpNumber = '';
    if (selectedOrg?.employeeNumberRule) {
      const { prefix, padLength, nextSequence } = selectedOrg.employeeNumberRule;
      nextSeqEmpNumber = `${prefix}${String(nextSequence + 1).padStart(padLength, '0')}`;
    }

    setFormData((prev) => ({
      ...prev,
      displayName: '',
      displayNameLatin: '',
      displayNameNative: '',
      jobTitle: '',
      employeeNumber: nextSeqEmpNumber || '',
      photoDataUrl: null,
      photoMediaId: null,
      photoCropParams: undefined,
      identityDocumentNumber: '',
      primaryPhone: '',
      emergencyContact: '',
      primaryEmail: '',
    }));
  };

  return {
    currentStep,
    setCurrentStep,
    workerMode,
    setWorkerMode,
    selectedWorker,
    setSelectedWorker,
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    isSubmitting,
    toastMessage,
    setToastMessage,
    organizations,
    locations,
    orgUnits,
    templates,
    isLoadingMeta,
    handleOrganizationChange,
    handleLocationChange,
    handleOrgUnitChange,
    handleTemplateChange,
    handleJobCategoryChange,
    activeEmploymentId,
    preflightResult,
    isLoadingPreflight,
    activeTemplateLayout,
    printOptions,
    setPrintOptions,
    completionData,
    setCompletionData,
    submitStep1,
    executePrintSubmission,
    resetForNextCard,
    runPreflightCheck,
  };
}
