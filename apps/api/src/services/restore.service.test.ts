import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import { RestoreService, getMaintenanceMode, setMaintenanceMode } from './restore.service.js';
import { CURRENT_APP_VERSION, CURRENT_SCHEMA_VERSION, encryptPayload } from './backup.service.js';

describe('RestoreService', () => {
  const passphrase = 'ValidRestorePassphrase123!';

  function createTestBackupBundle(manifestOverrides?: any): Buffer {
    const zip = new AdmZip();

    const manifest = {
      bundleVersion: 1,
      appVersion: CURRENT_APP_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      tenant: {
        id: 'test-tenant-id',
        slug: 'test-tenant',
        name: 'Test Tenant Inc.',
      },
      counts: {
        organizations: 1,
        locations: 1,
        orgUnits: 2,
        people: 10,
        employments: 10,
        identityDocuments: 5,
        mediaAssets: 10,
        cardTemplates: 2,
        cardIssues: 0,
        auditEvents: 25,
        users: 2,
        roles: 2,
      },
      mediaSizeBytes: 10240,
      checksums: {},
      ...manifestOverrides,
    };

    const manifestBuf = Buffer.from(JSON.stringify(manifest), 'utf8');
    zip.addFile('manifest.json', manifestBuf);

    const dbData = {
      exportedAt: new Date().toISOString(),
      data: {
        organizations: [],
        locations: [],
        orgUnits: [],
        people: [],
        employments: [],
        identityDocuments: [],
        mediaAssets: [],
        cardFormats: [],
        cardTemplates: [],
        templateVersions: [],
      },
    };
    zip.addFile('database/data.json', Buffer.from(JSON.stringify(dbData), 'utf8'));

    return encryptPayload(zip.toBuffer(), passphrase);
  }

  it('should toggle and query maintenance mode state', () => {
    setMaintenanceMode(false);
    expect(getMaintenanceMode()).toBe(false);

    setMaintenanceMode(true);
    expect(getMaintenanceMode()).toBe(true);

    setMaintenanceMode(false);
    expect(getMaintenanceMode()).toBe(false);
  });

  it('should successfully dry-inspect a valid encrypted backup bundle', async () => {
    const bundle = createTestBackupBundle();
    const result = await RestoreService.inspectBackup(bundle, passphrase);

    expect(result.isValid).toBe(true);
    expect(result.compatibilityStatus).toBe('COMPATIBLE');
    expect(result.tenant.name).toBe('Test Tenant Inc.');
    expect(result.counts.people).toBe(10);
    expect(result.counts.mediaAssets).toBe(10);
    expect(result.errors.length).toBe(0);
  });

  it('should reject inspection when wrong passphrase is provided', async () => {
    const bundle = createTestBackupBundle();
    const result = await RestoreService.inspectBackup(bundle, 'IncorrectPassword999!');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Failed to decrypt backup');
  });

  it('should flag newer app version backups as incompatible', async () => {
    const bundle = createTestBackupBundle({ appVersion: '99.0.0' });
    const result = await RestoreService.inspectBackup(bundle, passphrase);

    expect(result.isValid).toBe(false);
    expect(result.compatibilityStatus).toBe('INCOMPATIBLE_NEWER_VERSION');
    expect(result.errors.some((e) => e.includes('newer app version'))).toBe(true);
  });

  it('should flag older schema version backups with a migration warning', async () => {
    const bundle = createTestBackupBundle({
      appVersion: CURRENT_APP_VERSION,
      schemaVersion: '20260824143113_init',
    });
    const result = await RestoreService.inspectBackup(bundle, passphrase);

    expect(result.isValid).toBe(true);
    expect(result.compatibilityStatus).toBe('WARNING_OLD_VERSION');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
