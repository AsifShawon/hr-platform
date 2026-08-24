import { describe, it, expect } from 'vitest';
import { healthResponseSchema, cardDimensionsSchema } from '../src/index.js';

describe('Validation schemas', () => {
  it('validates health response', () => {
    const valid = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: 120,
    };
    expect(healthResponseSchema.safeParse(valid).success).toBe(true);
  });

  it('validates 60x90mm card dimensions', () => {
    const valid = {
      widthMm: 60,
      heightMm: 90,
      bleedMm: 3,
      safeAreaMm: 3,
      orientation: 'vertical',
    };
    expect(cardDimensionsSchema.safeParse(valid).success).toBe(true);
  });
});
