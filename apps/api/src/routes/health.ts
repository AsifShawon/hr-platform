import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { getMaintenanceMode } from '../services/restore.service.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const handler = async (_request: any, reply: any) => {
    const isMaintenance = getMaintenanceMode();
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err) {
      fastify.log.error({ err }, 'Database health check failed');
    }

    if (isMaintenance) {
      return reply.status(503).send({
        status: 'maintenance',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: process.uptime(),
        version: '0.1.0',
        message: 'System is currently undergoing scheduled restore maintenance.',
      });
    }

    const isHealthy = dbStatus === 'connected';

    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
      version: '0.1.0',
    });
  };

  fastify.get('/health', handler);
  fastify.get('/api/health', handler);
};
