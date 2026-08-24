import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get or derive the 256-bit encryption key from system environment.
 * In development or local default mode, falls back to a deterministic local key.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.SYSTEM_ENCRYPTION_KEY || 'hr-platform-local-secure-key-2026-32b!';
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts a sensitive string (e.g. government ID) using AES-256-GCM.
 * Output format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
 */
export function encryptSensitiveValue(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a sensitive string using AES-256-GCM.
 */
export function decryptSensitiveValue(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format.');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates an HMAC-SHA256 blind index hash of a normalized string for exact duplicate checking and search.
 */
export function hashForBlindIndex(value: string, tenantSalt = 'default-tenant-salt'): string {
  if (!value) return '';
  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, '');
  return crypto.createHmac('sha256', tenantSalt).update(normalized).digest('hex');
}

/**
 * Masks sensitive identifiers showing only the last N characters.
 * Example: `19922612345678901` -> `••••••••8901`
 */
export function maskSensitiveIdentifier(value: string, visibleChars = 4): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length <= visibleChars) {
    return '•'.repeat(trimmed.length);
  }
  const maskedLength = trimmed.length - visibleChars;
  return `${'•'.repeat(Math.min(maskedLength, 8))}${trimmed.slice(-visibleChars)}`;
}
