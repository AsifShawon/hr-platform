import { FastifyPluginAsync } from 'fastify';
import { Permission, AuditAction } from '@hr/domain';
import {
  directIssueCardRequestSchema,
  reprintCardRequestSchema,
  revokeCardRequestSchema,
  cardIssueQuerySchema,
  batchReadinessRequestSchema,
} from '@hr/schemas';
import { checkCardReadiness, checkBatchCardReadiness } from '../services/card-readiness.service.js';
import {
  issueCardDirect,
  reprintCard,
  revokeCard,
  listCardIssues,
  getCardIssueById,
  renderCardIssuePdfBuffer,
  CardIssueError,
} from '../services/card-issue.service.js';
import { getCardOperationsStats } from '../services/print-job.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const cardsRoutes: FastifyPluginAsync = async (server) => {
  // 1. GET /api/cards/readiness/:employmentId - Preflight check
  server.get(
    '/api/cards/readiness/:employmentId',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const { employmentId } = request.params as { employmentId: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await checkCardReadiness(tenantId, employmentId);
        return reply.send(result);
      } catch (err: any) {
        request.log.error({ err }, 'Error running card readiness check');
        return reply.status(500).send({ error: err.message || 'Readiness check failed.' });
      }
    },
  );

  // 2. GET /api/cards/issues - List issued cards
  server.get(
    '/api/cards/issues',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = cardIssueQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          issues: parsed.error.issues,
        });
      }

      try {
        const result = await listCardIssues(tenantId, parsed.data);
        return reply.send(result);
      } catch (err: any) {
        request.log.error({ err }, 'Error listing card issues');
        return reply.status(500).send({ error: err.message || 'Failed to list card issues.' });
      }
    },
  );

  // 3. GET /api/cards/issues/:id - Get single card issue
  server.get(
    '/api/cards/issues/:id',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const issue = await getCardIssueById(tenantId, id);
        return reply.send(issue);
      } catch (err: any) {
        if (err instanceof CardIssueError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        request.log.error({ err }, 'Error retrieving card issue');
        return reply.status(500).send({ error: 'Failed to retrieve card issue.' });
      }
    },
  );

  // 4. POST /api/cards/issue - Direct single card issuance
  server.post(
    '/api/cards/issue',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_ISSUE)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = directIssueCardRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const issue = await issueCardDirect(tenantId, parsed.data, request.user!.id, request.ip);
        return reply.status(201).send(issue);
      } catch (err: any) {
        if (err instanceof CardIssueError) {
          return reply.status(err.statusCode).send({
            error: err.message,
            issues: err.issues,
          });
        }
        request.log.error({ err }, 'Error issuing card');
        return reply.status(500).send({ error: err.message || 'Failed to issue card.' });
      }
    },
  );

  // 5. POST /api/cards/issues/:id/reprint - Request card reprint
  server.post(
    '/api/cards/issues/:id/reprint',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_ISSUE)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;
      const parsed = reprintCardRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const newIssue = await reprintCard(tenantId, id, parsed.data, request.user!.id, request.ip);
        return reply.status(201).send(newIssue);
      } catch (err: any) {
        if (err instanceof CardIssueError) {
          return reply.status(err.statusCode).send({
            error: err.message,
            issues: err.issues,
          });
        }
        request.log.error({ err }, 'Error reprinting card');
        return reply.status(500).send({ error: err.message || 'Failed to reprint card.' });
      }
    },
  );

  // 6. POST /api/cards/issues/:id/revoke - Revoke issued card
  server.post(
    '/api/cards/issues/:id/revoke',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_REVOKE)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;
      const parsed = revokeCardRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const revoked = await revokeCard(tenantId, id, parsed.data, request.user!.id, request.ip);
        return reply.send(revoked);
      } catch (err: any) {
        if (err instanceof CardIssueError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        request.log.error({ err }, 'Error revoking card');
        return reply.status(500).send({ error: err.message || 'Failed to revoke card.' });
      }
    },
  );

  // 7. POST /api/cards/readiness/batch - Batch preflight check
  server.post(
    '/api/cards/readiness/batch',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = batchReadinessRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const result = await checkBatchCardReadiness(tenantId, parsed.data.employmentIds);
        return reply.send(result);
      } catch (err: any) {
        request.log.error({ err }, 'Error running batch card readiness check');
        return reply.status(500).send({ error: err.message || 'Batch readiness check failed.' });
      }
    },
  );

  // 8. GET /api/cards/stats - Overview metrics
  server.get(
    '/api/cards/stats',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      try {
        const stats = await getCardOperationsStats(tenantId);
        return reply.send(stats);
      } catch (err: any) {
        request.log.error({ err }, 'Error retrieving card operations stats');
        return reply.status(500).send({ error: 'Failed to retrieve card operations stats.' });
      }
    },
  );

  // 9. GET /api/cards/issues/:id/pdf - Stream physical PDF master for an issued card
  server.get(
    '/api/cards/issues/:id/pdf',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await renderCardIssuePdfBuffer(tenantId, id);

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.EXPORT_DOWNLOADED as any,
          entityType: 'card_issue_pdf',
          entityId: id,
          details: {
            cardSerial: result.cardSerial,
            checksumSha256: result.checksumSha256,
          },
          ipAddress: request.ip,
        });

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `inline; filename="card-${result.cardSerial}.pdf"`)
          .header('X-Checksum-SHA256', result.checksumSha256)
          .send(result.buffer);
      } catch (err: any) {
        if (err instanceof CardIssueError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        request.log.error({ err }, 'Error rendering card issue PDF');
        return reply.status(500).send({ error: err.message || 'Failed to render card PDF.' });
      }
    },
  );
};
