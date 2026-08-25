import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import { TemplatePresetId, TemplateVersionStatus, EmploymentStatus, JobCategory } from '@hr/domain';
import { checkCardReadiness } from '../src/services/card-readiness.service.js';
import { createTemplate, publishTemplateVersion } from '../src/services/template.service.js';

describe('Phase 2: Card Readiness & Preflight Engine Tests', () => {
  let tenantId: string;
  let organizationId: string;
  let personId: string;
  let employmentId: string;

  beforeEach(async () => {
    const slug = `ready-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Readiness Test Workspace' },
    });
    tenantId = tenant.id;

    const org = await prisma.organization.create({
      data: {
        tenantId,
        name: 'Apex Industrial Apparel Ltd.',
        displayName: 'Apex Apparel',
        code: `APX_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      },
    });
    organizationId = org.id;

    // Create a published template
    const template = await createTemplate(tenantId, {
      organizationId,
      name: 'Default Factory Badge',
      presetId: TemplatePresetId.CLASSIC_VERTICAL,
    });
    await publishTemplateVersion(tenantId, template.id, template.activeVersionId!);

    // Create person
    const person = await prisma.person.create({
      data: {
        tenantId,
        displayName: 'Shahidul Islam',
        displayNameLatin: 'Shahidul Islam',
        displayNameNative: 'শহিদুল ইসলাম',
        bloodGroup: 'B+',
      },
    });
    personId = person.id;

    // Create employment
    const employment = await prisma.employment.create({
      data: {
        tenantId,
        personId,
        organizationId,
        employeeNumber: 'EMP-7001',
        jobTitle: 'Senior Machine Technician',
        jobCategory: JobCategory.STAFF,
        joinDate: new Date('2024-01-15'),
        status: EmploymentStatus.ACTIVE,
      },
    });
    employmentId = employment.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  it('passes readiness check for active worker with assigned template', async () => {
    const result = await checkCardReadiness(tenantId, employmentId);

    expect(result.isReady).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.resolvedTemplate).toBeDefined();
    expect(result.resolvedTemplate?.templateName).toBe('Default Factory Badge');
    expect(result.workerSummary.employeeNumber).toBe('EMP-7001');
  });

  it('blocks card readiness when employment status is SEPARATED', async () => {
    await prisma.employment.update({
      where: { id: employmentId },
      data: { status: EmploymentStatus.SEPARATED },
    });

    const result = await checkCardReadiness(tenantId, employmentId);

    expect(result.isReady).toBe(false);
    expect(result.blockers.some((b) => b.code === 'EMPLOYMENT_SEPARATED')).toBe(true);
  });

  it('warns when worker has no portrait photo attached', async () => {
    const result = await checkCardReadiness(tenantId, employmentId);

    expect(result.warnings.some((w) => w.code === 'MISSING_PHOTO')).toBe(true);
    expect(result.workerSummary.photoAvailable).toBe(false);
  });

  it('warns on Bangla native name fallback when native name is absent', async () => {
    await prisma.person.update({
      where: { id: personId },
      data: { displayNameNative: null },
    });

    const result = await checkCardReadiness(tenantId, employmentId);

    expect(result.warnings.some((w) => w.code === 'BANGLA_NAME_FALLBACK_TO_LATIN')).toBe(true);
    expect(result.workerSummary.nativeNameAvailable).toBe(false);
  });

  it('blocks when employee number is missing', async () => {
    await prisma.employment.update({
      where: { id: employmentId },
      data: { employeeNumber: ' ' },
    });

    const result = await checkCardReadiness(tenantId, employmentId);

    expect(result.isReady).toBe(false);
    expect(result.blockers.some((b) => b.code === 'MISSING_EMPLOYEE_NUMBER')).toBe(true);
  });
});
