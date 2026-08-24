import { describe, it, expect } from 'vitest';
import {
  encryptSensitiveValue,
  decryptSensitiveValue,
  hashForBlindIndex,
  maskSensitiveIdentifier,
} from '../src/services/crypto.service.js';

describe('Phase 4: Cryptography & Sensitive Field Protection', () => {
  it('encrypts and decrypts sensitive government ID strings correctly using AES-256-GCM', () => {
    const rawNid = '19922612345678901';
    const encrypted = encryptSensitiveValue(rawNid);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(rawNid);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptSensitiveValue(encrypted);
    expect(decrypted).toBe(rawNid);
  });

  it('produces deterministic blind index hashes with normalization', () => {
    const salt = 'test-tenant-salt-123';
    const nidWithSpaces = ' 1992-2612-3456-78901 ';
    const cleanNid = '19922612345678901';

    const hash1 = hashForBlindIndex(nidWithSpaces, salt);
    const hash2 = hashForBlindIndex(cleanNid, salt);

    expect(hash1).toBeDefined();
    expect(hash1).toBe(hash2); // Case and whitespace normalized
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it('masks sensitive identifiers preserving only the last 4 characters', () => {
    expect(maskSensitiveIdentifier('19922612345678901')).toBe('••••••••8901');
    expect(maskSensitiveIdentifier('BG0987654')).toBe('•••••7654');
    expect(maskSensitiveIdentifier('1234')).toBe('••••');
    expect(maskSensitiveIdentifier('AB')).toBe('••');
  });
});
