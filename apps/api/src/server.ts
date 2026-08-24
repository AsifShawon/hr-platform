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
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  server.register(cookie, {
    secret: env.APP_SECRET,
  });

  server.register(sensible);

  // Register Multipart for secure media/photo uploads (10MB file limit)
  server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
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
