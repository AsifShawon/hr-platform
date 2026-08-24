import { prisma } from '@hr/db';
import { Gender, EmploymentStatus, JobCategory, IdentityDocumentType } from '@hr/domain';
import {
  encryptSensitiveValue,
  hashForBlindIndex,
  maskSensitiveIdentifier,
} from './crypto.service.js';

export class ConcurrencyConflictError extends Error {
  constructor(message = 'The record was updated by another user. Please refresh and try again.') {
    super(message);
    this.name = 'ConcurrencyConflictError';
  }
}

export class DuplicateEmployeeNumberError extends Error {
  constructor(employeeNumber: string) {
    super(`Employee number '${employeeNumber}' already exists in this organization.`);
    this.name = 'DuplicateEmployeeNumberError';
  }
}

export class PersonNotFoundError extends Error {
  constructor(id: string) {
    super(`Person with ID '${id}' was not found.`);
    this.name = 'PersonNotFoundError';
  }
}

export class EmploymentNotFoundError extends Error {
  constructor(id: string) {
    super(`Employment record with ID '${id}' was not found.`);
    this.name = 'EmploymentNotFoundError';
  }
}

export interface CreatePersonInput {
  displayName: string;
  displayNameLatin?: string;
  displayNameNative?: string;
  givenName?: string;
  familyName?: string;
  middleName?: string;
  phoneticName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  photoMediaId?: string;
  employment: {
    organizationId: string;
    locationId?: string | null;
    orgUnitId?: string | null;
    employeeNumber: string;
    jobTitle: string;
    jobCategory?: JobCategory;
    joinDate: string;
    endDate?: string | null;
    status?: EmploymentStatus;
    isPrimary?: boolean;
  };
  identityDocument?: {
    documentType: IdentityDocumentType;
    country?: string;
    documentNumber: string;
    issueDate?: string;
    expiryDate?: string;
    isVerified?: boolean;
  };
}

export interface UpdatePersonInput {
  displayName?: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  middleName?: string | null;
  phoneticName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender;
  bloodGroup?: string | null;
  primaryPhone?: string | null;
  primaryEmail?: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  photoMediaId?: string | null;
  expectedVersion?: number;
}

export interface UpdateEmploymentInput {
  locationId?: string | null;
  orgUnitId?: string | null;
  jobTitle?: string;
  jobCategory?: JobCategory;
  joinDate?: string;
  endDate?: string | null;
  status?: EmploymentStatus;
  isPrimary?: boolean;
  expectedVersion?: number;
}

export interface DuplicateCheckInput {
  organizationId: string;
  employeeNumber: string;
  displayName?: string;
  dateOfBirth?: string;
  identityDocumentNumber?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  excludePersonId?: string;
}

export interface DuplicateWarning {
  type:
    | 'EXACT_EMPLOYEE_NUMBER'
    | 'EXACT_IDENTITY_DOCUMENT'
    | 'PROBABLE_NAME_AND_DOB'
    | 'MATCHING_PHONE_OR_EMAIL';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  matchedPersonId?: string;
  matchedPersonName?: string;
  matchedEmployeeNumber?: string;
}

/**
 * Conservative Duplicate Detection Engine
 * Checks exact employee number, document blind index hash, DOB + name, and contact details.
 */
export async function checkDuplicates(
  tenantId: string,
  input: DuplicateCheckInput,
): Promise<{ hasDuplicates: boolean; warnings: DuplicateWarning[] }> {
  const warnings: DuplicateWarning[] = [];

  // 1. Exact employee number match within the same organization
  const existingEmp = await prisma.employment.findFirst({
    where: {
      tenantId,
      organizationId: input.organizationId,
      employeeNumber: input.employeeNumber.trim(),
      ...(input.excludePersonId ? { personId: { not: input.excludePersonId } } : {}),
    },
    include: { person: true },
  });

  if (existingEmp) {
    warnings.push({
      type: 'EXACT_EMPLOYEE_NUMBER',
      severity: 'CRITICAL',
      message: `Employee number '${input.employeeNumber}' is already assigned to ${existingEmp.person.displayName}.`,
      matchedPersonId: existingEmp.person.id,
      matchedPersonName: existingEmp.person.displayName,
      matchedEmployeeNumber: existingEmp.employeeNumber,
    });
  }

  // 2. Exact Identity Document Number Match (via blind index hash)
  if (input.identityDocumentNumber) {
    const docHash = hashForBlindIndex(input.identityDocumentNumber, tenantId);
    const existingDoc = await prisma.identityDocument.findFirst({
      where: {
        tenantId,
        documentNumberHash: docHash,
        ...(input.excludePersonId ? { personId: { not: input.excludePersonId } } : {}),
      },
      include: {
        person: {
          include: {
            employments: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    if (existingDoc) {
      warnings.push({
        type: 'EXACT_IDENTITY_DOCUMENT',
        severity: 'WARNING',
        message: `An identity document with the same number is already registered for ${existingDoc.person.displayName}.`,
        matchedPersonId: existingDoc.person.id,
        matchedPersonName: existingDoc.person.displayName,
        matchedEmployeeNumber: existingDoc.person.employments[0]?.employeeNumber,
      });
    }
  }

  // 3. Probable Match: Exact Date of Birth + Matching Name (case-insensitive)
  if (input.dateOfBirth && input.displayName) {
    const dob = new Date(input.dateOfBirth);
    const cleanName = input.displayName.trim().toLowerCase();

    const matchingPeople = await prisma.person.findMany({
      where: {
        tenantId,
        dateOfBirth: dob,
        ...(input.excludePersonId ? { id: { not: input.excludePersonId } } : {}),
      },
      include: {
        employments: { where: { isPrimary: true }, take: 1 },
      },
    });

    for (const match of matchingPeople) {
      if (
        match.displayName.toLowerCase().includes(cleanName) ||
        cleanName.includes(match.displayName.toLowerCase())
      ) {
        warnings.push({
          type: 'PROBABLE_NAME_AND_DOB',
          severity: 'WARNING',
          message: `A worker with matching name '${match.displayName}' and identical birth date (${input.dateOfBirth}) already exists.`,
          matchedPersonId: match.id,
          matchedPersonName: match.displayName,
          matchedEmployeeNumber: match.employments[0]?.employeeNumber,
        });
      }
    }
  }

  // 4. Matching Phone or Email
  if (input.primaryPhone || input.primaryEmail) {
    const matchingContact = await prisma.person.findFirst({
      where: {
        tenantId,
        OR: [
          input.primaryPhone ? { primaryPhone: input.primaryPhone.trim() } : {},
          input.primaryEmail ? { primaryEmail: input.primaryEmail.trim().toLowerCase() } : {},
        ].filter((c) => Object.keys(c).length > 0),
        ...(input.excludePersonId ? { id: { not: input.excludePersonId } } : {}),
      },
      include: {
        employments: { where: { isPrimary: true }, take: 1 },
      },
    });

    if (matchingContact) {
      warnings.push({
        type: 'MATCHING_PHONE_OR_EMAIL',
        severity: 'WARNING',
        message: `Contact details match existing worker ${matchingContact.displayName}.`,
        matchedPersonId: matchingContact.id,
        matchedPersonName: matchingContact.displayName,
        matchedEmployeeNumber: matchingContact.employments[0]?.employeeNumber,
      });
    }
  }

  return {
    hasDuplicates: warnings.length > 0,
    warnings,
  };
}

/**
 * Creates a new Person record with initial Employment and optional Identity Document in a single transaction.
 */
export async function createPerson(tenantId: string, input: CreatePersonInput) {
  const employeeNumber = input.employment.employeeNumber.trim();

  // Guard against duplicate employee number
  const existingEmp = await prisma.employment.findUnique({
    where: {
      tenantId_organizationId_employeeNumber: {
        tenantId,
        organizationId: input.employment.organizationId,
        employeeNumber,
      },
    },
  });

  if (existingEmp) {
    throw new DuplicateEmployeeNumberError(employeeNumber);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create Person
    const person = await tx.person.create({
      data: {
        tenantId,
        displayName: input.displayName.trim(),
        displayNameLatin: input.displayNameLatin?.trim() || null,
        displayNameNative: input.displayNameNative?.trim() || null,
        givenName: input.givenName?.trim() || null,
        familyName: input.familyName?.trim() || null,
        middleName: input.middleName?.trim() || null,
        phoneticName: input.phoneticName?.trim() || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender || Gender.UNDISCLOSED,
        bloodGroup: input.bloodGroup?.trim() || null,
        primaryPhone: input.primaryPhone?.trim() || null,
        primaryEmail: input.primaryEmail?.trim().toLowerCase() || null,
        address: input.address || undefined,
        photoMediaId: input.photoMediaId || null,
        version: 1,
      },
    });

    // 2. Create Initial Employment
    const employment = await tx.employment.create({
      data: {
        tenantId,
        personId: person.id,
        organizationId: input.employment.organizationId,
        locationId: input.employment.locationId || null,
        orgUnitId: input.employment.orgUnitId || null,
        employeeNumber,
        jobTitle: input.employment.jobTitle.trim(),
        jobCategory: input.employment.jobCategory || JobCategory.STAFF,
        joinDate: new Date(input.employment.joinDate),
        endDate: input.employment.endDate ? new Date(input.employment.endDate) : null,
        status: input.employment.status || EmploymentStatus.ACTIVE,
        isPrimary: input.employment.isPrimary ?? true,
        version: 1,
      },
    });

    // 3. Create Identity Document if provided
    let identityDoc = null;
    if (input.identityDocument && input.identityDocument.documentNumber) {
      const rawNumber = input.identityDocument.documentNumber.trim();
      identityDoc = await tx.identityDocument.create({
        data: {
          tenantId,
          personId: person.id,
          documentType: input.identityDocument.documentType,
          country: input.identityDocument.country || 'BGD',
          documentNumberEncrypted: encryptSensitiveValue(rawNumber),
          documentNumberMasked: maskSensitiveIdentifier(rawNumber),
          documentNumberHash: hashForBlindIndex(rawNumber, tenantId),
          issueDate: input.identityDocument.issueDate
            ? new Date(input.identityDocument.issueDate)
            : null,
          expiryDate: input.identityDocument.expiryDate
            ? new Date(input.identityDocument.expiryDate)
            : null,
          isVerified: input.identityDocument.isVerified ?? false,
        },
      });
    }

    return {
      person,
      employment,
      identityDocument: identityDoc,
    };
  });
}

/**
 * Updates person details with optimistic concurrency check.
 */
export async function updatePerson(tenantId: string, personId: string, input: UpdatePersonInput) {
  const current = await prisma.person.findFirst({
    where: { id: personId, tenantId },
  });

  if (!current) {
    throw new PersonNotFoundError(personId);
  }

  if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
    throw new ConcurrencyConflictError();
  }

  return await prisma.person.update({
    where: { id: personId },
    data: {
      displayName: input.displayName ? input.displayName.trim() : undefined,
      displayNameLatin:
        input.displayNameLatin !== undefined ? input.displayNameLatin?.trim() || null : undefined,
      displayNameNative:
        input.displayNameNative !== undefined ? input.displayNameNative?.trim() || null : undefined,
      givenName: input.givenName !== undefined ? input.givenName?.trim() || null : undefined,
      familyName: input.familyName !== undefined ? input.familyName?.trim() || null : undefined,
      middleName: input.middleName !== undefined ? input.middleName?.trim() || null : undefined,
      phoneticName:
        input.phoneticName !== undefined ? input.phoneticName?.trim() || null : undefined,
      dateOfBirth:
        input.dateOfBirth !== undefined
          ? input.dateOfBirth
            ? new Date(input.dateOfBirth)
            : null
          : undefined,
      gender: input.gender,
      bloodGroup: input.bloodGroup !== undefined ? input.bloodGroup?.trim() || null : undefined,
      primaryPhone:
        input.primaryPhone !== undefined ? input.primaryPhone?.trim() || null : undefined,
      primaryEmail:
        input.primaryEmail !== undefined
          ? input.primaryEmail?.trim().toLowerCase() || null
          : undefined,
      address: input.address !== undefined ? input.address || undefined : undefined,
      photoMediaId: input.photoMediaId !== undefined ? input.photoMediaId : undefined,
      version: { increment: 1 },
    },
  });
}

/**
 * Updates employment record with optimistic concurrency check.
 */
export async function updateEmployment(
  tenantId: string,
  employmentId: string,
  input: UpdateEmploymentInput,
) {
  const current = await prisma.employment.findFirst({
    where: { id: employmentId, tenantId },
  });

  if (!current) {
    throw new EmploymentNotFoundError(employmentId);
  }

  if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
    throw new ConcurrencyConflictError();
  }

  return await prisma.employment.update({
    where: { id: employmentId },
    data: {
      locationId: input.locationId !== undefined ? input.locationId : undefined,
      orgUnitId: input.orgUnitId !== undefined ? input.orgUnitId : undefined,
      jobTitle: input.jobTitle !== undefined ? input.jobTitle.trim() : undefined,
      jobCategory: input.jobCategory !== undefined ? input.jobCategory : undefined,
      joinDate: input.joinDate ? new Date(input.joinDate) : undefined,
      endDate:
        input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined,
      status: input.status !== undefined ? input.status : undefined,
      isPrimary: input.isPrimary !== undefined ? input.isPrimary : undefined,
      version: { increment: 1 },
    },
  });
}

/**
 * Retrieves full Person record, active employment, historical employments, and masked identity documents.
 */
export async function getPersonById(tenantId: string, personId: string) {
  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId },
    include: {
      employments: {
        include: {
          organization: { select: { id: true, name: true, displayName: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
          orgUnit: { select: { id: true, name: true, nameBangla: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      identityDocuments: {
        select: {
          id: true,
          documentType: true,
          country: true,
          documentNumberMasked: true,
          issueDate: true,
          expiryDate: true,
          isVerified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!person) {
    throw new PersonNotFoundError(personId);
  }

  const activeEmployment =
    person.employments.find((e) => e.isPrimary) || person.employments[0] || null;

  return {
    ...person,
    activeEmployment,
  };
}

export interface PeopleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  organizationId?: string;
  locationId?: string;
  orgUnitId?: string;
  status?: EmploymentStatus;
  jobCategory?: JobCategory;
  hasPhoto?: 'true' | 'false';
  sortBy?: 'employeeNumber' | 'displayName' | 'joinDate' | 'status' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

/**
 * High-performance paginated people search for server-side tables (50,000+ records).
 */
export async function searchPeople(tenantId: string, params: PeopleQueryParams) {
  const page = Math.max(Number(params.page) || 1, 1);
  const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 100);
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: any = {
    tenantId,
  };

  // Search filter
  if (params.search) {
    const query = params.search.trim();
    where.OR = [
      { displayName: { contains: query, mode: 'insensitive' } },
      { displayNameLatin: { contains: query, mode: 'insensitive' } },
      { displayNameNative: { contains: query } },
      { primaryPhone: { contains: query } },
      { primaryEmail: { contains: query, mode: 'insensitive' } },
      {
        employments: {
          some: {
            employeeNumber: { contains: query, mode: 'insensitive' },
          },
        },
      },
      {
        employments: {
          some: {
            jobTitle: { contains: query, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  // Photo filter
  if (params.hasPhoto === 'true') {
    where.photoMediaId = { not: null };
  } else if (params.hasPhoto === 'false') {
    where.photoMediaId = null;
  }

  // Employment-level filters
  const employmentFilter: any = {};
  if (params.organizationId) employmentFilter.organizationId = params.organizationId;
  if (params.locationId) employmentFilter.locationId = params.locationId;
  if (params.orgUnitId) employmentFilter.orgUnitId = params.orgUnitId;
  if (params.status) employmentFilter.status = params.status;
  if (params.jobCategory) employmentFilter.jobCategory = params.jobCategory;

  if (Object.keys(employmentFilter).length > 0) {
    where.employments = {
      some: employmentFilter,
    };
  }

  // Sorting
  const sortDirection = params.sortDirection === 'desc' ? 'desc' : 'asc';
  let orderBy: any = { createdAt: 'desc' };

  if (params.sortBy === 'displayName') {
    orderBy = { displayName: sortDirection };
  } else if (params.sortBy === 'updatedAt') {
    orderBy = { updatedAt: sortDirection };
  }

  const [totalCount, people] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        employments: {
          where: { isPrimary: true },
          take: 1,
          include: {
            organization: { select: { id: true, name: true, displayName: true } },
            location: { select: { id: true, name: true, code: true } },
            orgUnit: { select: { id: true, name: true, nameBangla: true, code: true } },
          },
        },
        identityDocuments: {
          select: {
            id: true,
            documentType: true,
            documentNumberMasked: true,
            isVerified: true,
          },
          take: 1,
        },
      },
    }),
  ]);

  const items = people.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    displayNameLatin: p.displayNameLatin,
    displayNameNative: p.displayNameNative,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    primaryPhone: p.primaryPhone,
    primaryEmail: p.primaryEmail,
    photoMediaId: p.photoMediaId,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    activeEmployment: p.employments[0]
      ? {
          id: p.employments[0].id,
          employeeNumber: p.employments[0].employeeNumber,
          jobTitle: p.employments[0].jobTitle,
          jobCategory: p.employments[0].jobCategory,
          joinDate: p.employments[0].joinDate.toISOString().split('T')[0],
          endDate: p.employments[0].endDate?.toISOString().split('T')[0] || null,
          status: p.employments[0].status,
          organizationName:
            p.employments[0].organization.displayName || p.employments[0].organization.name,
          locationName: p.employments[0].location?.name || null,
          orgUnitName: p.employments[0].orgUnit?.name || null,
          orgUnitNameBangla: p.employments[0].orgUnit?.nameBangla || null,
        }
      : null,
    identityDocument: p.identityDocuments[0] || null,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Bulk updates employment status across multiple records.
 */
export async function bulkUpdateEmploymentStatus(
  tenantId: string,
  employmentIds: string[],
  newStatus: EmploymentStatus,
) {
  const result = await prisma.employment.updateMany({
    where: {
      tenantId,
      id: { in: employmentIds },
    },
    data: {
      status: newStatus,
      version: { increment: 1 },
    },
  });

  return {
    updatedCount: result.count,
  };
}
