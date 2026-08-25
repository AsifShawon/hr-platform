import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  createImportJob,
  configureImportJobMapping,
  validateAndSimulateImport,
  commitImportJob,
  normalizeDateValue,
  inferColumnMapping,
} from '../src/services/worker-import.service.js';
import {
  ImportDuplicateStrategy,
  ImportCommitPolicy,
  ImportJobStatus,
  Permission,
} from '@hr/domain';

describe('Phase 9: Worker Ingestion Engine, Dry-Run & Batch Transactions', () => {
  let tenantId: string;
  let organizationId: string;
  let userId: string;

  beforeEach(async () => {
    const slug = `import-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Import Test Workspace' },
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
        username: `importer_${Math.random().toString(36).substring(2, 6)}`,
        passwordHash: 'dummy_hash',
      },
    });
    userId = user.id;

    // Create standard location and org unit
    await prisma.location.create({
      data: {
        tenantId,
        organizationId,
        name: 'Gazipur Manufacturing Plant',
        code: 'GZP_PLANT',
      },
    });

    await prisma.orgUnit.create({
      data: {
        tenantId,
        organizationId,
        name: 'Garments Production',
        nameBangla: 'পোশাক প্রস্তুতকরণ',
        code: 'GARMENTS_PROD',
      },
    });
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  describe('Date Normalization & Zero-Guess Policy', () => {
    it('accepts ISO 8601 YYYY-MM-DD format correctly', () => {
      expect(normalizeDateValue('2026-04-03', 'joinDate', 1)).toBe('2026-04-03');
      expect(normalizeDateValue('2000/02/29', 'dateOfBirth', 2)).toBe('2000-02-29'); // Leap year
    });

    it('rejects ambiguous dates like 03/04/2026 with explicit error message', () => {
      expect(() => normalizeDateValue('03/04/2026', 'joinDate', 3)).toThrow(
        /Ambiguous date format '03\/04\/2026'/,
      );
      expect(() => normalizeDateValue('12-11-2025', 'joinDate', 4)).toThrow(
        /Ambiguous date format '12-11-2025'/,
      );
    });
  });

  describe('Import Ingestion, Dry-Run & Non-Persistence Check', () => {
    it('performs full dry-run simulation leaving zero persistent rows in database', async () => {
      const csvData =
        `employeeNumber,displayName,displayNameNative,jobTitle,locationCode,orgUnitCode,joinDate,status\n` +
        `EMP-3001,Tanvir Ahmed,তানভীর আহমেদ,Manager,GZP_PLANT,GARMENTS_PROD,2023-01-15,ACTIVE\n` +
        `EMP-3002,Nusrat Jahan,নুসরাত জাহান,Officer,GZP_PLANT,GARMENTS_PROD,2023-03-01,ACTIVE`;

      const upload = await createImportJob(tenantId, organizationId, userId, {
        buffer: Buffer.from(csvData, 'utf8'),
        filename: 'workers.csv',
        mimetype: 'text/csv',
      });

      expect(upload.totalRows).toBe(2);
      expect(upload.suggestedMapping.employeeNumber).toBe('employeeNumber');
      expect(upload.suggestedMapping.displayName).toBe('displayName');

      // Execute Dry-Run
      const dryRun = await validateAndSimulateImport(tenantId, upload.importJobId, [
        Permission.PEOPLE_EDIT,
      ]);
      expect(dryRun.dryRunPassed).toBe(true);
      expect(dryRun.report.validRows).toBe(2);
      expect(dryRun.report.invalidRows).toBe(0);

      // Verify DB remains completely empty of people & employments
      const personCount = await prisma.person.count({ where: { tenantId } });
      const employmentCount = await prisma.employment.count({ where: { tenantId } });
      expect(personCount).toBe(0);
      expect(employmentCount).toBe(0);
    });

    it('flags validation issues for missing fields, bad enums, and duplicate employee numbers', async () => {
      const csvData =
        `employeeNumber,displayName,jobCategory,joinDate\n` +
        `,Missing Emp No,STAFF,2023-01-15\n` +
        `EMP-3003,,STAFF,2023-01-15\n` +
        `EMP-3004,Valid Worker,INVALID_ENUM,2023-01-15\n` +
        `EMP-3004,Duplicate Emp No,STAFF,2023-01-15`;

      const upload = await createImportJob(tenantId, organizationId, userId, {
        buffer: Buffer.from(csvData, 'utf8'),
        filename: 'bad_workers.csv',
        mimetype: 'text/csv',
      });

      const dryRun = await validateAndSimulateImport(tenantId, upload.importJobId, [
        Permission.PEOPLE_EDIT,
      ]);
      expect(dryRun.dryRunPassed).toBe(false);
      expect(dryRun.report.invalidRows).toBeGreaterThan(0);

      const issueCodes = dryRun.report.issues.map((i) => i.code);
      expect(issueCodes).toContain('MISSING_REQUIRED');
      expect(issueCodes).toContain('DUPLICATE_IN_BATCH');
    });
  });

  describe('Transactional Commit Execution', () => {
    it('commits valid workers in batch transaction and creates Person, Employment, and Audit records', async () => {
      const csvData =
        `employeeNumber,displayName,displayNameNative,jobTitle,locationCode,orgUnitCode,joinDate,status,gender,bloodGroup\n` +
        `EMP-5001,Jahanara,জাহানারা,Operator,GZP_PLANT,GARMENTS_PROD,2024-01-05,ACTIVE,FEMALE,O-\n` +
        `EMP-5002,Ashraful Majumdar,আশরাফুল মজুমদার,Inspector,GZP_PLANT,GARMENTS_PROD,2024-02-01,ACTIVE,MALE,B-`;

      const upload = await createImportJob(tenantId, organizationId, userId, {
        buffer: Buffer.from(csvData, 'utf8'),
        filename: 'batch_workers.csv',
        mimetype: 'text/csv',
      });

      const result = await commitImportJob(tenantId, upload.importJobId, userId, {
        commitPolicy: ImportCommitPolicy.ALL_OR_NOTHING,
      });

      expect(result.status).toBe(ImportJobStatus.COMPLETED);
      expect(result.committedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // Verify DB records exist with native Bengali script intact
      const workers = await prisma.person.findMany({
        where: { tenantId },
        include: { employments: true },
      });
      expect(workers).toHaveLength(2);
      const jahanara = workers.find((w) => w.displayName === 'Jahanara');
      expect(jahanara?.displayNameNative).toBe('জাহানারা');
      expect(jahanara?.gender).toBe('FEMALE');
      expect(jahanara?.bloodGroup).toBe('O-');
      expect(jahanara?.employments[0]?.employeeNumber).toBe('EMP-5001');

      // Verify Audit Event
      const audit = await prisma.auditEvent.findFirst({
        where: { tenantId, action: 'data.imported' },
      });
      expect(audit).not.toBeNull();
    });

    it('enforces All-Or-Nothing rollback on validation failure', async () => {
      const csvData =
        `employeeNumber,displayName,joinDate\n` +
        `EMP-6001,Valid Worker,2024-01-01\n` +
        `EMP-6002,Broken Worker,03/04/2026`; // Ambiguous date failure

      const upload = await createImportJob(tenantId, organizationId, userId, {
        buffer: Buffer.from(csvData, 'utf8'),
        filename: 'all_or_nothing.csv',
        mimetype: 'text/csv',
      });

      await expect(
        commitImportJob(tenantId, upload.importJobId, userId, {
          commitPolicy: ImportCommitPolicy.ALL_OR_NOTHING,
        }),
      ).rejects.toThrow(/Cannot commit with 'ALL_OR_NOTHING' policy/);

      // Verify 0 records committed
      const count = await prisma.person.count({ where: { tenantId } });
      expect(count).toBe(0);
    });

    it('supports Partial-Success commit policy by saving valid rows and generating error CSV', async () => {
      const csvData =
        `employeeNumber,displayName,joinDate\n` +
        `EMP-7001,Valid Worker A,2024-01-01\n` +
        `EMP-7002,Broken Worker B,03/04/2026\n` +
        `EMP-7003,Valid Worker C,2024-02-01`;

      const upload = await createImportJob(tenantId, organizationId, userId, {
        buffer: Buffer.from(csvData, 'utf8'),
        filename: 'partial_workers.csv',
        mimetype: 'text/csv',
      });

      const result = await commitImportJob(tenantId, upload.importJobId, userId, {
        commitPolicy: ImportCommitPolicy.PARTIAL_SUCCESS,
      });

      expect(result.committedCount).toBe(2);
      expect(result.errorReportCsvUrl).toBeDefined();

      const committedPeople = await prisma.person.findMany({ where: { tenantId } });
      expect(committedPeople).toHaveLength(2);
      expect(committedPeople.map((p) => p.displayName)).toContain('Valid Worker A');
      expect(committedPeople.map((p) => p.displayName)).toContain('Valid Worker C');
    });
  });
});
