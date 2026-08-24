import { prisma } from '@hr/db';
import { CustomFieldType } from '@hr/domain';

export class DuplicateCustomFieldKeyError extends Error {
  constructor(key: string) {
    super(`Custom field with key '${key}' already exists.`);
    this.name = 'DuplicateCustomFieldKeyError';
  }
}

export interface CreateCustomFieldDefinitionInput {
  organizationId?: string | null;
  name: string;
  key: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  validationRegex?: string;
  sortOrder?: number;
}

export async function getCustomFieldDefinitions(tenantId: string, organizationId?: string) {
  return await prisma.customFieldDefinition.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])],
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createCustomFieldDefinition(
  tenantId: string,
  input: CreateCustomFieldDefinitionInput,
) {
  const key = input.key.trim().toLowerCase();

  const existing = await prisma.customFieldDefinition.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key,
      },
    },
  });

  if (existing) {
    throw new DuplicateCustomFieldKeyError(key);
  }

  return await prisma.customFieldDefinition.create({
    data: {
      tenantId,
      organizationId: input.organizationId || null,
      name: input.name.trim(),
      key,
      fieldType: input.fieldType,
      options: input.options || undefined,
      isRequired: input.isRequired ?? false,
      validationRegex: input.validationRegex || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    },
  });
}
