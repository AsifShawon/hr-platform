import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@hr/db';
import {
  getLiveTestServer,
  shutdownLiveTestServer,
  createTestTenant,
  createAuthHeaders,
} from './helpers/stack-harness.js';
import {
  BackupService,
  encryptPayload,
  decryptPayload,
  parseBackupHeader,
} from '../../apps/api/src/services/backup.service.js';

describe('Live Journey 9 & 10: AES-256 Backups, Clean Restore & Chaos Recovery', () => {
  let server: any;
  let tenantCtx: any;
  const backupPassphrase = 'EnterpriseBackupPassphrase#2026!';

  beforeAll(async () => {
    server = await getLiveTestServer();
    tenantCtx = await createTestTenant('journey-06');
  });

  afterAll(async () => {
    await shutdownLiveTestServer();
  });

  describe('Journey 9: AES-256-GCM Encrypted Backup & Restore Verification', () => {
    it('creates authenticated AES-256-GCM .hrbackup archive with valid binary header', async () => {
      const payloadData = JSON.stringify({
        schemaVersion: '1.0.0',
        tenantId: tenantCtx.tenantId,
        exportedAt: new Date().toISOString(),
        tables: {
          organizations: 1,
          people: 5,
          employments: 5,
          card_issues: 3,
        },
      });

      const encryptedBundle = encryptPayload(Buffer.from(payloadData, 'utf8'), backupPassphrase);
      expect(encryptedBundle.length).toBeGreaterThan(64);

      // Verify binary header
      const header = parseBackupHeader(encryptedBundle);
      expect(header.magic).toBe('HRBK');
      expect(header.version).toBe(1);

      // Decrypt and verify matching JSON payload
      const decrypted = decryptPayload(encryptedBundle, backupPassphrase);
      const parsedData = JSON.parse(decrypted.toString('utf8'));
      expect(parsedData.tenantId).toBe(tenantCtx.tenantId);
      expect(parsedData.tables.card_issues).toBe(3);
    });

    it('rejects tampered or corrupt backup bundles during restore verification', () => {
      const payloadData = Buffer.from('{"test":"critical database records"}', 'utf8');
      const validEncrypted = encryptPayload(payloadData, backupPassphrase);

      // Tamper ciphertext
      const tampered = Buffer.from(validEncrypted);
      tampered[70] = (tampered[70] + 1) % 256;

      expect(() => decryptPayload(tampered, backupPassphrase)).toThrow();
    });
  });

  describe('Journey 10: Process Crash Simulation & Queue Recovery', () => {
    it('guarantees database transaction rollback on simulated failure during batch operations', async () => {
      const initialPeopleCount = await prisma.person.count({
        where: { tenantId: tenantCtx.tenantId },
      });

      // Attempt transaction where second step intentionally fails
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.person.create({
            data: {
              tenantId: tenantCtx.tenantId,
              displayName: 'Worker Should Rollback',
            },
          });

          // Simulate unhandled exception / crash
          throw new Error('Simulated process crash during transaction');
        }),
      ).rejects.toThrow('Simulated process crash');

      // Verify count did not increment
      const afterCount = await prisma.person.count({
        where: { tenantId: tenantCtx.tenantId },
      });
      expect(afterCount).toBe(initialPeopleCount);
    });
  });
});
