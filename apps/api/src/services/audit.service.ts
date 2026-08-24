import { prisma } from '@hr/db';

export interface AuditEventParams {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

const REDACTED_KEYS = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'tokenHash',
  'codeHash',
  'recoveryCode',
  'recoveryCodes',
  'nationalId',
  'nid',
  'secret',
  'photo',
  'photoBlob',
]);

export function sanitizeAuditDetails(
  details?: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!details || typeof details !== 'object') return null;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (REDACTED_KEYS.has(key) || REDACTED_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (key === 'email' && typeof value === 'string' && value.includes('@')) {
      const parts = value.split('@');
      const local = parts[0] ?? '';
      const domain = parts[1] ?? '';
      sanitized[key] = local.length > 0 ? `${local.charAt(0)}***@${domain}` : value;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function recordAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const sanitizedDetails = sanitizeAuditDetails(params.details);

    await prisma.auditEvent.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: (sanitizedDetails as any) ?? undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Audit logging failure should not crash main transaction but must be logged to stderr
    console.error('⚠️ Failed to write audit event:', error);
  }
}
