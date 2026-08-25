import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@hr/db';
import { JobCategory, EmploymentStatus, Permission } from '@hr/domain';
import {
  getLiveTestServer,
  shutdownLiveTestServer,
  createTestTenant,
  createAuthHeaders,
} from './helpers/stack-harness.js';
import { sanitizeAuditDetails } from '../../apps/api/src/services/audit.service.js';
import { extractAndValidateZip } from '../../apps/api/src/services/zip-archive.service.js';
import AdmZip from 'adm-zip';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('Live Journey 11: Security Invariants, CSRF, Zip-Slip & Log Redaction', () => {
  let server: any;
  let tenantA: any;
  let tenantB: any;
  let tenantAPersonId: string;

  beforeAll(async () => {
    server = await getLiveTestServer();
    tenantA = await createTestTenant('sec-tenant-a');
    tenantB = await createTestTenant('sec-tenant-b');

    // Create worker in Tenant A
    const personA = await prisma.person.create({
      data: {
        tenantId: tenantA.tenantId,
        displayName: 'Tenant A Worker',
        employments: {
          create: {
            tenantId: tenantA.tenantId,
            organizationId: tenantA.orgId,
            employeeNumber: `EMP-TENA-${Date.now().toString().slice(-4)}`,
            jobTitle: 'Supervisor',
            jobCategory: JobCategory.REGULAR,
            employmentStatus: EmploymentStatus.ACTIVE,
          },
        },
      },
    });
    tenantAPersonId = personA.id;
  });

  afterAll(async () => {
    await shutdownLiveTestServer();
  });

  describe('Tenant Boundary Isolation (No Cross-Tenant Access)', () => {
    it('denies Tenant B user from accessing Tenant A worker records (returns 404/403)', async () => {
      const crossTenantRes = await server.inject({
        method: 'GET',
        url: `/api/people/${tenantAPersonId}`,
        headers: createAuthHeaders(tenantB.ownerToken),
      });

      // Tenant isolation must treat records outside the caller tenant as non-existent (404)
      expect(crossTenantRes.statusCode).toBe(404);
    });

    it('denies Tenant B user from issuing a card for Tenant A employment', async () => {
      const crossIssueRes = await server.inject({
        method: 'POST',
        url: '/api/cards/issue',
        headers: createAuthHeaders(tenantB.ownerToken),
        payload: {
          employmentId: tenantAPersonId, // passing foreign ID
          templateId: tenantB.templateId,
        },
      });

      expect(crossIssueRes.statusCode).toBe(404);
    });
  });

  describe('CSRF & Origin Enforcement', () => {
    it('rejects state-changing requests from untrusted external origins (CSRF defense)', async () => {
      const untrustedRes = await server.inject({
        method: 'POST',
        url: '/api/locations',
        headers: createAuthHeaders(tenantA.ownerToken, 'http://malicious-phishing-site.com'),
        payload: {
          organizationId: tenantA.orgId,
          name: 'Attacker Location',
          code: 'ATTACK-1',
        },
      });

      expect(untrustedRes.statusCode).toBe(403);
      const body = JSON.parse(untrustedRes.body);
      expect(body.message).toContain('Cross-Site Request Forgery');
    });
  });

  describe('Zip-Slip & Malicious Upload Protection', () => {
    const tempTestDir = path.resolve(process.cwd(), 'tests/e2e-live/helpers/temp_zip_test');

    beforeAll(async () => {
      await fs.mkdir(tempTestDir, { recursive: true });
    });

    afterAll(async () => {
      await fs.rm(tempTestDir, { recursive: true, force: true });
    });

    it('blocks Zip-Slip directory traversal attempts in imported zip archives', async () => {
      const zip = new AdmZip();
      zip.addFile('valid.csv', Buffer.from('employee_number,display_name\nEMP-1,Valid\n'));
      zip.addFile('evil.txt', Buffer.from('malicious data'));
      const entries = zip.getEntries();
      if (entries[1]) entries[1].entryName = '../../../../etc/shadow';
      const zipBuffer = zip.toBuffer();

      const targetExtractDir = path.join(tempTestDir, 'slip_test');
      await expect(extractAndValidateZip(zipBuffer, targetExtractDir)).rejects.toThrow(
        /Directory traversal attack detected/,
      );
    });
  });

  describe('Log & Audit Redaction Safeguards', () => {
    it('masks sensitive tokens, passwords, and NIDs from audit logs and output streams', () => {
      const rawAuditData = {
        username: 'admin',
        password: 'SuperSecretPassword!',
        token: 'opq_9876543210abcdef',
        nationalId: '19901234567890',
        dateOfBirth: '1990-05-15',
        action: 'USER_LOGIN',
      };

      const sanitized = sanitizeAuditDetails(rawAuditData);

      // Verify passwords and tokens are redacted
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.nationalId).toBeUndefined();
    });
  });
});
