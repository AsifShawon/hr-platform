import { describe, it, expect } from 'vitest';
import { envSchema } from '../src/index.js';

describe('envSchema', () => {
  it('should parse valid default environment', () => {
    const parsed = envSchema.parse({
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    });
    expect(parsed.PORT_WEB).toBe(3000);
    expect(parsed.PORT_API).toBe(3001);
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.STORAGE_DRIVER).toBe('local');
  });

  it('should reject invalid URLs', () => {
    expect(() =>
      envSchema.parse({
        APP_URL: 'not-a-url',
        DATABASE_URL: 'postgresql://test',
      }),
    ).toThrow();
  });
});
