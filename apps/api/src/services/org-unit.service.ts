import { prisma } from '@hr/db';
import {
  CreateOrgUnitRequest,
  UpdateOrgUnitRequest,
  OrgUnitDto,
  OrgUnitTreeNode,
} from '@hr/schemas';

export class OrgUnitNotFoundError extends Error {
  constructor(message = 'Organizational unit not found in workspace.') {
    super(message);
    this.name = 'OrgUnitNotFoundError';
  }
}

export class HierarchyCycleError extends Error {
  constructor(message = 'Invalid hierarchy move: would create a cyclic dependency.') {
    super(message);
    this.name = 'HierarchyCycleError';
  }
}

export class SiblingNameConflictError extends Error {
  constructor(
    message = 'A sibling organizational unit with this name already exists under the same parent.',
  ) {
    super(message);
    this.name = 'SiblingNameConflictError';
  }
}

export class DuplicateOrgUnitCodeError extends Error {
  constructor(message = 'Organizational unit code already in use in this organization.') {
    super(message);
    this.name = 'DuplicateOrgUnitCodeError';
  }
}

export class CrossOrganizationHierarchyError extends Error {
  constructor(message = 'Parent unit belongs to a different organization or tenant.') {
    super(message);
    this.name = 'CrossOrganizationHierarchyError';
  }
}

export class OrgUnitHasChildrenError extends Error {
  constructor(
    message = 'Cannot delete organizational unit because it has sub-units. Archive the unit or reassign sub-units first.',
  ) {
    super(message);
    this.name = 'OrgUnitHasChildrenError';
  }
}

/**
 * Validates that moving `unitId` to `newParentId` does not create a cycle or cross org boundaries
 */
export async function validateHierarchyIntegrity(
  tenantId: string,
  organizationId: string,
  unitId: string,
  newParentId: string | null,
) {
  if (!newParentId) {
    return; // Moving to root is always cycle-free
  }

  if (unitId === newParentId) {
    throw new HierarchyCycleError('An organizational unit cannot be its own parent.');
  }

  // Fetch proposed parent
  const parent = await prisma.orgUnit.findFirst({
    where: { id: newParentId, tenantId },
  });

  if (!parent) {
    throw new OrgUnitNotFoundError('Selected parent unit does not exist.');
  }

  if (parent.organizationId !== organizationId) {
    throw new CrossOrganizationHierarchyError();
  }

  // Traverse ancestor chain from newParent up to root
  let currentParentId: string | null = parent.parentId;
  const visited = new Set<string>([newParentId]);

  while (currentParentId) {
    if (currentParentId === unitId) {
      throw new HierarchyCycleError(
        'Invalid move: the selected parent is a sub-unit of the unit being moved.',
      );
    }

    if (visited.has(currentParentId)) {
      throw new HierarchyCycleError('Corrupted tree cycle detected in ancestor chain.');
    }
    visited.add(currentParentId);

    const ancestor = await prisma.orgUnit.findUnique({
      where: { id: currentParentId },
      select: { id: true, parentId: true },
    });

    currentParentId = ancestor ? ancestor.parentId : null;
  }
}

/**
 * Get all org units for an organization, formatted with breadcrumbs and child counts
 */
export async function getOrgUnits(
  tenantId: string,
  organizationId: string,
  options?: { includeArchived?: boolean },
) {
  const units = await prisma.orgUnit.findMany({
    where: {
      tenantId,
      organizationId,
      ...(options?.includeArchived ? {} : { isArchived: false }),
    },
    include: {
      location: {
        select: { id: true, name: true },
      },
      children: {
        select: { id: true },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  // Build a map for fast breadcrumb calculation
  const unitMap = new Map(units.map((u) => [u.id, u]));

  function getBreadcrumb(unit: (typeof units)[0]): string {
    const parts: string[] = [unit.name];
    let curr = unit.parentId ? unitMap.get(unit.parentId) : null;
    while (curr) {
      parts.unshift(curr.name);
      curr = curr.parentId ? unitMap.get(curr.parentId) : null;
    }
    return parts.join(' > ');
  }

  return units.map((u) => ({
    id: u.id,
    tenantId: u.tenantId,
    organizationId: u.organizationId,
    parentId: u.parentId,
    name: u.name,
    nameBangla: u.nameBangla,
    code: u.code,
    type: u.type,
    locationId: u.locationId,
    locationName: u.location?.name,
    isArchived: u.isArchived,
    sortOrder: u.sortOrder,
    breadcrumbPath: getBreadcrumb(u),
    childrenCount: u.children.length,
    workerCount: 0,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

/**
 * Get hierarchical tree structure
 */
export async function getOrgUnitTree(
  tenantId: string,
  organizationId: string,
  options?: { includeArchived?: boolean },
): Promise<OrgUnitTreeNode[]> {
  const flatUnits = await getOrgUnits(tenantId, organizationId, options);

  const nodeMap = new Map<string, OrgUnitTreeNode>();
  flatUnits.forEach((u) => {
    nodeMap.set(u.id, { ...u, children: [] });
  });

  const roots: OrgUnitTreeNode[] = [];

  flatUnits.forEach((u) => {
    const node = nodeMap.get(u.id)!;
    if (u.parentId && nodeMap.has(u.parentId)) {
      nodeMap.get(u.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Create a new OrgUnit
 */
export async function createOrgUnit(tenantId: string, payload: CreateOrgUnitRequest) {
  // Validate organization
  const org = await prisma.organization.findFirst({
    where: { id: payload.organizationId, tenantId },
  });

  if (!org) {
    throw new OrgUnitNotFoundError('Organization not found in workspace.');
  }

  // Validate parent if provided
  if (payload.parentId) {
    const parent = await prisma.orgUnit.findFirst({
      where: { id: payload.parentId, tenantId, organizationId: payload.organizationId },
    });

    if (!parent) {
      throw new OrgUnitNotFoundError('Specified parent unit does not exist in this organization.');
    }
  }

  // Check code uniqueness within org
  const duplicateCode = await prisma.orgUnit.findFirst({
    where: {
      organizationId: payload.organizationId,
      code: payload.code.toUpperCase().trim(),
    },
  });

  if (duplicateCode) {
    throw new DuplicateOrgUnitCodeError();
  }

  // Check sibling name uniqueness
  const duplicateSibling = await prisma.orgUnit.findFirst({
    where: {
      organizationId: payload.organizationId,
      parentId: payload.parentId || null,
      name: { equals: payload.name.trim(), mode: 'insensitive' },
    },
  });

  if (duplicateSibling) {
    throw new SiblingNameConflictError();
  }

  return await prisma.orgUnit.create({
    data: {
      tenantId,
      organizationId: payload.organizationId,
      parentId: payload.parentId || null,
      name: payload.name.trim(),
      nameBangla: payload.nameBangla?.trim() || null,
      code: payload.code.toUpperCase().trim(),
      type: payload.type,
      locationId: payload.locationId || null,
      sortOrder: payload.sortOrder || 0,
      isArchived: false,
    },
  });
}

/**
 * Update OrgUnit metadata
 */
export async function updateOrgUnit(tenantId: string, id: string, payload: UpdateOrgUnitRequest) {
  const existing = await prisma.orgUnit.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new OrgUnitNotFoundError();
  }

  // If code changed, check uniqueness
  if (payload.code && payload.code.toUpperCase().trim() !== existing.code) {
    const duplicate = await prisma.orgUnit.findFirst({
      where: {
        organizationId: existing.organizationId,
        code: payload.code.toUpperCase().trim(),
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new DuplicateOrgUnitCodeError();
    }
  }

  // If name changed, check sibling name uniqueness
  if (payload.name && payload.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.orgUnit.findFirst({
      where: {
        organizationId: existing.organizationId,
        parentId: existing.parentId,
        name: { equals: payload.name.trim(), mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new SiblingNameConflictError();
    }
  }

  return await prisma.orgUnit.update({
    where: { id },
    data: {
      name: payload.name !== undefined ? payload.name.trim() : undefined,
      nameBangla:
        payload.nameBangla !== undefined
          ? payload.nameBangla
            ? payload.nameBangla.trim()
            : null
          : undefined,
      code: payload.code !== undefined ? payload.code.toUpperCase().trim() : undefined,
      type: payload.type,
      locationId: payload.locationId !== undefined ? payload.locationId : undefined,
      sortOrder: payload.sortOrder,
    },
  });
}

/**
 * Move OrgUnit to a new parent with cycle detection
 */
export async function moveOrgUnit(tenantId: string, id: string, newParentId: string | null) {
  const existing = await prisma.orgUnit.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new OrgUnitNotFoundError();
  }

  if (existing.parentId === newParentId) {
    return { unit: existing, previousParentId: existing.parentId }; // No move needed
  }

  // Validate cycle prevention & org boundary
  await validateHierarchyIntegrity(tenantId, existing.organizationId, id, newParentId);

  // Check sibling name conflict at new destination
  const duplicateSibling = await prisma.orgUnit.findFirst({
    where: {
      organizationId: existing.organizationId,
      parentId: newParentId,
      name: { equals: existing.name, mode: 'insensitive' },
      id: { not: id },
    },
  });

  if (duplicateSibling) {
    throw new SiblingNameConflictError(
      `Cannot move unit: A unit named '${existing.name}' already exists under the target parent.`,
    );
  }

  const previousParentId = existing.parentId;
  const updated = await prisma.orgUnit.update({
    where: { id },
    data: {
      parentId: newParentId,
    },
  });

  return { unit: updated, previousParentId };
}

/**
 * Archive / Unarchive OrgUnit
 */
export async function setOrgUnitArchived(tenantId: string, id: string, isArchived: boolean) {
  const existing = await prisma.orgUnit.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new OrgUnitNotFoundError();
  }

  return await prisma.orgUnit.update({
    where: { id },
    data: { isArchived },
  });
}

/**
 * Delete OrgUnit (with child protection)
 */
export async function deleteOrgUnit(tenantId: string, id: string) {
  const existing = await prisma.orgUnit.findFirst({
    where: { id, tenantId },
    include: {
      children: { select: { id: true } },
    },
  });

  if (!existing) {
    throw new OrgUnitNotFoundError();
  }

  if (existing.children.length > 0) {
    throw new OrgUnitHasChildrenError();
  }

  await prisma.orgUnit.delete({
    where: { id },
  });

  return existing;
}
