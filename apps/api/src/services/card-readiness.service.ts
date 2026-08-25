import { prisma } from '@hr/db';
import {
  EmploymentStatus,
  TemplateVersionStatus,
  CardReadinessResult,
  CardReadinessIssue,
  LocaleFallbackPolicy,
  CardLayoutSpecification,
} from '@hr/domain';
import { resolveTemplateForWorker } from './template.service.js';

export async function checkCardReadiness(
  tenantId: string,
  employmentId: string,
): Promise<CardReadinessResult> {
  const blockers: CardReadinessIssue[] = [];
  const warnings: CardReadinessIssue[] = [];

  const employment = await prisma.employment.findFirst({
    where: { id: employmentId, tenantId },
    include: {
      person: {
        include: {
          photoMedia: true,
        },
      },
      organization: true,
      location: true,
      orgUnit: true,
    },
  });

  if (!employment) {
    return {
      isReady: false,
      canOverrideWarnings: false,
      blockers: [
        {
          code: 'EMPLOYMENT_NOT_FOUND',
          severity: 'BLOCKER',
          message: 'Employment record was not found for this tenant.',
        },
      ],
      warnings: [],
      resolvedTemplate: null,
      workerSummary: {
        personId: '',
        employmentId,
        displayName: '',
        employeeNumber: '',
        jobTitle: '',
        status: EmploymentStatus.INACTIVE,
        photoAvailable: false,
        nativeNameAvailable: false,
      },
    };
  }

  const { person, organization, location, orgUnit } = employment;

  // 1. Employment Status Check
  if (employment.status === EmploymentStatus.SEPARATED) {
    blockers.push({
      code: 'EMPLOYMENT_SEPARATED',
      field: 'status',
      severity: 'BLOCKER',
      message:
        'Worker employment status is SEPARATED. Cards cannot be issued for separated workers.',
      suggestion: 'Re-activate or re-hire the employee before attempting card issuance.',
    });
  } else if (employment.status === EmploymentStatus.INACTIVE) {
    blockers.push({
      code: 'EMPLOYMENT_INACTIVE',
      field: 'status',
      severity: 'BLOCKER',
      message: 'Worker employment status is INACTIVE.',
    });
  } else if (employment.status === EmploymentStatus.PREBOARDING) {
    warnings.push({
      code: 'EMPLOYMENT_PREBOARDING',
      field: 'status',
      severity: 'WARNING',
      message:
        'Worker is currently in PREBOARDING status. Verify that badge pre-issuance is authorized.',
    });
  }

  // 2. Photo Policy Check
  const hasPhoto = Boolean(person.photoMediaId && person.photoMedia);
  if (!hasPhoto) {
    warnings.push({
      code: 'MISSING_PHOTO',
      field: 'photoMediaId',
      severity: 'WARNING',
      message:
        'Worker does not have an approved portrait photo. A placeholder silhouette will be printed.',
      suggestion: 'Capture or upload an approved employee portrait photo in the photo studio.',
    });
  }

  // 3. Resolve Template
  const resolved = await resolveTemplateForWorker(tenantId, {
    personId: person.id,
    jobCategory: employment.jobCategory as any,
    orgUnitId: orgUnit?.id,
    locationId: location?.id,
    organizationId: organization.id,
  });

  const layout = resolved.layout as unknown as CardLayoutSpecification;

  // If layout strictly requires photo and no photo exists
  if (layout.front.photo && !hasPhoto) {
    // If strict photo preset (like PHOTO_FOCUS)
    if (layout.presetId === 'PHOTO_FOCUS') {
      blockers.push({
        code: 'PHOTO_FOCUS_REQUIRES_PHOTO',
        field: 'photo',
        severity: 'BLOCKER',
        message: 'The resolved template (Photo Focus) strictly requires a portrait photo.',
        suggestion:
          'Upload a photo or assign a template format that allows visitor/placeholder layouts.',
      });
    }
  }

  // 4. Mandatory Field Bindings Check
  const enabledFrontFields = layout.front.details.enabledFields || [];
  if (enabledFrontFields.includes('employeeNumber') && !employment.employeeNumber?.trim()) {
    blockers.push({
      code: 'MISSING_EMPLOYEE_NUMBER',
      field: 'employeeNumber',
      severity: 'BLOCKER',
      message: 'Employee number is required by the card template but is empty.',
    });
  }

  if (enabledFrontFields.includes('displayName') && !person.displayName?.trim()) {
    blockers.push({
      code: 'MISSING_DISPLAY_NAME',
      field: 'displayName',
      severity: 'BLOCKER',
      message: 'Display name is required by the card template but is empty.',
    });
  }

  if (enabledFrontFields.includes('jobTitle') && !employment.jobTitle?.trim()) {
    warnings.push({
      code: 'MISSING_JOB_TITLE',
      field: 'jobTitle',
      severity: 'WARNING',
      message: 'Job title is enabled on card template but worker has no job title specified.',
    });
  }

  // 5. Native / Bangla Script Fallback Warning
  const hasNativeName = Boolean(person.displayNameNative?.trim());
  if (layout.localeConfig?.backLocale?.startsWith('bn') && !hasNativeName) {
    if (layout.localeConfig.fallbackPolicy === LocaleFallbackPolicy.LATIN_FALLBACK) {
      warnings.push({
        code: 'BANGLA_NAME_FALLBACK_TO_LATIN',
        field: 'displayNameNative',
        severity: 'WARNING',
        message:
          'Bengali script name is missing. The card back will fallback to the English/Latin name.',
        suggestion:
          'Add the worker native name in Bangla (বাংলা) in worker profile for optimal bilingual display.',
      });
    } else {
      warnings.push({
        code: 'BANGLA_NAME_BLANK',
        field: 'displayNameNative',
        severity: 'WARNING',
        message: 'Bengali script name is missing and template policy leaves it blank.',
      });
    }
  }

  const isReady = blockers.length === 0;

  return {
    isReady,
    canOverrideWarnings: isReady && warnings.length > 0,
    blockers,
    warnings,
    resolvedTemplate: {
      templateId: resolved.templateId,
      templateName: resolved.templateName,
      versionId: resolved.versionId,
      versionNumber: resolved.versionNumber,
      layout,
      targetType: resolved.targetType,
      resolutionReason: resolved.resolutionReason,
    },
    workerSummary: {
      personId: person.id,
      employmentId: employment.id,
      displayName: person.displayName,
      displayNameLatin: person.displayNameLatin,
      displayNameNative: person.displayNameNative,
      employeeNumber: employment.employeeNumber,
      jobTitle: employment.jobTitle,
      status: employment.status as any as EmploymentStatus,
      photoAvailable: hasPhoto,
      nativeNameAvailable: hasNativeName,
    },
  };
}

/**
 * Validates card readiness across multiple worker employments concurrently.
 */
export async function checkBatchCardReadiness(tenantId: string, employmentIds: string[]) {
  const results = await Promise.all(
    employmentIds.map((empId) => checkCardReadiness(tenantId, empId)),
  );

  const ready: CardReadinessResult[] = [];
  const blocked: CardReadinessResult[] = [];

  for (const r of results) {
    if (r.isReady) {
      ready.push(r);
    } else {
      blocked.push(r);
    }
  }

  return {
    totalChecked: results.length,
    readyCount: ready.length,
    blockedCount: blocked.length,
    ready,
    blocked,
  };
}
