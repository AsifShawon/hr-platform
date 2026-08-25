import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  BACKUP_HEADER_SIZE,
  BACKUP_MAGIC_BYTES,
  buildBackupHeader,
  parseBackupHeader,
  encryptPayload,
  decryptPayload,
  deriveKeyFromPassphrase,
  BackupService,
} from './backup.service.js';

describe('BackupService & Cryptographic Envelopes', () => {
  const passphrase = 'SuperSecretBackupPassword2026!';
  const samplePayload = Buffer.from('{"test":"payload data for backup archive"}', 'utf8');

  it('should build and parse valid 64-byte HRBK binary header', () => {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const headerBuf = buildBackupHeader(salt, iv);
    expect(headerBuf.length).toBe(BACKUP_HEADER_SIZE);
    expect(headerBuf.subarray(0, 4).equals(BACKUP_MAGIC_BYTES)).toBe(true);

    const parsed = parseBackupHeader(headerBuf);
    expect(parsed.magic).toBe('HRBK');
    expect(parsed.version).toBe(1);
    expect(parsed.kdfType).toBe(1);
    expect(parsed.salt.equals(salt)).toBe(true);
    expect(parsed.iv.equals(iv)).toBe(true);
  });

  it('should reject invalid magic bytes in header', () => {
    const invalidHeader = Buffer.alloc(64);
    invalidHeader.write('FAIL', 0);
    expect(() => parseBackupHeader(invalidHeader)).toThrow('unrecognized magic bytes');
  });

  it('should successfully encrypt and decrypt payload with AES-256-GCM', () => {
    const encrypted = encryptPayload(samplePayload, passphrase);
    expect(encrypted.length).toBeGreaterThan(BACKUP_HEADER_SIZE + 16);

    const decrypted = decryptPayload(encrypted, passphrase);
    expect(decrypted.toString('utf8')).toBe(samplePayload.toString('utf8'));
  });

  it('should fail decryption if wrong passphrase is provided', () => {
    const encrypted = encryptPayload(samplePayload, passphrase);
    expect(() => decryptPayload(encrypted, 'WrongPassword123!')).toThrow(
      'incorrect passphrase or tampered/corrupted backup bundle',
    );
  });

  it('should detect tampering or corrupted ciphertext', () => {
    const encrypted = encryptPayload(samplePayload, passphrase);

    // Tamper one byte in the ciphertext payload
    const tampered = Buffer.from(encrypted);
    const idx = BACKUP_HEADER_SIZE + 2;
    tampered[idx] = (tampered[idx] ?? 0) ^ 0xff;

    expect(() => decryptPayload(tampered, passphrase)).toThrow(
      'incorrect passphrase or tampered/corrupted backup bundle',
    );
  });

  it('should detect truncated backup files', () => {
    const truncated = Buffer.from('HRBK');
    expect(() => decryptPayload(truncated, passphrase)).toThrow(
      'Corrupted or truncated backup file',
    );
  });

  it('should evaluate storage safety warnings correctly', () => {
    const internalCheck = BackupService.evaluateStorageSafety('./storage/uploads/backups');
    expect(internalCheck.isExternal).toBe(false);
    expect(internalCheck.warning).toBeDefined();

    const externalCheck = BackupService.evaluateStorageSafety('/mnt/external-nas/backups');
    expect(externalCheck.isExternal).toBe(true);
    expect(externalCheck.warning).toBeUndefined();
  });
});
