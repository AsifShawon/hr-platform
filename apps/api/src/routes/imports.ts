import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '@hr/db';
import { Permission, ImportDuplicateStrategy, ImportCommitPolicy } from '@hr/domain';
import { configureImportMappingRequestSchema, importCommitRequestSchema } from '@hr/schemas';
import {
  createImportJob,
  configureImportJobMapping,
  validateAndSimulateImport,
  commitImportJob,
  ImportValidationError,
} from '../services/worker-import.service.js';

export const importRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /**
   * Upload CSV or ZIP package for worker import
   */
  server.post(
    '/api/imports/upload',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const data = await request.file({
        limits: {
          fileSize: 25 * 1024 * 1024, // 25 MB max package size
        },
      });

      if (!data) {
        return reply.badRequest('No file uploaded.');
      }

      const buffer = await data.toBuffer();
      if (!buffer || buffer.length === 0) {
        return reply.badRequest('Uploaded file is empty.');
      }

      const fields: any = data.fields;
      let organizationId = fields.organizationId?.value;

      if (!organizationId) {
        // Fall back to default organization in tenant
        const defaultOrg = await prisma.organization.findFirst({
          where: { tenantId: request.user!.tenantId, isDefault: true },
        });
        organizationId = defaultOrg?.id;
      }

      if (!organizationId) {
        return reply.badRequest('organizationId is required or a default organization must exist.');
      }

      try {
        const result = await createImportJob(
          request.user!.tenantId,
          organizationId,
          request.user!.id,
          {
            buffer,
            filename: data.filename,
            mimetype: data.mimetype,
          },
        );

        return reply.code(201).send(result);
      } catch (err: any) {
        if (err instanceof ImportValidationError) {
          return reply.badRequest(err.message);
        }
        request.log.error({ err }, 'Failed to process import upload');
        return reply.internalServerError(err.message);
      }
    },
  );

  /**
   * Get Import Job Status & Metadata
   */
  server.get<{ Params: { id: string } }>(
    '/api/imports/:id',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const job = await prisma.importJob.findFirst({
        where: { id: request.params.id, tenantId: request.user!.tenantId },
        include: { organization: true },
      });

      if (!job) {
        return reply.notFound('Import job not found.');
      }

      return reply.send({
        id: job.id,
        status: job.status,
        fileName: job.fileName,
        fileSizeBytes: job.fileSizeBytes,
        organizationId: job.organizationId,
        organizationName: job.organization.name,
        totalRows: job.totalRows,
        validRows: job.validRows,
        invalidRows: job.invalidRows,
        duplicateRows: job.duplicateRows,
        duplicateStrategy: job.duplicateStrategy,
        commitPolicy: job.commitPolicy,
        columnMapping: job.columnMapping,
        detectedDelimiter: job.detectedDelimiter,
        detectedEncoding: job.detectedEncoding,
        previewRows: job.previewRows,
        validationReport: job.validationReport,
        dryRunPassed: job.dryRunPassed,
        isCommitted: job.isCommitted,
        hasErrorReport: Boolean(job.errorReportCsvKey),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      });
    },
  );

  /**
   * Configure column mapping & duplicate resolution strategy
   */
  server.put<{ Params: { id: string }; Body: unknown }>(
    '/api/imports/:id/mapping',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const parsed = configureImportMappingRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.badRequest(parsed.error.errors[0]?.message || 'Invalid mapping payload.');
      }

      try {
        const result = await configureImportJobMapping(request.user!.tenantId, request.params.id, {
          columnMapping: parsed.data.columnMapping as any,
          duplicateStrategy: parsed.data.duplicateStrategy as ImportDuplicateStrategy,
          delimiter: parsed.data.delimiter,
          encoding: parsed.data.encoding,
        });

        return reply.send(result);
      } catch (err: any) {
        if (err instanceof ImportValidationError) {
          return reply.badRequest(err.message);
        }
        return reply.internalServerError(err.message);
      }
    },
  );

  /**
   * Execute full non-persistent dry-run simulation
   */
  server.post<{ Params: { id: string } }>(
    '/api/imports/:id/dry-run',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      try {
        const result = await validateAndSimulateImport(
          request.user!.tenantId,
          request.params.id,
          request.permissions || [],
        );

        return reply.send({
          importJobId: request.params.id,
          dryRunPassed: result.dryRunPassed,
          report: result.report,
        });
      } catch (err: any) {
        if (err instanceof ImportValidationError) {
          return reply.badRequest(err.message);
        }
        return reply.internalServerError(err.message);
      }
    },
  );

  /**
   * Commit the import job into the database
   */
  server.post<{ Params: { id: string }; Body?: unknown }>(
    '/api/imports/:id/commit',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const parsed = importCommitRequestSchema.safeParse(request.body || {});
      const commitPolicy = parsed.success
        ? (parsed.data.commitPolicy as ImportCommitPolicy)
        : ImportCommitPolicy.ALL_OR_NOTHING;

      try {
        const result = await commitImportJob(
          request.user!.tenantId,
          request.params.id,
          request.user!.id,
          {
            commitPolicy,
          },
        );

        return reply.send(result);
      } catch (err: any) {
        if (err instanceof ImportValidationError) {
          return reply.badRequest(err.message);
        }
        return reply.internalServerError(err.message);
      }
    },
  );

  /**
   * Download rejected rows error CSV
   */
  server.get<{ Params: { id: string } }>(
    '/api/imports/:id/errors.csv',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const job = await prisma.importJob.findFirst({
        where: { id: request.params.id, tenantId: request.user!.tenantId },
      });

      if (!job || !job.errorReportCsvKey) {
        return reply.notFound('No error report CSV available for this import job.');
      }

      const filePath = path.resolve(
        process.cwd(),
        '../../storage/temp/imports',
        job.errorReportCsvKey,
      );
      try {
        const fileData = await fs.readFile(filePath);
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="import_errors_${job.id}.csv"`)
          .send(fileData);
      } catch {
        return reply.notFound('Error CSV file missing on server.');
      }
    },
  );
};
