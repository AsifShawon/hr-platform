import { z } from 'zod';
export { z };
import {
  Permission,
  BuiltInRole,
  WorkerStatus,
  CardOrientation,
  AuditAction,
  LocationType,
  OrgUnitType,
  Gender,
  EmploymentStatus,
  JobCategory,
  IdentityDocumentType,
  CustomFieldType,
  CardFormatPreset,
  TemplatePresetId,
  TemplateVersionStatus,
  TemplateAssignmentTarget,
  BarcodeType,
  BarcodePayloadType,
  LocaleFallbackPolicy,
  ImportDuplicateStrategy,
  ImportCommitPolicy,
  ImportJobStatus,
  ExportJobStatus,
  BackupStatus,
  BackupTrigger,
} from '@hr/domain';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string().datetime(),
  database: z.enum(['connected', 'disconnected']).optional(),
  uptime: z.number().optional(),
  version: z.string().optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// System & Activation Schemas
export const systemStatusSchema = z.object({
  isActivated: z.boolean(),
  activatedAt: z.string().datetime().nullable(),
  deploymentMode: z.enum(['local', 'hosted']),
  lanEnabled: z.boolean(),
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;

export const localActivationRequestSchema = z
  .object({
    newUsername: z.string().min(3).max(50).optional(),
    newPassword: z.string().min(10).max(128),
    confirmPassword: z.string().min(10).max(128),
    acknowledgedRecoveryCodes: z.boolean().refine((val) => val === true, {
      message: 'You must confirm that you have saved your emergency recovery codes.',
    }),
    confirmedBackupResponsibility: z.boolean().refine((val) => val === true, {
      message: 'You must confirm your responsibility for local data backups.',
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LocalActivationRequest = z.infer<typeof localActivationRequestSchema>;

export const hostedActivationRequestSchema = z
  .object({
    token: z.string().min(16),
    newPassword: z.string().min(10).max(128),
    confirmPassword: z.string().min(10).max(128),
    acknowledgedRecoveryCodes: z.boolean().refine((val) => val === true, {
      message: 'You must confirm that you have saved your emergency recovery codes.',
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type HostedActivationRequest = z.infer<typeof hostedActivationRequestSchema>;

// Auth Schemas
export const loginRequestSchema = z.object({
  username: z.string().min(1, 'Username or email is required').max(100),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  username: z.string(),
  email: z.string().email().nullable(),
  isActive: z.boolean(),
  isTemporaryBootstrap: z.boolean(),
  mustChangePassword: z.boolean(),
  roles: z.array(z.string()),
  permissions: z.array(z.nativeEnum(Permission)),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const passwordChangeRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(10, 'New password must be at least 10 characters long').max(128),
    confirmNewPassword: z.string().min(10).max(128),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match.',
    path: ['confirmNewPassword'],
  });

export type PasswordChangeRequest = z.infer<typeof passwordChangeRequestSchema>;

export const sessionItemSchema = z.object({
  id: z.string().uuid(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  isCurrent: z.boolean(),
  lastActiveAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type SessionItem = z.infer<typeof sessionItemSchema>;

// Address & Rule Schemas
export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export type AddressDto = z.infer<typeof addressSchema>;

export const employeeNumberRuleSchema = z.object({
  prefix: z.string().max(10).default('EMP-'),
  padLength: z.number().int().min(2).max(10).default(4),
  nextSequence: z.number().int().min(1).default(1),
});

export type EmployeeNumberRuleDto = z.infer<typeof employeeNumberRuleSchema>;

// Organization Schemas
export const organizationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  displayName: z.string().max(100).nullable().optional(),
  code: z.string().min(1).max(30),
  logoPath: z.string().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Must be a valid hex color code')
    .default('#134E4A'),
  secondaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Must be a valid hex color code')
    .default('#0F766E'),
  accentColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Must be a valid hex color code')
    .default('#14B8A6'),
  locale: z.string().default('en-US'),
  timezone: z.string().default('Asia/Dhaka'),
  address: addressSchema.nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  employeeNumberRule: employeeNumberRuleSchema.nullable().optional(),
  isDefault: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OrganizationDto = z.infer<typeof organizationSchema>;

export const updateOrganizationRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  displayName: z.string().max(100).nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Must be a valid 6-character hex code')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Must be a valid 6-character hex code')
    .optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, 'Must be a valid 6-character hex code')
    .optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(2).max(50).optional(),
  address: addressSchema.optional(),
  contactEmail: z.string().email().nullable().optional().or(z.literal('')),
  contactPhone: z.string().nullable().optional(),
  employeeNumberRule: employeeNumberRuleSchema.optional(),
});

export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationRequestSchema>;

export const createOrganizationRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  displayName: z.string().max(100).optional(),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain uppercase letters, numbers, hyphens or underscores'),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/)
    .optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  address: addressSchema.optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  employeeNumberRule: employeeNumberRuleSchema.optional(),
});

export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>;

// Location Schemas
export const locationTypeSchema = z.nativeEnum(LocationType);

export const locationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(30),
  type: locationTypeSchema,
  address: addressSchema.nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  unitCount: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LocationDto = z.infer<typeof locationSchema>;

export const createLocationRequestSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1, 'Location name is required').max(100),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain uppercase letters, numbers, hyphens or underscores'),
  type: locationTypeSchema.default(LocationType.OFFICE),
  address: addressSchema.optional(),
  contactPhone: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;

export const updateLocationRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  type: locationTypeSchema.optional(),
  address: addressSchema.optional(),
  contactPhone: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;

// OrgUnit Schemas
export const orgUnitTypeSchema = z.nativeEnum(OrgUnitType);

export const orgUnitSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string().min(1).max(100),
  nameBangla: z.string().max(100).nullable().optional(),
  code: z.string().min(1).max(30),
  type: orgUnitTypeSchema,
  locationId: z.string().uuid().nullable().optional(),
  locationName: z.string().optional(),
  isArchived: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  breadcrumbPath: z.string().optional(),
  childrenCount: z.number().int().default(0),
  workerCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OrgUnitDto = z.infer<typeof orgUnitSchema>;

export const orgUnitTreeNodeSchema: z.ZodType<any> = orgUnitSchema.extend({
  children: z.lazy(() => z.array(orgUnitTreeNodeSchema)),
});

export type OrgUnitTreeNode = z.infer<typeof orgUnitTreeNodeSchema>;

export const createOrgUnitRequestSchema = z.object({
  organizationId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Unit name is required').max(100),
  nameBangla: z.string().max(100).optional(),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Code must contain uppercase letters, numbers, hyphens or underscores'),
  type: orgUnitTypeSchema.default(OrgUnitType.DEPARTMENT),
  locationId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export type CreateOrgUnitRequest = z.infer<typeof createOrgUnitRequestSchema>;

export const updateOrgUnitRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameBangla: z.string().max(100).nullable().optional(),
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  type: orgUnitTypeSchema.optional(),
  locationId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateOrgUnitRequest = z.infer<typeof updateOrgUnitRequestSchema>;

export const moveOrgUnitRequestSchema = z.object({
  newParentId: z.string().uuid().nullable(),
});

export type MoveOrgUnitRequest = z.infer<typeof moveOrgUnitRequestSchema>;

export const archiveOrgUnitRequestSchema = z.object({
  isArchived: z.boolean(),
});

export type ArchiveOrgUnitRequest = z.infer<typeof archiveOrgUnitRequestSchema>;

// Role & Permission Schemas
export const roleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  isBuiltIn: z.boolean().default(false),
  permissions: z.array(z.nativeEnum(Permission)),
});

export type RoleDto = z.infer<typeof roleSchema>;

export const createRoleRequestSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50),
  description: z.string().max(255).optional(),
  permissions: z.array(z.nativeEnum(Permission)).min(1, 'At least one permission must be selected'),
});

export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;

export const updateRoleRequestSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(255).optional(),
  permissions: z
    .array(z.nativeEnum(Permission))
    .min(1, 'At least one permission must be selected')
    .optional(),
});

export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>;

// Scoped Role Grant Schema
export const scopedRoleGrantSchema = z.object({
  roleId: z.string().uuid(),
  organizationId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
});

export type ScopedRoleGrantDto = z.infer<typeof scopedRoleGrantSchema>;

// User Management Schemas
export const createUserRequestSchema = z
  .object({
    username: z.string().min(3).max(50),
    email: z.string().email().optional(),
    initialPassword: z.string().min(10).max(128),
    roleIds: z.array(z.string().uuid()).min(1, 'At least one role must be assigned').optional(),
    roleGrants: z
      .array(scopedRoleGrantSchema)
      .min(1, 'At least one role must be assigned')
      .optional(),
  })
  .refine(
    (data) =>
      (data.roleIds && data.roleIds.length > 0) || (data.roleGrants && data.roleGrants.length > 0),
    {
      message: 'At least one role must be assigned',
      path: ['roleGrants'],
    },
  );

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const updateUserRequestSchema = z.object({
  email: z.string().email().nullable().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  roleGrants: z.array(scopedRoleGrantSchema).optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

// ==============================================================================
// Phase 4: Person, Employment, Identity Document & Custom Field Schemas
// ==============================================================================

export const genderSchema = z.nativeEnum(Gender);
export const employmentStatusSchema = z.nativeEnum(EmploymentStatus);
export const jobCategorySchema = z.nativeEnum(JobCategory);
export const identityDocumentTypeSchema = z.nativeEnum(IdentityDocumentType);
export const customFieldTypeSchema = z.nativeEnum(CustomFieldType);

// Identity Document Schemas
export const identityDocumentDtoSchema = z.object({
  id: z.string().uuid(),
  documentType: identityDocumentTypeSchema,
  country: z.string(),
  documentNumberMasked: z.string(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  isVerified: z.boolean(),
});

export type IdentityDocumentDto = z.infer<typeof identityDocumentDtoSchema>;

export const createIdentityDocumentRequestSchema = z.object({
  documentType: identityDocumentTypeSchema,
  country: z.string().max(10).default('BGD'),
  documentNumber: z.string().min(4).max(50),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isVerified: z.boolean().optional(),
});

export type CreateIdentityDocumentRequest = z.infer<typeof createIdentityDocumentRequestSchema>;

// Employment Schemas
export const employmentDtoSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  organizationId: z.string().uuid(),
  organizationName: z.string().optional(),
  locationId: z.string().uuid().nullable().optional(),
  locationName: z.string().nullable().optional(),
  orgUnitId: z.string().uuid().nullable().optional(),
  orgUnitName: z.string().nullable().optional(),
  employeeNumber: z.string(),
  jobTitle: z.string(),
  jobCategory: jobCategorySchema,
  joinDate: z.string(),
  endDate: z.string().nullable().optional(),
  status: employmentStatusSchema,
  isPrimary: z.boolean(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type EmploymentDto = z.infer<typeof employmentDtoSchema>;

export const createEmploymentRequestSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().nullable().optional(),
  orgUnitId: z.string().uuid().nullable().optional(),
  employeeNumber: z.string().min(1).max(50),
  jobTitle: z.string().min(1).max(100),
  jobCategory: jobCategorySchema.default(JobCategory.STAFF),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Join date must be YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD')
    .nullable()
    .optional(),
  status: employmentStatusSchema.default(EmploymentStatus.ACTIVE),
  isPrimary: z.boolean().default(true),
});

export type CreateEmploymentRequest = z.infer<typeof createEmploymentRequestSchema>;

export const updateEmploymentRequestSchema = z.object({
  locationId: z.string().uuid().nullable().optional(),
  orgUnitId: z.string().uuid().nullable().optional(),
  jobTitle: z.string().min(1).max(100).optional(),
  jobCategory: jobCategorySchema.optional(),
  joinDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: employmentStatusSchema.optional(),
  isPrimary: z.boolean().optional(),
  expectedVersion: z.number().int().optional(),
});

export type UpdateEmploymentRequest = z.infer<typeof updateEmploymentRequestSchema>;

// Custom Field Schemas
export const customFieldDefinitionDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().nullable().optional(),
  name: z.string(),
  key: z.string(),
  fieldType: customFieldTypeSchema,
  options: z.array(z.string()).nullable().optional(),
  isRequired: z.boolean(),
  validationRegex: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export type CustomFieldDefinitionDto = z.infer<typeof customFieldDefinitionDtoSchema>;

export const createCustomFieldDefinitionRequestSchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(50),
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric and underscores'),
  fieldType: customFieldTypeSchema,
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  validationRegex: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export type CreateCustomFieldDefinitionRequest = z.infer<
  typeof createCustomFieldDefinitionRequestSchema
>;

export const customFieldValueInputSchema = z.object({
  fieldDefinitionId: z.string().uuid(),
  valueText: z.string().nullable().optional(),
  valueNumber: z.number().nullable().optional(),
  valueDate: z.string().nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
});

export type CustomFieldValueInput = z.infer<typeof customFieldValueInputSchema>;

// Person Schemas
export const personDtoSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  displayNameLatin: z.string().nullable().optional(),
  displayNameNative: z.string().nullable().optional(),
  givenName: z.string().nullable().optional(),
  familyName: z.string().nullable().optional(),
  middleName: z.string().nullable().optional(),
  phoneticName: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: genderSchema,
  bloodGroup: z.string().nullable().optional(),
  primaryPhone: z.string().nullable().optional(),
  primaryEmail: z.string().nullable().optional(),
  address: addressSchema.nullable().optional(),
  photoMediaId: z.string().nullable().optional(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  activeEmployment: employmentDtoSchema.nullable().optional(),
  identityDocuments: z.array(identityDocumentDtoSchema).optional(),
});

export type PersonDto = z.infer<typeof personDtoSchema>;

export const createPersonRequestSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  displayNameLatin: z.string().max(100).optional(),
  displayNameNative: z.string().max(100).optional(),
  givenName: z.string().max(100).optional(),
  familyName: z.string().max(100).optional(),
  middleName: z.string().max(100).optional(),
  phoneticName: z.string().max(100).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .optional(),
  gender: genderSchema.default(Gender.UNDISCLOSED),
  bloodGroup: z.string().max(10).optional(),
  primaryPhone: z.string().max(30).optional(),
  primaryEmail: z.string().email().optional().or(z.literal('')),
  address: addressSchema.optional(),
  employment: createEmploymentRequestSchema,
  identityDocument: createIdentityDocumentRequestSchema.optional(),
  customFieldValues: z.array(customFieldValueInputSchema).optional(),
});

export type CreatePersonRequest = z.infer<typeof createPersonRequestSchema>;

export const updatePersonRequestSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  displayNameLatin: z.string().max(100).nullable().optional(),
  displayNameNative: z.string().max(100).nullable().optional(),
  givenName: z.string().max(100).nullable().optional(),
  familyName: z.string().max(100).nullable().optional(),
  middleName: z.string().max(100).nullable().optional(),
  phoneticName: z.string().max(100).nullable().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  gender: genderSchema.optional(),
  bloodGroup: z.string().max(10).nullable().optional(),
  primaryPhone: z.string().max(30).nullable().optional(),
  primaryEmail: z.string().email().nullable().optional().or(z.literal('')),
  address: addressSchema.optional(),
  expectedVersion: z.number().int().optional(),
});

export type UpdatePersonRequest = z.infer<typeof updatePersonRequestSchema>;

// Duplicate Check Schemas
export const duplicateCheckRequestSchema = z.object({
  organizationId: z.string().uuid(),
  employeeNumber: z.string(),
  displayName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  identityDocumentNumber: z.string().optional(),
  primaryPhone: z.string().optional(),
  primaryEmail: z.string().optional(),
  excludePersonId: z.string().uuid().optional(),
});

export type DuplicateCheckRequest = z.infer<typeof duplicateCheckRequestSchema>;

export const duplicateWarningSchema = z.object({
  type: z.enum([
    'EXACT_EMPLOYEE_NUMBER',
    'EXACT_IDENTITY_DOCUMENT',
    'PROBABLE_NAME_AND_DOB',
    'MATCHING_PHONE_OR_EMAIL',
  ]),
  severity: z.enum(['CRITICAL', 'WARNING']),
  message: z.string(),
  matchedPersonId: z.string().uuid().optional(),
  matchedPersonName: z.string().optional(),
  matchedEmployeeNumber: z.string().optional(),
});

export type DuplicateWarning = z.infer<typeof duplicateWarningSchema>;

export const duplicateCheckResponseSchema = z.object({
  hasDuplicates: z.boolean(),
  warnings: z.array(duplicateWarningSchema),
});

export type DuplicateCheckResponse = z.infer<typeof duplicateCheckResponseSchema>;

// Bulk Operations Schemas
export const bulkStatusChangeRequestSchema = z.object({
  employmentIds: z.array(z.string().uuid()).min(1),
  newStatus: employmentStatusSchema,
  reason: z.string().max(255).optional(),
});

export type BulkStatusChangeRequest = z.infer<typeof bulkStatusChangeRequestSchema>;

// People Query Schema (Server-side Table)
export const peopleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  orgUnitId: z.string().uuid().optional(),
  status: employmentStatusSchema.optional(),
  jobCategory: jobCategorySchema.optional(),
  hasPhoto: z.enum(['true', 'false']).optional(),
  sortBy: z
    .enum(['employeeNumber', 'displayName', 'joinDate', 'status', 'updatedAt'])
    .default('employeeNumber'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});

export type PeopleQuery = z.infer<typeof peopleQuerySchema>;

// Audit Query Schema
export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.nativeEnum(AuditAction).optional(),
  actorId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const auditEventItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  details: z.record(z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type AuditEventItem = z.infer<typeof auditEventItemSchema>;

export const workerStatusSchema = z.nativeEnum(WorkerStatus);
export const cardOrientationSchema = z.nativeEnum(CardOrientation);

export const cardDimensionsSchema = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  bleedMm: z.number().nonnegative().default(3),
  safeAreaMm: z.number().nonnegative().default(3),
  orientation: cardOrientationSchema.default(CardOrientation.VERTICAL),
});

// ==============================================================================
// Phase 5: Photo Processing, Cropping & Phone Handoff Schemas
// ==============================================================================

export const cropCoordinatesSchema = z.object({
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
});

export type CropCoordinatesInput = z.infer<typeof cropCoordinatesSchema>;

export const photoUploadOptionsSchema = z.object({
  crop: cropCoordinatesSchema.optional(),
});

export type PhotoUploadOptions = z.infer<typeof photoUploadOptionsSchema>;

export const photoQualityReportSchema = z.object({
  isAcceptable: z.boolean(),
  warnings: z.array(z.string()),
  width: z.number().int(),
  height: z.number().int(),
  luminance: z.number(),
});

export type PhotoQualityReportDTO = z.infer<typeof photoQualityReportSchema>;

export const createPhoneHandoffTokenSchema = z.object({
  slotId: z.string().min(1).max(100),
  personId: z.string().uuid().optional(),
});

export type CreatePhoneHandoffTokenInput = z.infer<typeof createPhoneHandoffTokenSchema>;

export const phoneHandoffTokenResponseSchema = z.object({
  tokenId: z.string().uuid(),
  slotId: z.string(),
  token: z.string(),
  qrUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  expiresInSeconds: z.number().int(),
});

export type PhoneHandoffTokenResponse = z.infer<typeof phoneHandoffTokenResponseSchema>;

export const phoneHandoffEventSchema = z.object({
  type: z.enum(['PHONE_CONNECTED', 'PHOTO_UPLOADED', 'EXPIRED', 'CANCELLED', 'HEARTBEAT']),
  slotId: z.string(),
  mediaAssetId: z.string().uuid().optional(),
  previewUrl: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type PhoneHandoffEvent = z.infer<typeof phoneHandoffEventSchema>;

// ==============================================================================
// Phase 6: Card Format & Constrained Template Engine Schemas
// ==============================================================================

export const cardFormatPresetSchema = z.nativeEnum(CardFormatPreset);
export const templatePresetIdSchema = z.nativeEnum(TemplatePresetId);
export const templateVersionStatusSchema = z.nativeEnum(TemplateVersionStatus);
export const templateAssignmentTargetSchema = z.nativeEnum(TemplateAssignmentTarget);
export const barcodeTypeSchema = z.nativeEnum(BarcodeType);
export const barcodePayloadTypeSchema = z.nativeEnum(BarcodePayloadType);
export const localeFallbackPolicySchema = z.nativeEnum(LocaleFallbackPolicy);

export const cardFormatInputSchema = z.object({
  name: z.string().min(1).max(100),
  preset: cardFormatPresetSchema.default(CardFormatPreset.COMPANY_VERTICAL_60X90),
  widthMm: z
    .number()
    .min(40, 'Width must be at least 40 mm')
    .max(200, 'Width cannot exceed 200 mm'),
  heightMm: z
    .number()
    .min(40, 'Height must be at least 40 mm')
    .max(200, 'Height cannot exceed 200 mm'),
  bleedMm: z.number().min(0).max(10).default(3),
  safeAreaMm: z.number().min(0).max(10).default(3),
  orientation: cardOrientationSchema.default(CardOrientation.VERTICAL),
  isCustom: z.boolean().default(false),
});

export type CardFormatInput = z.infer<typeof cardFormatInputSchema>;

export const cardLayoutThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  fontFamilyLatin: z.string().default('Noto Sans'),
  fontFamilyBengali: z.string().default('Noto Sans Bengali'),
});

export type CardLayoutThemeDTO = z.infer<typeof cardLayoutThemeSchema>;

export const cardHeaderZoneSchema = z.object({
  showLogo: z.boolean().default(true),
  showOrgName: z.boolean().default(true),
  customTitle: z.string().max(100).nullable().optional(),
  heightMm: z.number().min(5).max(30).default(12),
});

export const cardPhotoZoneSchema = z
  .object({
    widthMm: z.number().min(15).max(50).default(24),
    heightMm: z.number().min(20).max(65).default(32),
    borderRadiusMm: z.number().min(0).max(10).default(2),
    borderColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .default('#0F766E'),
    borderWidthMm: z.number().min(0).max(5).default(0.5),
  })
  .nullable()
  .optional();

export const cardDetailsZoneSchema = z.object({
  enabledFields: z
    .array(z.string())
    .default(['displayName', 'jobTitle', 'department', 'employeeNumber', 'bloodGroup']),
  customLabels: z.record(z.string()).default({}),
});

export const cardBarcodeZoneSchema = z
  .object({
    type: barcodeTypeSchema.default(BarcodeType.QR_CODE),
    payloadType: barcodePayloadTypeSchema.default(BarcodePayloadType.OPAQUE_CARD_SERIAL),
  })
  .nullable()
  .optional();

export const cardFooterZoneSchema = z.object({
  showSignatureLine: z.boolean().default(true),
  signatureLabel: z.string().max(50).nullable().optional(),
  instructionsText: z.string().max(300).nullable().optional(),
});

export const cardSideLayoutSchema = z.object({
  header: cardHeaderZoneSchema,
  photo: cardPhotoZoneSchema,
  details: cardDetailsZoneSchema,
  barcode: cardBarcodeZoneSchema,
  footer: cardFooterZoneSchema,
});

export const cardLayoutSpecificationSchema = z.object({
  version: z.string().default('1.0.0'),
  presetId: templatePresetIdSchema,
  dimensions: cardDimensionsSchema,
  theme: cardLayoutThemeSchema,
  front: cardSideLayoutSchema,
  back: cardSideLayoutSchema,
  localeConfig: z.object({
    frontLocale: z.string().default('en-US'),
    backLocale: z.string().default('bn-BD'),
    fallbackPolicy: localeFallbackPolicySchema.default(LocaleFallbackPolicy.LATIN_FALLBACK),
  }),
});

export type CardLayoutSpecificationDTO = z.infer<typeof cardLayoutSpecificationSchema>;

export const createTemplateRequestSchema = z.object({
  organizationId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().max(255).nullable().optional(),
  presetId: templatePresetIdSchema.default(TemplatePresetId.CLASSIC_VERTICAL),
  themeOverrides: cardLayoutThemeSchema.partial().optional(),
  dimensionOverrides: cardDimensionsSchema.partial().optional(),
});

export type CreateTemplateRequest = z.infer<typeof createTemplateRequestSchema>;

export const updateTemplateDraftSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  layout: cardLayoutSpecificationSchema,
});

export type UpdateTemplateDraftRequest = z.infer<typeof updateTemplateDraftSchema>;

export const publishTemplateVersionSchema = z.object({
  draftVersionId: z.string().uuid(),
});

export type PublishTemplateVersionRequest = z.infer<typeof publishTemplateVersionSchema>;

export const templateAssignmentRequestSchema = z.object({
  templateId: z.string().uuid(),
  targetType: templateAssignmentTargetSchema,
  targetId: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(1).max(100).default(50),
});

export type TemplateAssignmentRequest = z.infer<typeof templateAssignmentRequestSchema>;

export const templateResolutionQuerySchema = z.object({
  personId: z.string().uuid().optional(),
  jobCategory: jobCategorySchema.optional(),
  orgUnitId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
});

export type TemplateResolutionQuery = z.infer<typeof templateResolutionQuerySchema>;

// ==============================================================================
// Phase 9: Data Portability, Import & Export Schemas
// ==============================================================================

export const importDuplicateStrategySchema = z.nativeEnum(ImportDuplicateStrategy);
export const importCommitPolicySchema = z.nativeEnum(ImportCommitPolicy);
export const importJobStatusSchema = z.nativeEnum(ImportJobStatus);
export const exportJobStatusSchema = z.nativeEnum(ExportJobStatus);

export const importColumnMappingSchema = z.object({
  displayName: z.string().optional(),
  displayNameLatin: z.string().optional(),
  displayNameNative: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  middleName: z.string().optional(),
  phoneticName: z.string().optional(),
  employeeNumber: z.string().optional(),
  jobTitle: z.string().optional(),
  jobCategory: z.string().optional(),
  joinDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  primaryPhone: z.string().optional(),
  primaryEmail: z.string().optional(),
  organizationId: z.string().optional(),
  organizationCode: z.string().optional(),
  locationId: z.string().optional(),
  locationCode: z.string().optional(),
  locationName: z.string().optional(),
  orgUnitId: z.string().optional(),
  orgUnitCode: z.string().optional(),
  orgUnitName: z.string().optional(),
  identityDocumentType: z.string().optional(),
  identityDocumentNumber: z.string().optional(),
  photoPath: z.string().optional(),
  customFields: z.record(z.string()).optional(),
});

export type ImportColumnMappingDTO = z.infer<typeof importColumnMappingSchema>;

export const configureImportMappingRequestSchema = z.object({
  organizationId: z.string().uuid(),
  columnMapping: importColumnMappingSchema,
  duplicateStrategy: importDuplicateStrategySchema.default(
    ImportDuplicateStrategy.REJECT_DUPLICATES,
  ),
  delimiter: z.string().min(1).max(5).optional(),
  encoding: z.string().optional(),
});

export type ConfigureImportMappingRequest = z.infer<typeof configureImportMappingRequestSchema>;

export const importCommitRequestSchema = z.object({
  commitPolicy: importCommitPolicySchema.default(ImportCommitPolicy.ALL_OR_NOTHING),
});

export type ImportCommitRequest = z.infer<typeof importCommitRequestSchema>;

export const exportWorkersRequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  orgUnitId: z.string().uuid().optional(),
  status: employmentStatusSchema.optional(),
  jobCategory: jobCategorySchema.optional(),
  includedFields: z
    .array(z.string())
    .min(1, 'At least one field must be selected')
    .default([
      'employeeNumber',
      'displayName',
      'displayNameLatin',
      'displayNameNative',
      'jobTitle',
      'jobCategory',
      'joinDate',
      'status',
      'primaryPhone',
      'primaryEmail',
      'photoFile',
    ]),
  includeSensitive: z.boolean().default(false),
});

export type ExportWorkersRequest = z.infer<typeof exportWorkersRequestSchema>;

export const exportManifestSchema = z.object({
  schemaVersion: z.string(),
  exportVersion: z.string(),
  generatedAt: z.string().datetime(),
  appVersion: z.string(),
  tenantId: z.string().uuid(),
  organization: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string(),
    })
    .optional(),
  counts: z.object({
    totalWorkers: z.number().int(),
    totalImages: z.number().int(),
    totalIdentityDocuments: z.number().int(),
  }),
  locale: z.string(),
  timezone: z.string(),
  includedFields: z.array(z.string()),
  sensitiveFieldsIncluded: z.boolean(),
  checksums: z.record(z.string()),
});

export type ExportManifestDTO = z.infer<typeof exportManifestSchema>;

// ==============================================================================
// Phase 10: Local Product Recoverability, Encrypted Backups & System Health
// ==============================================================================

export const backupStatusSchema = z.nativeEnum(BackupStatus);
export const backupTriggerSchema = z.nativeEnum(BackupTrigger);

export const createBackupRequestSchema = z.object({
  passphrase: z
    .string()
    .min(10, 'Backup encryption passphrase must be at least 10 characters')
    .max(128),
  targetDirectory: z.string().optional(),
});

export type CreateBackupRequest = z.infer<typeof createBackupRequestSchema>;

export const backupJobDTOSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  status: backupStatusSchema,
  trigger: backupTriggerSchema,
  fileName: z.string(),
  filePath: z.string(),
  fileSizeBytes: z.number().int().nullable().optional(),
  checksumSha256: z.string().nullable().optional(),
  appVersion: z.string(),
  schemaVersion: z.string(),
  totalRecords: z.number().int(),
  totalMediaFiles: z.number().int(),
  isVerified: z.boolean(),
  verifiedAt: z.string().datetime().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  durationMs: z.number().int().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BackupJobDTO = z.infer<typeof backupJobDTOSchema>;

export const backupScheduleDTOSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  isEnabled: z.boolean(),
  cronExpression: z.string(),
  retentionCount: z.number().int().min(1).max(100),
  targetDirectory: z.string(),
  lastRunAt: z.string().datetime().nullable().optional(),
  nextRunAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BackupScheduleDTO = z.infer<typeof backupScheduleDTOSchema>;

export const updateBackupScheduleRequestSchema = z.object({
  isEnabled: z.boolean(),
  cronExpression: z.string().min(5),
  retentionCount: z.number().int().min(1).max(100),
  targetDirectory: z.string().min(1),
});

export type UpdateBackupScheduleRequest = z.infer<typeof updateBackupScheduleRequestSchema>;

export const inspectRestoreRequestSchema = z.object({
  passphrase: z.string().min(1, 'Passphrase is required'),
});

export type InspectRestoreRequest = z.infer<typeof inspectRestoreRequestSchema>;

export const executeRestoreRequestSchema = z.object({
  passphrase: z.string().min(1, 'Passphrase is required'),
  ownerPassword: z.string().min(1, 'System Owner password confirmation is required'),
  confirmRollbackAwareness: z.boolean().refine((val) => val === true, {
    message: 'You must confirm awareness of the restore operation.',
  }),
});

export type ExecuteRestoreRequest = z.infer<typeof executeRestoreRequestSchema>;

export const restoreInspectionResultSchema = z.object({
  isValid: z.boolean(),
  compatibilityStatus: z.enum(['COMPATIBLE', 'WARNING_OLD_VERSION', 'INCOMPATIBLE_NEWER_VERSION']),
  appVersion: z.string(),
  schemaVersion: z.string(),
  currentAppVersion: z.string(),
  currentSchemaVersion: z.string(),
  createdAt: z.string(),
  tenant: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
  }),
  counts: z.object({
    organizations: z.number().int(),
    locations: z.number().int(),
    orgUnits: z.number().int(),
    people: z.number().int(),
    employments: z.number().int(),
    identityDocuments: z.number().int(),
    mediaAssets: z.number().int(),
    cardTemplates: z.number().int(),
    cardIssues: z.number().int(),
    auditEvents: z.number().int(),
    users: z.number().int(),
    roles: z.number().int(),
  }),
  mediaSizeBytes: z.number().int(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

export type RestoreInspectionResultDTO = z.infer<typeof restoreInspectionResultSchema>;

export const diskSpaceInfoSchema = z.object({
  totalBytes: z.number(),
  freeBytes: z.number(),
  usedBytes: z.number(),
  usedPercentage: z.number(),
  isLowDisk: z.boolean(),
});

export const systemDiagnosticsSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error', 'maintenance']),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  appVersion: z.string(),
  schemaVersion: z.string(),
  nodeVersion: z.string(),
  environment: z.string(),
  isActivated: z.boolean(),
  lanEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
  components: z.object({
    web: z.object({ status: z.enum(['ok', 'degraded', 'error', 'maintenance']) }),
    api: z.object({ status: z.enum(['ok', 'degraded', 'error', 'maintenance']) }),
    database: z.object({
      status: z.enum(['ok', 'degraded', 'error', 'maintenance']),
      latencyMs: z.number().optional(),
    }),
    worker: z.object({
      status: z.enum(['ok', 'degraded', 'error', 'maintenance']),
      lastHeartbeat: z.string().optional(),
    }),
    storage: z.object({
      status: z.enum(['ok', 'degraded', 'error', 'maintenance']),
      writable: z.boolean(),
      isExternal: z.boolean(),
      path: z.string(),
    }),
    renderer: z.object({
      status: z.enum(['ok', 'degraded', 'error', 'maintenance']),
      poolReady: z.boolean(),
    }),
    backups: z.object({
      status: z.enum(['ok', 'degraded', 'error', 'maintenance']),
      lastBackupAt: z.string().nullable().optional(),
      lastBackupStatus: backupStatusSchema.nullable().optional(),
      daysSinceLastBackup: z.number().nullable().optional(),
      isWarning: z.boolean(),
    }),
  }),
  disk: diskSpaceInfoSchema,
});

export type SystemDiagnosticsDTO = z.infer<typeof systemDiagnosticsSchema>;
