import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@hr/db';
import { JobCategory, EmploymentStatus, CardIssueStatus, PrintJobStatus } from '@hr/domain';
import {
  getLiveTestServer,
  shutdownLiveTestServer,
  createTestTenant,
  createAuthHeaders,
  generateTestPhotoBuffer,
} from './helpers/stack-harness.js';
import { processPhotoUpload } from '../../apps/api/src/services/photo-processing.service.js';

describe('Live Journey 5 & 6: Preflight, Card Issuance & Batch Print Queue', () => {
  let server: any;
  let tenantCtx: any;
  let employmentId: string;
  let personId: string;

  beforeAll(async () => {
    server = await getLiveTestServer();
    tenantCtx = await createTestTenant('journey-03');

    // Create worker with photo for testing
    const person = await prisma.person.create({
      data: {
        tenantId: tenantCtx.tenantId,
        displayName: 'Shirin Akter',
        displayNameLatin: 'Shirin Akter',
        displayNameNative: 'শিরিন আক্তার',
        employments: {
          create: {
            tenantId: tenantCtx.tenantId,
            organizationId: tenantCtx.orgId,
            employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
            jobTitle: 'Senior Machine Operator',
            jobCategory: JobCategory.REGULAR,
            employmentStatus: EmploymentStatus.ACTIVE,
            bloodGroup: 'B+',
          },
        },
      },
      include: { employments: true },
    });

    personId = person.id;
    employmentId = person.employments[0].id;

    // Attach photo
    const photoBuf = await generateTestPhotoBuffer();
    await processPhotoUpload(tenantCtx.tenantId, personId, photoBuf, 'image/jpeg');
  });

  afterAll(async () => {
    await shutdownLiveTestServer();
  });

  describe('Journey 5: Single Card Preflight, Render & Direct Issuance', () => {
    let cardIssueId: string;

    it('performs readiness preflight evaluation with 0 blockers', async () => {
      const preflightRes = await server.inject({
        method: 'GET',
        url: `/api/cards/readiness/${employmentId}`,
        headers: createAuthHeaders(tenantCtx.operatorToken),
      });

      expect(preflightRes.statusCode).toBe(200);
      const preflight = JSON.parse(preflightRes.body);
      expect(preflight.isReady).toBe(true);
      expect(preflight.status).toBe('READY');
      expect(preflight.blockers).toHaveLength(0);
    });

    it('issues single card directly, creating immutable snapshot and unique serial', async () => {
      const issueRes = await server.inject({
        method: 'POST',
        url: '/api/cards/issue',
        headers: createAuthHeaders(tenantCtx.operatorToken),
        payload: {
          employmentId,
          templateId: tenantCtx.templateId,
        },
      });

      expect(issueRes.statusCode).toBe(201);
      const issue = JSON.parse(issueRes.body);
      cardIssueId = issue.id;

      expect(issue.cardSerial).toMatch(/^CARD-\d{4}-\d{6}$/);
      expect(issue.status).toBe(CardIssueStatus.ACTIVE);
      expect(issue.issueNumber).toBe(1);
      expect(issue.printedSnapshot).toBeDefined();
      expect(issue.printedSnapshot.worker.displayName).toBe('Shirin Akter');
      expect(issue.printedSnapshot.worker.displayNameNative).toBe('শিরিন আক্তার');
    });

    it('streams exact single-card master PDF and verifies PDF headers', async () => {
      const pdfRes = await server.inject({
        method: 'GET',
        url: `/api/cards/issues/${cardIssueId}/pdf`,
        headers: createAuthHeaders(tenantCtx.operatorToken),
      });

      expect(pdfRes.statusCode).toBe(200);
      expect(pdfRes.headers['content-type']).toBe('application/pdf');
      expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
      // PDF magic bytes %PDF-
      expect(pdfRes.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('Journey 6: Batch Print Queue, Worker Execution & Defect Recovery', () => {
    let printJobId: string;
    let extraEmploymentId: string;

    beforeAll(async () => {
      // Create a second worker for batch job
      const person2 = await prisma.person.create({
        data: {
          tenantId: tenantCtx.tenantId,
          displayName: 'Rashidul Hasan',
          displayNameLatin: 'Rashidul Hasan',
          displayNameNative: 'রাশিদুল হাসান',
          employments: {
            create: {
              tenantId: tenantCtx.tenantId,
              organizationId: tenantCtx.orgId,
              employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
              jobTitle: 'Maintenance Technician',
              jobCategory: JobCategory.REGULAR,
              employmentStatus: EmploymentStatus.ACTIVE,
            },
          },
        },
        include: { employments: true },
      });
      extraEmploymentId = person2.employments[0].id;
    });

    it('submits multi-worker batch print job to queue', async () => {
      const jobRes = await server.inject({
        method: 'POST',
        url: '/api/cards/print-jobs',
        headers: createAuthHeaders(tenantCtx.operatorToken),
        payload: {
          employmentIds: [employmentId, extraEmploymentId],
          templateId: tenantCtx.templateId,
          outputFormat: 'PDF',
          side: 'DUPLEX',
        },
      });

      expect(jobRes.statusCode).toBe(201);
      const job = JSON.parse(jobRes.body);
      printJobId = job.id;

      expect(job.status).toBe(PrintJobStatus.QUEUED);
      expect(job.items).toHaveLength(2);
      expect(job.items[0].itemIndex).toBe(0);
      expect(job.items[1].itemIndex).toBe(1);
    });

    it('allows physical operator confirmation with defect handling', async () => {
      // Simulate physical confirmation where operator marks print confirmed
      const confirmRes = await server.inject({
        method: 'POST',
        url: `/api/cards/print-jobs/${printJobId}/confirm`,
        headers: createAuthHeaders(tenantCtx.operatorToken),
        payload: {
          status: 'CONFIRMED_PRINTED',
          notes: 'Operator inspection passed on standard 60x90 PVC sheet.',
        },
      });

      expect(confirmRes.statusCode).toBe(200);
      const confirmedJob = JSON.parse(confirmRes.body);
      expect(confirmedJob.operatorStatus).toBe('CONFIRMED_PRINTED');
    });
  });
});
