import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { AuditAction, Permission, validatePasswordStrength } from '@hr/domain';
import { createUserRequestSchema, updateUserRequestSchema } from '@hr/schemas';
import { hashPassword } from '../services/auth.service.js';
import { recordAuditEvent } from '../services/audit.service.js';
import {
  ensureNotLastActiveSystemOwner,
  LastOwnerProtectionError,
} from '../services/user.service.js';

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/users
  fastify.get(
    '/api/users',
    { preHandler: [fastify.requirePermission(Permission.USERS_MANAGE)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const users = await prisma.user.findMany({
        where: { tenantId },
        include: {
          roleGrants: {
            include: {
              role: true,
              organization: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          isActive: u.isActive,
          isTemporaryBootstrap: u.isTemporaryBootstrap,
          mustChangePassword: u.mustChangePassword,
          roles: u.roleGrants.map((rg) => ({
            id: rg.role.id,
            name: rg.role.name,
            isBuiltIn: rg.role.isBuiltIn,
            organizationId: rg.organizationId,
            organizationName: rg.organization?.name || null,
            locationId: rg.locationId,
            locationName: rg.location?.name || null,
          })),
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        })),
      });
    },
  );

  // 2. POST /api/users
  fastify.post(
    '/api/users',
    { preHandler: [fastify.requirePermission(Permission.USERS_MANAGE)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parseResult = createUserRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid user creation payload.',
          errors: parseResult.error.format(),
        });
      }

      const { username, email, initialPassword, roleIds, roleGrants } = parseResult.data;

      // Check username uniqueness within tenant
      const existingUser = await prisma.user.findFirst({
        where: { tenantId, username },
      });

      if (existingUser) {
        return reply.code(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `Username '${username}' is already in use in this workspace.`,
        });
      }

      // Check password strength
      const strength = validatePasswordStrength(initialPassword, {
        username,
        email: email ?? undefined,
      });

      if (!strength.isValid) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: strength.errors[0] ?? 'Initial password does not meet security requirements.',
          errors: strength.errors,
        });
      }

      // Normalise role grants
      const grantsToCreate: {
        roleId: string;
        organizationId?: string | null;
        locationId?: string | null;
      }[] = [];

      if (roleGrants && roleGrants.length > 0) {
        grantsToCreate.push(...roleGrants);
      } else if (roleIds && roleIds.length > 0) {
        roleIds.forEach((roleId) => grantsToCreate.push({ roleId }));
      }

      const allRoleIds = grantsToCreate.map((g) => g.roleId);

      // Verify roles exist in tenant
      const validRoles = await prisma.role.findMany({
        where: { tenantId, id: { in: allRoleIds } },
      });

      if (validRoles.length !== new Set(allRoleIds).size) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'One or more specified roles do not exist in this tenant.',
        });
      }

      const passwordHash = await hashPassword(initialPassword);

      const newUser = await prisma.user.create({
        data: {
          tenantId,
          username,
          email: email?.toLowerCase() || null,
          passwordHash,
          mustChangePassword: true,
          isActive: true,
          roleGrants: {
            create: grantsToCreate.map((g) => ({
              roleId: g.roleId,
              organizationId: g.organizationId || null,
              locationId: g.locationId || null,
            })),
          },
        },
        include: {
          roleGrants: {
            include: {
              role: true,
              organization: { select: { name: true } },
              location: { select: { name: true } },
            },
          },
        },
      });

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.USER_CREATED,
        entityType: 'User',
        entityId: newUser.id,
        details: {
          username: newUser.username,
          assignedRoles: validRoles.map((r) => r.name),
        },
        ipAddress: request.ip,
      });

      return reply.code(201).send({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          isActive: newUser.isActive,
          roles: newUser.roleGrants.map((rg) => rg.role.name),
          createdAt: newUser.createdAt.toISOString(),
        },
      });
    },
  );

  // 3. PUT /api/users/:id
  fastify.put(
    '/api/users/:id',
    { preHandler: [fastify.requirePermission(Permission.USERS_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const parseResult = updateUserRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid update payload.',
        });
      }

      const { email, isActive, roleIds, roleGrants } = parseResult.data;

      // Verify user exists in tenant
      const targetUser = await prisma.user.findFirst({
        where: { id, tenantId },
        include: { roleGrants: true },
      });

      if (!targetUser) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found in this workspace.',
        });
      }

      let proposedRoleIds: string[] | undefined = undefined;
      const grantsToApply: {
        roleId: string;
        organizationId?: string | null;
        locationId?: string | null;
      }[] = [];

      if (roleGrants !== undefined) {
        grantsToApply.push(...roleGrants);
        proposedRoleIds = roleGrants.map((g) => g.roleId);
      } else if (roleIds !== undefined) {
        roleIds.forEach((roleId) => grantsToApply.push({ roleId }));
        proposedRoleIds = roleIds;
      }

      // Check Last System Owner Invariant
      try {
        await ensureNotLastActiveSystemOwner(tenantId, id, proposedRoleIds, isActive);
      } catch (err) {
        if (err instanceof LastOwnerProtectionError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        throw err;
      }

      // Update role assignments if provided
      if (proposedRoleIds !== undefined) {
        const validRoles = await prisma.role.findMany({
          where: { tenantId, id: { in: proposedRoleIds } },
        });

        if (validRoles.length !== new Set(proposedRoleIds).size) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'One or more specified roles do not exist in this tenant.',
          });
        }

        await prisma.$transaction([
          prisma.roleGrant.deleteMany({ where: { userId: id } }),
          prisma.roleGrant.createMany({
            data: grantsToApply.map((g) => ({
              userId: id,
              roleId: g.roleId,
              organizationId: g.organizationId || null,
              locationId: g.locationId || null,
            })),
          }),
        ]);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          email: email !== undefined ? (email ? email.toLowerCase() : null) : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
        },
        include: {
          roleGrants: {
            include: {
              role: true,
              organization: { select: { name: true } },
              location: { select: { name: true } },
            },
          },
        },
      });

      // If user deactivated, kill all their sessions
      if (isActive === false) {
        await prisma.session.deleteMany({ where: { userId: id } });
      }

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.USER_UPDATED,
        entityType: 'User',
        entityId: id,
        details: {
          username: updated.username,
          isActive: updated.isActive,
          updatedRoles: proposedRoleIds !== undefined,
        },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          isActive: updated.isActive,
          roles: updated.roleGrants.map((rg) => ({
            id: rg.role.id,
            name: rg.role.name,
            isBuiltIn: rg.role.isBuiltIn,
            organizationName: rg.organization?.name || null,
            locationName: rg.location?.name || null,
          })),
        },
      });
    },
  );

  // 4. DELETE /api/users/:id
  fastify.delete(
    '/api/users/:id',
    { preHandler: [fastify.requirePermission(Permission.USERS_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      if (id === request.user!.id) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'You cannot delete your own account.',
        });
      }

      const targetUser = await prisma.user.findFirst({
        where: { id, tenantId },
      });

      if (!targetUser) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found in this workspace.',
        });
      }

      // Check Last System Owner Invariant
      try {
        await ensureNotLastActiveSystemOwner(tenantId, id, [], false);
      } catch (err) {
        if (err instanceof LastOwnerProtectionError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        throw err;
      }

      await prisma.user.delete({ where: { id } });

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.USER_DELETED,
        entityType: 'User',
        entityId: id,
        details: { username: targetUser.username },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: `User '${targetUser.username}' deleted successfully.`,
      });
    },
  );
};
