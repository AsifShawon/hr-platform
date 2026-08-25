import { FastifyInstance } from 'fastify';
import { prisma } from '@hr/db';
import { BuiltInRole, Permission, SESSION_COOKIE_NAME, TemplatePresetId } from '@hr/domain';
import { buildServer } from '../../../apps/api/src/server.js';
import { createSession } from '../../../apps/api/src/services/auth.service.js';
import {
  createTemplate,
  publishTemplateVersion,
} from '../../../apps/api/src/services/template.service.js';
import sharp from 'sharp';

export interface TestTenantContext {
  tenantId: string;
  orgId: string;
  templateId: string;
  ownerUser: { id: string; username: string };
  ownerToken: string;
  operatorUser: { id: string; username: string };
  operatorToken: string;
  viewerUser: { id: string; username: string };
  viewerToken: string;
}

let sharedServer: FastifyInstance | null = null;

export async function getLiveTestServer(): Promise<FastifyInstance> {
  if (!sharedServer) {
    sharedServer = buildServer();
    await sharedServer.ready();
  }
  return sharedServer;
}

export async function shutdownLiveTestServer(): Promise<void> {
  if (sharedServer) {
    await sharedServer.close();
    sharedServer = null;
  }
}

/**
 * Creates a fully provisioned test tenant with owner, operator, and viewer roles.
 */
export async function createTestTenant(prefix = 'live-e2e'): Promise<TestTenantContext> {
  const uniqueTag = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug: uniqueTag,
      name: `Test Tenant ${uniqueTag}`,
    },
  });

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      tenantId: tenant.id,
      name: 'London Boy Apparel Ltd.',
      nameBangla: 'লন্ডন বয় অ্যাপারেল লি.',
      code: `LBA_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      isActive: true,
    },
  });

  // 3. Create Default Template
  const template = await createTemplate(tenant.id, {
    organizationId: org.id,
    name: 'Standard 60x90 Company Badge',
    presetId: TemplatePresetId.CLASSIC_VERTICAL,
  });
  await publishTemplateVersion(tenant.id, template.id, template.activeVersionId!);

  // 4. Create Roles
  const ownerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: BuiltInRole.SYSTEM_OWNER } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: BuiltInRole.SYSTEM_OWNER,
      description: 'Full administrative owner',
      isSystem: true,
      permissions: Object.values(Permission),
    },
  });

  const operatorRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: BuiltInRole.PRINT_OPERATOR } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: BuiltInRole.PRINT_OPERATOR,
      description: 'Badge print and camera operator',
      isSystem: true,
      permissions: [
        Permission.PEOPLE_VIEW,
        Permission.PEOPLE_EDIT,
        Permission.CARDS_PRINT,
        Permission.CARDS_ISSUE,
      ],
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: BuiltInRole.HR_VIEWER } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: BuiltInRole.HR_VIEWER,
      description: 'Read only viewer',
      isSystem: true,
      permissions: [Permission.PEOPLE_VIEW, Permission.CARDS_PRINT],
    },
  });

  // 5. Create Users
  const ownerUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: `owner_${uniqueTag}`,
      email: `owner_${uniqueTag}@factory.local`,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      isActive: true,
      roles: {
        create: [{ roleId: ownerRole.id, tenantId: tenant.id }],
      },
    },
  });

  const operatorUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: `operator_${uniqueTag}`,
      email: `operator_${uniqueTag}@factory.local`,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      isActive: true,
      roles: {
        create: [{ roleId: operatorRole.id, tenantId: tenant.id }],
      },
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: `viewer_${uniqueTag}`,
      email: `viewer_${uniqueTag}@factory.local`,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      isActive: true,
      roles: {
        create: [{ roleId: viewerRole.id, tenantId: tenant.id }],
      },
    },
  });

  // 6. Create Sessions
  const ownerSession = await createSession(ownerUser.id, '127.0.0.1', 'Vitest-Live-E2E');
  const operatorSession = await createSession(operatorUser.id, '127.0.0.1', 'Vitest-Live-E2E');
  const viewerSession = await createSession(viewerUser.id, '127.0.0.1', 'Vitest-Live-E2E');

  return {
    tenantId: tenant.id,
    orgId: org.id,
    templateId: template.id,
    ownerUser: { id: ownerUser.id, username: ownerUser.username },
    ownerToken: ownerSession.token,
    operatorUser: { id: operatorUser.id, username: operatorUser.username },
    operatorToken: operatorSession.token,
    viewerUser: { id: viewerUser.id, username: viewerUser.username },
    viewerToken: viewerSession.token,
  };
}

/**
 * Creates a helper for injecting authenticated HTTP requests into Fastify.
 */
export function createAuthHeaders(token: string, origin = 'http://localhost:3000') {
  return {
    cookie: `${SESSION_COOKIE_NAME}=${token}`,
    origin,
  };
}

/**
 * Generates a valid fictional JPEG worker portrait with simulated EXIF metadata.
 */
export async function generateTestPhotoBuffer(width = 600, height = 900): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 120, b: 160 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}
