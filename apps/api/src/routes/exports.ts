import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createReadStream } from 'node:fs';
import { prisma } from '@hr/db';
import { Permission, AuditAction } from '@hr/domain';
import { exportWorkersRequestSchema } from '@hr/schemas';
import {
  executeWorkerExport,
  getExportDownloadStream,
  ExportValidationError,
} from '../services/worker-export.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const exportRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /**
   * Initiate a Worker Export Job
   */
  server.post(
    '/api/exports/workers',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.EXPORTS_CREATE)],
    },
    async (request, reply) => {
      const parsed = exportWorkersRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.badRequest(parsed.error.errors[0]?.message || 'Invalid export request.');
      }

      try {
        const result = await executeWorkerExport(
          request.user!.tenantId,
          request.user!.id,
          request.permissions || [],
          parsed.data,
        );

        return reply.code(201).send(result);
      } catch (err: any) {
        if (err instanceof ExportValidationError) {
          return reply.badRequest(err.message);
        }
        request.log.error({ err }, 'Failed to execute worker export');
        return reply.internalServerError(err.message);
      }
    },
  );

  /**
   * Get Export Job Status & Metadata
   */
  server.get<{ Params: { id: string } }>(
    '/api/exports/:id',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.EXPORTS_CREATE)],
    },
    async (request, reply) => {
      const job = await prisma.exportJob.findFirst({
        where: { id: request.params.id, tenantId: request.user!.tenantId },
      });

      if (!job) {
        return reply.notFound('Export job not found.');
      }

      return reply.send({
        id: job.id,
        status: job.status,
        totalWorkers: job.totalWorkers,
        totalImages: job.totalImages,
        fileSizeBytes: job.fileSizeBytes,
        checksumSha256: job.checksumSha256,
        downloadToken: job.downloadToken,
        downloadUrl: job.downloadToken ? `/api/exports/download/${job.downloadToken}` : null,
        downloadCount: job.downloadCount,
        includeSensitive: job.includeSensitive,
        includedFields: job.includedFields,
        manifestSnapshot: job.manifestSnapshot,
        expiresAt: job.expiresAt.toISOString(),
        createdAt: job.createdAt.toISOString(),
      });
    },
  );

  /**
   * Stream Export ZIP Download by Token
   */
  server.get<{ Params: { token: string } }>(
    '/api/exports/download/:token',
    async (request, reply) => {
      try {
        const streamInfo = await getExportDownloadStream(request.params.token);
        const fileStream = createReadStream(streamInfo.filePath);

        await recordAuditEvent({
          tenantId: streamInfo.tenantId,
          actorId: request.user?.id ?? null,
          action: AuditAction.EXPORT_DOWNLOADED,
          entityType: 'ExportJob',
          entityId: streamInfo.jobId,
          details: { fileName: streamInfo.fileName, fileSizeBytes: streamInfo.fileSizeBytes },
          ipAddress: request.ip,
        });

        return reply
          .header('Content-Type', streamInfo.mimeType)
          .header('Content-Length', streamInfo.fileSizeBytes)
          .header('Content-Disposition', `attachment; filename="${streamInfo.fileName}"`)
          .send(fileStream);
      } catch (err: any) {
        if (err instanceof ExportValidationError) {
          return reply.notFound(err.message);
        }
        return reply.internalServerError('Failed to stream export archive.');
      }
    },
  );
};
