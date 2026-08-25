import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import { env } from '@hr/config';
import { authHookPlugin } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { systemRoutes } from './routes/system.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { roleRoutes } from './routes/roles.js';
import { auditRoutes } from './routes/audit.js';
import { organizationRoutes } from './routes/organizations.js';
import { locationRoutes } from './routes/locations.js';
import { orgUnitRoutes } from './routes/org-units.js';
import { peopleRoutes } from './routes/people.js';
import { identityRoutes } from './routes/identity.js';
import { customFieldRoutes } from './routes/custom-fields.js';
import { mediaRoutes } from './routes/media.js';
import { templateRoutes } from './routes/templates.js';
import { renderRoutes } from './routes/render.js';
import { importRoutes } from './routes/imports.js';
import { exportRoutes } from './routes/exports.js';
import { backupRoutes } from './routes/backups.js';
import { restoreRoutes } from './routes/restore.js';

export function buildServer() {
  const server = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
    disableRequestLogging: env.NODE_ENV === 'test',
  });

  server.register(cors, {
    origin: [env.APP_URL],
    credentials: true,
  });

  server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  });

  server.register(cookie, {
    secret: env.APP_SECRET,
  });

  server.register(sensible);

  // CSRF Defense: Verify Origin / Referer on state-changing requests (POST, PUT, PATCH, DELETE)
  server.addHook('preValidation', async (request, reply) => {
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(request.method)) {
      return;
    }

    const origin = request.headers.origin || request.headers.referer;
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const appUrl = new URL(env.APP_URL);
        const isAllowedOrigin =
          originUrl.host === appUrl.host ||
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1' ||
          originUrl.hostname.endsWith('.lan');

        if (!isAllowedOrigin) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Cross-Site Request Forgery (CSRF) protection: untrusted origin.',
          });
        }
      } catch {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Invalid origin header format.',
        });
      }
    }
  });

  // Register Multipart for secure media/package uploads (25MB package limit)
  server.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB
      files: 1,
    },
  });

  // Register Auth Hooks & Context Decorators
  server.register(authHookPlugin);

  // Register routes
  server.register(healthRoutes);
  server.register(systemRoutes);
  server.register(authRoutes);
  server.register(userRoutes);
  server.register(roleRoutes);
  server.register(auditRoutes);
  server.register(organizationRoutes);
  server.register(locationRoutes);
  server.register(orgUnitRoutes);
  server.register(peopleRoutes);
  server.register(identityRoutes);
  server.register(customFieldRoutes);
  server.register(mediaRoutes);
  server.register(templateRoutes);
  server.register(renderRoutes);
  server.register(importRoutes);
  server.register(exportRoutes);
  server.register(backupRoutes);
  server.register(restoreRoutes);

  return server;
}

export async function start() {
  const server = buildServer();
  try {
    const address = await server.listen({
      port: env.PORT_API,
      host: '0.0.0.0',
    });
    server.log.info(`🚀 API Server listening at ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
