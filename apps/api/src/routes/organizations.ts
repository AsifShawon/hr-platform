import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { Permission, AuditAction } from '@hr/domain';
import { createOrganizationRequestSchema, updateOrganizationRequestSchema } from '@hr/schemas';
import {
  getTenantOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  updateOrganizationLogo,
  OrganizationNotFoundError,
  DuplicateOrganizationCodeError,
} from '../services/organization.service.js';
import {
  validateAndProcessLogo,
  saveLogo,
  getLogoFile,
  MediaValidationError,
} from '../services/media.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const organizationRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/organizations - List organizations
  fastify.get(
    '/api/organizations',
    { preHandler: [fastify.requirePermission(Permission.PEOPLE_VIEW)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const orgs = await getTenantOrganizations(tenantId);
      return reply.send({ organizations: orgs });
    },
  );

  // 2. GET /api/organizations/:id - Get single organization
  fastify.get(
    '/api/organizations/:id',
    { preHandler: [fastify.requirePermission(Permission.PEOPLE_VIEW)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const org = await getOrganizationById(tenantId, id);
        return reply.send({ organization: org });
      } catch (err) {
        if (err instanceof OrganizationNotFoundError) {
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

  // 3. POST /api/organizations - Create organization
  fastify.post(
    '/api/organizations',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parseResult = createOrganizationRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
          errors: parseResult.error.format(),
        });
      }

      try {
        const org = await createOrganization(tenantId, parseResult.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORGANIZATION_CREATED,
          entityType: 'Organization',
          entityId: org.id,
          details: { name: org.name, code: org.code },
          ipAddress: request.ip,
        });

        return reply.code(201).send({ success: true, organization: org });
      } catch (err) {
        if (err instanceof DuplicateOrganizationCodeError) {
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

  // 4. PUT /api/organizations/:id - Update organization settings
  fastify.put(
    '/api/organizations/:id',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const parseResult = updateOrganizationRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid payload',
          errors: parseResult.error.format(),
        });
      }

      try {
        const updated = await updateOrganization(tenantId, id, parseResult.data);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORGANIZATION_UPDATED,
          entityType: 'Organization',
          entityId: id,
          details: { name: updated.name, fieldsUpdated: Object.keys(parseResult.data) },
          ipAddress: request.ip,
        });

        return reply.send({ success: true, organization: updated });
      } catch (err) {
        if (err instanceof OrganizationNotFoundError) {
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

  // 5. POST /api/organizations/:id/logo - Upload logo
  fastify.post(
    '/api/organizations/:id/logo',
    { preHandler: [fastify.requirePermission(Permission.ORGANIZATION_MANAGE)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'No image file uploaded.',
        });
      }

      const buffer = await data.toBuffer();

      try {
        const { processedBuffer, extension } = await validateAndProcessLogo(buffer);
        const filename = await saveLogo(processedBuffer, extension);
        const org = await updateOrganizationLogo(tenantId, id, filename);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.ORGANIZATION_UPDATED,
          entityType: 'Organization',
          entityId: id,
          details: { logoUpdated: true, logoFilename: filename },
          ipAddress: request.ip,
        });

        return reply.send({
          success: true,
          logoPath: filename,
          logoUrl: `/api/organizations/${id}/logo`,
          message: 'Logo uploaded and processed successfully.',
        });
      } catch (err: any) {
        if (err instanceof MediaValidationError) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: err.message,
          });
        }
        if (err instanceof OrganizationNotFoundError) {
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

  // 6. GET /api/organizations/:id/logo - Stream logo securely
  fastify.get('/api/organizations/:id/logo', async (request, reply) => {
    const { id } = request.params as { id: string };
    // Allow unauthenticated/authenticated retrieval with security headers
    const tenantId = request.user?.tenantId;

    const org = await getOrganizationById(
      tenantId || (await prisma.organization.findUnique({ where: { id } }))?.tenantId || '',
      id,
    );
    if (!org || !org.logoPath) {
      return reply
        .code(404)
        .send({ statusCode: 404, error: 'Not Found', message: 'Logo not found.' });
    }

    const file = await getLogoFile(org.logoPath);
    if (!file) {
      return reply
        .code(404)
        .send({ statusCode: 404, error: 'Not Found', message: 'Logo file not found on disk.' });
    }

    reply.header('Content-Type', file.mimeType);
    reply.header('Cache-Control', 'public, max-age=86400');
    reply.header('X-Content-Type-Options', 'nosniff');
    return reply.send(file.buffer);
  });
};
