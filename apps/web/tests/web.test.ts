import { describe, it, expect } from 'vitest';
import { FICTIONAL_WORKERS } from '@hr/fixtures';
import { calculateCardPixelDimensions } from '@hr/card-kit';
import { DEFAULT_CARD_DIMENSIONS } from '@hr/domain';

describe('Web application invariants', () => {
  it('loads valid fictional employee fixtures for landing page and sign-in visual', () => {
    expect(FICTIONAL_WORKERS.length).toBeGreaterThan(0);
    const worker = FICTIONAL_WORKERS[0]!;
    expect(worker.displayNameLatin).toBe('Tanvir Ahmed');
    expect(worker.displayNameNative).toBe('তানভীর আহমেদ');
    expect(worker.employeeNumber).toBe('EMP-1001');
  });

  it('calculates exact 60x90mm card dimensions at 300 and 600 DPI', () => {
    const dpi300 = calculateCardPixelDimensions(DEFAULT_CARD_DIMENSIONS, 300);
    expect(dpi300.widthPx).toBe(709);
    expect(dpi300.heightPx).toBe(1063);

    const dpi600 = calculateCardPixelDimensions(DEFAULT_CARD_DIMENSIONS, 600);
    expect(dpi600.widthPx).toBe(1417);
    expect(dpi600.heightPx).toBe(2126);
  });
});
