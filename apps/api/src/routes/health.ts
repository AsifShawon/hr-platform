import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { DiagnosticsService } from '../services/diagnostics.service.js';

export const healthRoutes: FastifyPluginAsync = async (server) => {
  // GET /health - Unauthenticated liveness probe for Docker / Orchestration
  server.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/system/health - Lightweight health endpoint for authenticated UI shell
  server.get(
    '/api/system/health',
    {
      preHandler: [server.authenticate],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      try {
        const diagnostics = await DiagnosticsService.getSystemDiagnostics(tenantId);

        return reply.send({
          status: diagnostics.status,
          timestamp: diagnostics.timestamp,
          uptimeSeconds: diagnostics.uptimeSeconds,
          appVersion: diagnostics.appVersion,
          components: {
            database: diagnostics.components.database,
            storage: {
              status: diagnostics.components.storage.status,
              writable: diagnostics.components.storage.writable,
            },
            renderer: diagnostics.components.renderer,
            backups: diagnostics.components.backups,
          },
          disk: {
            isLowDisk: diagnostics.disk.isLowDisk,
            usedPercentage: diagnostics.disk.usedPercentage,
          },
        });
      } catch (err: any) {
        request.log.error({ err }, 'Error retrieving system health status');
        return reply.status(500).send({
          status: 'error',
          error: 'Failed to retrieve system health status.',
        });
      }
    },
  );
};
