import { prisma } from '@hr/db';
import { CreateLocationRequest, UpdateLocationRequest } from '@hr/schemas';

export class LocationNotFoundError extends Error {
  constructor(message = 'Location not found in workspace.') {
    super(message);
    this.name = 'LocationNotFoundError';
  }
}

export class DuplicateLocationCodeError extends Error {
  constructor(message = 'Location code already in use in this organization.') {
    super(message);
    this.name = 'DuplicateLocationCodeError';
  }
}

export class LocationInUseError extends Error {
  constructor(
    message = 'Cannot delete location because it is associated with organizational units or assigned users.',
  ) {
    super(message);
    this.name = 'LocationInUseError';
  }
}

export async function getLocations(tenantId: string, organizationId?: string) {
  const locations = await prisma.location.findMany({
    where: {
      tenantId,
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      _count: {
        select: {
          orgUnits: true,
        },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return locations.map((loc) => ({
    id: loc.id,
    tenantId: loc.tenantId,
    organizationId: loc.organizationId,
    name: loc.name,
    code: loc.code,
    type: loc.type,
    address: loc.address as any,
    contactPhone: loc.contactPhone,
    isDefault: loc.isDefault,
    unitCount: loc._count.orgUnits,
    createdAt: loc.createdAt.toISOString(),
    updatedAt: loc.updatedAt.toISOString(),
  }));
}

export async function createLocation(tenantId: string, payload: CreateLocationRequest) {
  // Check organization exists in tenant
  const org = await prisma.organization.findFirst({
    where: { id: payload.organizationId, tenantId },
  });

  if (!org) {
    throw new LocationNotFoundError('Organization not found.');
  }

  // Check code uniqueness within org
  const existingCode = await prisma.location.findFirst({
    where: {
      organizationId: payload.organizationId,
      code: payload.code.toUpperCase(),
    },
  });

  if (existingCode) {
    throw new DuplicateLocationCodeError();
  }

  // If marked default, unset other defaults in org
  if (payload.isDefault) {
    await prisma.location.updateMany({
      where: { organizationId: payload.organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return await prisma.location.create({
    data: {
      tenantId,
      organizationId: payload.organizationId,
      name: payload.name.trim(),
      code: payload.code.toUpperCase().trim(),
      type: payload.type,
      address: payload.address ? (payload.address as any) : undefined,
      contactPhone: payload.contactPhone?.trim() || null,
      isDefault: payload.isDefault || false,
    },
  });
}

export async function updateLocation(tenantId: string, id: string, payload: UpdateLocationRequest) {
  const existing = await prisma.location.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new LocationNotFoundError();
  }

  if (payload.code && payload.code.toUpperCase() !== existing.code) {
    const duplicate = await prisma.location.findFirst({
      where: {
        organizationId: existing.organizationId,
        code: payload.code.toUpperCase(),
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new DuplicateLocationCodeError();
    }
  }

  if (payload.isDefault) {
    await prisma.location.updateMany({
      where: { organizationId: existing.organizationId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  return await prisma.location.update({
    where: { id },
    data: {
      name: payload.name !== undefined ? payload.name.trim() : undefined,
      code: payload.code !== undefined ? payload.code.toUpperCase().trim() : undefined,
      type: payload.type,
      address: payload.address !== undefined ? (payload.address as any) : undefined,
      contactPhone:
        payload.contactPhone !== undefined
          ? payload.contactPhone
            ? payload.contactPhone.trim()
            : null
          : undefined,
      isDefault: payload.isDefault,
    },
  });
}

export async function deleteLocation(tenantId: string, id: string) {
  const existing = await prisma.location.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: {
          orgUnits: true,
          roleGrants: true,
        },
      },
    },
  });

  if (!existing) {
    throw new LocationNotFoundError();
  }

  if (existing._count.orgUnits > 0 || existing._count.roleGrants > 0) {
    throw new LocationInUseError();
  }

  await prisma.location.delete({
    where: { id },
  });

  return existing;
}
