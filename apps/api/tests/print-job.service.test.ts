import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  TemplatePresetId,
  EmploymentStatus,
  JobCategory,
  PrintJobStatus,
  PrintOutputFormat,
  PrintJobSide,
  OperatorPrintStatus,
  CardIssueStatus,
} from '@hr/domain';
import {
  createPrintJob,
  confirmPrintJob,
  listPrintJobs,
  getPrintJobById,
} from '../src/services/print-job.service.js';
import { createTemplate, publishTemplateVersion } from '../src/services/template.service.js';

describe('Phase 2: Print Job Queue & Operator Confirmation Service Tests', () => {
  let tenantId: string;
  let organizationId: string;
  let employmentId1: string;
  let employmentId2: string;

  beforeEach(async () => {
    const slug = `pjob-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Print Job Test Workspace' },
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
      name: 'Standard Badge Template',
      presetId: TemplatePresetId.CLASSIC_VERTICAL,
    });
    await publishTemplateVersion(tenantId, template.id, template.activeVersionId!);

    // Worker 1
    const p1 = await prisma.person.create({
      data: {
        tenantId,
        displayName: 'Rahim Uddin',
        bloodGroup: 'O+',
      },
    });
    const emp1 = await prisma.employment.create({
      data: {
        tenantId,
        personId: p1.id,
        organizationId,
        employeeNumber: 'EMP-9001',
        jobTitle: 'Pattern Cutter',
        jobCategory: JobCategory.WORKER,
        joinDate: new Date('2023-01-01'),
        status: EmploymentStatus.ACTIVE,
      },
    });
    employmentId1 = emp1.id;

    // Worker 2
    const p2 = await prisma.person.create({
      data: {
        tenantId,
        displayName: 'Karim Mollah',
        bloodGroup: 'B+',
      },
    });
    const emp2 = await prisma.employment.create({
      data: {
        tenantId,
        personId: p2.id,
        organizationId,
        employeeNumber: 'EMP-9002',
        jobTitle: 'Sewing Operator',
        jobCategory: JobCategory.WORKER,
        joinDate: new Date('2023-02-01'),
        status: EmploymentStatus.ACTIVE,
      },
    });
    employmentId2 = emp2.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  it('creates a batch print job with items in deterministic order', async () => {
    const job = await createPrintJob(tenantId, {
      employmentIds: [employmentId1, employmentId2],
      outputFormat: PrintOutputFormat.A4_SHEET,
      side: PrintJobSide.DUPLEX,
      copiesPerCard: 1,
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe(PrintJobStatus.QUEUED);
    expect(job.totalItems).toBe(2);
    expect(job.items).toHaveLength(2);

    expect(job.items![0]!.itemIndex).toBe(0);
    expect(job.items![0]!.cardIssue.employment.employeeNumber).toBe('EMP-9001');

    expect(job.items![1]!.itemIndex).toBe(1);
    expect(job.items![1]!.cardIssue.employment.employeeNumber).toBe('EMP-9002');
  });

  it('operator confirmation activates CardIssue records to ISSUED and isCurrent: true', async () => {
    const job = await createPrintJob(tenantId, {
      employmentIds: [employmentId1, employmentId2],
      outputFormat: PrintOutputFormat.A4_SHEET,
    });

    const confirmed = await confirmPrintJob(tenantId, job.id, {
      status: 'CONFIRMED_PRINTED',
      notes: 'All cards inspected and printed clearly on matte PVC.',
      autoActivateIssues: true,
    });

    expect(confirmed.operatorStatus).toBe(OperatorPrintStatus.CONFIRMED_PRINTED);

    // Verify both card issues are now ISSUED and isCurrent: true
    const card1 = await prisma.cardIssue.findFirst({
      where: { tenantId, employmentId: employmentId1 },
    });
    expect(card1?.status).toBe(CardIssueStatus.ISSUED);
    expect(card1?.isCurrent).toBe(true);

    const card2 = await prisma.cardIssue.findFirst({
      where: { tenantId, employmentId: employmentId2 },
    });
    expect(card2?.status).toBe(CardIssueStatus.ISSUED);
    expect(card2?.isCurrent).toBe(true);
  });

  it('idempotency key prevents duplicate batch print job enqueue', async () => {
    const idempotencyKey = `batch-idemp-${Date.now()}`;

    const job1 = await createPrintJob(tenantId, {
      employmentIds: [employmentId1],
      idempotencyKey,
    });

    const job2 = await createPrintJob(tenantId, {
      employmentIds: [employmentId1],
      idempotencyKey,
    });

    expect(job1.id).toBe(job2.id);

    const totalJobs = await prisma.printJob.count({ where: { tenantId } });
    expect(totalJobs).toBe(1);
  });
});
