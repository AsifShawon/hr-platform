import { prisma } from '@hr/db';
import { BuiltInRole } from '@hr/domain';

export class LastOwnerProtectionError extends Error {
  constructor(message = 'Cannot modify, demote, or delete the last active System Owner.') {
    super(message);
    this.name = 'LastOwnerProtectionError';
  }
}

export async function ensureNotLastActiveSystemOwner(
  tenantId: string,
  targetUserId: string,
  proposedRoleIds?: string[],
  proposedIsActive?: boolean,
): Promise<void> {
  const systemOwnerRole = await prisma.role.findFirst({
    where: {
      tenantId,
      name: BuiltInRole.SYSTEM_OWNER,
    },
  });

  if (!systemOwnerRole) return;

  // Check if target user currently is a System Owner
  const currentGrant = await prisma.roleGrant.findFirst({
    where: {
      userId: targetUserId,
      roleId: systemOwnerRole.id,
    },
  });

  if (!currentGrant) {
    // User is not a system owner, safe to modify
    return;
  }

  // If user is being deactivated OR proposed roles no longer contain system owner role
  const isBeingDeactivated = proposedIsActive === false;
  const isLosingOwnerRole =
    proposedRoleIds !== undefined && !proposedRoleIds.includes(systemOwnerRole.id);

  if (isBeingDeactivated || isLosingOwnerRole) {
    // Count other active system owners in tenant
    const otherActiveOwnersCount = await prisma.user.count({
      where: {
        tenantId,
        isActive: true,
        id: { not: targetUserId },
        roleGrants: {
          some: {
            roleId: systemOwnerRole.id,
          },
        },
      },
    });

    if (otherActiveOwnersCount === 0) {
      throw new LastOwnerProtectionError();
    }
  }
}
