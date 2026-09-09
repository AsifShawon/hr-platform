import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { Permission, AuditAction } from '@hr/domain';
import { createCustomFieldDefinitionRequestSchema } from '@hr/schemas';
import {
  getCustomFieldDefinitions,
  createCustomFieldDefinition,
  DuplicateCustomFieldKeyError,
} from '../services/custom-field.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const customFieldRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/custom-fields - List active custom field definitions
  fastify.get(
    '/api/custom-fields',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_VIEW)],
    },
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

      const fields = await getCustomFieldDefinitions(tenantId, organizationId);
      return reply.send({ customFields: fields });
    },
  );

  // 2. POST /api/custom-fields - Create custom field definition
  fastify.post(
    '/api/custom-fields',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.ORGANIZATION_MANAGE)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsedBody = createCustomFieldDefinitionRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsedBody.error.errors[0]?.message || 'Invalid custom field data.',
        });
      }

      try {
        const field = await createCustomFieldDefinition(tenantId, parsedBody.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.CUSTOM_FIELD_CREATED,
          entityType: 'custom_field_definition',
          entityId: field.id,
          ipAddress: request.ip,
          details: { name: field.name, key: field.key, fieldType: field.fieldType },
        });

        return reply.code(201).send({ customField: field });
      } catch (err: any) {
        if (err instanceof DuplicateCustomFieldKeyError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        throw err;
      }
    },
  );
};
