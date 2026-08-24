import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  TemplatePresetId,
  TemplateVersionStatus,
  TemplateAssignmentTarget,
  JobCategory,
} from '@hr/domain';
import {
  createTemplate,
  updateTemplateDraft,
  publishTemplateVersion,
  archiveTemplate,
  resolveTemplateForWorker,
  createTemplateAssignment,
  listTemplates,
  getTemplateById,
  TemplateError,
} from '../src/services/template.service.js';
import { createClassicVerticalPreset } from '@hr/card-kit';

describe('Phase 6: Card Format Engine & Constrained Template Engine Service Tests', () => {
  let tenantId: string;
  let organizationId: string;

  beforeEach(async () => {
    const slug = `tpl-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Template Test Workspace' },
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
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  it('creates template from preset with initial draft version v1', async () => {
    const template = await createTemplate(tenantId, {
      organizationId,
      name: 'Corporate Executive Badge',
      description: 'Classic vertical template for office staff',
      presetId: TemplatePresetId.CLASSIC_VERTICAL,
    });

    expect(template.id).toBeDefined();
    expect(template.name).toBe('Corporate Executive Badge');
    expect(template.presetId).toBe(TemplatePresetId.CLASSIC_VERTICAL);
    expect(template.versions).toHaveLength(1);

    const version1 = template.versions[0]!;
    expect(version1.versionNumber).toBe(1);
    expect(version1.status).toBe(TemplateVersionStatus.DRAFT);
    expect((version1.layout as any).presetId).toBe(TemplatePresetId.CLASSIC_VERTICAL);
    expect((version1.layout as any).front.header.showLogo).toBe(true);
    expect((version1.layout as any).back.details.customLabels.displayName).toBe('নাম');
  });

  it('updates draft version in-place when status is DRAFT', async () => {
    const template = await createTemplate(tenantId, {
      name: 'Draft Modifiable Template',
      presetId: TemplatePresetId.MODERN_STRIPE,
    });

    const modifiedLayout = createClassicVerticalPreset({ primaryColor: '#2563EB' });
    const updated = await updateTemplateDraft(tenantId, template.id, {
      name: 'Renamed Template',
      layout: modifiedLayout,
    });

    expect(updated.name).toBe('Renamed Template');
    expect(updated.versions).toHaveLength(1);
    expect((updated.versions[0]!.layout as any).theme.primaryColor).toBe('#2563EB');
  });

  it('publishes draft version, computes SHA-256 digest, and locks immutability', async () => {
    const template = await createTemplate(tenantId, {
      name: 'Production Ready Badge',
      presetId: TemplatePresetId.PHOTO_FOCUS,
    });

    const draftVersionId = template.activeVersionId!;
    const published = await publishTemplateVersion(
      tenantId,
      template.id,
      draftVersionId,
      'usr-test-1',
    );

    expect(published.status).toBe(TemplateVersionStatus.PUBLISHED);
    expect(published.checksumSha256).toBeDefined();
    expect(published.checksumSha256).toHaveLength(64); // SHA-256 hex string
    expect(published.publishedAt).toBeDefined();

    // Re-publishing a published version must throw
    await expect(publishTemplateVersion(tenantId, template.id, draftVersionId)).rejects.toThrow(
      /Only DRAFT template versions can be published/i,
    );
  });

  it('automatically forks new DRAFT version v2 when editing a published template', async () => {
    const template = await createTemplate(tenantId, {
      name: 'Immutable Template',
      presetId: TemplatePresetId.FACTORY_INDUSTRIAL,
    });

    // 1. Publish v1
    await publishTemplateVersion(tenantId, template.id, template.activeVersionId!);

    // 2. Edit template -> Must create new DRAFT v2
    const modifiedLayout = createClassicVerticalPreset({ primaryColor: '#DC2626' });
    const updated = await updateTemplateDraft(tenantId, template.id, {
      layout: modifiedLayout,
    });

    expect(updated.versions).toHaveLength(2);
    const version2 = updated.versions.find((v) => v.versionNumber === 2);
    expect(version2).toBeDefined();
    expect(version2?.status).toBe(TemplateVersionStatus.DRAFT);
    expect((version2?.layout as any).theme.primaryColor).toBe('#DC2626');

    // Published v1 remains unchanged
    const version1 = updated.versions.find((v) => v.versionNumber === 1);
    expect(version1?.status).toBe(TemplateVersionStatus.PUBLISHED);
  });

  it('executes 6-level deterministic template assignment resolution hierarchy', async () => {
    // 1. Create 3 different templates
    const contractorTemplate = await createTemplate(tenantId, {
      name: 'Contractor Badge',
      presetId: TemplatePresetId.CONTRACTOR,
    });
    await publishTemplateVersion(
      tenantId,
      contractorTemplate.id,
      contractorTemplate.activeVersionId!,
    );

    const plantTemplate = await createTemplate(tenantId, {
      name: 'Plant Standard Badge',
      presetId: TemplatePresetId.FACTORY_INDUSTRIAL,
    });
    await publishTemplateVersion(tenantId, plantTemplate.id, plantTemplate.activeVersionId!);

    const overrideTemplate = await createTemplate(tenantId, {
      name: 'VIP Executive Override',
      presetId: TemplatePresetId.PHOTO_FOCUS,
    });
    await publishTemplateVersion(tenantId, overrideTemplate.id, overrideTemplate.activeVersionId!);

    // 2. Assign Job Category rule
    await createTemplateAssignment(tenantId, {
      templateId: contractorTemplate.id,
      targetType: TemplateAssignmentTarget.JOB_CATEGORY,
      targetId: JobCategory.CONTRACTOR,
      priority: 20,
    });

    // 3. Assign Location rule
    const loc = await prisma.location.create({
      data: {
        tenantId,
        organizationId,
        name: 'Gazipur Plant',
        code: 'GZP_1',
      },
    });

    await createTemplateAssignment(tenantId, {
      templateId: plantTemplate.id,
      targetType: TemplateAssignmentTarget.LOCATION,
      targetId: loc.id,
      priority: 40,
    });

    // Case A: Worker with JobCategory CONTRACTOR at Gazipur Plant -> Resolves Level 2 (JOB_CATEGORY beats LOCATION)
    const resA = await resolveTemplateForWorker(tenantId, {
      jobCategory: JobCategory.CONTRACTOR,
      locationId: loc.id,
    });
    expect(resA.targetType).toBe(TemplateAssignmentTarget.JOB_CATEGORY);
    expect(resA.templateId).toBe(contractorTemplate.id);

    // Case B: Worker with JobCategory WORKER at Gazipur Plant -> Resolves Level 4 (LOCATION)
    const resB = await resolveTemplateForWorker(tenantId, {
      jobCategory: JobCategory.WORKER,
      locationId: loc.id,
    });
    expect(resB.targetType).toBe(TemplateAssignmentTarget.LOCATION);
    expect(resB.templateId).toBe(plantTemplate.id);

    // Case C: Worker with explicit Person Override -> Resolves Level 1 (WORKER_OVERRIDE beats everything)
    const fakePersonId = '550e8400-e29b-41d4-a716-446655440000';
    await createTemplateAssignment(tenantId, {
      templateId: overrideTemplate.id,
      targetType: TemplateAssignmentTarget.WORKER_OVERRIDE,
      targetId: fakePersonId,
      priority: 1,
    });

    const resC = await resolveTemplateForWorker(tenantId, {
      personId: fakePersonId,
      jobCategory: JobCategory.CONTRACTOR,
      locationId: loc.id,
    });
    expect(resC.targetType).toBe(TemplateAssignmentTarget.WORKER_OVERRIDE);
    expect(resC.templateId).toBe(overrideTemplate.id);
  });

  it('archives template and preserves published versions for historical cards', async () => {
    const template = await createTemplate(tenantId, {
      name: 'Archivable Template',
      presetId: TemplatePresetId.VISITOR,
    });
    await publishTemplateVersion(tenantId, template.id, template.activeVersionId!);

    const archived = await archiveTemplate(tenantId, template.id);
    expect(archived.isArchived).toBe(true);

    const fetched = await getTemplateById(tenantId, template.id);
    expect(fetched.isArchived).toBe(true);
    expect(fetched.versions).toHaveLength(1);
    expect(fetched.versions[0]!.status).toBe(TemplateVersionStatus.PUBLISHED);
  });
});
