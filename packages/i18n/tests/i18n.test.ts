import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES, DEFAULT_MESSAGES, FONT_FAMILIES } from '../src/index.js';

describe('i18n package', () => {
  it('supports en and bn locales', () => {
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('bn');
  });

  it('declares self-hosted font families', () => {
    expect(FONT_FAMILIES.latin).toBe('Noto Sans');
    expect(FONT_FAMILIES.bengali).toBe('Noto Sans Bengali');
  });

  it('has base message keys for both languages', () => {
    expect(DEFAULT_MESSAGES.en['card.frontSide']).toBe('Front (English)');
    expect(DEFAULT_MESSAGES.bn['card.backSide']).toBe('পেছনে (বাংলা)');
  });
});
