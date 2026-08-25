import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Permission } from '@hr/domain';
import { RestoreService } from '../services/restore.service.js';

export const restoreRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /**
   * 1. Dry Inspect an Encrypted Backup Bundle
   * POST /api/restore/inspect
   */
  server.post(
    '/api/restore/inspect',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.SYSTEM_MANAGE)],
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.badRequest('Backup bundle file is required.');
      }

      const fileBuffer = await data.toBuffer();
      const fields = data.fields as Record<string, any>;
      const passphrase = fields?.passphrase?.value;

      if (!passphrase) {
        return reply.badRequest('Passphrase is required to inspect the backup bundle.');
      }

      try {
        const result = await RestoreService.inspectBackup(fileBuffer, passphrase);
        return reply.send(result);
      } catch (err: any) {
        request.log.error({ err }, 'Backup inspection error');
        return reply.badRequest(err.message || 'Failed to inspect backup bundle.');
      }
    },
  );

  /**
   * 2. Execute Restore Operation with Re-Authentication & Pre-Restore Snapshot
   * POST /api/restore/execute
   */
  server.post(
    '/api/restore/execute',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.SYSTEM_MANAGE)],
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.badRequest('Backup bundle file is required.');
      }

      const fileBuffer = await data.toBuffer();
      const fields = data.fields as Record<string, any>;
      const passphrase = fields?.passphrase?.value;
      const ownerPassword = fields?.ownerPassword?.value;
      const confirmRollback =
        fields?.confirmRollbackAwareness?.value === 'true' ||
        fields?.confirmRollbackAwareness?.value === true;

      if (!passphrase) {
        return reply.badRequest('Backup passphrase is required.');
      }

      if (!ownerPassword) {
        return reply.badRequest('System Owner password confirmation is required.');
      }

      if (!confirmRollback) {
        return reply.badRequest('You must confirm awareness of the restore operation.');
      }

      try {
        const result = await RestoreService.executeRestore({
          tenantId: request.user!.tenantId,
          userId: request.user!.id,
          backupBuffer: fileBuffer,
          passphrase,
          ownerPassword,
        });

        return reply.send(result);
      } catch (err: any) {
        request.log.error({ err }, 'Restore execution failed');
        return reply.badRequest(err.message || 'Restore execution failed.');
      }
    },
  );
};
