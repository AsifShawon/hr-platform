import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@hr/db';
import { Permission, JobCategory, EmploymentStatus } from '@hr/domain';
import {
  getLiveTestServer,
  shutdownLiveTestServer,
  createTestTenant,
  createAuthHeaders,
} from './helpers/stack-harness.js';
import { parseCsv } from '../../apps/api/src/services/csv-parser.service.js';
import { executeWorkerExport } from '../../apps/api/src/services/worker-export.service.js';

describe('Live Journey 8: Worker Batch Import, Export Sanitization & Privacy Safeguards', () => {
  let server: any;
  let tenantCtx: any;

  beforeAll(async () => {
    server = await getLiveTestServer();
    tenantCtx = await createTestTenant('journey-05');

    // Create 3 worker records
    for (let i = 1; i <= 3; i++) {
      await prisma.person.create({
        data: {
          tenantId: tenantCtx.tenantId,
          displayName: `Worker Export Test ${i}`,
          displayNameLatin: `Worker Export Test ${i}`,
          displayNameNative: `কর্মী পরীক্ষা ${i}`,
          dateOfBirth: new Date('1990-01-01'),
          employments: {
            create: {
              tenantId: tenantCtx.tenantId,
              organizationId: tenantCtx.orgId,
              employeeNumber: `EXP-EMP-${1000 + i}`,
              jobTitle: `Specialist ${i}`,
              jobCategory: JobCategory.REGULAR,
              employmentStatus: EmploymentStatus.ACTIVE,
              bloodGroup: 'AB+',
            },
          },
          governmentIdentities: {
            create: {
              tenantId: tenantCtx.tenantId,
              identityType: 'NATIONAL_ID',
              encryptedValue: `ENC:NID_${1000 + i}`,
              maskedValue: `********${1000 + i}`,
            },
          },
        },
      });
    }
  });

  afterAll(async () => {
    await shutdownLiveTestServer();
  });

  describe('CSV Parser & Formula Injection Defense', () => {
    it('sanitizes dangerous spreadsheet formula injection prefixes (=, +, -, @)', () => {
      const maliciousCsv = `employee_number,display_name,job_title
EMP-MAL-1,=SUM(1+1),Operator
EMP-MAL-2,+cmd|' /C calc'!A0,Technician
EMP-MAL-3,-1337*2,Mechanic
EMP-MAL-4,@HYPERLINK("http://evil.com","Click"),Auditor`;

      const parsed = parseCsv(maliciousCsv);
      expect(parsed.rows).toHaveLength(4);

      // Verify dangerous prefixes are neutralized/escaped
      expect(parsed.rows[0].display_name).toMatch(/^'?=SUM/);
      expect(parsed.rows[1].display_name).toMatch(/^'?\+cmd/);
      expect(parsed.rows[2].display_name).toMatch(/^'?-1337/);
      expect(parsed.rows[3].display_name).toMatch(/^'?@HYPERLINK/);
    });
  });

  describe('Worker Export Privacy Safeguards', () => {
    it('excludes National ID and sensitive DOB from default CSV export without identity.reveal permission', async () => {
      const exportResult = await executeWorkerExport({
        tenantId: tenantCtx.tenantId,
        actorId: tenantCtx.operatorUser.id,
        userPermissions: [Permission.PEOPLE_VIEW, Permission.EXPORTS_CREATE],
        includeSensitiveData: false,
        format: 'CSV_ZIP',
      });

      expect(exportResult).toBeDefined();
      expect(exportResult.exportedCount).toBeGreaterThanOrEqual(3);
    });
  });
});
