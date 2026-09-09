import { prisma } from '@hr/db';
import {
  PrintJobStatus,
  PrintJobItemStatus,
  PrintOutputFormat,
  PrintJobSide,
  OperatorPrintStatus,
  CardIssueStatus,
  CardIssueReason,
  AuditAction,
  CardLayoutSpecification,
} from '@hr/domain';
import { createPrintedSnapshot, CardRenderWorkerPayload } from '@hr/card-kit';
import { CardRenderer } from '@hr/card-kit/renderer';
import { CreatePrintJobRequest, ConfirmPrintJobRequest, PrintJobQuery } from '@hr/schemas';
import { checkCardReadiness } from './card-readiness.service.js';
import { generateCardSerial } from './card-issue.service.js';
import { computeLayoutChecksum } from './template.service.js';
import { recordAuditEvent } from './audit.service.js';
import { getPhotoBuffer } from './photo-processing.service.js';

export class PrintJobError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public issues?: any[],
  ) {
    super(message);
    this.name = 'PrintJobError';
  }
}

/**
 * Creates and enqueues a batch print job with deterministic item ordering
 */
export async function createPrintJob(
  tenantId: string,
  input: CreatePrintJobRequest,
  actorId?: string,
  ipAddress?: string,
) {
  // 1. Idempotency Check
  if (input.idempotencyKey) {
    const existing = await prisma.printJob.findFirst({
      where: { tenantId, idempotencyKey: input.idempotencyKey },
      include: {
        items: {
          include: {
            cardIssue: {
              include: { person: true, employment: true },
            },
          },
        },
      },
    });
    if (existing) return existing;
  }

  // 2. Fetch and Validate All Employments
  const employments = await prisma.employment.findMany({
    where: {
      tenantId,
      id: { in: input.employmentIds },
    },
    include: {
      person: {
        include: { photoMedia: true },
      },
      organization: true,
      location: true,
      orgUnit: true,
    },
  });

  if (employments.length !== input.employmentIds.length) {
    throw new PrintJobError(
      'One or more specified employments were not found in this tenant.',
      400,
    );
  }

  // Preserve the exact order of requested IDs
  const orderedEmployments = input.employmentIds.map((id) => employments.find((e) => e.id === id)!);

  // 3. Preflight readiness for each worker & prepare card issue drafts
  const preparedItems: Array<{
    employment: (typeof employments)[0];
    templateVersionId: string;
    layout: CardLayoutSpecification;
    templateChecksum: string;
    cardSerial: string;
    issueNumber: number;
    printedSnapshot: any;
  }> = [];

  for (const emp of orderedEmployments) {
    const readiness = await checkCardReadiness(tenantId, emp.id);
    if (!readiness.isReady) {
      throw new PrintJobError(
        `Print job creation blocked: Worker ${emp.employeeNumber} (${emp.person.displayName}) failed preflight checks.`,
        400,
        readiness.blockers,
      );
    }

    if (!readiness.resolvedTemplate) {
      throw new PrintJobError(
        `No published card template found for worker ${emp.employeeNumber}.`,
        400,
      );
    }

    const templateVersionId = readiness.resolvedTemplate.versionId;
    const layout = readiness.resolvedTemplate.layout;
    const templateChecksum = computeLayoutChecksum(layout);
    const baseSerial = await generateCardSerial(tenantId);
    const cardSerial = `${baseSerial}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const priorCount = await prisma.cardIssue.count({
      where: { tenantId, employmentId: emp.id },
    });
    const issueNumber = priorCount + 1;
    const issuedAt = new Date();

    const printedSnapshot = createPrintedSnapshot({
      person: {
        id: emp.person.id,
        displayName: emp.person.displayName,
        displayNameLatin: emp.person.displayNameLatin,
        displayNameNative: emp.person.displayNameNative,
        bloodGroup: emp.person.bloodGroup,
        primaryPhone: emp.person.primaryPhone,
        photoMediaId: emp.person.photoMediaId,
      },
      employment: {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        jobTitle: emp.jobTitle,
        jobCategory: emp.jobCategory,
        orgUnitName: emp.orgUnit?.name,
        locationName: emp.location?.name,
        joinDate: emp.joinDate,
      },
      organization: {
        id: emp.organization.id,
        name: emp.organization.name,
        displayName: emp.organization.displayName,
        code: emp.organization.code,
        logoPath: emp.organization.logoPath,
        primaryColor: emp.organization.primaryColor,
        secondaryColor: emp.organization.secondaryColor,
        accentColor: emp.organization.accentColor,
      },
      card: {
        serialNumber: cardSerial,
        issueNumber,
        issuedAt: issuedAt.toISOString(),
        formatPreset: layout.presetId,
        widthMm: layout.dimensions.widthMm,
        heightMm: layout.dimensions.heightMm,
        orientation: layout.dimensions.orientation,
      },
      photoChecksumSha256: emp.person.photoMedia?.checksumSha256,
    });

    preparedItems.push({
      employment: emp,
      templateVersionId,
      layout,
      templateChecksum,
      cardSerial,
      issueNumber,
      printedSnapshot,
    });
  }

  // 4. Atomic Transaction: Create CardIssue records and PrintJob container
  const createdJob = await prisma.$transaction(async (tx) => {
    const job = await tx.printJob.create({
      data: {
        tenantId,
        status: PrintJobStatus.QUEUED,
        outputFormat: input.outputFormat,
        side: input.side,
        totalItems: preparedItems.length,
        operatorStatus: OperatorPrintStatus.UNCONFIRMED,
        idempotencyKey: input.idempotencyKey || null,
        createdByUserId: actorId || null,
      },
    });

    for (let i = 0; i < preparedItems.length; i++) {
      const item = preparedItems[i]!;

      // Create draft card issue record
      const cardIssue = await tx.cardIssue.create({
        data: {
          tenantId,
          personId: item.employment.person.id,
          employmentId: item.employment.id,
          templateVersionId: item.templateVersionId,
          cardSerial: item.cardSerial,
          issueNumber: item.issueNumber,
          issueReason: CardIssueReason.INITIAL,
          status: CardIssueStatus.RENDER_READY,
          isCurrent: false, // will become true upon operator confirmation
          printedSnapshot: item.printedSnapshot as any,
          layoutSnapshot: item.layout as any,
          templateChecksum: item.templateChecksum,
          issuedByUserId: actorId || null,
        },
      });

      // Create print job item with deterministic item index
      await tx.printJobItem.create({
        data: {
          tenantId,
          printJobId: job.id,
          cardIssueId: cardIssue.id,
          itemIndex: i,
          status: PrintJobItemStatus.PENDING,
          copies: input.copiesPerCard || 1,
        },
      });
    }

    return tx.printJob.findUnique({
      where: { id: job.id },
      include: {
        items: {
          orderBy: { itemIndex: 'asc' },
          include: {
            cardIssue: {
              include: {
                person: true,
                employment: true,
              },
            },
          },
        },
      },
    });
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.PRINT_JOB_CREATED,
    entityType: 'print_job',
    entityId: createdJob!.id,
    details: {
      totalItems: preparedItems.length,
      outputFormat: input.outputFormat,
      side: input.side,
    },
    ipAddress,
  });

  return createdJob!;
}

/**
 * Records physical operator print outcome and optionally activates issued cards
 */
export async function confirmPrintJob(
  tenantId: string,
  jobId: string,
  input: ConfirmPrintJobRequest,
  actorId?: string,
  ipAddress?: string,
) {
  const job = await prisma.printJob.findFirst({
    where: { id: jobId, tenantId },
    include: {
      items: {
        include: {
          cardIssue: true,
        },
      },
    },
  });

  if (!job) {
    throw new PrintJobError('Print job not found.', 404);
  }

  const defectiveSet = new Set(input.defectiveItemIds || []);
  const confirmedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update PrintJob status
    const updatedJob = await tx.printJob.update({
      where: { id: job.id },
      data: {
        operatorStatus: input.status as any,
        confirmedByUserId: actorId || null,
        confirmedAt,
        confirmationNotes: input.notes || null,
      },
    });

    // 2. Process items
    for (const item of job.items) {
      const isDefective = defectiveSet.has(item.id);

      if (isDefective || input.status === 'REJECTED_DEFECT') {
        await tx.printJobItem.update({
          where: { id: item.id },
          data: {
            status: PrintJobItemStatus.FAILED,
            errorMessage: 'Marked defective by operator.',
          },
        });
      } else {
        await tx.printJobItem.update({
          where: { id: item.id },
          data: {
            status: PrintJobItemStatus.RENDERED,
          },
        });

        // If operator confirmed and autoActivate is requested, activate CardIssue
        if (input.status === 'CONFIRMED_PRINTED' && input.autoActivateIssues) {
          // Deactivate prior active card for this employment
          await tx.cardIssue.updateMany({
            where: {
              tenantId,
              employmentId: item.cardIssue.employmentId,
              isCurrent: true,
              id: { not: item.cardIssue.id },
            },
            data: {
              isCurrent: false,
              status: CardIssueStatus.REPLACED,
            },
          });

          // Activate new card
          await tx.cardIssue.update({
            where: { id: item.cardIssue.id },
            data: {
              status: CardIssueStatus.ISSUED,
              isCurrent: true,
              issuedAt: confirmedAt,
              issuedByUserId: actorId || null,
            },
          });
        }
      }
    }

    return tx.printJob.findUnique({
      where: { id: job.id },
      include: {
        items: {
          orderBy: { itemIndex: 'asc' },
          include: {
            cardIssue: {
              include: { person: true, employment: true },
            },
          },
        },
      },
    });
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.PRINT_JOB_CONFIRMED,
    entityType: 'print_job',
    entityId: job.id,
    details: {
      operatorStatus: input.status,
      notes: input.notes,
      totalItems: job.items.length,
      defectiveCount: defectiveSet.size,
    },
    ipAddress,
  });

  return updated!;
}

/**
 * Lists print jobs with pagination and status filters
 */
export async function listPrintJobs(tenantId: string, query: PrintJobQuery) {
  const { page = 1, limit = 25, status, operatorStatus } = query;
  const skip = (page - 1) * limit;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (operatorStatus) where.operatorStatus = operatorStatus;

  const [total, items] = await Promise.all([
    prisma.printJob.count({ where }),
    prisma.printJob.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { id: true, username: true } },
        confirmedByUser: { select: { id: true, username: true } },
        _count: { select: { items: true } },
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
 * Gets a single print job by ID with all item details
 */
export async function getPrintJobById(tenantId: string, jobId: string) {
  const job = await prisma.printJob.findFirst({
    where: { id: jobId, tenantId },
    include: {
      createdByUser: { select: { id: true, username: true } },
      confirmedByUser: { select: { id: true, username: true } },
      items: {
        orderBy: { itemIndex: 'asc' },
        include: {
          cardIssue: {
            include: {
              person: {
                select: {
                  id: true,
                  displayName: true,
                  displayNameLatin: true,
                  displayNameNative: true,
                  photoMedia: true,
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
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new PrintJobError('Print job not found.', 404);
  }

  return job;
}

/**
 * Renders the batch PDF buffer for a print job
 */
export async function renderPrintJobPdfBuffer(tenantId: string, jobId: string) {
  const job = await getPrintJobById(tenantId, jobId);

  if (job.items.length === 0) {
    throw new PrintJobError('This print job has no badge items to render.', 400);
  }

  const renderer = new CardRenderer();

  // Map each item to CardRenderer input with embedded base64 photos
  const items = await Promise.all(
    job.items.map(async (item) => {
      const rawSnap = item.cardIssue.printedSnapshot as any;
      const layout = item.cardIssue.layoutSnapshot as unknown as CardLayoutSpecification;

      let photoBase64: string | null = null;
      if (item.cardIssue.person?.photoMedia?.storageKeyCardReady || item.cardIssue.person?.photoMedia?.storageKeyMaster) {
        const key =
          item.cardIssue.person.photoMedia.storageKeyCardReady ||
          item.cardIssue.person.photoMedia.storageKeyMaster;
        const photoData = await getPhotoBuffer(key, tenantId);
        if (photoData) {
          photoBase64 = `data:${photoData.mimeType};base64,${photoData.buffer.toString('base64')}`;
        }
      }

      const worker: CardRenderWorkerPayload = {
        displayName: rawSnap?.worker?.displayName || item.cardIssue.person?.displayName || 'Worker',
        displayNameLatin:
          rawSnap?.worker?.displayNameLatin || item.cardIssue.person?.displayNameLatin || null,
        displayNameNative:
          rawSnap?.worker?.displayNameNative || item.cardIssue.person?.displayNameNative || null,
        jobTitle: rawSnap?.worker?.jobTitle || item.cardIssue.employment?.jobTitle || '',
        department: rawSnap?.worker?.department || '',
        employeeNumber:
          rawSnap?.worker?.employeeNumber || item.cardIssue.employment?.employeeNumber || '',
        bloodGroup: rawSnap?.worker?.bloodGroup || null,
        joinDate: rawSnap?.worker?.joinDate || '2026-01-01',
        emergencyContact: rawSnap?.worker?.emergencyContact || null,
        photoUrl: photoBase64 || (rawSnap?.worker?.photoMediaId
          ? `/api/people/${item.cardIssue.personId}/photo`
          : null),
        photoBase64,
        orgName: rawSnap?.organization?.displayName || rawSnap?.organization?.name || 'Company',
        orgNameBangla:
          rawSnap?.organization?.displayName || rawSnap?.organization?.name || 'প্রতিষ্ঠান',
        serialNumber: item.cardIssue.cardSerial,
      };

      return {
        layout,
        worker,
      };
    }),
  );

  const side = job.side === 'FRONT' ? 'front' : job.side === 'BACK' ? 'back' : 'duplex';

  const result = await renderer.renderBatchCardPdf({
    items,
    side,
  });

  return {
    buffer: result.buffer,
    checksumSha256: result.checksumSha256,
    totalCards: result.totalCards,
    pageCount: result.pageCount,
  };
}

/**
 * Cancels a pending or queued print job
 */
export async function cancelPrintJob(
  tenantId: string,
  jobId: string,
  actorId?: string,
  ipAddress?: string,
) {
  const job = await prisma.printJob.findFirst({
    where: { id: jobId, tenantId },
  });

  if (!job) {
    throw new PrintJobError('Print job not found.', 404);
  }

  if (job.status === PrintJobStatus.COMPLETED) {
    throw new PrintJobError('Cannot cancel a print job that has already completed.', 400);
  }

  const updated = await prisma.printJob.update({
    where: { id: jobId },
    data: {
      status: PrintJobStatus.CANCELLED,
    },
  });

  await recordAuditEvent({
    tenantId,
    actorId: actorId || null,
    action: AuditAction.PRINT_JOB_CANCELLED as any,
    entityType: 'print_job',
    entityId: job.id,
    details: {
      previousStatus: job.status,
    },
    ipAddress,
  });

  return updated;
}

/**
 * Aggregates summary statistics for the card operations overview hub
 */
export async function getCardOperationsStats(tenantId: string) {
  const [
    totalEmployments,
    employmentsWithPhoto,
    queuedJobs,
    totalActiveBadges,
    totalRevokedBadges,
  ] = await Promise.all([
    prisma.employment.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'PREBOARDING'] },
      },
    }),
    prisma.employment.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'PREBOARDING'] },
        person: {
          photoMediaId: { not: null },
        },
      },
    }),
    prisma.printJob.count({
      where: {
        tenantId,
        status: { in: [PrintJobStatus.QUEUED, PrintJobStatus.PROCESSING] },
      },
    }),
    prisma.cardIssue.count({
      where: {
        tenantId,
        status: CardIssueStatus.ISSUED,
        isCurrent: true,
      },
    }),
    prisma.cardIssue.count({
      where: {
        tenantId,
        status: CardIssueStatus.REVOKED,
      },
    }),
  ]);

  const readyToPrintCount = employmentsWithPhoto;
  const needsAttentionCount = Math.max(0, totalEmployments - employmentsWithPhoto);

  return {
    readyToPrintCount,
    needsAttentionCount,
    queuedJobsCount: queuedJobs,
    totalActiveBadgesCount: totalActiveBadges,
    totalRevokedCount: totalRevokedBadges,
  };
}
