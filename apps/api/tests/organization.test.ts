import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  createOrganization,
  updateOrganization,
  getTenantOrganizations,
  getOrganizationById,
  OrganizationNotFoundError,
  DuplicateOrganizationCodeError,
} from '../src/services/organization.service.js';
import {
  createLocation,
  updateLocation,
  getLocations,
  deleteLocation,
  DuplicateLocationCodeError,
  LocationInUseError,
} from '../src/services/location.service.js';
import { LocationType } from '@hr/domain';

describe('Phase 3: Organization & Location Administration', () => {
  let tenantId: string;

  beforeEach(async () => {
    const slug = `org-admin-tenant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Org Admin Tenant' },
    });
    tenantId = tenant.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  describe('Organization CRUD & Brand Configuration', () => {
    it('creates and retrieves organization with full brand settings', async () => {
      const org = await createOrganization(tenantId, {
        name: 'London Boy Apparel Ltd.',
        displayName: 'London Boy Apparel',
        code: 'LONDON_BOY',
        primaryColor: '#134E4A',
        secondaryColor: '#0F766E',
        accentColor: '#14B8A6',
        locale: 'en-US',
        timezone: 'Asia/Dhaka',
        address: {
          street: 'Plot 42, Sector 3, Uttara C/A',
          city: 'Dhaka',
          postalCode: '1230',
          country: 'Bangladesh',
        },
        contactEmail: 'info@londonboyapparel.com',
        contactPhone: '+88028901234',
        employeeNumberRule: {
          prefix: 'EMP-',
          padLength: 4,
          nextSequence: 1001,
        },
      });

      expect(org.id).toBeDefined();
      expect(org.name).toBe('London Boy Apparel Ltd.');
      expect(org.primaryColor).toBe('#134E4A');

      const retrieved = await getOrganizationById(tenantId, org.id);
      expect(retrieved.displayName).toBe('London Boy Apparel');
      expect(retrieved.employeeNumberRule.prefix).toBe('EMP-');
    });

    it('rejects duplicate organization codes in the same tenant', async () => {
      await createOrganization(tenantId, {
        name: 'Company 1',
        code: 'COMP_A',
      });

      await expect(
        createOrganization(tenantId, {
          name: 'Company 2',
          code: 'COMP_A',
        }),
      ).rejects.toThrow(DuplicateOrganizationCodeError);
    });
  });

  describe('Location Management & Deletion Safety', () => {
    it('creates locations and enforces unique location codes per organization', async () => {
      const org = await createOrganization(tenantId, {
        name: 'Textile Corp',
        code: 'TEX_CORP',
      });

      const hq = await createLocation(tenantId, {
        organizationId: org.id,
        name: 'Dhaka Corporate Office',
        code: 'DHK_HQ',
        type: LocationType.HEADQUARTERS,
        isDefault: true,
      });

      expect(hq.isDefault).toBe(true);

      const plant = await createLocation(tenantId, {
        organizationId: org.id,
        name: 'Gazipur Plant',
        code: 'GZP_PLANT',
        type: LocationType.FACTORY,
        isDefault: false,
      });

      expect(plant.id).toBeDefined();

      // Duplicate code rejection
      await expect(
        createLocation(tenantId, {
          organizationId: org.id,
          name: 'Duplicate Plant',
          code: 'GZP_PLANT',
        }),
      ).rejects.toThrow(DuplicateLocationCodeError);
    });

    it('blocks deletion of locations that are referenced by organizational units', async () => {
      const org = await createOrganization(tenantId, {
        name: 'Apparel Group',
        code: 'APP_GRP',
      });

      const loc = await createLocation(tenantId, {
        organizationId: org.id,
        name: 'Chittagong Site',
        code: 'CTG_SITE',
        type: LocationType.SITE,
      });

      // Create an org unit linked to this location
      await prisma.orgUnit.create({
        data: {
          tenantId,
          organizationId: org.id,
          name: 'Export Dept',
          code: 'EXP_DEPT',
          locationId: loc.id,
        },
      });

      await expect(deleteLocation(tenantId, loc.id)).rejects.toThrow(LocationInUseError);
    });
  });

  describe('Security & Multi-Tenant Isolation (SEC-HIGH-01)', () => {
    it('prevents cross-tenant organization retrieval and scopes requests strictly to authenticated tenant', async () => {
      // Create second tenant
      const otherTenant = await prisma.tenant.create({
        data: {
          slug: `other-tenant-${Date.now()}`,
          name: 'Other Tenant',
        },
      });

      try {
        const otherOrg = await createOrganization(otherTenant.id, {
          name: 'Confidential Enterprise',
          code: 'CONF_ENT',
        });

        // Attempting to retrieve otherTenant's org using tenantId must fail
        await expect(getOrganizationById(tenantId, otherOrg.id)).rejects.toThrow(
          OrganizationNotFoundError,
        );
      } finally {
        await prisma.tenant.delete({ where: { id: otherTenant.id } }).catch(() => {});
      }
    });
  });
});
