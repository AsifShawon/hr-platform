import { describe, it, expect } from 'vitest';
import { cn, BREAKPOINTS, COLOR_TOKENS, CARD_GEOMETRY } from '../src/index.js';

describe('UI utilities & Design Tokens', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('defines responsive breakpoints', () => {
    expect(BREAKPOINTS.mobile).toBe('360px');
    expect(BREAKPOINTS.tablet).toBe('768px');
    expect(BREAKPOINTS.desktop).toBe('1280px');
    expect(BREAKPOINTS.wide).toBe('1440px');
  });

  it('defines Deep Teal system color tokens', () => {
    expect(COLOR_TOKENS.primary.DEFAULT).toBe('#134E4A');
    expect(COLOR_TOKENS.secondary.DEFAULT).toBe('#0F766E');
    expect(COLOR_TOKENS.accent.DEFAULT).toBe('#14B8A6');
    expect(COLOR_TOKENS.background.DEFAULT).toBe('#F0FDFA');
    expect(COLOR_TOKENS.text.primary).toBe('#0F172A');
  });

  it('defines standard card geometry', () => {
    expect(CARD_GEOMETRY.defaultWidthMm).toBe(60);
    expect(CARD_GEOMETRY.defaultHeightMm).toBe(90);
    expect(CARD_GEOMETRY.standardDpi).toBe(300);
  });
});
