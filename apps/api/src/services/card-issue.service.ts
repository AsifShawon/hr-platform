import crypto from 'node:crypto';
import { prisma } from '@hr/db';
import {
  CardIssueStatus,
  CardIssueReason,
  CardRevocationReason,
  TemplateVersionStatus,
  AuditAction,
  CardLayoutSpecification,
} from '@hr/domain';
import { createPrintedSnapshot, CardRenderWorkerPayload } from '@hr/card-kit';
import { CardRenderer } from '@hr/card-kit/renderer';

import {
  DirectIssueCardRequest,
  ReprintCardRequest,
  RevokeCardRequest,
  CardIssueQuery,
} from '@hr/schemas';
import { checkCardReadiness } from './card-readiness.service.js';
import { computeLayoutChecksum } from './template.service.js';
import { recordAuditEvent } from './audit.service.js';
import { getPhotoBuffer } from './photo-processing.service.js';

export class CardIssueError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public issues?: any[],
  ) {
    super(message);
    this.name = 'CardIssueError';
  }
}

/**
 * Generates an atomic, unique serial number in format CARD-YYYY-XXXXXX
 */
export async function generateCardSerial(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.cardIssue.count({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
      },
    },
  });

  const nextSeq = count + 1;
  const seqPadded = String(nextSeq).padStart(6, '0');
  const serial = `CARD-${currentYear}-${seqPadded}`;

  // Verify uniqueness (in case of concurrency)
  const existing = await prisma.cardIssue.findFirst({
    where: { tenantId, cardSerial: serial },
  });

  if (existing) {
    // Append high-entropy hex suffix to guarantee absolute uniqueness
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `CARD-${currentYear}-${seqPadded}-${suffix}`;
  }

  return serial;
}

/**
 * Directly issues a card for a worker (atomic preflight -> issue transaction)
 */
export async function issueCardDirect(
  tenantId: string,
  input: DirectIssueCardRequest,
  actorId?: string,
  ipAddress?: string,
) {
  // 1. Idempotency Check
  if (input.idempotencyKey) {
    const existing = await prisma.cardIssue.findFirst({
      where: { tenantId, idempotencyKey: input.idempotencyKey },
      include: {
        person: true,
        employment: true,
        templateVersion: true,
      },
    });
    if (existing) {
      return existing;
    }
  }

  // 2. Preflight Check
  const readiness = await checkCardReadiness(tenantId, input.employmentId);
  if (!readiness.isReady) {
    throw new CardIssueError(
      'Card cannot be issued: preflight validation failed.',
      400,
      readiness.blockers,
    );
  }

  const employment = await prisma.employment.findFirst({
    where: { id: input.employmentId, tenantId },
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
    throw new CardIssueError('Employment record not found.', 404);
  }

  // 3. Resolve or fetch published template version
  let templateVersionId: string;
  let layout: CardLayoutSpecification;
  let templateChecksum: string;

  if (input.templateId) {
    const template = await prisma.cardTemplate.findFirst({
      where: { id: input.templateId, tenantId, isArchived: false },
      include: {
        versions: {
          where: { status: TemplateVersionStatus.PUBLISHED },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!template || template.versions.length === 0) {
      throw new CardIssueError('Specified template is not published or does not exist.', 400);
    }
    const version = template.versions[0]!;
    templateVersionId = version.id;
    layout = version.layout as unknown as CardLayoutSpecification;
    templateChecksum = version.checksumSha256 || computeLayoutChecksum(layout);
  } else {
    if (!readiness.resolvedTemplate) {
      throw new CardIssueError('No published template could be resolved for this worker.', 400);
    }
    templateVersionId = readiness.resolvedTemplate.versionId;
    layout = readiness.resolvedTemplate.layout;
    templateChecksum = computeLayoutChecksum(layout);
  }

  // 4. Generate Serial & Issue Sequence Number
  const cardSerial = await generateCardSerial(tenantId);
  const priorIssuesCount = await prisma.cardIssue.count({
    where: { tenantId, employmentId: input.employmentId },
  });
  const issueNumber = priorIssuesCount + 1;
  const issuedAt = new Date();

  // 5. Generate Immutable Printed Snapshot
  const printedSnapshot = createPrintedSnapshot({
    person: {
      id: employment.person.id,
      displayName: employment.person.displayName,
      displayNameLatin: employment.person.displayNameLatin,
      displayNameNative: employment.person.displayNameNative,
      bloodGroup: employment.person.bloodGroup,
      primaryPhone: employment.person.primaryPhone,
      photoMediaId: employment.person.photoMediaId,
    },
    employment: {
      id: employment.id,
      employeeNumber: employment.employeeNumber,
      jobTitle: employment.jobTitle,
      jobCategory: employment.jobCategory,
      orgUnitName: employment.orgUnit?.name,
      locationName: employment.location?.name,
      joinDate: employment.joinDate,
    },
    organization: {
      id: employment.organization.id,
      name: employment.organization.name,
      displayName: employment.organization.displayName,
      code: employment.organization.code,
      logoPath: employment.organization.logoPath,
      primaryColor: employment.organization.primaryColor,
      secondaryColor: employment.organization.secondaryColor,
      accentColor: employment.organization.accentColor,
    },
    card: {
      serialNumber: cardSerial,
      issueNumber,
      issuedAt: issuedAt.toISOString(),
      validUntil: input.validUntil,
      formatPreset: layout.presetId,
      widthMm: layout.dimensions.widthMm,
      heightMm: layout.dimensions.heightMm,
      orientation: layout.dimensions.orientation,
    },
    photoChecksumSha256: employment.person.photoMedia?.checksumSha256,
  });

  // 6. Atomic Transaction
  const createdIssue = await prisma.$transaction(async (tx) => {
    // Deactivate previous active card for this employment if any
    await tx.cardIssue.updateMany({
      where: {
        tenantId,
        employmentId: input.employmentId,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        status: CardIssueStatus.REPLACED,
      },
    });

    const issue = await tx.cardIssue.create({
      data: {
        tenantId,
        personId: employment.person.id,
        employmentId: employment.id,
        templateVersionId,
        cardSerial,
        issueNumber,
        issueReason: input.issueReason || CardIssueReason.INITIAL,
        reasonNotes: input.reasonNotes || null,
        status: CardIssueStatus.ISSUED,
        isCurrent: true,
        printedSnapshot: printedSnapshot as any,
        layoutSnapshot: layout as any,
        templateChecksum,
        issuedByUserId: actorId || null,
        issuedAt,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        idempotencyKey: input.idempotencyKey || null,
      },
      include: {
        person: true,
        employment: true,
        templateVersion: true,
      },
    });

    return issue;
  });

  // 7. Audit Event
  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.CARD_ISSUED,
    entityType: 'card_issue',
    entityId: createdIssue.id,
    details: {
      cardSerial,
      issueNumber,
      issueReason: createdIssue.issueReason,
      employeeNumber: employment.employeeNumber,
      templateVersionId,
    },
    ipAddress,
  });

  return createdIssue;
}

/**
 * Requests a replacement reprint with mandatory reason and lineage tracking
 */
export async function reprintCard(
  tenantId: string,
  issueId: string,
  input: ReprintCardRequest,
  actorId?: string,
  ipAddress?: string,
) {
  // Idempotency Check
  if (input.idempotencyKey) {
    const existing = await prisma.cardIssue.findFirst({
      where: { tenantId, idempotencyKey: input.idempotencyKey },
      include: { person: true, employment: true, templateVersion: true },
    });
    if (existing) return existing;
  }

  const previousIssue = await prisma.cardIssue.findFirst({
    where: { id: issueId, tenantId },
    include: {
      employment: {
        include: {
          person: {
            include: { photoMedia: true },
          },
          organization: true,
          location: true,
          orgUnit: true,
        },
      },
      templateVersion: true,
    },
  });

  if (!previousIssue) {
    throw new CardIssueError('Target card issue not found.', 404);
  }

  if (previousIssue.status === CardIssueStatus.REVOKED) {
    throw new CardIssueError(
      'Cannot reprint a revoked card. A fresh card issue must be initiated.',
      400,
    );
  }

  const { employment } = previousIssue;
  const readiness = await checkCardReadiness(tenantId, employment.id);
  if (!readiness.isReady) {
    throw new CardIssueError(
      'Card reprint blocked: worker record failed preflight checks.',
      400,
      readiness.blockers,
    );
  }

  // Resolve template layout
  let templateVersionId = previousIssue.templateVersionId;
  let layout = previousIssue.layoutSnapshot as unknown as CardLayoutSpecification;
  let templateChecksum = previousIssue.templateChecksum;

  if (input.templateId) {
    const tpl = await prisma.cardTemplate.findFirst({
      where: { id: input.templateId, tenantId, isArchived: false },
      include: {
        versions: {
          where: { status: TemplateVersionStatus.PUBLISHED },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (tpl && tpl.versions.length > 0) {
      const v = tpl.versions[0]!;
      templateVersionId = v.id;
      layout = v.layout as unknown as CardLayoutSpecification;
      templateChecksum = v.checksumSha256 || computeLayoutChecksum(layout);
    }
  }

  const cardSerial = await generateCardSerial(tenantId);
  const nextIssueNumber = previousIssue.issueNumber + 1;
  const issuedAt = new Date();

  const printedSnapshot = createPrintedSnapshot({
    person: {
      id: employment.person.id,
      displayName: employment.person.displayName,
      displayNameLatin: employment.person.displayNameLatin,
      displayNameNative: employment.person.displayNameNative,
      bloodGroup: employment.person.bloodGroup,
      primaryPhone: employment.person.primaryPhone,
      photoMediaId: employment.person.photoMediaId,
    },
    employment: {
      id: employment.id,
      employeeNumber: employment.employeeNumber,
      jobTitle: employment.jobTitle,
      jobCategory: employment.jobCategory,
      orgUnitName: employment.orgUnit?.name,
      locationName: employment.location?.name,
      joinDate: employment.joinDate,
    },
    organization: {
      id: employment.organization.id,
      name: employment.organization.name,
      displayName: employment.organization.displayName,
      code: employment.organization.code,
      logoPath: employment.organization.logoPath,
      primaryColor: employment.organization.primaryColor,
      secondaryColor: employment.organization.secondaryColor,
      accentColor: employment.organization.accentColor,
    },
    card: {
      serialNumber: cardSerial,
      issueNumber: nextIssueNumber,
      issuedAt: issuedAt.toISOString(),
      formatPreset: layout.presetId,
      widthMm: layout.dimensions.widthMm,
      heightMm: layout.dimensions.heightMm,
      orientation: layout.dimensions.orientation,
    },
    photoChecksumSha256: employment.person.photoMedia?.checksumSha256,
  });

  const newIssue = await prisma.$transaction(async (tx) => {
    // 1. Mark previous active issues as REPLACED and isCurrent = false
    await tx.cardIssue.updateMany({
      where: {
        tenantId,
        employmentId: employment.id,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        status: CardIssueStatus.REPLACED,
      },
    });

    // 2. Create replacement card issue with previousIssueId link
    const created = await tx.cardIssue.create({
      data: {
        tenantId,
        personId: employment.person.id,
        employmentId: employment.id,
        templateVersionId,
        cardSerial,
        issueNumber: nextIssueNumber,
        issueReason: input.reason as any,
        reasonNotes: input.reasonNotes,
        status: CardIssueStatus.ISSUED,
        isCurrent: true,
        printedSnapshot: printedSnapshot as any,
        layoutSnapshot: layout as any,
        templateChecksum,
        previousIssueId: previousIssue.id,
        issuedByUserId: actorId || null,
        issuedAt,
        idempotencyKey: input.idempotencyKey || null,
      },
      include: {
        person: true,
        employment: true,
        templateVersion: true,
        previousIssue: true,
      },
    });

    return created;
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.CARD_REPRINTED,
    entityType: 'card_issue',
    entityId: newIssue.id,
    details: {
      newCardSerial: cardSerial,
      previousCardSerial: previousIssue.cardSerial,
      issueNumber: nextIssueNumber,
      reprintReason: input.reason,
      employeeNumber: employment.employeeNumber,
    },
    ipAddress,
  });

  return newIssue;
}

/**
 * Revokes an issued credential with mandatory reason without deleting historical records
 */
export async function revokeCard(
  tenantId: string,
  issueId: string,
  input: RevokeCardRequest,
  actorId?: string,
  ipAddress?: string,
) {
  const issue = await prisma.cardIssue.findFirst({
    where: { id: issueId, tenantId },
    include: { employment: true },
  });

  if (!issue) {
    throw new CardIssueError('Card issue record not found.', 404);
  }

  if (issue.status === CardIssueStatus.REVOKED) {
    throw new CardIssueError('Card is already revoked.', 400);
  }

  const revoked = await prisma.cardIssue.update({
    where: { id: issue.id },
    data: {
      status: CardIssueStatus.REVOKED,
      isCurrent: false,
      revokedAt: new Date(),
      revokedByUserId: actorId || null,
      revocationReason: input.reason as any,
      revocationNotes: input.reasonNotes,
    },
    include: {
      person: true,
      employment: true,
      templateVersion: true,
    },
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.CARD_REVOKED,
    entityType: 'card_issue',
    entityId: revoked.id,
    details: {
      cardSerial: revoked.cardSerial,
      revocationReason: input.reason,
      employeeNumber: issue.employment.employeeNumber,
    },
    ipAddress,
  });

  return revoked;
}

/**
 * Lists card issues with server-side pagination, search, and filtering
 */
export async function listCardIssues(tenantId: string, query: CardIssueQuery) {
  const {
    page = 1,
    limit = 25,
    search,
    personId,
    employmentId,
    organizationId,
    status,
    isCurrent,
    sortBy = 'createdAt',
    sortDirection = 'desc',
  } = query;

  const skip = (page - 1) * limit;

  const where: any = {
    tenantId,
  };

  if (personId) where.personId = personId;
  if (employmentId) where.employmentId = employmentId;
  if (status) where.status = status;
  if (isCurrent !== undefined) where.isCurrent = isCurrent === 'true';

  if (organizationId) {
    where.employment = { organizationId };
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { cardSerial: { contains: term, mode: 'insensitive' } },
      { person: { displayName: { contains: term, mode: 'insensitive' } } },
      { person: { displayNameLatin: { contains: term, mode: 'insensitive' } } },
      { person: { displayNameNative: { contains: term, mode: 'insensitive' } } },
      { employment: { employeeNumber: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.cardIssue.count({ where }),
    prisma.cardIssue.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortDirection },
      include: {
        person: {
          select: {
            id: true,
            displayName: true,
            displayNameLatin: true,
            displayNameNative: true,
          },
        },
        employment: {
          select: {
            id: true,
            employeeNumber: true,
            jobTitle: true,
            status: true,
          },
        },
        templateVersion: {
          select: {
            id: true,
            versionNumber: true,
            template: {
              select: { id: true, name: true, presetId: true },
            },
          },
        },
        issuedByUser: {
          select: { id: true, username: true },
        },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Gets a single card issue by ID with full lineage history
 */
export async function getCardIssueById(tenantId: string, issueId: string) {
  const issue = await prisma.cardIssue.findFirst({
    where: { id: issueId, tenantId },
    include: {
      person: {
        include: {
          photoMedia: true,
        },
      },
      employment: {
        include: {
          organization: true,
          location: true,
          orgUnit: true,
        },
      },
      templateVersion: {
        include: {
          template: true,
        },
      },
      issuedByUser: {
        select: { id: true, username: true },
      },
      revokedByUser: {
        select: { id: true, username: true },
      },
      previousIssue: true,
      nextIssues: true,
    },
  });

  if (!issue) {
    throw new CardIssueError('Card issue not found.', 404);
  }

  return issue;
}

/**
 * Renders the single exact physical PDF master for an issued badge
 */
export async function renderCardIssuePdfBuffer(tenantId: string, issueId: string) {
  const issue = await getCardIssueById(tenantId, issueId);

  const renderer = new CardRenderer();
  const rawSnap = issue.printedSnapshot as any;
  const layout = issue.layoutSnapshot as unknown as CardLayoutSpecification;

  // Embed base64 data URI for zero-trust renderer worker
  let photoBase64: string | null = null;
  if (issue.person?.photoMedia?.storageKeyCardReady || issue.person?.photoMedia?.storageKeyMaster) {
    const key =
      issue.person.photoMedia.storageKeyCardReady || issue.person.photoMedia.storageKeyMaster;
    const photoData = await getPhotoBuffer(key, tenantId);
    if (photoData) {
      photoBase64 = `data:${photoData.mimeType};base64,${photoData.buffer.toString('base64')}`;
    }
  }

  const worker: CardRenderWorkerPayload = {
    displayName: rawSnap?.worker?.displayName || issue.person?.displayName || 'Worker',
    displayNameLatin: rawSnap?.worker?.displayNameLatin || issue.person?.displayNameLatin || null,
    displayNameNative:
      rawSnap?.worker?.displayNameNative || issue.person?.displayNameNative || null,
    jobTitle: rawSnap?.worker?.jobTitle || issue.employment?.jobTitle || '',
    department: rawSnap?.worker?.department || '',
    employeeNumber: rawSnap?.worker?.employeeNumber || issue.employment?.employeeNumber || '',
    bloodGroup: rawSnap?.worker?.bloodGroup || null,
    joinDate: rawSnap?.worker?.joinDate || '2026-01-01',
    emergencyContact: rawSnap?.worker?.emergencyContact || null,
    photoUrl: photoBase64 || (rawSnap?.worker?.photoMediaId ? `/api/people/${issue.personId}/photo` : null),
    photoBase64,
    orgName: rawSnap?.organization?.displayName || rawSnap?.organization?.name || 'Company',
    orgNameBangla:
      rawSnap?.organization?.displayName || rawSnap?.organization?.name || 'প্রতিষ্ঠান',
    serialNumber: issue.cardSerial,
  };

  const result = await renderer.renderCardPdf({
    layout,
    worker,
    side: 'duplex',
    templateVersionId: issue.templateVersionId,
  });

  return {
    buffer: result.buffer,
    checksumSha256: result.checksumSha256,
    pageCount: result.pageCount,
    cardSerial: issue.cardSerial,
  };
}
