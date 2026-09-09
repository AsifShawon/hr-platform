import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { Permission, AuditAction } from '@hr/domain';
import { createLocationRequestSchema, updateLocationRequestSchema } from '@hr/schemas';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  LocationNotFoundError,
  DuplicateLocationCodeError,
  LocationInUseError,
} from '../services/location.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const locationRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/locations
  fastify.get(
    '/api/locations',
    { preHandler: [fastify.requirePermission(Permission.PEOPLE_VIEW)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { organizationId } = request.query as { organizationId?: string };
      if (organizationId) {
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
      }

      const locations = await getLocations(tenantId, organizationId);
      return reply.send({ locations });
    },
  );

  // 2. POST /api/locations
  fastify.post(
    '/api/locations',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parseResult = createLocationRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
          errors: parseResult.error.format(),
        });
      }

      try {
        const location = await createLocation(tenantId, parseResult.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.LOCATION_CREATED,
          entityType: 'Location',
          entityId: location.id,
          details: { name: location.name, code: location.code, type: location.type },
          ipAddress: request.ip,
        });

        return reply.code(201).send({ success: true, location });
      } catch (err) {
        if (err instanceof DuplicateLocationCodeError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof LocationNotFoundError) {
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

  // 3. PUT /api/locations/:id
  fastify.put(
    '/api/locations/:id',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const parseResult = updateLocationRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
          errors: parseResult.error.format(),
        });
      }

      try {
        const updated = await updateLocation(tenantId, id, parseResult.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.LOCATION_UPDATED,
          entityType: 'Location',
          entityId: id,
          details: { name: updated.name, code: updated.code },
          ipAddress: request.ip,
        });

        return reply.send({ success: true, location: updated });
      } catch (err) {
        if (err instanceof DuplicateLocationCodeError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof LocationNotFoundError) {
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

  // 4. DELETE /api/locations/:id
  fastify.delete(
    '/api/locations/:id',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const deleted = await deleteLocation(tenantId, id);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.LOCATION_DELETED,
          entityType: 'Location',
          entityId: id,
          details: { name: deleted.name, code: deleted.code },
          ipAddress: request.ip,
        });

        return reply.send({
          success: true,
          message: `Location '${deleted.name}' deleted successfully.`,
        });
      } catch (err) {
        if (err instanceof LocationInUseError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof LocationNotFoundError) {
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
