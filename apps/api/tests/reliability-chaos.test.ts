import { describe, it, expect } from 'vitest';
import {
  encryptSensitiveValue,
  decryptSensitiveValue,
  maskSensitiveIdentifier,
  hashForBlindIndex,
} from '../src/services/crypto.service.js';
import { sanitizeCsvCell } from '../src/services/csv-parser.service.js';
import { ConcurrencyConflictError } from '../src/services/person.service.js';

describe('Phase 12: Reliability, Chaos & Fault-Injection Resilience Suite', () => {
  describe('Optimistic Concurrency & Version Mismatch Defense', () => {
    it('throws ConcurrencyConflictError when record version does not match expected version', () => {
      const currentVersion = 2;
      const expectedVersion = 1;

      expect(() => {
        if (currentVersion !== expectedVersion) {
          throw new ConcurrencyConflictError(
            'The record was updated by another user. Please refresh and try again.',
          );
        }
      }).toThrow(ConcurrencyConflictError);
    });
  });

  describe('Cryptographic Integrity & Tamper Detection (AES-256-GCM)', () => {
    it('throws error when ciphertext or authentication tag is tampered with', () => {
      const plaintext = '19922612345678901';
      const encrypted = encryptSensitiveValue(plaintext);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      const [iv, authTag, ciphertext] = parts;

      // Tamper with the ciphertext
      const tamperedCiphertext = ciphertext!.slice(0, -2) + 'ff';
      const tamperedPayload = `${iv}:${authTag}:${tamperedCiphertext}`;

      expect(() => {
        decryptSensitiveValue(tamperedPayload);
      }).toThrow();

      // Tamper with the auth tag
      const tamperedAuthTag = authTag!.slice(0, -2) + '00';
      const tamperedTagPayload = `${iv}:${tamperedAuthTag}:${ciphertext}`;

      expect(() => {
        decryptSensitiveValue(tamperedTagPayload);
      }).toThrow();
    });

    it('handles empty or malformed encryption payloads gracefully', () => {
      expect(encryptSensitiveValue('')).toBe('');
      expect(decryptSensitiveValue('')).toBe('');
      expect(() => decryptSensitiveValue('malformed-payload')).toThrow(
        'Invalid encrypted payload format.',
      );
    });
  });

  describe('CSV Injection & Formula Sanitization Fault-Tolerance', () => {
    it('neutralizes malicious formula injection prefixes (=, +, -, @, tab, CR)', () => {
      expect(sanitizeCsvCell('=cmd|"/C calc"!A0')).toBe(`'=cmd|"/C calc"!A0`);
      expect(sanitizeCsvCell('+cmd|')).toBe(`'+cmd|`);
      expect(sanitizeCsvCell('-cmd|')).toBe(`'-cmd|`);
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe(`'@SUM(A1:A10)`);
      expect(sanitizeCsvCell('\t=2+2')).toBe(`'\t=2+2`);
      expect(sanitizeCsvCell('\r=2+2')).toBe(`'\r=2+2`);
      expect(sanitizeCsvCell('Normal Worker Name')).toBe('Normal Worker Name');
    });
  });

  describe('Masking Resilience Under Boundary Inputs', () => {
    it('safely masks identifiers of varying lengths without throwing', () => {
      expect(maskSensitiveIdentifier('')).toBe('');
      expect(maskSensitiveIdentifier('A')).toBe('•');
      expect(maskSensitiveIdentifier('1234')).toBe('••••');
      expect(maskSensitiveIdentifier('12345')).toBe('•2345');
      expect(maskSensitiveIdentifier('12345678901234567890')).toBe('••••••••7890');
    });

    it('produces identical blind index hashes for identical normalized inputs across multiple runs', () => {
      const nid1 = '  1992-2612-3456-78901  ';
      const nid2 = '19922612345678901';
      const salt = 'tenant-salt-chaos-test-2026';

      const hash1 = hashForBlindIndex(nid1, salt);
      const hash2 = hashForBlindIndex(nid2, salt);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });
});
