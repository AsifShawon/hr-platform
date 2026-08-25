import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import AdmZip from 'adm-zip';
import { prisma } from '@hr/db';
import {
  executeWorkerExport,
  getExportDownloadStream,
  ExportValidationError,
} from '../src/services/worker-export.service.js';
import { parseCsv } from '../src/services/csv-parser.service.js';
import { createPerson } from '../src/services/person.service.js';
import { FICTIONAL_PEOPLE } from '@hr/fixtures';
import {
  Gender,
  EmploymentStatus,
  JobCategory,
  IdentityDocumentType,
  Permission,
} from '@hr/domain';

describe('Phase 9: Portable Worker Export, Manifests & Privileged Safeguards', () => {
  let tenantId: string;
  let organizationId: string;
  let userId: string;

  beforeEach(async () => {
    const slug = `export-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Export Test Workspace' },
    });
    tenantId = tenant.id;

    const org = await prisma.organization.create({
      data: {
        tenantId,
        name: 'London Boy Apparel Ltd.',
        displayName: 'London Boy Apparel',
        code: `LBA_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        isDefault: true,
      },
    });
    organizationId = org.id;

    const user = await prisma.user.create({
      data: {
        tenantId,
        username: `exporter_${Math.random().toString(36).substring(2, 6)}`,
        passwordHash: 'dummy_hash',
      },
    });
    userId = user.id;

    // Seed 20 fictional workers from fixture dataset
    for (const p of FICTIONAL_PEOPLE) {
      await createPerson(tenantId, {
        displayName: p.displayName,
        displayNameLatin: p.displayNameLatin,
        displayNameNative: p.displayNameNative,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        primaryPhone: p.primaryPhone,
        primaryEmail: p.primaryEmail,
        employment: {
          organizationId,
          employeeNumber: p.employment.employeeNumber,
          jobTitle: p.employment.jobTitle,
          jobCategory: p.employment.jobCategory,
          joinDate: p.employment.joinDate,
          endDate: p.employment.endDate,
          status: p.employment.status,
        },
        identityDocument: p.identityDocument
          ? {
              documentType: p.identityDocument.type,
              documentNumber: p.identityDocument.number,
              isVerified: true,
            }
          : undefined,
      });
    }
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  it('exports 20 workers into a complete ZIP package with workers.csv, manifest.json, and README.txt', async () => {
    const result = await executeWorkerExport(tenantId, userId, [Permission.EXPORTS_CREATE], {
      organizationId,
      includedFields: [
        'employeeNumber',
        'displayName',
        'displayNameLatin',
        'displayNameNative',
        'jobTitle',
        'jobCategory',
        'joinDate',
        'status',
        'bloodGroup',
        'primaryPhone',
      ],
      includeSensitive: false,
    });

    expect(result.totalWorkers).toBe(20);
    expect(result.downloadToken).toBeDefined();

    // Fetch and read the generated ZIP archive
    const download = await getExportDownloadStream(result.downloadToken);
    const zipData = await fs.readFile(download.filePath);
    const zip = new AdmZip(zipData);
    const entryNames = zip.getEntries().map((e) => e.entryName);

    expect(entryNames).toContain('workers.csv');
    expect(entryNames).toContain('manifest.json');
    expect(entryNames).toContain('README.txt');

    // Parse exported workers.csv
    const csvContent = zip.readAsText('workers.csv');
    const parsedCsv = parseCsv(csvContent);
    expect(parsedCsv.rows).toHaveLength(20);

    // Verify Bengali script integrity
    const tanvir = parsedCsv.rows.find((r) => r.data.employeeNumber === 'EMP-1001');
    expect(tanvir?.data.displayNameNative).toBe('তানভীর আহমেদ');

    // Verify manifest schema and SHA-256 digests
    const manifestJson = JSON.parse(zip.readAsText('manifest.json'));
    expect(manifestJson.counts.totalWorkers).toBe(20);
    expect(manifestJson.checksums['workers.csv']).toBeDefined();
    expect(manifestJson.sensitiveFieldsIncluded).toBe(false);
  });

  it('excludes sensitive government IDs and masks birth dates by default', async () => {
    const result = await executeWorkerExport(tenantId, userId, [Permission.EXPORTS_CREATE], {
      organizationId,
      includedFields: ['employeeNumber', 'displayName', 'dateOfBirth', 'identityDocumentNumber'],
      includeSensitive: false,
    });

    const download = await getExportDownloadStream(result.downloadToken);
    const zip = new AdmZip(await fs.readFile(download.filePath));
    const parsedCsv = parseCsv(zip.readAsText('workers.csv'));

    const farhana = parsedCsv.rows.find((r) => r.data.employeeNumber === 'EMP-1004');
    expect(farhana?.data.identityDocumentNumber).toContain('••••');
    expect(farhana?.data.dateOfBirth).toContain('••');
  });

  it('includes unmasked government IDs when privileged identity.reveal permission is granted', async () => {
    const result = await executeWorkerExport(
      tenantId,
      userId,
      [Permission.EXPORTS_CREATE, Permission.IDENTITY_REVEAL],
      {
        organizationId,
        includedFields: ['employeeNumber', 'displayName', 'dateOfBirth', 'identityDocumentNumber'],
        includeSensitive: true,
      },
    );

    const download = await getExportDownloadStream(result.downloadToken);
    const zip = new AdmZip(await fs.readFile(download.filePath));
    const parsedCsv = parseCsv(zip.readAsText('workers.csv'));

    const farhana = parsedCsv.rows.find((r) => r.data.employeeNumber === 'EMP-1004');
    expect(farhana?.data.identityDocumentNumber).toBe('BG0987654'); // Plaintext revealed in privileged export
    expect(farhana?.data.dateOfBirth).toBe('2000-02-29');

    // Verify Audit Event recorded
    const audit = await prisma.auditEvent.findFirst({
      where: { tenantId, action: 'data.exported' },
    });
    expect(audit).not.toBeNull();
  });

  it('rejects privileged export attempt when user lacks identity.reveal permission', async () => {
    await expect(
      executeWorkerExport(
        tenantId,
        userId,
        [Permission.EXPORTS_CREATE], // Missing identity.reveal
        {
          organizationId,
          includedFields: ['employeeNumber', 'displayName', 'identityDocumentNumber'],
          includeSensitive: true,
        },
      ),
    ).rejects.toThrow(/Unauthorized.*identity.reveal/);
  });

  it('rejects invalid or expired download tokens', async () => {
    await expect(getExportDownloadStream('non_existent_token_12345')).rejects.toThrow(
      /Invalid or expired export download token/,
    );
  });
});
