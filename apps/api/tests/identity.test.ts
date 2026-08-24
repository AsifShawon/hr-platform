import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import { createPerson } from '../src/services/person.service.js';
import {
  upsertIdentityDocument,
  revealIdentityDocument,
  deleteIdentityDocument,
} from '../src/services/identity.service.js';
import { IdentityDocumentType, AuditAction } from '@hr/domain';

describe('Phase 4: Identity Document Encryption & Audited Reveal Flow', () => {
  let tenantId: string;
  let organizationId: string;
  let actorUserId: string;

  beforeEach(async () => {
    const slug = `identity-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Identity Test Workspace' },
    });
    tenantId = tenant.id;

    const org = await prisma.organization.create({
      data: {
        tenantId,
        name: 'London Boy Apparel Ltd.',
        code: `ORG_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      },
    });
    organizationId = org.id;

    const user = await prisma.user.create({
      data: {
        tenantId,
        username: `hr_officer_${Date.now()}`,
        passwordHash: 'dummy-hash',
        isActive: true,
      },
    });
    actorUserId = user.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  it('encrypts document number at rest and never exposes raw number in standard queries', async () => {
    const rawNid = '19882612345678901';

    const created = await createPerson(tenantId, {
      displayName: 'Tanvir Ahmed',
      employment: {
        organizationId,
        employeeNumber: 'EMP-ID-1',
        jobTitle: 'Manager',
        joinDate: '2022-01-01',
      },
      identityDocument: {
        documentType: IdentityDocumentType.SMART_NID,
        documentNumber: rawNid,
        country: 'BGD',
        isVerified: true,
      },
    });

    // Inspect database raw row
    const rawDbRow = await prisma.identityDocument.findFirst({
      where: { personId: created.person.id },
    });

    expect(rawDbRow).toBeDefined();
    expect(rawDbRow?.documentNumberEncrypted).not.toBe(rawNid);
    expect(rawDbRow?.documentNumberMasked).toBe('••••••••8901');

    // Reveal document
    const revealResult = await revealIdentityDocument(
      tenantId,
      rawDbRow!.id,
      actorUserId,
      '127.0.0.1',
    );

    expect(revealResult.documentNumber).toBe(rawNid);
    expect(revealResult.expiresInSeconds).toBe(30);

    // Verify audit trail entry was generated
    const auditLog = await prisma.auditEvent.findFirst({
      where: {
        tenantId,
        action: AuditAction.IDENTITY_REVEALED,
        entityId: rawDbRow!.id,
      },
    });

    expect(auditLog).toBeDefined();
    expect(auditLog?.actorId).toBe(actorUserId);
  });
});
