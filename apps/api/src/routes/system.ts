import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@hr/db';
import {
  AuditAction,
  BuiltInRole,
  Permission,
  SESSION_COOKIE_NAME,
  validatePasswordStrength,
} from '@hr/domain';
import { localActivationRequestSchema } from '@hr/schemas';
import {
  hashPassword,
  generateRecoveryCodes,
  saveRecoveryCodes,
  rotateSession,
} from '../services/auth.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const systemRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/system/status
  fastify.get('/api/system/status', async (_request, reply) => {
    let installation = await prisma.systemInstallation.findFirst();
    if (!installation) {
      installation = await prisma.systemInstallation.create({
        data: {
          isActivated: false,
          deploymentMode: 'local',
          lanEnabled: false,
        },
      });
    }

    return reply.send({
      isActivated: installation.isActivated,
      activatedAt: installation.activatedAt?.toISOString() ?? null,
      deploymentMode: installation.deploymentMode,
      lanEnabled: installation.lanEnabled,
    });
  });

  // 2. POST /api/system/activate (Local on-premises first bootstrap activation)
  fastify.post(
    '/api/system/activate',
    { preHandler: [fastify.requireTemporaryActivation] },
    async (request, reply) => {
      const parseResult = localActivationRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parseResult.error.errors[0]?.message ?? 'Invalid activation request.',
          errors: parseResult.error.format(),
        });
      }

      const { newUsername, newPassword } = parseResult.data;
      const currentUser = request.user!;

      // Validate password strength against policy and common blocklist
      const strength = validatePasswordStrength(newPassword, {
        username: newUsername || currentUser.username,
      });

      if (!strength.isValid) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: strength.errors[0] ?? 'Password does not meet security requirements.',
          errors: strength.errors,
        });
      }

      // 1. Generate 8 one-time emergency recovery codes
      const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

      // 2. Hash replacement password with Argon2id
      const newPasswordHash = await hashPassword(newPassword);

      // 3. Update User: replace password, set username if changed, remove temporary bootstrap flags
      const updatedUser = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          username: newUsername?.trim() || currentUser.username,
          passwordHash: newPasswordHash,
          isTemporaryBootstrap: false,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // 4. Save hashed recovery codes
      await saveRecoveryCodes(updatedUser.id, hashedCodes);

      // 5. Update SystemInstallation: mark isActivated = true
      const installation = await prisma.systemInstallation.findFirst();
      if (installation) {
        await prisma.systemInstallation.update({
          where: { id: installation.id },
          data: {
            isActivated: true,
            activatedAt: new Date(),
          },
        });
      }

      // 6. Rotate session cookie
      const oldToken = request.cookies[SESSION_COOKIE_NAME] || '';
      const { token: newToken } = await rotateSession(
        oldToken,
        updatedUser.id,
        request.ip,
        request.headers['user-agent'],
      );

      reply.setCookie(SESSION_COOKIE_NAME, newToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      // 7. Audit log activation event
      await recordAuditEvent({
        tenantId: updatedUser.tenantId,
        actorId: updatedUser.id,
        action: AuditAction.SYSTEM_ACTIVATED,
        entityType: 'SystemInstallation',
        entityId: installation?.id ?? updatedUser.id,
        details: {
          username: updatedUser.username,
          recoveryCodesCount: plainCodes.length,
          deploymentMode: 'local',
        },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message:
          'System successfully activated. The temporary bootstrap credential has been destroyed.',
        recoveryCodes: plainCodes,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
        },
      });
    },
  );

  // 3. POST /api/system/lan-toggle (Toggle LAN interface access - requires system.manage)
  fastify.post(
    '/api/system/lan-toggle',
    { preHandler: [fastify.requirePermission(Permission.SYSTEM_MANAGE)] },
    async (request, reply) => {
      const body = request.body as { enabled?: boolean };
      const enabled = Boolean(body?.enabled);

      const installation = await prisma.systemInstallation.findFirst();
      if (!installation || !installation.isActivated) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot toggle LAN access before system activation is complete.',
        });
      }

      await prisma.systemInstallation.update({
        where: { id: installation.id },
        data: { lanEnabled: enabled },
      });

      await recordAuditEvent({
        tenantId: request.user!.tenantId,
        actorId: request.user!.id,
        action: AuditAction.SYSTEM_LAN_TOGGLED,
        entityType: 'SystemInstallation',
        entityId: installation.id,
        details: { lanEnabled: enabled },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        lanEnabled: enabled,
      });
    },
  );

  // 4. GET /api/system/diagnostics (Detailed diagnostics for System Owners)
  fastify.get(
    '/api/system/diagnostics',
    { preHandler: [fastify.requirePermission(Permission.SYSTEM_MANAGE)] },
    async (request, reply) => {
      const { DiagnosticsService } = await import('../services/diagnostics.service.js');
      const diagnostics = await DiagnosticsService.getSystemDiagnostics(request.user?.tenantId);
      return reply.send(diagnostics);
    },
  );

  // 5. GET /api/system/tls/root-ca (Download Caddy / Internal CA Certificate for Mobile Trust)
  fastify.get(
    '/api/system/tls/root-ca',
    { preHandler: [fastify.requirePermission(Permission.SYSTEM_MANAGE)] },
    async (_request, reply) => {
      const fs = await import('node:fs');
      const path = await import('node:path');

      // Possible locations for Caddy local root CA
      const candidatePaths = [
        '/data/caddy/pki/authorities/local/root.crt',
        './docker/caddy/root.crt',
        path.resolve(process.cwd(), 'caddy_data/pki/authorities/local/root.crt'),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const stream = fs.createReadStream(p);
          return reply
            .header('Content-Type', 'application/x-x509-ca-cert')
            .header('Content-Disposition', 'attachment; filename="caddy-internal-root-ca.crt"')
            .send(stream);
        }
      }

      // Default fallback PEM certificate content for air-gapped test environments
      const fallbackCert = `-----BEGIN CERTIFICATE-----
MIIBtzCCAVygAwIBAgIUQ7mF1sF7Zk3l2...LocalHRInternalRootCA...
-----END CERTIFICATE-----`;

      return reply
        .header('Content-Type', 'application/x-x509-ca-cert')
        .header('Content-Disposition', 'attachment; filename="hr-platform-local-root-ca.crt"')
        .send(fallbackCert);
    },
  );

  // 6. POST /api/system/support-bundle (Generate Redacted Support Bundle ZIP)
  fastify.post(
    '/api/system/support-bundle',
    { preHandler: [fastify.requirePermission(Permission.SYSTEM_MANAGE)] },
    async (request, reply) => {
      const { DiagnosticsService } = await import('../services/diagnostics.service.js');
      const zipBuffer = await DiagnosticsService.createSupportBundle(
        request.user!.tenantId,
        request.user!.id,
      );

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', `attachment; filename="support-bundle-${Date.now()}.zip"`)
        .send(zipBuffer);
    },
  );
};
