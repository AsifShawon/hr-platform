import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { Permission } from '@hr/domain';
import { auditQuerySchema } from '@hr/schemas';

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/audit-events
  fastify.get(
    '/api/audit-events',
    { preHandler: [fastify.requirePermission(Permission.AUDIT_VIEW)] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parseResult = auditQuerySchema.safeParse(request.query);

      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid query parameters.',
          errors: parseResult.error.format(),
        });
      }

      const { page, limit, action, actorId, entityType, from, to } = parseResult.data;
      const skip = (page - 1) * limit;

      const whereClause: any = {
        tenantId,
      };

      if (action) whereClause.action = action;
      if (actorId) whereClause.actorId = actorId;
      if (entityType) whereClause.entityType = entityType;
      if (from || to) {
        whereClause.createdAt = {};
        if (from) whereClause.createdAt.gte = new Date(from);
        if (to) whereClause.createdAt.lte = new Date(to);
      }

      const [totalCount, events] = await prisma.$transaction([
        prisma.auditEvent.count({ where: whereClause }),
        prisma.auditEvent.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return reply.send({
        events: events.map((e) => ({
          id: e.id,
          tenantId: e.tenantId,
          actorId: e.actorId,
          action: e.action,
          entityType: e.entityType,
          entityId: e.entityId,
          details: e.details,
          ipAddress: e.ipAddress,
          createdAt: e.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    },
  );
};
