import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import { Permission, TemplatePresetId, JobCategory, EmploymentStatus } from '@hr/domain';
import { createSession } from '../src/services/auth.service.js';
import { createTemplate, publishTemplateVersion } from '../src/services/template.service.js';
import { buildServer } from '../src/server.js';

describe('Phase 2: Cards API Default-Deny RBAC & Tenant Isolation Tests', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let org1Id: string;
  let employmentId1: string;

  let ownerToken: string;
  let printOpToken: string;
  let unprivilegedToken: string;

  beforeEach(async () => {
    // Tenant 1
    const t1 = await prisma.tenant.create({
      data: { slug: `rbac-t1-${Date.now()}`, name: 'RBAC Tenant 1' },
    });
    tenant1Id = t1.id;

    // Tenant 2
    const t2 = await prisma.tenant.create({
      data: { slug: `rbac-t2-${Date.now()}`, name: 'RBAC Tenant 2' },
    });
    tenant2Id = t2.id;

    const org1 = await prisma.organization.create({
      data: {
        tenantId: tenant1Id,
        name: 'Apex Industrial Ltd.',
        code: `APX_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      },
    });
    org1Id = org1.id;

    // Template in Tenant 1
    const tpl = await createTemplate(tenant1Id, {
      organizationId: org1Id,
      name: 'Default Card Template',
      presetId: TemplatePresetId.CLASSIC_VERTICAL,
    });
    await publishTemplateVersion(tenant1Id, tpl.id, tpl.activeVersionId!);

    // Worker in Tenant 1
    const person = await prisma.person.create({
      data: {
        tenantId: tenant1Id,
        displayName: 'Jahirul Islam',
      },
    });

    const emp = await prisma.employment.create({
      data: {
        tenantId: tenant1Id,
        personId: person.id,
        organizationId: org1Id,
        employeeNumber: 'EMP-3001',
        jobTitle: 'Production Manager',
        jobCategory: JobCategory.MANAGEMENT,
        joinDate: new Date('2023-01-01'),
        status: EmploymentStatus.ACTIVE,
      },
    });
    employmentId1 = emp.id;

    // 1. System Owner (all permissions)
    const ownerRole = await prisma.role.create({
      data: {
        tenantId: tenant1Id,
        name: 'Full Owner',
        permissions: Object.values(Permission) as any,
      },
    });
    const ownerUser = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        username: `owner_${Date.now()}`,
        passwordHash: 'dummy',
        isActive: true,
      },
    });
    await prisma.roleGrant.create({
      data: { userId: ownerUser.id, roleId: ownerRole.id },
    });
    const { token: oToken } = await createSession(ownerUser.id);
    ownerToken = oToken;

    // 2. Print Operator (CARDS_PRINT, CARDS_ISSUE, PEOPLE_VIEW - NO CARDS_REVOKE)
    const printRole = await prisma.role.create({
      data: {
        tenantId: tenant1Id,
        name: 'Print Operator Role',
        permissions: [
          Permission.CARDS_PRINT,
          Permission.CARDS_ISSUE,
          Permission.PEOPLE_VIEW,
        ] as any,
      },
    });
    const printUser = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        username: `print_op_${Date.now()}`,
        passwordHash: 'dummy',
        isActive: true,
      },
    });
    await prisma.roleGrant.create({
      data: { userId: printUser.id, roleId: printRole.id },
    });
    const { token: pToken } = await createSession(printUser.id);
    printOpToken = pToken;

    // 3. Unprivileged User (PEOPLE_VIEW only)
    const viewRole = await prisma.role.create({
      data: {
        tenantId: tenant1Id,
        name: 'Viewer Role',
        permissions: [Permission.PEOPLE_VIEW] as any,
      },
    });
    const viewUser = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        username: `viewer_${Date.now()}`,
        passwordHash: 'dummy',
        isActive: true,
      },
    });
    await prisma.roleGrant.create({
      data: { userId: viewUser.id, roleId: viewRole.id },
    });
    const { token: uToken } = await createSession(viewUser.id);
    unprivilegedToken = uToken;
  });

  afterEach(async () => {
    if (tenant1Id) await prisma.tenant.delete({ where: { id: tenant1Id } }).catch(() => {});
    if (tenant2Id) await prisma.tenant.delete({ where: { id: tenant2Id } }).catch(() => {});
  });

  it('allows CARDS_ISSUE authorized user to directly issue a card', async () => {
    const server = buildServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/cards/issue',
      cookies: { hr_session: ownerToken },
      payload: {
        employmentId: employmentId1,
      },
    });

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload);
    expect(data.cardSerial).toBeDefined();
    expect(data.status).toBe('ISSUED');
  });

  it('rejects unprivileged user attempting POST /api/cards/issue with 403 Forbidden', async () => {
    const server = buildServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/cards/issue',
      cookies: { hr_session: unprivilegedToken },
      payload: {
        employmentId: employmentId1,
      },
    });

    expect(res.statusCode).toBe(403);
    const data = JSON.parse(res.payload);
    expect(data.message).toContain('Permission denied');
  });

  it('denies Print Operator without CARDS_REVOKE permission from revoking cards', async () => {
    const server = buildServer();

    // Issue card as owner first
    const issueRes = await server.inject({
      method: 'POST',
      url: '/api/cards/issue',
      cookies: { hr_session: ownerToken },
      payload: { employmentId: employmentId1 },
    });
    const cardId = JSON.parse(issueRes.payload).id;

    // Print Operator attempts revoke
    const revokeRes = await server.inject({
      method: 'POST',
      url: `/api/cards/issues/${cardId}/revoke`,
      cookies: { hr_session: printOpToken },
      payload: {
        reason: 'SEPARATION',
        reasonNotes: 'Attempted operator revoke',
      },
    });

    expect(revokeRes.statusCode).toBe(403);
  });

  it('enforces tenant isolation: Tenant 2 user cannot access Tenant 1 card issue', async () => {
    const server = buildServer();

    // Issue card in Tenant 1
    const issueRes = await server.inject({
      method: 'POST',
      url: '/api/cards/issue',
      cookies: { hr_session: ownerToken },
      payload: { employmentId: employmentId1 },
    });
    const cardId = JSON.parse(issueRes.payload).id;

    // Create user in Tenant 2 with full permissions
    const t2OwnerRole = await prisma.role.create({
      data: {
        tenantId: tenant2Id,
        name: 'T2 Owner',
        permissions: Object.values(Permission) as any,
      },
    });
    const t2User = await prisma.user.create({
      data: {
        tenantId: tenant2Id,
        username: `t2_user_${Date.now()}`,
        passwordHash: 'dummy',
        isActive: true,
      },
    });
    await prisma.roleGrant.create({
      data: { userId: t2User.id, roleId: t2OwnerRole.id },
    });
    const { token: t2Token } = await createSession(t2User.id);

    // Tenant 2 user attempts to fetch Tenant 1 card
    const res = await server.inject({
      method: 'GET',
      url: `/api/cards/issues/${cardId}`,
      cookies: { hr_session: t2Token },
    });

    expect(res.statusCode).toBe(404);
  });
});
