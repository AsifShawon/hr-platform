import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePasswordStrength, BuiltInRole, Permission } from '@hr/domain';
import {
  hashPassword,
  verifyPassword,
  generateRecoveryCodes,
  generateOpaqueToken,
  hashToken,
} from '../src/services/auth.service.js';
import { sanitizeAuditDetails } from '../src/services/audit.service.js';
import {
  ensureNotLastActiveSystemOwner,
  LastOwnerProtectionError,
} from '../src/services/user.service.js';
import { prisma } from '@hr/db';
import { buildServer } from '../src/server.js';

describe('Phase 2: Authentication & Security Foundations', () => {
  describe('Password Strength & Common Password Defense', () => {
    it('rejects passwords shorter than 10 characters', () => {
      const result = validatePasswordStrength('Short1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 10 characters long.');
    });

    it('rejects common passwords from the offline blocklist', () => {
      const result = validatePasswordStrength('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('common or easily guessable'))).toBe(true);
    });

    it('rejects passwords containing the username', () => {
      const result = validatePasswordStrength('SecretAdmin2026', { username: 'admin' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain your username.');
    });

    it('accepts strong unique passwords with letters and numbers', () => {
      const result = validatePasswordStrength('K9#mX7!qL2p99v');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Argon2id Hashing & Token Digest', () => {
    it('produces valid Argon2id hashes and verifies matching passwords', async () => {
      const rawPassword = 'SuperStrongPassword2026!';
      const hash = await hashPassword(rawPassword);
      expect(hash).toMatch(/^\$argon2id\$/);

      const isValid = await verifyPassword(rawPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('generates opaque cryptographic tokens and deterministic SHA-256 hashes', () => {
      const { token, tokenHash } = generateOpaqueToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThanOrEqual(40);
      expect(tokenHash).toHaveLength(64);
      expect(hashToken(token)).toBe(tokenHash);
    });

    it('generates 8 distinct 10-character recovery codes with hashes', () => {
      const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
      expect(plainCodes).toHaveLength(8);
      expect(hashedCodes).toHaveLength(8);
      for (const code of plainCodes) {
        expect(code).toHaveLength(10);
        expect(hashToken(code)).toBeDefined();
      }
    });
  });

  describe('Audit Parameter Redaction & Privacy Safeguards', () => {
    it('strictly sanitizes passwords, tokens, recovery codes, and sensitive PII', () => {
      const input = {
        username: 'tanvir',
        email: 'tanvir@example.com',
        password: 'PlainTextPassword123',
        token: 'secret_token_value',
        recoveryCodes: ['CODE1', 'CODE2'],
        nationalId: '19901234567890123',
        role: 'system_owner',
      };

      const sanitized = sanitizeAuditDetails(input);
      expect(sanitized).toBeDefined();
      expect(sanitized?.password).toBe('[REDACTED]');
      expect(sanitized?.token).toBe('[REDACTED]');
      expect(sanitized?.recoveryCodes).toBe('[REDACTED]');
      expect(sanitized?.nationalId).toBe('[REDACTED]');
      expect(sanitized?.email).toBe('t***@example.com');
      expect(sanitized?.username).toBe('tanvir');
      expect(sanitized?.role).toBe('system_owner');
    });
  });

  describe('Last Active System Owner Protection', () => {
    it('throws LastOwnerProtectionError when deactivating the only active system owner', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-owner-1';

      vi.spyOn(prisma.role, 'findFirst').mockResolvedValueOnce({
        id: 'role-owner-id',
        tenantId,
        name: BuiltInRole.SYSTEM_OWNER,
        description: null,
        isBuiltIn: true,
        permissions: Object.values(Permission) as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.roleGrant, 'findFirst').mockResolvedValueOnce({
        id: 'grant-1',
        userId,
        roleId: 'role-owner-id',
        createdAt: new Date(),
      });

      vi.spyOn(prisma.user, 'count').mockResolvedValueOnce(0); // 0 other active owners

      await expect(
        ensureNotLastActiveSystemOwner(tenantId, userId, undefined, false),
      ).rejects.toThrow(LastOwnerProtectionError);
    });

    it('allows deactivating a system owner if another active system owner exists', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-owner-1';

      vi.spyOn(prisma.role, 'findFirst').mockResolvedValueOnce({
        id: 'role-owner-id',
        tenantId,
        name: BuiltInRole.SYSTEM_OWNER,
        description: null,
        isBuiltIn: true,
        permissions: Object.values(Permission) as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.roleGrant, 'findFirst').mockResolvedValueOnce({
        id: 'grant-1',
        userId,
        roleId: 'role-owner-id',
        createdAt: new Date(),
      });

      vi.spyOn(prisma.user, 'count').mockResolvedValueOnce(1); // 1 other active owner exists

      await expect(
        ensureNotLastActiveSystemOwner(tenantId, userId, undefined, false),
      ).resolves.not.toThrow();
    });
  });

  describe('Fastify Server Security Handlers & Route Integration', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('responds to GET /health or /api/health with status info', async () => {
      const server = buildServer();
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect([200, 503]).toContain(response.statusCode);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
    });

    it('returns 401 Unauthorized for unauthenticated requests to protected endpoints', async () => {
      const server = buildServer();
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.payload);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles system status lookup with mock installation', async () => {
      vi.spyOn(prisma.systemInstallation, 'findFirst').mockResolvedValueOnce({
        id: 'inst-1',
        isActivated: false,
        activatedAt: null,
        deploymentMode: 'local',
        lanEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const server = buildServer();
      const response = await server.inject({
        method: 'GET',
        url: '/api/system/status',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.isActivated).toBe(false);
      expect(data.deploymentMode).toBe('local');
    });

    it('returns 401 on login failure when user not found without account existence disclosure', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce(null);
      vi.spyOn(prisma.auditEvent, 'create').mockResolvedValueOnce({} as any);

      const server = buildServer();
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'non_existent_user',
          password: 'SomePassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe('The username or password entered is incorrect.');
    });
  });
});
