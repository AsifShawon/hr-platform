import { FastifyPluginAsync } from 'fastify';
import { Permission, AuditAction } from '@hr/domain';
import { createIdentityDocumentRequestSchema } from '@hr/schemas';
import {
  upsertIdentityDocument,
  revealIdentityDocument,
  deleteIdentityDocument,
  IdentityDocumentNotFoundError,
} from '../services/identity.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const identityRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. POST /api/people/:id/identity-documents - Upsert identity document
  fastify.post(
    '/api/people/:id/identity-documents',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.IDENTITY_EDIT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { id: personId } = request.params as { id: string };
      const parsedBody = createIdentityDocumentRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsedBody.error.errors[0]?.message || 'Invalid identity document data.',
        });
      }

      const doc = await upsertIdentityDocument(tenantId, personId, parsedBody.data);

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.IDENTITY_DOCUMENT_CREATED,
        entityType: 'identity_document',
        entityId: doc.id,
        ipAddress: request.ip,
        details: {
          personId,
          documentType: doc.documentType,
          documentNumberMasked: doc.documentNumberMasked,
        },
      });

      return reply.code(201).send({
        identityDocument: {
          id: doc.id,
          documentType: doc.documentType,
          country: doc.country,
          documentNumberMasked: doc.documentNumberMasked,
          issueDate: doc.issueDate?.toISOString().split('T')[0] || null,
          expiryDate: doc.expiryDate?.toISOString().split('T')[0] || null,
          isVerified: doc.isVerified,
        },
      });
    },
  );

  // 2. POST /api/people/:id/identity-documents/:docId/reveal - Audited unmasked reveal
  fastify.post(
    '/api/people/:id/identity-documents/:docId/reveal',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.IDENTITY_REVEAL)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { docId } = request.params as { id: string; docId: string };

      try {
        const revealed = await revealIdentityDocument(
          tenantId,
          docId,
          request.user!.id,
          request.ip,
        );

        return reply.send(revealed);
      } catch (err: any) {
        if (err instanceof IdentityDocumentNotFoundError) {
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

  // 3. DELETE /api/people/:id/identity-documents/:docId - Delete identity document
  fastify.delete(
    '/api/people/:id/identity-documents/:docId',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.IDENTITY_EDIT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { docId } = request.params as { id: string; docId: string };

      try {
        await deleteIdentityDocument(tenantId, docId);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.IDENTITY_DOCUMENT_DELETED,
          entityType: 'identity_document',
          entityId: docId,
          ipAddress: request.ip,
          details: { documentId: docId },
        });

        return reply.send({ success: true, message: 'Identity document deleted successfully.' });
      } catch (err: any) {
        if (err instanceof IdentityDocumentNotFoundError) {
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
