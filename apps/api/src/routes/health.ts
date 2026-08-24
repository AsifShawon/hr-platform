import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const handler = async (request: any, reply: any) => {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err) {
      fastify.log.error({ err }, 'Database health check failed');
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
