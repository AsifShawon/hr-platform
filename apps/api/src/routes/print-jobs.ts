import { FastifyPluginAsync } from 'fastify';
import { Permission } from '@hr/domain';
import {
  createPrintJobRequestSchema,
  confirmPrintJobRequestSchema,
  printJobQuerySchema,
} from '@hr/schemas';
import {
  createPrintJob,
  confirmPrintJob,
  listPrintJobs,
  getPrintJobById,
  renderPrintJobPdfBuffer,
  cancelPrintJob,
  PrintJobError,
} from '../services/print-job.service.js';

export const printJobsRoutes: FastifyPluginAsync = async (server) => {
  // 1. POST /api/cards/print-jobs - Create batch print job
  server.post(
    '/api/cards/print-jobs',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = createPrintJobRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const job = await createPrintJob(tenantId, parsed.data, request.user!.id, request.ip);
        return reply.status(201).send(job);
      } catch (err: any) {
        if (err instanceof PrintJobError) {
          return reply.status(err.statusCode).send({
            error: err.message,
            issues: err.issues,
          });
        }
        request.log.error({ err }, 'Error creating print job');
        return reply.status(500).send({ error: err.message || 'Failed to create print job.' });
      }
    },
  );

  // 2. GET /api/cards/print-jobs - List print jobs
  server.get(
    '/api/cards/print-jobs',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parsed = printJobQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          issues: parsed.error.issues,
        });
      }

      try {
        const result = await listPrintJobs(tenantId, parsed.data);
        return reply.send(result);
      } catch (err: any) {
        request.log.error({ err }, 'Error listing print jobs');
        return reply.status(500).send({ error: err.message || 'Failed to list print jobs.' });
      }
    },
  );

  // 3. GET /api/cards/print-jobs/:id - Get print job by ID with items
  server.get(
    '/api/cards/print-jobs/:id',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const job = await getPrintJobById(tenantId, id);
        return reply.send(job);
      } catch (err: any) {
        if (err instanceof PrintJobError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        request.log.error({ err }, 'Error retrieving print job');
        return reply.status(500).send({ error: 'Failed to retrieve print job.' });
      }
    },
  );

  // 4. POST /api/cards/print-jobs/:id/confirm - Operator confirmation
  server.post(
    '/api/cards/print-jobs/:id/confirm',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;
      const parsed = confirmPrintJobRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const updated = await confirmPrintJob(
          tenantId,
          id,
          parsed.data,
          request.user!.id,
          request.ip,
        );
        return reply.send(updated);
      } catch (err: any) {
        if (err instanceof PrintJobError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        request.log.error({ err }, 'Error confirming print job');
        return reply.status(500).send({ error: err.message || 'Failed to confirm print job.' });
      }
    },
  );

  // 5. POST /api/cards/print-jobs/:id/cancel - Cancel pending or queued print job
  server.post(
    '/api/cards/print-jobs/:id/cancel',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await cancelPrintJob(tenantId, id, request.user!.id, request.ip);
        return reply.send(result);
      } catch (err: any) {
        if (err instanceof PrintJobError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        request.log.error({ err }, 'Error cancelling print job');
        return reply.status(500).send({ error: err.message || 'Failed to cancel print job.' });
      }
    },
  );

  // 6. GET /api/cards/print-jobs/:id/pdf - Download/stream exact batch master PDF
  server.get(
    '/api/cards/print-jobs/:id/pdf',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await renderPrintJobPdfBuffer(tenantId, id);
        return reply
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `attachment; filename="print-job-${id.substring(0, 8)}.pdf"`,
          )
          .header('X-Checksum-SHA256', result.checksumSha256)
          .send(result.buffer);
      } catch (err: any) {
        if (err instanceof PrintJobError) {
          return reply.status(err.statusCode).send({ error: err.message });
        }
        request.log.error({ err }, 'Error generating print job PDF');
        return reply
          .status(500)
          .send({ error: err.message || 'Failed to generate print job PDF.' });
      }
    },
  );
};
