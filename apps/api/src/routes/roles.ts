import { FastifyPluginAsync } from 'fastify';
import { prisma, PermissionType } from '@hr/db';
import { Permission, AuditAction } from '@hr/domain';
import { createRoleRequestSchema, updateRoleRequestSchema } from '@hr/schemas';
import { recordAuditEvent } from '../services/audit.service.js';

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

export const roleRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/roles
  fastify.get(
    '/api/roles',
    { preHandler: [fastify.requirePermission(Permission.ROLES_MANAGE)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const roles = await prisma.role.findMany({
        where: { tenantId },
        include: {
          _count: {
            select: { roleGrants: true },
          },
        },
        orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      });

      return reply.send({
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isBuiltIn: r.isBuiltIn,
          permissions: r.permissions,
          assignedUserCount: r._count.roleGrants,
          createdAt: r.createdAt.toISOString(),
        })),
      });
    },
  );

  // 2. POST /api/roles - Create custom role
  fastify.post(
    '/api/roles',
    { preHandler: [fastify.requirePermission(Permission.ROLES_MANAGE)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parseResult = createRoleRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid role payload',
          errors: parseResult.error.format(),
        });
      }

      const { name, description, permissions } = parseResult.data;

      // Check name uniqueness in tenant
      const existing = await prisma.role.findFirst({
        where: { tenantId, name: { equals: name.trim(), mode: 'insensitive' } },
      });

      if (existing) {
        return reply.code(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `A role named '${name}' already exists in this workspace.`,
        });
      }

      const prismaPermissions = permissions.map((p) => mapPermissionToPrisma(p));

      const newRole = await prisma.role.create({
        data: {
          tenantId,
          name: name.trim(),
          description: description?.trim() || null,
          isBuiltIn: false,
          permissions: prismaPermissions,
        },
      });

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.ROLE_CREATED,
        entityType: 'Role',
        entityId: newRole.id,
        details: { name: newRole.name, permissions: newRole.permissions },
        ipAddress: request.ip,
      });

      return reply.code(201).send({
        success: true,
        role: {
          id: newRole.id,
          name: newRole.name,
          description: newRole.description,
          isBuiltIn: newRole.isBuiltIn,
          permissions: newRole.permissions,
        },
      });
    },
  );

  // 3. PUT /api/roles/:id - Update custom role
  fastify.put(
    '/api/roles/:id',
    { preHandler: [fastify.requirePermission(Permission.ROLES_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const parseResult = updateRoleRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid role payload',
        });
      }

      const targetRole = await prisma.role.findFirst({
        where: { id, tenantId },
      });

      if (!targetRole) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Role not found in this workspace.',
        });
      }

      if (targetRole.isBuiltIn) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Built-in system roles cannot be modified.',
        });
      }

      const { name, description, permissions } = parseResult.data;

      if (name && name.trim().toLowerCase() !== targetRole.name.toLowerCase()) {
        const existing = await prisma.role.findFirst({
          where: { tenantId, name: { equals: name.trim(), mode: 'insensitive' }, id: { not: id } },
        });
        if (existing) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: `A role named '${name}' already exists in this workspace.`,
          });
        }
      }

      const prismaPermissions = permissions
        ? permissions.map((p) => mapPermissionToPrisma(p))
        : undefined;

      const updated = await prisma.role.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          description:
            description !== undefined ? (description ? description.trim() : null) : undefined,
          permissions: prismaPermissions,
        },
      });

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.ROLE_UPDATED,
        entityType: 'Role',
        entityId: id,
        details: { name: updated.name, permissions: updated.permissions },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        role: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          isBuiltIn: updated.isBuiltIn,
          permissions: updated.permissions,
        },
      });
    },
  );

  // 4. DELETE /api/roles/:id - Delete custom role
  fastify.delete(
    '/api/roles/:id',
    { preHandler: [fastify.requirePermission(Permission.ROLES_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const targetRole = await prisma.role.findFirst({
        where: { id, tenantId },
        include: {
          _count: {
            select: { roleGrants: true },
          },
        },
      });

      if (!targetRole) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Role not found in this workspace.',
        });
      }

      if (targetRole.isBuiltIn) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Built-in system roles cannot be deleted.',
        });
      }

      if (targetRole._count.roleGrants > 0) {
        return reply.code(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `Cannot delete role '${targetRole.name}' because it is assigned to ${targetRole._count.roleGrants} user(s).`,
        });
      }

      await prisma.role.delete({ where: { id } });

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.ROLE_DELETED,
        entityType: 'Role',
        entityId: id,
        details: { name: targetRole.name },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: `Role '${targetRole.name}' deleted successfully.`,
      });
    },
  );
};
