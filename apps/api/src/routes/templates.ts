import { FastifyPluginAsync } from 'fastify';
import { Permission } from '@hr/domain';
import {
  createTemplateRequestSchema,
  updateTemplateDraftSchema,
  publishTemplateVersionSchema,
  templateAssignmentRequestSchema,
  templateResolutionQuerySchema,
} from '@hr/schemas';
import {
  createTemplate,
  updateTemplateDraft,
  publishTemplateVersion,
  archiveTemplate,
  resolveTemplateForWorker,
  createTemplateAssignment,
  listTemplates,
  getTemplateById,
  TemplateError,
} from '../services/template.service.js';
import { prisma } from '@hr/db';

export const templateRoutes: FastifyPluginAsync = async (server) => {
  // 1. List Templates
  server.get(
    '/api/templates',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const templates = await listTemplates(tenantId);
      return reply.send({ templates });
    },
  );

  // 2. Get Template Detail
  server.get(
    '/api/templates/:id',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params as { id: string };
      try {
        const template = await getTemplateById(tenantId, id);
        return reply.send({ template });
      } catch (err: any) {
        if (err instanceof TemplateError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // 3. Create Template
  server.post(
    '/api/templates',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = createTemplateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const template = await createTemplate(tenantId, parsed.data, request.user!.id, request.ip);
        return reply.status(201).send({ template });
      } catch (err: any) {
        if (err instanceof TemplateError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // 4. Update Template Draft Version
  server.put(
    '/api/templates/:id/draft',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params as { id: string };
      const parsed = updateTemplateDraftSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const template = await updateTemplateDraft(
          tenantId,
          id,
          parsed.data,
          request.user!.id,
          request.ip,
        );
        return reply.send({ template });
      } catch (err: any) {
        if (err instanceof TemplateError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // 5. Publish Template Version
  server.post(
    '/api/templates/:id/publish',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params as { id: string };
      const parsed = publishTemplateVersionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const publishedVersion = await publishTemplateVersion(
          tenantId,
          id,
          parsed.data.draftVersionId,
          request.user!.id,
          request.ip,
        );
        return reply.send({ version: publishedVersion });
      } catch (err: any) {
        if (err instanceof TemplateError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // 6. Archive Template
  server.post(
    '/api/templates/:id/archive',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id } = request.params as { id: string };
      try {
        const archived = await archiveTemplate(tenantId, id, request.user!.id, request.ip);
        return reply.send({ template: archived });
      } catch (err: any) {
        if (err instanceof TemplateError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // 7. Resolve Template for Worker Context
  server.post(
    '/api/templates/resolve',
    { preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_VIEW)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = templateResolutionQuerySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      const resolution = await resolveTemplateForWorker(tenantId, parsed.data);
      return reply.send({ resolution });
    },
  );

  // 8. List Template Assignments
  server.get(
    '/api/templates/assignments',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const assignments = await prisma.templateAssignment.findMany({
        where: { tenantId },
        include: {
          template: {
            select: { id: true, name: true, presetId: true, isArchived: true },
          },
        },
        orderBy: { priority: 'asc' },
      });
      return reply.send({ assignments });
    },
  );

  // 9. Create / Update Template Assignment Rule
  server.post(
    '/api/templates/assignments',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_DESIGN)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = templateAssignmentRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const assignment = await createTemplateAssignment(
          tenantId,
          parsed.data,
          request.user!.id,
          request.ip,
        );
        return reply.status(201).send({ assignment });
      } catch (err: any) {
        if (err instanceof TemplateError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    },
  );
};
