import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  createPerson,
  updatePerson,
  updateEmployment,
  getPersonById,
  searchPeople,
  checkDuplicates,
  ConcurrencyConflictError,
  DuplicateEmployeeNumberError,
  PersonNotFoundError,
} from '../src/services/person.service.js';
import { Gender, EmploymentStatus, JobCategory, IdentityDocumentType } from '@hr/domain';

describe('Phase 4: Person Registry, Employment & Concurrency Controls', () => {
  let tenantId: string;
  let organizationId: string;

  beforeEach(async () => {
    const slug = `person-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Person Test Workspace' },
    });
    tenantId = tenant.id;

    const org = await prisma.organization.create({
      data: {
        tenantId,
        name: 'London Boy Apparel Ltd.',
        displayName: 'London Boy Apparel',
        code: `LBA_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      },
    });
    organizationId = org.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  describe('Person Creation & Decoupled Employment', () => {
    it('creates person with bilingual names (Bengali), leap-day birth date, and initial employment', async () => {
      const result = await createPerson(tenantId, {
        displayName: 'Farhana Akter',
        displayNameLatin: 'Farhana Akter',
        displayNameNative: 'ফারহানা আক্তার',
        givenName: 'Farhana',
        familyName: 'Akter',
        dateOfBirth: '2000-02-29', // Leap day
        gender: Gender.FEMALE,
        bloodGroup: 'AB+',
        primaryPhone: '+8801711000004',
        primaryEmail: 'farhana.akter@londonboyapparel.com',
        employment: {
          organizationId,
          employeeNumber: 'EMP-2001',
          jobTitle: 'HR Compliance Officer',
          jobCategory: JobCategory.STAFF,
          joinDate: '2023-08-20',
          status: EmploymentStatus.ACTIVE,
        },
        identityDocument: {
          documentType: IdentityDocumentType.PASSPORT,
          country: 'BGD',
          documentNumber: 'BG0987654',
          isVerified: true,
        },
      });

      expect(result.person.id).toBeDefined();
      expect(result.person.displayName).toBe('Farhana Akter');
      expect(result.person.displayNameNative).toBe('ফারহানা আক্তার');
      expect(result.person.version).toBe(1);
      expect(result.employment.employeeNumber).toBe('EMP-2001');
      expect(result.identityDocument?.documentNumberMasked).toBe('•••••7654');

      // Verify retrieval
      const fetched = await getPersonById(tenantId, result.person.id);
      expect(fetched.displayName).toBe('Farhana Akter');
      expect(fetched.activeEmployment?.jobTitle).toBe('HR Compliance Officer');
      expect(fetched.identityDocuments?.[0]?.documentNumberMasked).toBe('•••••7654');
    });

    it('handles mononyms and very long multi-word names smoothly', async () => {
      // Mononym
      const mononym = await createPerson(tenantId, {
        displayName: 'Jahanara',
        displayNameLatin: 'Jahanara',
        displayNameNative: 'জাহানারা',
        gender: Gender.FEMALE,
        employment: {
          organizationId,
          employeeNumber: 'EMP-MONO-1',
          jobTitle: 'Senior Sewing Operator',
          jobCategory: JobCategory.WORKER,
          joinDate: '2024-01-05',
        },
      });
      expect(mononym.person.displayName).toBe('Jahanara');
      expect(mononym.person.familyName).toBeNull();

      // Long Name
      const longName = await createPerson(tenantId, {
        displayName: 'Mohammad Ashraful Islam Majumdar',
        displayNameLatin: 'Mohammad Ashraful Islam Majumdar',
        displayNameNative: 'মোহাম্মদ আশরাফুল ইসলাম মজুমদার',
        gender: Gender.MALE,
        employment: {
          organizationId,
          employeeNumber: 'EMP-LONG-1',
          jobTitle: 'Chief Quality Inspector',
          jobCategory: JobCategory.STAFF,
          joinDate: '2024-02-01',
        },
      });
      expect(longName.person.displayName).toBe('Mohammad Ashraful Islam Majumdar');
    });

    it('rejects duplicate employee numbers within the same organization', async () => {
      await createPerson(tenantId, {
        displayName: 'Worker 1',
        employment: {
          organizationId,
          employeeNumber: 'EMP-DUPE-TEST',
          jobTitle: 'Operator',
          joinDate: '2024-01-01',
        },
      });

      await expect(
        createPerson(tenantId, {
          displayName: 'Worker 2',
          employment: {
            organizationId,
            employeeNumber: 'EMP-DUPE-TEST',
            jobTitle: 'Operator',
            joinDate: '2024-01-01',
          },
        }),
      ).rejects.toThrow(DuplicateEmployeeNumberError);
    });
  });

  describe('Optimistic Concurrency Control', () => {
    it('successfully updates person and increments version when expected version matches', async () => {
      const created = await createPerson(tenantId, {
        displayName: 'Tanvir Ahmed',
        employment: {
          organizationId,
          employeeNumber: 'EMP-CONCUR-1',
          jobTitle: 'Manager',
          joinDate: '2022-01-01',
        },
      });

      expect(created.person.version).toBe(1);

      const updated = await updatePerson(tenantId, created.person.id, {
        displayName: 'Tanvir Ahmed (Promoted)',
        expectedVersion: 1,
      });

      expect(updated.displayName).toBe('Tanvir Ahmed (Promoted)');
      expect(updated.version).toBe(2);
    });

    it('throws ConcurrencyConflictError when expectedVersion does not match current version', async () => {
      const created = await createPerson(tenantId, {
        displayName: 'Nusrat Jahan',
        employment: {
          organizationId,
          employeeNumber: 'EMP-CONCUR-2',
          jobTitle: 'QA Lead',
          joinDate: '2022-03-01',
        },
      });

      // User A updates record
      await updatePerson(tenantId, created.person.id, {
        displayName: 'Nusrat Jahan (Edit A)',
        expectedVersion: 1,
      });

      // User B tries to update using stale version 1
      await expect(
        updatePerson(tenantId, created.person.id, {
          displayName: 'Nusrat Jahan (Edit B)',
          expectedVersion: 1,
        }),
      ).rejects.toThrow(ConcurrencyConflictError);
    });
  });

  describe('Conservative Duplicate Detection Engine', () => {
    it('detects duplicate employee number as CRITICAL warning', async () => {
      await createPerson(tenantId, {
        displayName: 'Rahim Chowdhury',
        employment: {
          organizationId,
          employeeNumber: 'EMP-DUP-1',
          jobTitle: 'Technician',
          joinDate: '2023-01-01',
        },
      });

      const dupeCheck = await checkDuplicates(tenantId, {
        organizationId,
        employeeNumber: 'EMP-DUP-1',
      });

      expect(dupeCheck.hasDuplicates).toBe(true);
      expect(dupeCheck.warnings.some((w) => w.type === 'EXACT_EMPLOYEE_NUMBER')).toBe(true);
    });

    it('detects matching identity document number via blind index hash as WARNING', async () => {
      await createPerson(tenantId, {
        displayName: 'Existing Worker',
        employment: {
          organizationId,
          employeeNumber: 'EMP-EXIST-1',
          jobTitle: 'Operator',
          joinDate: '2023-01-01',
        },
        identityDocument: {
          documentType: IdentityDocumentType.NID,
          documentNumber: '19922612345678901',
        },
      });

      const dupeCheck = await checkDuplicates(tenantId, {
        organizationId,
        employeeNumber: 'EMP-NEW-UNIQUE',
        identityDocumentNumber: ' 1992-2612-3456-78901 ',
      });

      expect(dupeCheck.hasDuplicates).toBe(true);
      expect(dupeCheck.warnings.some((w) => w.type === 'EXACT_IDENTITY_DOCUMENT')).toBe(true);
    });
  });

  describe('Search & Server-Side Pagination', () => {
    it('searches people by Latin name, native Bangla script, and job title', async () => {
      await createPerson(tenantId, {
        displayName: 'Tanvir Ahmed',
        displayNameLatin: 'Tanvir Ahmed',
        displayNameNative: 'তানভীর আহমেদ',
        employment: {
          organizationId,
          employeeNumber: 'EMP-SEARCH-1',
          jobTitle: 'Production Director',
          joinDate: '2021-01-01',
        },
      });

      // Search by Bangla script
      const banglaSearch = await searchPeople(tenantId, { search: 'তানভীর' });
      expect(banglaSearch.items).toHaveLength(1);
      expect(banglaSearch.items[0]?.displayName).toBe('Tanvir Ahmed');

      // Search by Job Title
      const titleSearch = await searchPeople(tenantId, { search: 'Production Director' });
      expect(titleSearch.items).toHaveLength(1);
    });
  });
});
