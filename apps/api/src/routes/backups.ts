import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import { prisma } from '@hr/db';
import { AuditAction, Permission } from '@hr/domain';
import { createBackupRequestSchema, updateBackupScheduleRequestSchema } from '@hr/schemas';
import { BackupService } from '../services/backup.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const backupRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /**
   * 1. Trigger Manual Encrypted Backup
   * POST /api/backups
   */
  server.post(
    '/api/backups',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.BACKUP_MANAGE)],
    },
    async (request, reply) => {
      const parseResult = createBackupRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.badRequest(parseResult.error.errors[0]?.message || 'Invalid backup request.');
      }

      const { passphrase, targetDirectory } = parseResult.data;
      const tenantId = request.user!.tenantId;

      try {
        const job = await BackupService.createBackup({
          tenantId,
          userId: request.user!.id,
          passphrase,
          targetDirectory,
        });

        return reply.code(201).send(job);
      } catch (err: any) {
        request.log.error({ err }, 'Failed to create backup');
        return reply.internalServerError(err.message || 'Failed to create backup.');
      }
    },
  );

  /**
   * 2. List Tenant Backups
   * GET /api/backups
   */
  server.get(
    '/api/backups',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.BACKUP_MANAGE)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const jobs = await prisma.backupJob.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        backups: jobs.map((job) => ({
          id: job.id,
          tenantId: job.tenantId,
          status: job.status,
          trigger: job.trigger,
          fileName: job.fileName,
          filePath: job.filePath,
          fileSizeBytes: job.fileSizeBytes,
          checksumSha256: job.checksumSha256,
          appVersion: job.appVersion,
          schemaVersion: job.schemaVersion,
          totalRecords: job.totalRecords,
          totalMediaFiles: job.totalMediaFiles,
          isVerified: job.isVerified,
          verifiedAt: job.verifiedAt?.toISOString() ?? null,
          errorMessage: job.errorMessage,
          durationMs: job.durationMs,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        })),
      });
    },
  );

  /**
   * 3. Download Encrypted Backup File
   * GET /api/backups/:id/download
   */
  server.get<{ Params: { id: string } }>(
    '/api/backups/:id/download',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.BACKUP_MANAGE)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await prisma.backupJob.findFirst({
        where: { id: request.params.id, tenantId },
      });

      if (!job) {
        return reply.notFound('Backup job not found.');
      }

      if (!fs.existsSync(job.filePath)) {
        return reply.notFound('Backup file no longer exists on disk.');
      }

      const fileStream = fs.createReadStream(job.filePath);
      return reply
        .header('Content-Type', 'application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${job.fileName}"`)
        .send(fileStream);
    },
  );

  /**
   * 4. Verify Existing Backup Bundle
   * POST /api/backups/verify/:id
   */
  server.post<{ Params: { id: string }; Body: { passphrase: string } }>(
    '/api/backups/verify/:id',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.BACKUP_MANAGE)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { passphrase } = request.body || {};
      if (!passphrase) {
        return reply.badRequest('Passphrase is required to verify backup bundle.');
      }

      const job = await prisma.backupJob.findFirst({
        where: { id: request.params.id, tenantId },
      });

      if (!job) {
        return reply.notFound('Backup job not found.');
      }

      if (!fs.existsSync(job.filePath)) {
        return reply.notFound('Backup file not found on disk.');
      }

      try {
        const { isValid, manifest } = await BackupService.verifyBackupFile(
          job.filePath,
          passphrase,
        );
        await prisma.backupJob.update({
          where: { id: job.id },
          data: { isVerified: true, verifiedAt: new Date() },
        });

        await recordAuditEvent({
          tenantId,
          actorId: request.user!.id,
          action: AuditAction.BACKUP_VERIFIED,
          entityType: 'BackupJob',
          entityId: job.id,
          details: { fileName: job.fileName, isValid },
        });

        return reply.send({
          isValid,
          verifiedAt: new Date().toISOString(),
          manifest,
        });
      } catch (err: any) {
        return reply.badRequest(err.message || 'Backup verification failed.');
      }
    },
  );

  /**
   * 5. Get Backup Schedule Settings
   * GET /api/backups/schedule
   */
  server.get(
    '/api/backups/schedule',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.BACKUP_MANAGE)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      let schedule = await prisma.backupSchedule.findUnique({
        where: { tenantId },
      });

      if (!schedule) {
        schedule = await prisma.backupSchedule.create({
          data: {
            tenantId,
            isEnabled: false,
            cronExpression: '0 2 * * *',
            retentionCount: 7,
            targetDirectory: './backups',
          },
        });
      }

      const safety = BackupService.evaluateStorageSafety(schedule.targetDirectory);

      return reply.send({
        schedule: {
          id: schedule.id,
          tenantId: schedule.tenantId,
          isEnabled: schedule.isEnabled,
          cronExpression: schedule.cronExpression,
          retentionCount: schedule.retentionCount,
          targetDirectory: schedule.targetDirectory,
          lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
          nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
          createdAt: schedule.createdAt.toISOString(),
          updatedAt: schedule.updatedAt.toISOString(),
        },
        storageSafety: safety,
      });
    },
  );

  /**
   * 6. Update Backup Schedule Settings
   * PUT /api/backups/schedule
   */
  server.put(
    '/api/backups/schedule',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.BACKUP_MANAGE)],
    },
    async (request, reply) => {
      const parseResult = updateBackupScheduleRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.badRequest(
          parseResult.error.errors[0]?.message || 'Invalid schedule payload.',
        );
      }

      const tenantId = request.user!.tenantId;
      const { isEnabled, cronExpression, retentionCount, targetDirectory } = parseResult.data;

      const schedule = await prisma.backupSchedule.upsert({
        where: { tenantId },
        create: {
          tenantId,
          isEnabled,
          cronExpression,
          retentionCount,
          targetDirectory,
        },
        update: {
          isEnabled,
          cronExpression,
          retentionCount,
          targetDirectory,
        },
      });

      await recordAuditEvent({
        tenantId,
        actorId: request.user!.id,
        action: AuditAction.BACKUP_SCHEDULE_UPDATED,
        entityType: 'BackupSchedule',
        entityId: schedule.id,
        details: { isEnabled, cronExpression, retentionCount, targetDirectory },
      });

      const safety = BackupService.evaluateStorageSafety(schedule.targetDirectory);

      return reply.send({
        schedule: {
          id: schedule.id,
          tenantId: schedule.tenantId,
          isEnabled: schedule.isEnabled,
          cronExpression: schedule.cronExpression,
          retentionCount: schedule.retentionCount,
          targetDirectory: schedule.targetDirectory,
          lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
          nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
          createdAt: schedule.createdAt.toISOString(),
          updatedAt: schedule.updatedAt.toISOString(),
        },
        storageSafety: safety,
      });
    },
  );
};
