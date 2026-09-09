import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { Permission, AuditAction } from '@hr/domain';
import {
  createPersonRequestSchema,
  updatePersonRequestSchema,
  updateEmploymentRequestSchema,
  duplicateCheckRequestSchema,
  peopleQuerySchema,
  bulkStatusChangeRequestSchema,
} from '@hr/schemas';
import {
  createPerson,
  updatePerson,
  updateEmployment,
  getPersonById,
  searchPeople,
  checkDuplicates,
  bulkUpdateEmploymentStatus,
  ConcurrencyConflictError,
  DuplicateEmployeeNumberError,
  PersonNotFoundError,
  EmploymentNotFoundError,
} from '../services/person.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const peopleRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/people - High-performance server-side table search
  fastify.get(
    '/api/people',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_VIEW)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsedQuery = peopleQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsedQuery.error.errors[0]?.message || 'Invalid query parameters.',
        });
      }

      if (parsedQuery.data.organizationId) {
        const org = await prisma.organization.findFirst({
          where: { id: parsedQuery.data.organizationId, tenantId },
        });
        if (!org) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Organization not found in workspace.',
          });
        }
      }

      const result = await searchPeople(tenantId, parsedQuery.data);
      return reply.send(result);
    },
  );

  // 2. POST /api/people - Create new person + employment
  fastify.post(
    '/api/people',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsedBody = createPersonRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsedBody.error.errors[0]?.message || 'Invalid person request data.',
        });
      }

      try {
        const result = await createPerson(tenantId, parsedBody.data);

        // Record audit event
        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.PERSON_CREATED,
          entityType: 'person',
          entityId: result.person.id,
          ipAddress: request.ip,
          details: {
            displayName: result.person.displayName,
            employeeNumber: result.employment.employeeNumber,
            jobTitle: result.employment.jobTitle,
          },
        });

        return reply.code(201).send(result);
      } catch (err: any) {
        if (err instanceof DuplicateEmployeeNumberError) {
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

  // 3. POST /api/people/validate - Dry-run conservative duplicate check
  fastify.post(
    '/api/people/validate',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_VIEW)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = duplicateCheckRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsed.error.errors[0]?.message || 'Invalid validation parameters.',
        });
      }

      const result = await checkDuplicates(tenantId, parsed.data);
      return reply.send(result);
    },
  );

  // 4. GET /api/people/:id - Retrieve person detail
  fastify.get(
    '/api/people/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_VIEW)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params as { id: string };

      try {
        const person = await getPersonById(tenantId, id);
        return reply.send({ person });
      } catch (err: any) {
        if (err instanceof PersonNotFoundError) {
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

  // 5. PUT /api/people/:id - Update person with optimistic concurrency
  fastify.put(
    '/api/people/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params as { id: string };
      const parsedBody = updatePersonRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsedBody.error.errors[0]?.message || 'Invalid person update data.',
        });
      }

      try {
        const updated = await updatePerson(tenantId, id, parsedBody.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.PERSON_UPDATED,
          entityType: 'person',
          entityId: updated.id,
          ipAddress: request.ip,
          details: { displayName: updated.displayName },
        });

        return reply.send({ person: updated });
      } catch (err: any) {
        if (err instanceof ConcurrencyConflictError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof PersonNotFoundError) {
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

  // 6. PUT /api/employments/:id - Update employment record with optimistic concurrency
  fastify.put(
    '/api/employments/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params as { id: string };
      const parsedBody = updateEmploymentRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsedBody.error.errors[0]?.message || 'Invalid employment update data.',
        });
      }

      try {
        const updated = await updateEmployment(tenantId, id, parsedBody.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.EMPLOYMENT_UPDATED,
          entityType: 'employment',
          entityId: updated.id,
          ipAddress: request.ip,
          details: { status: updated.status, jobTitle: updated.jobTitle },
        });

        return reply.send({ employment: updated });
      } catch (err: any) {
        if (err instanceof ConcurrencyConflictError) {
          return reply.code(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message,
          });
        }
        if (err instanceof EmploymentNotFoundError) {
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

  // 7. POST /api/people/bulk/status - Bulk status update
  fastify.post(
    '/api/people/bulk/status',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsedBody = bulkStatusChangeRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsedBody.error.errors[0]?.message || 'Invalid bulk status update request.',
        });
      }

      const result = await bulkUpdateEmploymentStatus(
        tenantId,
        parsedBody.data.employmentIds,
        parsedBody.data.newStatus,
      );

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.EMPLOYMENT_UPDATED,
        entityType: 'employment_bulk',
        ipAddress: request.ip,
        details: {
          updatedCount: result.updatedCount,
          newStatus: parsedBody.data.newStatus,
          reason: parsedBody.data.reason || null,
        },
      });

      return reply.send({
        success: true,
        updatedCount: result.updatedCount,
        message: `Updated status to '${parsedBody.data.newStatus}' for ${result.updatedCount} record(s).`,
      });
    },
  );
};
