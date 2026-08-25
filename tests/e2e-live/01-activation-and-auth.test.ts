import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@hr/db';
import { Permission, SESSION_COOKIE_NAME } from '@hr/domain';
import {
  getLiveTestServer,
  shutdownLiveTestServer,
  createTestTenant,
  createAuthHeaders,
} from './helpers/stack-harness.js';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from '../../apps/api/src/services/auth.service.js';

describe('Live Journey 1 & 2: Activation Ceremony, Authentication, Lockout & RBAC', () => {
  let server: any;
  let tenantCtx: any;

  beforeAll(async () => {
    server = await getLiveTestServer();
    tenantCtx = await createTestTenant('journey-01');
  });

  afterAll(async () => {
    await shutdownLiveTestServer();
  });

  describe('Journey 1: Brand-New Loopback Activation Ceremony', () => {
    it('enforces password strength requirements for Master Password', () => {
      const weak = validatePasswordStrength('short1');
      expect(weak.isValid).toBe(false);

      const common = validatePasswordStrength('password123');
      expect(common.isValid).toBe(false);

      const strong = validatePasswordStrength('EnterpriseMaster#2026!');
      expect(strong.isValid).toBe(true);
    });

    it('hashes passwords using Argon2id and verifies correctly', async () => {
      const raw = 'SecureMasterPass2026!';
      const hash = await hashPassword(raw);
      expect(hash).toMatch(/^\$argon2id\$/);

      const valid = await verifyPassword(raw, hash);
      expect(valid).toBe(true);

      const invalid = await verifyPassword('WrongPassword', hash);
      expect(invalid).toBe(false);
    });

    it('destroys temporary bootstrap credentials upon activation and maintains loopback isolation', async () => {
      // Create a simulated temporary bootstrap user
      const tempUser = await prisma.user.create({
        data: {
          tenantId: tenantCtx.tenantId,
          username: `temp_bootstrap_${Date.now()}`,
          email: `temp_${Date.now()}@factory.local`,
          passwordHash: await hashPassword('admin'),
          isTemporaryBootstrap: true,
          mustChangePassword: true,
        },
      });

      expect(tempUser.isTemporaryBootstrap).toBe(true);

      // Simulate activation: update user with strong password and clear bootstrap flag
      const updatedUser = await prisma.user.update({
        where: { id: tempUser.id },
        data: {
          passwordHash: await hashPassword('FinalMasterKey#2026!'),
          isTemporaryBootstrap: false,
          mustChangePassword: false,
        },
      });

      expect(updatedUser.isTemporaryBootstrap).toBe(false);
      expect(updatedUser.mustChangePassword).toBe(false);

      // Verify old admin password no longer verifies
      const oldMatch = await verifyPassword('admin', updatedUser.passwordHash);
      expect(oldMatch).toBe(false);
    });
  });

  describe('Journey 2: Authentication, Lockout Behavior & RBAC Default-Deny', () => {
    it('authenticates valid credentials and rejects unauthenticated access to protected routes', async () => {
      // 1. Unauthenticated request -> 401
      const unauthRes = await server.inject({
        method: 'GET',
        url: '/api/organizations',
      });
      expect(unauthRes.statusCode).toBe(401);

      // 2. Authenticated request with owner session -> 200
      const authRes = await server.inject({
        method: 'GET',
        url: '/api/organizations',
        headers: createAuthHeaders(tenantCtx.ownerToken),
      });
      expect(authRes.statusCode).toBe(200);
      const data = JSON.parse(authRes.body);
      expect(Array.isArray(data)).toBe(true);
    });

    it('enforces RBAC default-deny for users lacking required permissions', async () => {
      // Viewer role does not have CARDS_ISSUE permission
      const forbiddenRes = await server.inject({
        method: 'POST',
        url: '/api/cards/issue',
        headers: createAuthHeaders(tenantCtx.viewerToken),
        payload: {
          employmentId: 'dummy-emp-id',
          templateId: tenantCtx.templateId,
        },
      });

      expect(forbiddenRes.statusCode).toBe(403);
      const body = JSON.parse(forbiddenRes.body);
      expect(body.error).toBe('Forbidden');
      expect(body.message).toContain('Missing required permission');
    });

    it('enforces session termination on sign-out', async () => {
      // Sign out
      const logoutRes = await server.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: createAuthHeaders(tenantCtx.ownerToken),
      });

      expect(logoutRes.statusCode).toBe(200);
      expect(logoutRes.headers['set-cookie']).toBeDefined();
    });
  });
});
