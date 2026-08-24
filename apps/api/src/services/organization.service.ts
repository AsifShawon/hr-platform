import { prisma } from '@hr/db';
import { UpdateOrganizationRequest, CreateOrganizationRequest } from '@hr/schemas';

export class OrganizationNotFoundError extends Error {
  constructor(message = 'Organization not found in workspace.') {
    super(message);
    this.name = 'OrganizationNotFoundError';
  }
}

export class DuplicateOrganizationCodeError extends Error {
  constructor(message = 'Organization code already in use in this workspace.') {
    super(message);
    this.name = 'DuplicateOrganizationCodeError';
  }
}

export async function getTenantOrganizations(tenantId: string) {
  const orgs = await prisma.organization.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: {
          locations: true,
          orgUnits: true,
        },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return orgs.map((org) => ({
    id: org.id,
    tenantId: org.tenantId,
    name: org.name,
    displayName: org.displayName,
    code: org.code,
    logoPath: org.logoPath,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    accentColor: org.accentColor,
    locale: org.locale,
    timezone: org.timezone,
    address: org.address as any,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    employeeNumberRule: org.employeeNumberRule as any,
    isDefault: org.isDefault,
    locationCount: org._count.locations,
    unitCount: org._count.orgUnits,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  }));
}

export async function getOrganizationById(tenantId: string, id: string) {
  const org = await prisma.organization.findFirst({
    where: { id, tenantId },
    include: {
      locations: {
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      },
      _count: {
        select: {
          orgUnits: true,
        },
      },
    },
  });

  if (!org) {
    throw new OrganizationNotFoundError();
  }

  return {
    id: org.id,
    tenantId: org.tenantId,
    name: org.name,
    displayName: org.displayName,
    code: org.code,
    logoPath: org.logoPath,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    accentColor: org.accentColor,
    locale: org.locale,
    timezone: org.timezone,
    address: org.address as any,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    employeeNumberRule: org.employeeNumberRule as any,
    isDefault: org.isDefault,
    locations: org.locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      type: loc.type,
      address: loc.address as any,
      contactPhone: loc.contactPhone,
      isDefault: loc.isDefault,
    })),
    unitCount: org._count.orgUnits,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function createOrganization(tenantId: string, payload: CreateOrganizationRequest) {
  const existing = await prisma.organization.findFirst({
    where: { tenantId, code: payload.code.toUpperCase() },
  });

  if (existing) {
    throw new DuplicateOrganizationCodeError();
  }

  const org = await prisma.organization.create({
    data: {
      tenantId,
      name: payload.name.trim(),
      displayName: payload.displayName?.trim() || null,
      code: payload.code.toUpperCase().trim(),
      primaryColor: payload.primaryColor || '#134E4A',
      secondaryColor: payload.secondaryColor || '#0F766E',
      accentColor: payload.accentColor || '#14B8A6',
      locale: payload.locale || 'en-US',
      timezone: payload.timezone || 'Asia/Dhaka',
      address: payload.address ? (payload.address as any) : undefined,
      contactEmail: payload.contactEmail ? payload.contactEmail.toLowerCase().trim() : null,
      contactPhone: payload.contactPhone?.trim() || null,
      employeeNumberRule: payload.employeeNumberRule
        ? (payload.employeeNumberRule as any)
        : undefined,
      isDefault: false,
    },
  });

  return org;
}

export async function updateOrganization(
  tenantId: string,
  id: string,
  payload: UpdateOrganizationRequest,
) {
  const existing = await prisma.organization.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new OrganizationNotFoundError();
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      name: payload.name !== undefined ? payload.name.trim() : undefined,
      displayName:
        payload.displayName !== undefined
          ? payload.displayName
            ? payload.displayName.trim()
            : null
          : undefined,
      primaryColor: payload.primaryColor,
      secondaryColor: payload.secondaryColor,
      accentColor: payload.accentColor,
      locale: payload.locale,
      timezone: payload.timezone,
      address: payload.address !== undefined ? (payload.address as any) : undefined,
      contactEmail:
        payload.contactEmail !== undefined
          ? payload.contactEmail
            ? payload.contactEmail.toLowerCase().trim()
            : null
          : undefined,
      contactPhone:
        payload.contactPhone !== undefined
          ? payload.contactPhone
            ? payload.contactPhone.trim()
            : null
          : undefined,
      employeeNumberRule:
        payload.employeeNumberRule !== undefined ? (payload.employeeNumberRule as any) : undefined,
    },
  });

  return updated;
}

export async function updateOrganizationLogo(tenantId: string, id: string, logoFilename: string) {
  const existing = await prisma.organization.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new OrganizationNotFoundError();
  }

  return await prisma.organization.update({
    where: { id },
    data: {
      logoPath: logoFilename,
    },
  });
}
