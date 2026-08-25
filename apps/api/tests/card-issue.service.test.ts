import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  TemplatePresetId,
  EmploymentStatus,
  JobCategory,
  CardIssueStatus,
  CardIssueReason,
  CardRevocationReason,
} from '@hr/domain';
import {
  issueCardDirect,
  reprintCard,
  revokeCard,
  listCardIssues,
  getCardIssueById,
  CardIssueError,
} from '../src/services/card-issue.service.js';
import { createTemplate, publishTemplateVersion } from '../src/services/template.service.js';

describe('Phase 2: Card Issuance & Reprint Lineage Service Tests', () => {
  let tenantId: string;
  let organizationId: string;
  let personId: string;
  let employmentId: string;

  beforeEach(async () => {
    const slug = `issue-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Card Issuance Test Workspace' },
    });
    tenantId = tenant.id;

    const org = await prisma.organization.create({
      data: {
        tenantId,
        name: 'Standard Industrial Ltd.',
        displayName: 'Standard Industrial',
        code: `IND_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      },
    });
    organizationId = org.id;

    // Create a published template
    const template = await createTemplate(tenantId, {
      organizationId,
      name: 'Standard Factory Badge',
      presetId: TemplatePresetId.CLASSIC_VERTICAL,
    });
    await publishTemplateVersion(tenantId, template.id, template.activeVersionId!);

    // Create person
    const person = await prisma.person.create({
      data: {
        tenantId,
        displayName: 'Kazi Nazrul Islam',
        displayNameLatin: 'Kazi Nazrul Islam',
        displayNameNative: 'কাজী নজরুল ইসলাম',
        bloodGroup: 'A+',
      },
    });
    personId = person.id;

    // Create employment
    const employment = await prisma.employment.create({
      data: {
        tenantId,
        personId,
        organizationId,
        employeeNumber: 'EMP-8001',
        jobTitle: 'Production Supervisor',
        jobCategory: JobCategory.STAFF,
        joinDate: new Date('2023-05-10'),
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

  it('directly issues a card with unique serial and isCurrent: true', async () => {
    const issue = await issueCardDirect(tenantId, {
      employmentId,
      issueReason: CardIssueReason.INITIAL,
    });

    expect(issue.id).toBeDefined();
    expect(issue.cardSerial).toMatch(/^CARD-\d{4}-\d{6}/);
    expect(issue.issueNumber).toBe(1);
    expect(issue.status).toBe(CardIssueStatus.ISSUED);
    expect(issue.isCurrent).toBe(true);
    expect((issue.printedSnapshot as any).worker.displayName).toBe('Kazi Nazrul Islam');
    expect((issue.printedSnapshot as any).worker.employeeNumber).toBe('EMP-8001');
    expect((issue.printedSnapshot as any).card.serialNumber).toBe(issue.cardSerial);
  });

  it('guarantees immutability: updating Person or Employment does not mutate printedSnapshot', async () => {
    const issue = await issueCardDirect(tenantId, {
      employmentId,
      issueReason: CardIssueReason.INITIAL,
    });

    // Worker gets promoted and changes display name
    await prisma.person.update({
      where: { id: personId },
      data: { displayName: 'Kazi N. Islam' },
    });

    await prisma.employment.update({
      where: { id: employmentId },
      data: { jobTitle: 'Assistant General Manager' },
    });

    const refetchedIssue = await getCardIssueById(tenantId, issue.id);

    // Snapshot retains historical truth
    expect((refetchedIssue.printedSnapshot as any).worker.displayName).toBe('Kazi Nazrul Islam');
    expect((refetchedIssue.printedSnapshot as any).worker.jobTitle).toBe('Production Supervisor');
  });

  it('reprints card: increments issueNumber, sets previousIssueId, and marks old card REPLACED', async () => {
    const issue1 = await issueCardDirect(tenantId, {
      employmentId,
      issueReason: CardIssueReason.INITIAL,
    });

    const issue2 = await reprintCard(tenantId, issue1.id, {
      reason: CardIssueReason.DAMAGED,
      reasonNotes: 'Card snapped in factory turnstile.',
    });

    expect(issue2.issueNumber).toBe(2);
    expect(issue2.previousIssueId).toBe(issue1.id);
    expect(issue2.status).toBe(CardIssueStatus.ISSUED);
    expect(issue2.isCurrent).toBe(true);
    expect(issue2.issueReason).toBe(CardIssueReason.DAMAGED);

    // Old issue #1 is now REPLACED and no longer current
    const oldIssue = await getCardIssueById(tenantId, issue1.id);
    expect(oldIssue.status).toBe(CardIssueStatus.REPLACED);
    expect(oldIssue.isCurrent).toBe(false);
  });

  it('revokes card: marks status REVOKED and isCurrent false without erasing row', async () => {
    const issue = await issueCardDirect(tenantId, {
      employmentId,
      issueReason: CardIssueReason.INITIAL,
    });

    const revoked = await revokeCard(tenantId, issue.id, {
      reason: CardRevocationReason.SEPARATION,
      reasonNotes: 'Worker resigned and surrendered badge.',
    });

    expect(revoked.status).toBe(CardIssueStatus.REVOKED);
    expect(revoked.isCurrent).toBe(false);
    expect(revoked.revokedAt).toBeDefined();
    expect(revoked.revocationReason).toBe(CardRevocationReason.SEPARATION);
    expect(revoked.revocationNotes).toBe('Worker resigned and surrendered badge.');

    // Historical row remains inspectable
    const historical = await getCardIssueById(tenantId, issue.id);
    expect(historical.id).toBe(issue.id);
  });

  it('idempotency key prevents duplicate card issues on retry', async () => {
    const idempotencyKey = `idemp-${Date.now()}`;

    const issue1 = await issueCardDirect(tenantId, {
      employmentId,
      idempotencyKey,
    });

    const issue2 = await issueCardDirect(tenantId, {
      employmentId,
      idempotencyKey,
    });

    expect(issue1.id).toBe(issue2.id);
    expect(issue1.cardSerial).toBe(issue2.cardSerial);

    const totalIssues = await prisma.cardIssue.count({
      where: { tenantId, employmentId },
    });
    expect(totalIssues).toBe(1);
  });

  it('lists card issues with pagination and search filters', async () => {
    await issueCardDirect(tenantId, { employmentId });

    const result = await listCardIssues(tenantId, {
      search: 'EMP-8001',
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.items[0]!.employment.employeeNumber).toBe('EMP-8001');
  });
});
