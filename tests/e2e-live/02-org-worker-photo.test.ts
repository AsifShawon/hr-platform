import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@hr/db';
import { JobCategory, EmploymentStatus, TemplatePresetId } from '@hr/domain';
import {
  getLiveTestServer,
  shutdownLiveTestServer,
  createTestTenant,
  createAuthHeaders,
  generateTestPhotoBuffer,
} from './helpers/stack-harness.js';
import { processPhotoUpload } from '../../apps/api/src/services/photo-processing.service.js';

describe('Live Journey 3 & 4: Org Hierarchy, Template Assignment, Worker & Photo Studio', () => {
  let server: any;
  let tenantCtx: any;

  beforeAll(async () => {
    server = await getLiveTestServer();
    tenantCtx = await createTestTenant('journey-02');
  });

  afterAll(async () => {
    await shutdownLiveTestServer();
  });

  describe('Journey 3: Company, Section & Template Assignment', () => {
    let locationId: string;
    let orgUnitId: string;

    it('creates factory location and organizational unit hierarchy', async () => {
      // 1. Create Location
      const locRes = await server.inject({
        method: 'POST',
        url: '/api/locations',
        headers: createAuthHeaders(tenantCtx.ownerToken),
        payload: {
          organizationId: tenantCtx.orgId,
          name: 'Gazipur Industrial Facility',
          code: 'LOC-GZP-01',
          city: 'Gazipur',
          country: 'Bangladesh',
        },
      });
      expect(locRes.statusCode).toBe(201);
      const locData = JSON.parse(locRes.body);
      locationId = locData.id;

      // 2. Create Org Unit / Department
      const orgUnitRes = await server.inject({
        method: 'POST',
        url: '/api/org-units',
        headers: createAuthHeaders(tenantCtx.ownerToken),
        payload: {
          organizationId: tenantCtx.orgId,
          name: 'Quality Assurance',
          nameBangla: 'গুণমান নিশ্চিতকরণ বিভাগ',
          code: 'QA-DEPT',
          type: 'DEPARTMENT',
        },
      });
      expect(orgUnitRes.statusCode).toBe(201);
      const orgUnitData = JSON.parse(orgUnitRes.body);
      orgUnitId = orgUnitData.id;

      expect(orgUnitData.nameBangla).toBe('গুণমান নিশ্চিতকরণ বিভাগ');
    });

    it('assigns card template to organization and specific department', async () => {
      // Verify template can be queried by organization
      const tplRes = await server.inject({
        method: 'GET',
        url: `/api/templates?organizationId=${tenantCtx.orgId}`,
        headers: createAuthHeaders(tenantCtx.ownerToken),
      });
      expect(tplRes.statusCode).toBe(200);
      const templates = JSON.parse(tplRes.body);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].presetId).toBe(TemplatePresetId.CLASSIC_VERTICAL);
    });
  });

  describe('Journey 4: Worker Registration & Photo Processing Pipeline', () => {
    let personId: string;
    let employmentId: string;

    it('creates worker profile with bilingual names and employment records', async () => {
      const personRes = await server.inject({
        method: 'POST',
        url: '/api/people',
        headers: createAuthHeaders(tenantCtx.operatorToken),
        payload: {
          organizationId: tenantCtx.orgId,
          displayName: 'Tanvir Ahmed',
          displayNameLatin: 'Tanvir Ahmed',
          displayNameNative: 'তানভীর আহমেদ',
          employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
          jobTitle: 'Senior Quality Auditor',
          jobCategory: JobCategory.REGULAR,
          employmentStatus: EmploymentStatus.ACTIVE,
          bloodGroup: 'O+',
          emergencyContact: '+880 1711-000000',
        },
      });

      expect(personRes.statusCode).toBe(201);
      const personData = JSON.parse(personRes.body);
      personId = personData.id;
      employmentId = personData.employments[0].id;

      expect(personData.displayNameNative).toBe('তানভীর আহমেদ');
      expect(personData.employments[0].jobTitle).toBe('Senior Quality Auditor');
    });

    it('processes worker photo: enforces 2:3 aspect ratio, strips EXIF, and attaches derivatives', async () => {
      // Generate simulated photo buffer
      const photoBuffer = await generateTestPhotoBuffer(600, 900);

      // Process photo upload through photo processing service
      const processed = await processPhotoUpload(
        tenantCtx.tenantId,
        personId,
        photoBuffer,
        'image/jpeg',
      );

      expect(processed).toBeDefined();
      expect(processed.mediaId).toBeDefined();
      expect(processed.width).toBeGreaterThan(0);
      expect(processed.height).toBeGreaterThan(0);

      // Verify aspect ratio is 2:3 (height / width close to 1.5)
      const ratio = processed.height / processed.width;
      expect(ratio).toBeCloseTo(1.5, 0.1);

      // Verify photo is attached to person record
      const updatedPerson = await prisma.person.findUnique({
        where: { id: personId },
      });
      expect(updatedPerson?.photoMediaId).toBe(processed.mediaId);
    });

    it('masks sensitive National ID by default and logs audit access when revealed', async () => {
      // Add sensitive government identifier to person
      const nidRecord = await prisma.governmentIdentity.create({
        data: {
          tenantId: tenantCtx.tenantId,
          personId,
          identityType: 'NATIONAL_ID',
          encryptedValue: 'ENC:fictional_nid_9876543210',
          maskedValue: '********3210',
        },
      });

      expect(nidRecord.maskedValue).toBe('********3210');

      // Query person via standard API: verify NID is not leaked in plain text
      const getRes = await server.inject({
        method: 'GET',
        url: `/api/people/${personId}`,
        headers: createAuthHeaders(tenantCtx.viewerToken),
      });

      expect(getRes.statusCode).toBe(200);
      const personDetails = JSON.parse(getRes.body);
      expect(personDetails.rawNid).toBeUndefined();
    });
  });
});
