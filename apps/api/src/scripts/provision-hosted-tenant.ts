import { prisma, PermissionType } from '@hr/db';
import { BUILT_IN_ROLE_PERMISSIONS, BuiltInRole, Permission } from '@hr/domain';
import crypto from 'node:crypto';

function mapPermissionToPrisma(perm: Permission): PermissionType {
  const map: Record<Permission, PermissionType> = {
    [Permission.PEOPLE_VIEW]: PermissionType.PEOPLE_VIEW,
    [Permission.PEOPLE_EDIT]: PermissionType.PEOPLE_EDIT,
    [Permission.IDENTITY_REVEAL]: PermissionType.IDENTITY_REVEAL,
    [Permission.IDENTITY_EDIT]: PermissionType.IDENTITY_EDIT,
    [Permission.CARDS_DESIGN]: PermissionType.CARDS_DESIGN,
    [Permission.CARDS_PRINT]: PermissionType.CARDS_PRINT,
    [Permission.CARDS_ISSUE]: PermissionType.CARDS_ISSUE,
    [Permission.CARDS_REVOKE]: PermissionType.CARDS_REVOKE,
    [Permission.EXPORTS_CREATE]: PermissionType.EXPORTS_CREATE,
    [Permission.ORGANIZATION_MANAGE]: PermissionType.ORGANIZATION_MANAGE,
    [Permission.USERS_MANAGE]: PermissionType.USERS_MANAGE,
    [Permission.ROLES_MANAGE]: PermissionType.ROLES_MANAGE,
    [Permission.AUDIT_VIEW]: PermissionType.AUDIT_VIEW,
    [Permission.BACKUP_MANAGE]: PermissionType.BACKUP_MANAGE,
    [Permission.SYSTEM_MANAGE]: PermissionType.SYSTEM_MANAGE,
  };
  return map[perm];
}

export async function provisionHostedTenant(options: {
  tenantSlug: string;
  tenantName: string;
  orgName: string;
  orgCode: string;
  ownerUsername: string;
  ownerEmail: string;
  tokenExpiresInHours?: number;
}) {
  const {
    tenantSlug,
    tenantName,
    orgName,
    orgCode,
    ownerUsername,
    ownerEmail,
    tokenExpiresInHours = 72,
  } = options;

  console.log(`🚀 Provisioning Hosted Tenant: ${tenantName} (${tenantSlug})...`);

  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug: tenantSlug,
      name: tenantName,
    },
  });

  // 2. Create Organization
  await prisma.organization.create({
    data: {
      tenantId: tenant.id,
      name: orgName,
      code: orgCode,
    },
  });

  // 3. Seed Built-In Roles for this tenant
  const roleMap: Record<string, string> = {};
  for (const [roleName, permissions] of Object.entries(BUILT_IN_ROLE_PERMISSIONS)) {
    const prismaPermissions = permissions.map((p) => mapPermissionToPrisma(p as Permission));
    const role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: roleName,
        isBuiltIn: true,
        description: `Built-in role for ${roleName}`,
        permissions: prismaPermissions,
      },
    });
    roleMap[roleName] = role.id;
  }

  // 4. Create Inactive First-Owner User (without password yet)
  const dummyPasswordHash = 'HOSTED_ACTIVATION_PENDING';
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: ownerUsername,
      email: ownerEmail.toLowerCase(),
      passwordHash: dummyPasswordHash,
      isActive: false, // inactive until token activation
      mustChangePassword: false,
    },
  });

  // Grant System Owner Role
  const systemOwnerRoleId = roleMap[BuiltInRole.SYSTEM_OWNER];
  if (systemOwnerRoleId) {
    await prisma.roleGrant.create({
      data: {
        userId: owner.id,
        roleId: systemOwnerRoleId,
      },
    });
  }

  // 5. Generate Secure Activation Token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + tokenExpiresInHours * 60 * 60 * 1000);

  await prisma.provisioningToken.create({
    data: {
      tenantId: tenant.id,
      userId: owner.id,
      tokenHash,
      type: 'FIRST_OWNER_ACTIVATION',
      expiresAt,
    },
  });

  console.log(`✅ Tenant provisioned successfully.`);
  console.log(`🔑 First-Owner Activation Token: ${rawToken}`);
  console.log(`🔗 Activation URL: http://localhost:3000/activate?token=${rawToken}`);

  return {
    tenantId: tenant.id,
    userId: owner.id,
    activationToken: rawToken,
    expiresAt,
  };
}

// Allow direct CLI execution if invoked directly
if (
  process.argv[1]?.endsWith('provision-hosted-tenant.ts') ||
  process.argv[1]?.endsWith('provision-hosted-tenant.js')
) {
  const args = process.argv.slice(2);
  const slug = args[0] || `tenant-${Date.now()}`;
  provisionHostedTenant({
    tenantSlug: slug,
    tenantName: args[1] || 'Acme Corp',
    orgName: args[2] || 'Acme Apparel Ltd.',
    orgCode: args[3] || 'ACME',
    ownerUsername: args[4] || 'owner',
    ownerEmail: args[5] || 'owner@acme.com',
  })
    .catch((e) => {
      console.error('❌ Provisioning error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
