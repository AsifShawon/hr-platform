import crypto from 'node:crypto';
import { prisma } from '@hr/db';
import {
  TemplatePresetId,
  TemplateVersionStatus,
  TemplateAssignmentTarget,
  CardLayoutSpecification,
  JobCategory,
  AuditAction,
} from '@hr/domain';
import {
  getPresetLayout,
  createClassicVerticalPreset,
  CURRENT_LAYOUT_SCHEMA_VERSION,
} from '@hr/card-kit';
import {
  CreateTemplateRequest,
  UpdateTemplateDraftRequest,
  TemplateAssignmentRequest,
  TemplateResolutionQuery,
} from '@hr/schemas';
import { recordAuditEvent } from './audit.service.js';

export class TemplateError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

/**
 * Computes deterministic SHA-256 checksum for layout snapshot
 */
export function computeLayoutChecksum(layout: CardLayoutSpecification): string {
  const serialized = JSON.stringify(layout);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Creates a new template with initial draft version v1
 */
export async function createTemplate(
  tenantId: string,
  input: CreateTemplateRequest,
  actorId?: string,
  ipAddress?: string,
) {
  if (input.organizationId) {
    const org = await prisma.organization.findFirst({
      where: { id: input.organizationId, tenantId },
    });
    if (!org) {
      throw new TemplateError('Referenced organization does not exist in this tenant.', 404);
    }
  }

  const initialLayout = getPresetLayout(
    input.presetId || TemplatePresetId.CLASSIC_VERTICAL,
    input.themeOverrides,
    input.dimensionOverrides,
  );

  const template = await prisma.$transaction(async (tx) => {
    const createdTemplate = await tx.cardTemplate.create({
      data: {
        tenantId,
        organizationId: input.organizationId || null,
        name: input.name,
        description: input.description || null,
        presetId: input.presetId || TemplatePresetId.CLASSIC_VERTICAL,
      },
    });

    const draftVersion = await tx.templateVersion.create({
      data: {
        tenantId,
        templateId: createdTemplate.id,
        versionNumber: 1,
        status: TemplateVersionStatus.DRAFT,
        layoutSchemaVersion: CURRENT_LAYOUT_SCHEMA_VERSION,
        layout: initialLayout as any,
      },
    });

    const updatedTemplate = await tx.cardTemplate.update({
      where: { id: createdTemplate.id },
      data: { activeVersionId: draftVersion.id },
      include: {
        versions: true,
      },
    });

    return updatedTemplate;
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.TEMPLATE_CREATED,
    entityType: 'card_template',
    entityId: template.id,
    details: { name: input.name, presetId: input.presetId },
    ipAddress,
  });

  return template;
}

/**
 * Updates a template draft. If active version is published, automatically forks a new DRAFT version.
 */
export async function updateTemplateDraft(
  tenantId: string,
  templateId: string,
  input: UpdateTemplateDraftRequest,
  actorId?: string,
  ipAddress?: string,
) {
  const template = await prisma.cardTemplate.findFirst({
    where: { id: templateId, tenantId, isArchived: false },
    include: { versions: { orderBy: { versionNumber: 'desc' } } },
  });

  if (!template) {
    throw new TemplateError('Card template not found or is archived.', 404);
  }

  const latestDraft = template.versions.find((v) => v.status === TemplateVersionStatus.DRAFT);

  const result = await prisma.$transaction(async (tx) => {
    let targetVersionId: string;

    if (latestDraft) {
      // Update existing draft
      const updated = await tx.templateVersion.update({
        where: { id: latestDraft.id },
        data: {
          layout: input.layout as any,
          layoutSchemaVersion: input.layout.version || CURRENT_LAYOUT_SCHEMA_VERSION,
        },
      });
      targetVersionId = updated.id;
    } else {
      // Fork new draft version
      const maxVersion = template.versions.length > 0 ? template.versions[0]!.versionNumber : 0;
      const newVersion = await tx.templateVersion.create({
        data: {
          tenantId,
          templateId: template.id,
          versionNumber: maxVersion + 1,
          status: TemplateVersionStatus.DRAFT,
          layoutSchemaVersion: input.layout.version || CURRENT_LAYOUT_SCHEMA_VERSION,
          layout: input.layout as any,
        },
      });
      targetVersionId = newVersion.id;
    }

    const updatedTemplate = await tx.cardTemplate.update({
      where: { id: template.id },
      data: {
        name: input.name || template.name,
        description: input.description !== undefined ? input.description : template.description,
        activeVersionId: targetVersionId,
      },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });

    return updatedTemplate;
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.TEMPLATE_UPDATED,
    entityType: 'card_template',
    entityId: template.id,
    details: { templateId: template.id, name: input.name },
    ipAddress,
  });

  return result;
}

/**
 * Publishes a draft template version, computing checksum and locking immutability.
 */
export async function publishTemplateVersion(
  tenantId: string,
  templateId: string,
  draftVersionId: string,
  publishedByUserId?: string,
  ipAddress?: string,
) {
  const version = await prisma.templateVersion.findFirst({
    where: { id: draftVersionId, templateId, tenantId },
    include: { template: true },
  });

  if (!version) {
    throw new TemplateError('Template version not found.', 404);
  }

  if (version.status !== TemplateVersionStatus.DRAFT) {
    throw new TemplateError('Only DRAFT template versions can be published.', 400);
  }

  const checksum = computeLayoutChecksum(version.layout as any);

  const updatedVersion = await prisma.$transaction(async (tx) => {
    const published = await tx.templateVersion.update({
      where: { id: version.id },
      data: {
        status: TemplateVersionStatus.PUBLISHED,
        checksumSha256: checksum,
        publishedAt: new Date(),
        publishedByUserId: publishedByUserId || null,
      },
    });

    await tx.cardTemplate.update({
      where: { id: templateId },
      data: { activeVersionId: published.id },
    });

    return published;
  });

  await recordAuditEvent({
    tenantId,
    actorId: publishedByUserId || null,
    action: AuditAction.TEMPLATE_VERSION_PUBLISHED,
    entityType: 'template_version',
    entityId: updatedVersion.id,
    details: {
      templateId,
      versionNumber: updatedVersion.versionNumber,
      checksumSha256: checksum,
    },
    ipAddress,
  });

  return updatedVersion;
}

/**
 * Archives a template. Published versions remain preserved for historical card snapshots.
 */
export async function archiveTemplate(
  tenantId: string,
  templateId: string,
  actorId?: string,
  ipAddress?: string,
) {
  const template = await prisma.cardTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new TemplateError('Card template not found.', 404);
  }

  const updated = await prisma.cardTemplate.update({
    where: { id: templateId },
    data: { isArchived: true },
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.TEMPLATE_ARCHIVED,
    entityType: 'card_template',
    entityId: template.id,
    details: { templateId: template.id, name: template.name },
    ipAddress,
  });

  return updated;
}

/**
 * Resolves a template deterministically for a given worker context using the 6-level hierarchy:
 * 1. WORKER_OVERRIDE
 * 2. JOB_CATEGORY
 * 3. ORG_UNIT
 * 4. LOCATION
 * 5. ORGANIZATION
 * 6. SYSTEM_DEFAULT
 */
export async function resolveTemplateForWorker(tenantId: string, query: TemplateResolutionQuery) {
  // Fetch active assignments for this tenant
  const assignments = await prisma.templateAssignment.findMany({
    where: { tenantId, template: { isArchived: false } },
    include: {
      template: {
        include: {
          versions: {
            where: { status: TemplateVersionStatus.PUBLISHED },
            orderBy: { versionNumber: 'desc' },
          },
        },
      },
    },
    orderBy: { priority: 'asc' },
  });

  // Level 1: Worker Override
  if (query.personId) {
    const workerAssignment = assignments.find(
      (a) =>
        a.targetType === TemplateAssignmentTarget.WORKER_OVERRIDE && a.targetId === query.personId,
    );
    if (workerAssignment && workerAssignment.template.versions.length > 0) {
      const version = workerAssignment.template.versions[0]!;
      return {
        templateId: workerAssignment.template.id,
        templateName: workerAssignment.template.name,
        versionId: version.id,
        versionNumber: version.versionNumber,
        layout: version.layout as unknown as CardLayoutSpecification,
        targetType: TemplateAssignmentTarget.WORKER_OVERRIDE,
        resolutionReason: `Explicit worker override assigned directly to Person [${query.personId}].`,
      };
    }
  }

  // Level 2: Job Category
  if (query.jobCategory) {
    const categoryAssignment = assignments.find(
      (a) =>
        a.targetType === TemplateAssignmentTarget.JOB_CATEGORY && a.targetId === query.jobCategory,
    );
    if (categoryAssignment && categoryAssignment.template.versions.length > 0) {
      const version = categoryAssignment.template.versions[0]!;
      return {
        templateId: categoryAssignment.template.id,
        templateName: categoryAssignment.template.name,
        versionId: version.id,
        versionNumber: version.versionNumber,
        layout: version.layout as unknown as CardLayoutSpecification,
        targetType: TemplateAssignmentTarget.JOB_CATEGORY,
        resolutionReason: `Matched worker job category rule [${query.jobCategory}].`,
      };
    }
  }

  // Level 3: Organizational Unit
  if (query.orgUnitId) {
    const orgUnitAssignment = assignments.find(
      (a) => a.targetType === TemplateAssignmentTarget.ORG_UNIT && a.targetId === query.orgUnitId,
    );
    if (orgUnitAssignment && orgUnitAssignment.template.versions.length > 0) {
      const version = orgUnitAssignment.template.versions[0]!;
      return {
        templateId: orgUnitAssignment.template.id,
        templateName: orgUnitAssignment.template.name,
        versionId: version.id,
        versionNumber: version.versionNumber,
        layout: version.layout as unknown as CardLayoutSpecification,
        targetType: TemplateAssignmentTarget.ORG_UNIT,
        resolutionReason: `Matched organizational unit rule [${query.orgUnitId}].`,
      };
    }
  }

  // Level 4: Location
  if (query.locationId) {
    const locationAssignment = assignments.find(
      (a) => a.targetType === TemplateAssignmentTarget.LOCATION && a.targetId === query.locationId,
    );
    if (locationAssignment && locationAssignment.template.versions.length > 0) {
      const version = locationAssignment.template.versions[0]!;
      return {
        templateId: locationAssignment.template.id,
        templateName: locationAssignment.template.name,
        versionId: version.id,
        versionNumber: version.versionNumber,
        layout: version.layout as unknown as CardLayoutSpecification,
        targetType: TemplateAssignmentTarget.LOCATION,
        resolutionReason: `Matched location assignment rule [${query.locationId}].`,
      };
    }
  }

  // Level 5: Organization Default
  if (query.organizationId) {
    const orgAssignment = assignments.find(
      (a) =>
        a.targetType === TemplateAssignmentTarget.ORGANIZATION &&
        a.targetId === query.organizationId,
    );
    if (orgAssignment && orgAssignment.template.versions.length > 0) {
      const version = orgAssignment.template.versions[0]!;
      return {
        templateId: orgAssignment.template.id,
        templateName: orgAssignment.template.name,
        versionId: version.id,
        versionNumber: version.versionNumber,
        layout: version.layout as unknown as CardLayoutSpecification,
        targetType: TemplateAssignmentTarget.ORGANIZATION,
        resolutionReason: `Matched organization default template [${query.organizationId}].`,
      };
    }
  }

  // Level 6: System Default (first published template in tenant, or fallback default preset)
  const systemAssignment = assignments.find(
    (a) => a.targetType === TemplateAssignmentTarget.SYSTEM,
  );
  if (systemAssignment && systemAssignment.template.versions.length > 0) {
    const version = systemAssignment.template.versions[0]!;
    return {
      templateId: systemAssignment.template.id,
      templateName: systemAssignment.template.name,
      versionId: version.id,
      versionNumber: version.versionNumber,
      layout: version.layout as unknown as CardLayoutSpecification,
      targetType: TemplateAssignmentTarget.SYSTEM,
      resolutionReason: 'Matched tenant system default template assignment.',
    };
  }

  // Find any published template in tenant
  const anyPublished = await prisma.templateVersion.findFirst({
    where: {
      tenantId,
      status: TemplateVersionStatus.PUBLISHED,
      template: { isArchived: false },
    },
    include: { template: true },
    orderBy: { createdAt: 'asc' },
  });

  if (anyPublished) {
    return {
      templateId: anyPublished.template.id,
      templateName: anyPublished.template.name,
      versionId: anyPublished.id,
      versionNumber: anyPublished.versionNumber,
      layout: anyPublished.layout as unknown as CardLayoutSpecification,
      targetType: TemplateAssignmentTarget.SYSTEM,
      resolutionReason: 'Fallback to earliest published tenant template.',
    };
  }

  // Ultimate fallback: provision default published template in DB if none exists
  const fallbackLayout = createClassicVerticalPreset();
  const autoCreated = await prisma.$transaction(async (tx) => {
    const tpl = await tx.cardTemplate.create({
      data: {
        tenantId,
        name: 'Standard Company Vertical (60×90mm Bilingual)',
        description: 'Auto-provisioned default bilingual template for physical issuance',
        presetId: TemplatePresetId.CLASSIC_VERTICAL,
        isArchived: false,
      },
    });

    const ver = await tx.templateVersion.create({
      data: {
        tenantId,
        templateId: tpl.id,
        versionNumber: 1,
        status: TemplateVersionStatus.PUBLISHED,
        layoutSchemaVersion: '1.0.0',
        layout: fallbackLayout as any,
        publishedAt: new Date(),
        checksumSha256: computeLayoutChecksum(fallbackLayout),
      },
    });

    await tx.cardTemplate.update({
      where: { id: tpl.id },
      data: { activeVersionId: ver.id },
    });

    return { tpl, ver };
  });

  return {
    templateId: autoCreated.tpl.id,
    templateName: autoCreated.tpl.name,
    versionId: autoCreated.ver.id,
    versionNumber: autoCreated.ver.versionNumber,
    layout: fallbackLayout,
    targetType: TemplateAssignmentTarget.SYSTEM,
    resolutionReason: 'Auto-provisioned default Company Vertical 60×90mm Bilingual preset.',
  };
}

/**
 * Creates or updates a template assignment rule with conflict detection
 */
export async function createTemplateAssignment(
  tenantId: string,
  input: TemplateAssignmentRequest,
  actorId?: string,
  ipAddress?: string,
) {
  const template = await prisma.cardTemplate.findFirst({
    where: { id: input.templateId, tenantId, isArchived: false },
  });

  if (!template) {
    throw new TemplateError('Target card template not found or is archived.', 404);
  }

  // Check for existing assignment on same target
  const existing = await prisma.templateAssignment.findFirst({
    where: {
      tenantId,
      targetType: input.targetType,
      targetId: input.targetId || null,
    },
  });

  let assignment;
  if (existing) {
    assignment = await prisma.templateAssignment.update({
      where: { id: existing.id },
      data: {
        templateId: input.templateId,
        priority: input.priority,
      },
    });
  } else {
    assignment = await prisma.templateAssignment.create({
      data: {
        tenantId,
        templateId: input.templateId,
        targetType: input.targetType,
        targetId: input.targetId || null,
        priority: input.priority,
      },
    });
  }

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.TEMPLATE_ASSIGNED,
    entityType: 'template_assignment',
    entityId: assignment.id,
    details: {
      templateId: input.templateId,
      targetType: input.targetType,
      targetId: input.targetId,
    },
    ipAddress,
  });

  return assignment;
}

/**
 * Lists all templates with active version summary.
 * If organizationId is provided, returns organization-specific and tenant-wide templates.
 */
export async function listTemplates(tenantId: string, organizationId?: string) {
  const where: any = { tenantId };
  if (organizationId) {
    where.OR = [{ organizationId }, { organizationId: null }];
  }

  return prisma.cardTemplate.findMany({
    where,
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
      assignments: true,
      organization: {
        select: { id: true, name: true, displayName: true, code: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Gets template by ID with all versions
 */
export async function getTemplateById(tenantId: string, templateId: string) {
  const template = await prisma.cardTemplate.findFirst({
    where: { id: templateId, tenantId },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
      assignments: true,
      organization: {
        select: { id: true, name: true, displayName: true, code: true },
      },
    },
  });

  if (!template) {
    throw new TemplateError('Card template not found.', 404);
  }

  return template;
}
