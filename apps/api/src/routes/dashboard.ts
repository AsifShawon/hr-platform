import { FastifyPluginAsync } from 'fastify';
import { Permission } from '@hr/domain';
import { getDashboardOverview } from '../services/dashboard.service.js';

export const dashboardRoutes: FastifyPluginAsync = async (server) => {
  server.get(
    '/api/dashboard/overview',
    {
      preHandler: [server.authenticate, server.requirePermission(Permission.PEOPLE_VIEW)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userPermissions = (request.user as any).permissions || [];
      const query = request.query as { orgId?: string; organizationId?: string };
      const requestedOrgId = query.organizationId || query.orgId || (request.headers['x-organization-id'] as string);

      try {
        const overview = await getDashboardOverview({
          tenantId,
          organizationId: requestedOrgId,
          userPermissions,
        });

        // Set local operational cache header with explicit revalidation instructions
        reply.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return reply.send(overview);
      } catch (err: any) {
        if (err.message === 'ORGANIZATION_NOT_FOUND') {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Requested organization not found or access denied in this workspace.',
          });
        }
        request.log.error({ err }, 'Failed to compute dashboard overview');
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to generate operational dashboard overview.',
        });
      }
    },
  );
};
