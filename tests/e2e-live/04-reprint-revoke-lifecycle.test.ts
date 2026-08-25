import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@hr/db';
import {
  JobCategory,
  EmploymentStatus,
  CardIssueStatus,
  CardIssueReason,
  CardRevocationReason,
} from '@hr/domain';
import {
  getLiveTestServer,
  shutdownLiveTestServer,
  createTestTenant,
  createAuthHeaders,
  generateTestPhotoBuffer,
} from './helpers/stack-harness.js';
import { processPhotoUpload } from '../../apps/api/src/services/photo-processing.service.js';

describe('Live Journey 7: Replacement Reprint Lineage & Revocation Audit', () => {
  let server: any;
  let tenantCtx: any;
  let employmentId: string;
  let firstIssueId: string;
  let firstSerial: string;

  beforeAll(async () => {
    server = await getLiveTestServer();
    tenantCtx = await createTestTenant('journey-04');

    // Create worker with photo
    const person = await prisma.person.create({
      data: {
        tenantId: tenantCtx.tenantId,
        displayName: 'Kamrul Hasan',
        displayNameLatin: 'Kamrul Hasan',
        displayNameNative: 'কামরুল হাসান',
        employments: {
          create: {
            tenantId: tenantCtx.tenantId,
            organizationId: tenantCtx.orgId,
            employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
            jobTitle: 'Cutting Master',
            jobCategory: JobCategory.REGULAR,
            employmentStatus: EmploymentStatus.ACTIVE,
            bloodGroup: 'A+',
          },
        },
      },
      include: { employments: true },
    });

    employmentId = person.employments[0].id;
    const photoBuf = await generateTestPhotoBuffer();
    await processPhotoUpload(tenantCtx.tenantId, person.id, photoBuf, 'image/jpeg');

    // Initial card issue
    const initialIssueRes = await server.inject({
      method: 'POST',
      url: '/api/cards/issue',
      headers: createAuthHeaders(tenantCtx.operatorToken),
      payload: {
        employmentId,
        templateId: tenantCtx.templateId,
      },
    });

    const initialIssue = JSON.parse(initialIssueRes.body);
    firstIssueId = initialIssue.id;
    firstSerial = initialIssue.cardSerial;
  });

  afterAll(async () => {
    await shutdownLiveTestServer();
  });

  it('rejects reprint request when mandatory reason is missing', async () => {
    const invalidRes = await server.inject({
      method: 'POST',
      url: `/api/cards/issues/${firstIssueId}/reprint`,
      headers: createAuthHeaders(tenantCtx.operatorToken),
      payload: {},
    });

    expect(invalidRes.statusCode).toBe(400);
  });

  it('executes replacement reprint with mandatory reason and links historical lineage', async () => {
    const reprintRes = await server.inject({
      method: 'POST',
      url: `/api/cards/issues/${firstIssueId}/reprint`,
      headers: createAuthHeaders(tenantCtx.operatorToken),
      payload: {
        issueReason: CardIssueReason.LOST,
        reasonNotes: 'Badge lost during commute on factory transit.',
      },
    });

    expect(reprintRes.statusCode).toBe(200);
    const replacement = JSON.parse(reprintRes.body);

    expect(replacement.id).not.toBe(firstIssueId);
    expect(replacement.cardSerial).not.toBe(firstSerial);
    expect(replacement.issueNumber).toBe(2);
    expect(replacement.issueReason).toBe(CardIssueReason.LOST);
    expect(replacement.previousIssueId).toBe(firstIssueId);
    expect(replacement.status).toBe(CardIssueStatus.ACTIVE);

    // Verify historical card is marked REPLACED
    const historicalCard = await prisma.cardIssue.findUnique({
      where: { id: firstIssueId },
    });
    expect(historicalCard?.status).toBe(CardIssueStatus.REPLACED);
    expect(historicalCard?.issueNumber).toBe(1);
  });

  it('revokes active credential with security reason and audit trail', async () => {
    // Find active card for this employment
    const activeCard = await prisma.cardIssue.findFirst({
      where: { employmentId, status: CardIssueStatus.ACTIVE },
    });
    expect(activeCard).toBeDefined();

    const revokeRes = await server.inject({
      method: 'POST',
      url: `/api/cards/issues/${activeCard!.id}/revoke`,
      headers: createAuthHeaders(tenantCtx.ownerToken),
      payload: {
        revocationReason: CardRevocationReason.SEPARATED_EMPLOYEE,
        revocationNotes: 'Worker formally separated at end of contract.',
      },
    });

    expect(revokeRes.statusCode).toBe(200);
    const revoked = JSON.parse(revokeRes.body);
    expect(revoked.status).toBe(CardIssueStatus.REVOKED);
    expect(revoked.revokedAt).toBeDefined();
    expect(revoked.revocationReason).toBe(CardRevocationReason.SEPARATED_EMPLOYEE);

    // Verify audit event recorded
    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        tenantId: tenantCtx.tenantId,
        targetId: activeCard!.id,
      },
    });
    expect(auditEvent).toBeDefined();
  });
});
