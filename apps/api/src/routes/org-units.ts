import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { Permission, AuditAction } from '@hr/domain';
import {
  createOrgUnitRequestSchema,
  updateOrgUnitRequestSchema,
  moveOrgUnitRequestSchema,
  archiveOrgUnitRequestSchema,
} from '@hr/schemas';
import {
  getOrgUnits,
  getOrgUnitTree,
  createOrgUnit,
  updateOrgUnit,
  moveOrgUnit,
  setOrgUnitArchived,
  deleteOrgUnit,
  OrgUnitNotFoundError,
  HierarchyCycleError,
  SiblingNameConflictError,
  DuplicateOrgUnitCodeError,
  CrossOrganizationHierarchyError,
  OrgUnitHasChildrenError,
} from '../services/org-unit.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const orgUnitRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/org-units - List or Tree
  fastify.get(
    '/api/org-units',
    { preHandler: [fastify.requirePermission(Permission.PEOPLE_VIEW)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { organizationId, tree, includeArchived } = request.query as {
        organizationId?: string;
        tree?: string;
        includeArchived?: string;
      };

      if (!organizationId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'organizationId query parameter is required.',
        });
      }

      const org = await prisma.organization.findFirst({
        where: { id: organizationId, tenantId },
      });
      if (!org) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Organization not found in workspace.',
        });
      }

      const shouldIncludeArchived = includeArchived === 'true';

      if (tree === 'true') {
        const orgTree = await getOrgUnitTree(tenantId, organizationId, {
          includeArchived: shouldIncludeArchived,
        });
        return reply.send({ units: orgTree });
      }

      const units = await getOrgUnits(tenantId, organizationId, {
        includeArchived: shouldIncludeArchived,
      });
      return reply.send({ units });
    },
  );

  // 2. POST /api/org-units - Create unit
  fastify.post(
    '/api/org-units',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parseResult = createOrgUnitRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
          errors: parseResult.error.format(),
        });
      }

      try {
        const unit = await createOrgUnit(tenantId, parseResult.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORG_UNIT_CREATED,
          entityType: 'OrgUnit',
          entityId: unit.id,
          details: {
            name: unit.name,
            code: unit.code,
            type: unit.type,
            parentId: unit.parentId,
          },
          ipAddress: request.ip,
        });

        return reply.code(201).send({ success: true, unit });
      } catch (err) {
        if (err instanceof DuplicateOrgUnitCodeError || err instanceof SiblingNameConflictError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof OrgUnitNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: err.message,
          });
        }
        throw err;
      }
    },
  );

  // 3. PUT /api/org-units/:id - Update unit
  fastify.put(
    '/api/org-units/:id',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const parseResult = updateOrgUnitRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
          errors: parseResult.error.format(),
        });
      }

      try {
        const updated = await updateOrgUnit(tenantId, id, parseResult.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORG_UNIT_UPDATED,
          entityType: 'OrgUnit',
          entityId: id,
          details: { name: updated.name, code: updated.code },
          ipAddress: request.ip,
        });

        return reply.send({ success: true, unit: updated });
      } catch (err) {
        if (err instanceof DuplicateOrgUnitCodeError || err instanceof SiblingNameConflictError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof OrgUnitNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: err.message,
          });
        }
        throw err;
      }
    },
  );

  // 4. POST /api/org-units/:id/move - Move unit with cycle detection
  fastify.post(
    '/api/org-units/:id/move',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const parseResult = moveOrgUnitRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
          errors: parseResult.error.format(),
        });
      }

      try {
        const { unit, previousParentId } = await moveOrgUnit(
          tenantId,
          id,
          parseResult.data.newParentId,
        );

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORG_UNIT_MOVED,
          entityType: 'OrgUnit',
          entityId: id,
          details: {
            name: unit.name,
            previousParentId,
            newParentId: unit.parentId,
          },
          ipAddress: request.ip,
        });

        return reply.send({
          success: true,
          unit,
          message: `Unit '${unit.name}' moved successfully.`,
        });
      } catch (err) {
        if (err instanceof HierarchyCycleError || err instanceof CrossOrganizationHierarchyError) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: err.message,
          });
        }
        if (err instanceof SiblingNameConflictError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof OrgUnitNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: err.message,
          });
        }
        throw err;
      }
    },
  );

  // 5. POST /api/org-units/:id/archive - Archive / unarchive
  fastify.post(
    '/api/org-units/:id/archive',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const parseResult = archiveOrgUnitRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
        });
      }

      try {
        const updated = await setOrgUnitArchived(tenantId, id, parseResult.data.isArchived);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORG_UNIT_ARCHIVED,
          entityType: 'OrgUnit',
          entityId: id,
          details: { name: updated.name, isArchived: updated.isArchived },
          ipAddress: request.ip,
        });

        return reply.send({
          success: true,
          unit: updated,
          message: `Unit '${updated.name}' ${updated.isArchived ? 'archived' : 'restored'} successfully.`,
        });
      } catch (err) {
        if (err instanceof OrgUnitNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: err.message,
          });
        }
        throw err;
      }
    },
  );

  // 6. DELETE /api/org-units/:id - Delete (with child protection)
  fastify.delete(
    '/api/org-units/:id',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const deleted = await deleteOrgUnit(tenantId, id);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORG_UNIT_DELETED,
          entityType: 'OrgUnit',
          entityId: id,
          details: { name: deleted.name, code: deleted.code },
          ipAddress: request.ip,
        });

        return reply.send({
          success: true,
          message: `Unit '${deleted.name}' deleted successfully.`,
        });
      } catch (err) {
        if (err instanceof OrgUnitHasChildrenError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof OrgUnitNotFoundError) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: err.message,
          });
        }
        throw err;
      }
    },
  );
};
