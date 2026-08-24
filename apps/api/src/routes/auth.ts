import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import { AuditAction, Permission, SESSION_COOKIE_NAME, validatePasswordStrength } from '@hr/domain';
import {
  loginRequestSchema,
  passwordChangeRequestSchema,
  hostedActivationRequestSchema,
} from '@hr/schemas';
import {
  createSession,
  hashPassword,
  hashToken,
  rotateSession,
  verifyPassword,
  generateRecoveryCodes,
  saveRecoveryCodes,
  revokeSession,
  revokeAllOtherSessions,
} from '../services/auth.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

// In-memory rate limiting tracker for failed login attempts
interface FailureTracker {
  count: number;
  lockedUntil: number | null;
}
const loginFailures = new Map<string, FailureTracker>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. POST /api/auth/login
  fastify.post('/api/auth/login', async (request, reply) => {
    const parseResult = loginRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Username and password are required.',
      });
    }

    const { username, password } = parseResult.data;
    const clientIp = request.ip;
    const rateLimitKey = `${clientIp}:${username.toLowerCase()}`;
    const now = Date.now();

    // Check rate limit tracker
    const tracker = loginFailures.get(rateLimitKey);
    if (tracker?.lockedUntil && tracker.lockedUntil > now) {
      const waitSeconds = Math.ceil((tracker.lockedUntil - now) / 1000);
      return reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${Math.ceil(waitSeconds / 60)} minutes.`,
      });
    }

    // Lookup user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: username.toLowerCase() }],
      },
      include: {
        tenant: true,
      },
    });

    // Check user existence and active status
    if (!user || !user.isActive) {
      // Record failure in rate limiter
      const current = loginFailures.get(rateLimitKey) || { count: 0, lockedUntil: null };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = now + LOCKOUT_DURATION_MS;
      }
      loginFailures.set(rateLimitKey, current);

      // Audit log failed attempt with safe masked identifier
      await recordAuditEvent({
        tenantId: user?.tenantId ?? '00000000-0000-0000-0000-000000000000',
        actorId: null,
        action: AuditAction.USER_LOGIN_FAILURE,
        entityType: 'User',
        entityId: user?.id ?? null,
        details: {
          attemptedUsername: username.substring(0, 3) + '***',
          reason: 'Invalid credentials or inactive',
        },
        ipAddress: clientIp,
      });

      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'The username or password entered is incorrect.',
      });
    }

    // Check DB-level lockout
    if (user.lockedUntil && user.lockedUntil.getTime() > now) {
      return reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message:
          'Account is temporarily locked due to excessive failed attempts. Please try again later.',
      });
    }

    // Verify Argon2id password hash
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const current = loginFailures.get(rateLimitKey) || { count: 0, lockedUntil: null };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = now + LOCKOUT_DURATION_MS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 },
            lockedUntil: new Date(now + LOCKOUT_DURATION_MS),
          },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: { increment: 1 } },
        });
      }
      loginFailures.set(rateLimitKey, current);

      await recordAuditEvent({
        tenantId: user.tenantId,
        actorId: user.id,
        action: AuditAction.USER_LOGIN_FAILURE,
        entityType: 'User',
        entityId: user.id,
        details: { attemptedUsername: user.username, reason: 'Invalid password' },
        ipAddress: clientIp,
      });

      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'The username or password entered is incorrect.',
      });
    }

    // Reset failure counters on successful login
    loginFailures.delete(rateLimitKey);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Create server-side session
    const { token, session } = await createSession(
      user.id,
      clientIp,
      request.headers['user-agent'],
    );

    // Set secure HttpOnly cookie
    reply.setCookie(SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Check system installation activation status
    const installation = await prisma.systemInstallation.findFirst();
    const isActivated = installation?.isActivated ?? false;

    // Audit log successful sign-in
    await recordAuditEvent({
      tenantId: user.tenantId,
      actorId: user.id,
      action: AuditAction.USER_LOGIN_SUCCESS,
      entityType: 'User',
      entityId: user.id,
      details: { username: user.username, sessionId: session.id },
      ipAddress: clientIp,
    });

    return reply.send({
      success: true,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        email: user.email,
        isTemporaryBootstrap: user.isTemporaryBootstrap,
        mustChangePassword: user.mustChangePassword,
      },
      system: {
        isActivated,
        requiresActivation: !isActivated && user.isTemporaryBootstrap,
      },
    });
  });

  // 2. POST /api/auth/logout
  fastify.post(
    '/api/auth/logout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const token = request.cookies[SESSION_COOKIE_NAME];
      if (token) {
        const tokenHash = hashToken(token);
        await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {});
      }

      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

      if (request.user) {
        await recordAuditEvent({
          tenantId: request.user.tenantId,
          actorId: request.user.id,
          action: AuditAction.USER_LOGOUT,
          entityType: 'User',
          entityId: request.user.id,
          details: { username: request.user.username },
          ipAddress: request.ip,
        });
      }

      return reply.send({ success: true, message: 'Logged out successfully.' });
    },
  );

  // 3. GET /api/auth/me
  fastify.get('/api/auth/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user!;
    const permissions = request.permissions ?? [];
    const isActivated = request.isActivated ?? false;

    return reply.send({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        isTemporaryBootstrap: user.isTemporaryBootstrap,
        mustChangePassword: user.mustChangePassword,
        roles: user.roles.map((r) => r.name),
        permissions,
      },
      system: {
        isActivated,
        requiresActivation: !isActivated && user.isTemporaryBootstrap,
      },
    });
  });

  // 4. POST /api/auth/password-change
  fastify.post(
    '/api/auth/password-change',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parseResult = passwordChangeRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid password change request.',
          errors: parseResult.error.format(),
        });
      }

      const { currentPassword, newPassword } = parseResult.data;
      const user = request.user!;

      // Verify current password
      const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Current password entered is incorrect.',
        });
      }

      // Check strength of new password
      const strength = validatePasswordStrength(newPassword, {
        username: user.username,
        email: user.email ?? undefined,
      });

      if (!strength.isValid) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: strength.errors[0] ?? 'New password does not meet security requirements.',
          errors: strength.errors,
        });
      }

      // Hash and update password
      const newHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          mustChangePassword: false,
        },
      });

      // Revoke all other active sessions for user (session rotation for security)
      await revokeAllOtherSessions(user.id, request.session!.id);

      await recordAuditEvent({
        tenantId: user.tenantId,
        actorId: user.id,
        action: AuditAction.USER_PASSWORD_CHANGED,
        entityType: 'User',
        entityId: user.id,
        details: { username: user.username },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: 'Password changed successfully. All other active sessions have been invalidated.',
      });
    },
  );

  // 5. GET /api/auth/sessions
  fastify.get(
    '/api/auth/sessions',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const currentSessionId = request.session!.id;

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { lastActiveAt: 'desc' },
      });

      return reply.send({
        sessions: sessions.map((s) => ({
          id: s.id,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          isCurrent: s.id === currentSessionId,
          lastActiveAt: s.lastActiveAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
        })),
      });
    },
  );

  // 6. DELETE /api/auth/sessions/:id
  fastify.delete(
    '/api/auth/sessions/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (id === request.session!.id) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message:
            'Cannot revoke your current session with this endpoint. Please use sign out instead.',
        });
      }

      const revoked = await revokeSession(id, user.id);
      if (!revoked) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Session not found.',
        });
      }

      await recordAuditEvent({
        tenantId: user.tenantId,
        actorId: user.id,
        action: AuditAction.SESSION_REVOKED,
        entityType: 'Session',
        entityId: id,
        details: { sessionId: id },
        ipAddress: request.ip,
      });

      return reply.send({ success: true, message: 'Session revoked successfully.' });
    },
  );

  // 7. POST /api/auth/sessions/revoke-others
  fastify.post(
    '/api/auth/sessions/revoke-others',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user!;
      const currentSessionId = request.session!.id;

      const revokedCount = await revokeAllOtherSessions(user.id, currentSessionId);

      await recordAuditEvent({
        tenantId: user.tenantId,
        actorId: user.id,
        action: AuditAction.SESSION_REVOKED_ALL_OTHERS,
        entityType: 'Session',
        entityId: null,
        details: { revokedCount },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: `Successfully revoked ${revokedCount} other active sessions.`,
        revokedCount,
      });
    },
  );

  // 8. POST /api/auth/hosted/activate (Hosted tenant first-owner token activation)
  fastify.post('/api/auth/hosted/activate', async (request, reply) => {
    const parseResult = hostedActivationRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parseResult.error.errors[0]?.message ?? 'Invalid activation request.',
        errors: parseResult.error.format(),
      });
    }

    const { token, newPassword } = parseResult.data;
    const tokenHash = hashToken(token);

    const provToken = await prisma.provisioningToken.findUnique({
      where: { tokenHash },
      include: { user: true, tenant: true },
    });

    if (!provToken || provToken.usedAt !== null || provToken.expiresAt < new Date()) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Activation link is invalid or has expired.',
      });
    }

    const user = provToken.user;
    const strength = validatePasswordStrength(newPassword, {
      username: user.username,
      email: user.email ?? undefined,
    });

    if (!strength.isValid) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: strength.errors[0] ?? 'Password does not meet security requirements.',
        errors: strength.errors,
      });
    }

    const passwordHash = await hashPassword(newPassword);
    const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          isActive: true,
          mustChangePassword: false,
          isTemporaryBootstrap: false,
        },
      }),
      prisma.provisioningToken.update({
        where: { id: provToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await saveRecoveryCodes(user.id, hashedCodes);

    // Create session
    const { token: sessionToken } = await createSession(
      user.id,
      request.ip,
      request.headers['user-agent'],
    );

    reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    await recordAuditEvent({
      tenantId: user.tenantId,
      actorId: user.id,
      action: AuditAction.USER_ACTIVATED,
      entityType: 'User',
      entityId: user.id,
      details: { username: user.username, deploymentMode: 'hosted' },
      ipAddress: request.ip,
    });

    return reply.send({
      success: true,
      message: 'Account activated successfully.',
      recoveryCodes: plainCodes,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  });
};
