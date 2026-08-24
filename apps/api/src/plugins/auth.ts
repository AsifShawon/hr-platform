import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { Permission, SESSION_COOKIE_NAME } from '@hr/domain';
import { validateSession, ResolvedAuthContext } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    authContext?: ResolvedAuthContext;
    user?: ResolvedAuthContext['user'];
    session?: ResolvedAuthContext['session'];
    permissions?: Permission[];
    isActivated?: boolean;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (
      permission: Permission,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireActivated: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireTemporaryActivation: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication session cookie is missing or expired.',
      });
    }

    const context = await validateSession(token);
    if (!context) {
      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired session.',
      });
    }

    request.authContext = context;
    request.user = context.user;
    request.session = context.session;
    request.permissions = context.permissions;
    request.isActivated = context.isActivated;
  });

  fastify.decorate('requirePermission', (permission: Permission) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply);
      if (reply.sent) return;

      // If system is unactivated and user is temporary bootstrap, block general API access
      if (!request.isActivated && request.user?.isTemporaryBootstrap) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          code: 'ACTIVATION_REQUIRED',
          message: 'System activation is required before accessing application resources.',
        });
      }

      if (!request.permissions?.includes(permission)) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: `Permission denied: Missing required permission '${permission}'.`,
        });
      }
    };
  });

  fastify.decorate('requireActivated', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply);
    if (reply.sent) return;

    if (!request.isActivated) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        code: 'ACTIVATION_REQUIRED',
        message: 'System activation is required before performing this operation.',
      });
    }
  });

  fastify.decorate(
    'requireTemporaryActivation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply);
      if (reply.sent) return;

      if (request.isActivated) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'System is already activated.',
        });
      }

      if (!request.user?.isTemporaryBootstrap) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only temporary bootstrap administrator session can activate the system.',
        });
      }
    },
  );
};

export const authHookPlugin = fp(authPlugin);
