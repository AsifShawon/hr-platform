import { describe, it, expect } from 'vitest';
import {
  COLOR_TOKENS,
  CARD_GEOMETRY,
  FOCUS_RING_CLASSES,
  SPACING_RHYTHM,
  RADIUS_TOKENS,
} from '@hr/ui';
import { queryKeys } from '../lib/query-keys';
import { ApiError } from '../lib/api-client';

describe('Phase 8: UI Consistency, Tokens & Frontend Architecture', () => {
  it('validates deep teal semantic color tokens and focus ring classes', () => {
    expect(COLOR_TOKENS.primary.DEFAULT).toBe('#134E4A');
    expect(COLOR_TOKENS.secondary.DEFAULT).toBe('#0F766E');
    expect(COLOR_TOKENS.accent.DEFAULT).toBe('#14B8A6');
    expect(COLOR_TOKENS.background.canvas).toBe('#F8FAFC');
    expect(COLOR_TOKENS.feedback.error).toBe('#E11D48');
    expect(COLOR_TOKENS.feedback.success).toBe('#059669');

    expect(FOCUS_RING_CLASSES).toContain('focus-visible:ring-[#0F766E]');
    expect(FOCUS_RING_CLASSES).toContain('focus-visible:ring-offset-2');
  });

  it('validates physical card geometry constants and vertical orientation', () => {
    expect(CARD_GEOMETRY.defaultWidthMm).toBe(60);
    expect(CARD_GEOMETRY.defaultHeightMm).toBe(90);
    expect(CARD_GEOMETRY.aspectRatio).toBe('60/90');
    expect(CARD_GEOMETRY.standardDpi).toBe(300);
    expect(CARD_GEOMETRY.orientation).toBe('vertical');
  });

  it('validates spacing rhythm and radius design token sets', () => {
    expect(SPACING_RHYTHM.sm).toBe('8px');
    expect(SPACING_RHYTHM.md).toBe('16px');
    expect(RADIUS_TOKENS.lg).toBe('16px');
    expect(RADIUS_TOKENS.xl).toBe('20px');
  });

  it('validates TanStack Query keys factory predictability across domains', () => {
    expect(queryKeys.auth.me).toEqual(['auth', 'me']);
    expect(queryKeys.people.list({ department: 'Engineering' })).toEqual([
      'people',
      'list',
      { department: 'Engineering' },
    ]);
    expect(queryKeys.cards.templates.detail('tpl-101')).toEqual([
      'cards',
      'templates',
      'detail',
      'tpl-101',
    ]);
    expect(queryKeys.cards.issues.lineage('emp-99')).toEqual([
      'cards',
      'issues',
      'lineage',
      'emp-99',
    ]);
    expect(queryKeys.system.health).toEqual(['system', 'health']);
  });

  it('validates ApiError structured attributes for normalized frontend error handling', () => {
    const error = new ApiError('Validation failed', 422, { email: 'Invalid email format' });
    expect(error.message).toBe('Validation failed');
    expect(error.statusCode).toBe(422);
    expect(error.errors?.email).toBe('Invalid email format');
    expect(error.name).toBe('ApiError');
  });
});
