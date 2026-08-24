// ==============================================================================
// Domain Models, Types, Permissions, and Invariants
// ==============================================================================

export type TenantId = string;

export interface TenantScoped {
  tenantId: TenantId;
}

export enum Permission {
  PEOPLE_VIEW = 'people.view',
  PEOPLE_EDIT = 'people.edit',
  IDENTITY_REVEAL = 'identity.reveal',
  IDENTITY_EDIT = 'identity.edit',
  CARDS_DESIGN = 'cards.design',
  CARDS_PRINT = 'cards.print',
  CARDS_ISSUE = 'cards.issue',
  CARDS_REVOKE = 'cards.revoke',
  EXPORTS_CREATE = 'exports.create',
  ORGANIZATION_MANAGE = 'organization.manage',
  USERS_MANAGE = 'users.manage',
  ROLES_MANAGE = 'roles.manage',
  AUDIT_VIEW = 'audit.view',
  BACKUP_MANAGE = 'backup.manage',
  SYSTEM_MANAGE = 'system.manage',
}

export enum BuiltInRole {
  SYSTEM_OWNER = 'system_owner',
  COMPANY_ADMIN = 'company_admin',
  HR_MANAGER = 'hr_manager',
  HR_OPERATOR = 'hr_operator',
  PRINT_OPERATOR = 'print_operator',
  AUDITOR_VIEWER = 'auditor_viewer',
}

export const BUILT_IN_ROLE_PERMISSIONS: Record<BuiltInRole, readonly Permission[]> = {
  [BuiltInRole.SYSTEM_OWNER]: Object.values(Permission),
  [BuiltInRole.COMPANY_ADMIN]: [
    Permission.PEOPLE_VIEW,
    Permission.PEOPLE_EDIT,
    Permission.IDENTITY_REVEAL,
    Permission.IDENTITY_EDIT,
    Permission.CARDS_DESIGN,
    Permission.CARDS_PRINT,
    Permission.CARDS_ISSUE,
    Permission.CARDS_REVOKE,
    Permission.EXPORTS_CREATE,
    Permission.ORGANIZATION_MANAGE,
    Permission.USERS_MANAGE,
    Permission.ROLES_MANAGE,
    Permission.AUDIT_VIEW,
  ],
  [BuiltInRole.HR_MANAGER]: [
    Permission.PEOPLE_VIEW,
    Permission.PEOPLE_EDIT,
    Permission.IDENTITY_REVEAL,
    Permission.IDENTITY_EDIT,
    Permission.CARDS_DESIGN,
    Permission.CARDS_PRINT,
    Permission.CARDS_ISSUE,
    Permission.CARDS_REVOKE,
    Permission.EXPORTS_CREATE,
    Permission.ORGANIZATION_MANAGE,
    Permission.AUDIT_VIEW,
  ],
  [BuiltInRole.HR_OPERATOR]: [
    Permission.PEOPLE_VIEW,
    Permission.PEOPLE_EDIT,
    Permission.CARDS_PRINT,
    Permission.CARDS_ISSUE,
  ],
  [BuiltInRole.PRINT_OPERATOR]: [
    Permission.PEOPLE_VIEW,
    Permission.CARDS_PRINT,
    Permission.CARDS_ISSUE,
  ],
  [BuiltInRole.AUDITOR_VIEWER]: [Permission.PEOPLE_VIEW, Permission.AUDIT_VIEW],
};

export enum LocationType {
  HEADQUARTERS = 'HEADQUARTERS',
  OFFICE = 'OFFICE',
  FACTORY = 'FACTORY',
  BRANCH = 'BRANCH',
  SITE = 'SITE',
  WAREHOUSE = 'WAREHOUSE',
  OTHER = 'OTHER',
}

export enum OrgUnitType {
  DIVISION = 'DIVISION',
  DEPARTMENT = 'DEPARTMENT',
  SECTION = 'SECTION',
  TEAM = 'TEAM',
  LINE = 'LINE',
  OTHER = 'OTHER',
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface EmployeeNumberRule {
  prefix: string;
  padLength: number;
  nextSequence: number;
}

export interface ScopedRoleGrant {
  roleId: string;
  organizationId?: string | null;
  locationId?: string | null;
}

// ==============================================================================
// Phase 4: Person, Employment, Identity Document & Custom Field Domains
// ==============================================================================

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  UNDISCLOSED = 'UNDISCLOSED',
}

export enum EmploymentStatus {
  PREBOARDING = 'PREBOARDING',
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  INACTIVE = 'INACTIVE',
  SEPARATED = 'SEPARATED',
}

export const WorkerStatus = EmploymentStatus;
export type WorkerStatus = EmploymentStatus;

export enum JobCategory {
  EXECUTIVE = 'EXECUTIVE',
  MANAGEMENT = 'MANAGEMENT',
  STAFF = 'STAFF',
  OPERATOR = 'OPERATOR',
  WORKER = 'WORKER',
  CONTRACTOR = 'CONTRACTOR',
  INTERN = 'INTERN',
  OTHER = 'OTHER',
}

export enum IdentityDocumentType {
  NID = 'NID',
  SMART_NID = 'SMART_NID',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  OTHER = 'OTHER',
}

export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  SELECT = 'SELECT',
  BOOLEAN = 'BOOLEAN',
}

export enum AuditAction {
  USER_LOGIN_SUCCESS = 'user.login_success',
  USER_LOGIN_FAILURE = 'user.login_failure',
  USER_LOGOUT = 'user.logout',
  USER_PASSWORD_CHANGED = 'user.password_changed',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ACTIVATED = 'user.activated',
  SYSTEM_ACTIVATED = 'system.activated',
  SYSTEM_LAN_TOGGLED = 'system.lan_toggled',
  SESSION_REVOKED = 'session.revoked',
  SESSION_REVOKED_ALL_OTHERS = 'session.revoked_all_others',
  ROLE_CREATED = 'role.created',
  ROLE_UPDATED = 'role.updated',
  ROLE_DELETED = 'role.deleted',
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_UPDATED = 'organization.updated',
  LOCATION_CREATED = 'location.created',
  LOCATION_UPDATED = 'location.updated',
  LOCATION_DELETED = 'location.deleted',
  ORG_UNIT_CREATED = 'org_unit.created',
  ORG_UNIT_UPDATED = 'org_unit.updated',
  ORG_UNIT_MOVED = 'org_unit.moved',
  ORG_UNIT_ARCHIVED = 'org_unit.archived',
  ORG_UNIT_DELETED = 'org_unit.deleted',
  PERSON_CREATED = 'person.created',
  PERSON_UPDATED = 'person.updated',
  PERSON_DELETED = 'person.deleted',
  EMPLOYMENT_CREATED = 'employment.created',
  EMPLOYMENT_UPDATED = 'employment.updated',
  EMPLOYMENT_SEPARATED = 'employment.separated',
  IDENTITY_DOCUMENT_CREATED = 'identity_document.created',
  IDENTITY_DOCUMENT_UPDATED = 'identity_document.updated',
  IDENTITY_DOCUMENT_DELETED = 'identity_document.deleted',
  IDENTITY_REVEALED = 'identity.revealed',
  IDENTITY_UPDATED = 'identity.updated',
  CUSTOM_FIELD_CREATED = 'custom_field.created',
  CUSTOM_FIELD_UPDATED = 'custom_field.updated',
  PHOTO_UPLOADED = 'photo.uploaded',
  PHOTO_REMOVED = 'photo.removed',
  PHONE_HANDOFF_INITIATED = 'phone_handoff.initiated',
  PHONE_HANDOFF_COMPLETED = 'phone_handoff.completed',
  DATA_EXPORTED = 'data.exported',
  BACKUP_CREATED = 'backup.created',
  CARD_ISSUED = 'card.issued',
  CARD_REVOKED = 'card.revoked',
  TEMPLATE_CREATED = 'template.created',
  TEMPLATE_UPDATED = 'template.updated',
  TEMPLATE_VERSION_PUBLISHED = 'template.version_published',
  TEMPLATE_ARCHIVED = 'template.archived',
  TEMPLATE_ASSIGNED = 'template.assigned',
}

// ==============================================================================
// Phase 5: Media Asset & Phone Handoff Models
// ==============================================================================

export enum PhoneHandoffStatus {
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  UPLOADED = 'UPLOADED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface MediaAsset {
  id: string;
  tenantId: string;
  personId?: string | null;
  storageKeyMaster: string;
  storageKeyCardReady?: string | null;
  storageKeyThumbnail?: string | null;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  checksumSha256: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PhoneHandoffToken {
  id: string;
  tenantId: string;
  tokenHash: string;
  slotId: string;
  expiresAt: Date | string;
  isConsumed: boolean;
  consumedAt?: Date | string | null;
  mediaAssetId?: string | null;
  createdAt: Date | string;
}

export interface CropCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // 0, 90, 180, 270
}

export interface PhotoQualityReport {
  isAcceptable: boolean;
  warnings: string[];
  width: number;
  height: number;
  luminance: number; // 0 to 255
}

export enum CardOrientation {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
}

export interface CardDimensionsMm {
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  safeAreaMm: number;
  orientation: CardOrientation;
}

export const DEFAULT_CARD_DIMENSIONS: CardDimensionsMm = {
  widthMm: 60,
  heightMm: 90,
  bleedMm: 3,
  safeAreaMm: 3,
  orientation: CardOrientation.VERTICAL,
};

// ==============================================================================
// Password Policy & Common Password Defense (Air-Gapped Offline Protection)
// ==============================================================================

export const COMMON_PASSWORDS_BLOCKLIST: ReadonlySet<string> = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'password123',
  'admin',
  'admin123',
  'welcome',
  'welcome123',
  'qwerty',
  '111111',
  '1234567890',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'monkey',
  'dragon',
  'pass1234',
  'master',
  'secret',
  'changeme',
  'hrplatform',
  'company123',
]);

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePasswordStrength(
  password: string,
  options?: { username?: string; email?: string },
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 10) {
    errors.push('Password must be at least 10 characters long.');
  }

  if (COMMON_PASSWORDS_BLOCKLIST.has(password.toLowerCase().trim())) {
    errors.push('Password is too common or easily guessable. Please choose a stronger password.');
  }

  if (options?.username && options.username.length >= 3) {
    if (password.toLowerCase().includes(options.username.toLowerCase())) {
      errors.push('Password cannot contain your username.');
    }
  }

  if (options?.email && options.email.includes('@')) {
    const localPart = options.email.split('@')[0];
    if (
      localPart &&
      localPart.length >= 3 &&
      password.toLowerCase().includes(localPart.toLowerCase())
    ) {
      errors.push('Password cannot contain parts of your email address.');
    }
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  if (!hasLetter || !hasDigit) {
    errors.push('Password must contain both letters and numbers.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Session Constants
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes sliding window
export const SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours absolute ceiling
export const SESSION_COOKIE_NAME = 'hr_session';

// ==============================================================================
// Phase 6: Physical Card Formats & Constrained Template Engine Models
// ==============================================================================

export enum CardFormatPreset {
  COMPANY_VERTICAL_60X90 = 'COMPANY_VERTICAL_60X90',
  ISO_ID1_HORIZONTAL = 'ISO_ID1_HORIZONTAL',
  ISO_ID1_VERTICAL = 'ISO_ID1_VERTICAL',
  CUSTOM = 'CUSTOM',
}

export enum TemplatePresetId {
  CLASSIC_VERTICAL = 'CLASSIC_VERTICAL',
  MODERN_STRIPE = 'MODERN_STRIPE',
  PHOTO_FOCUS = 'PHOTO_FOCUS',
  FACTORY_INDUSTRIAL = 'FACTORY_INDUSTRIAL',
  CONTRACTOR = 'CONTRACTOR',
  VISITOR = 'VISITOR',
}

export enum TemplateVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum TemplateAssignmentTarget {
  WORKER_OVERRIDE = 'WORKER_OVERRIDE',
  JOB_CATEGORY = 'JOB_CATEGORY',
  ORG_UNIT = 'ORG_UNIT',
  LOCATION = 'LOCATION',
  ORGANIZATION = 'ORGANIZATION',
  SYSTEM = 'SYSTEM',
}

export enum BarcodeType {
  QR_CODE = 'QR_CODE',
  CODE_128 = 'CODE_128',
  NONE = 'NONE',
}

export enum BarcodePayloadType {
  OPAQUE_CARD_SERIAL = 'OPAQUE_CARD_SERIAL',
  INTERNAL_VERIFY_TOKEN = 'INTERNAL_VERIFY_TOKEN',
}

export enum LocaleFallbackPolicy {
  LATIN_FALLBACK = 'LATIN_FALLBACK',
  BLANK = 'BLANK',
}

export interface CardFormatEntity {
  id: string;
  tenantId: string;
  name: string;
  preset: CardFormatPreset;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  safeAreaMm: number;
  orientation: CardOrientation;
  isCustom: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CardLayoutTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamilyLatin: string;
  fontFamilyBengali: string;
}

export interface CardHeaderZone {
  showLogo: boolean;
  showOrgName: boolean;
  customTitle?: string | null;
  heightMm: number;
}

export interface CardPhotoZone {
  widthMm: number;
  heightMm: number;
  borderRadiusMm: number;
  borderColor: string;
  borderWidthMm: number;
}

export interface CardDetailsZone {
  enabledFields: string[];
  customLabels: Record<string, string>;
}

export interface CardBarcodeZone {
  type: BarcodeType;
  payloadType: BarcodePayloadType;
}

export interface CardFooterZone {
  showSignatureLine: boolean;
  signatureLabel?: string | null;
  instructionsText?: string | null;
}

export interface CardSideLayoutSpecification {
  header: CardHeaderZone;
  photo?: CardPhotoZone | null;
  details: CardDetailsZone;
  barcode?: CardBarcodeZone | null;
  footer: CardFooterZone;
}

export interface CardLayoutSpecification {
  version: string;
  presetId: TemplatePresetId;
  dimensions: CardDimensionsMm;
  theme: CardLayoutTheme;
  front: CardSideLayoutSpecification;
  back: CardSideLayoutSpecification;
  localeConfig: {
    frontLocale: string;
    backLocale: string;
    fallbackPolicy: LocaleFallbackPolicy;
  };
}

export interface CardTemplateEntity {
  id: string;
  tenantId: string;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  presetId: TemplatePresetId;
  activeVersionId?: string | null;
  isArchived: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TemplateVersionEntity {
  id: string;
  templateId: string;
  tenantId: string;
  versionNumber: number;
  status: TemplateVersionStatus;
  layoutSchemaVersion: string;
  layout: CardLayoutSpecification;
  checksumSha256?: string | null;
  publishedAt?: Date | string | null;
  publishedByUserId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TemplateAssignmentEntity {
  id: string;
  tenantId: string;
  templateId: string;
  targetType: TemplateAssignmentTarget;
  targetId?: string | null;
  priority: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TemplateResolutionResult {
  templateId: string;
  templateName: string;
  versionId: string;
  versionNumber: number;
  layout: CardLayoutSpecification;
  targetType: TemplateAssignmentTarget;
  resolutionReason: string;
}
