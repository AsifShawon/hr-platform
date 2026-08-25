import { describe, it, expect } from 'vitest';
import { FICTIONAL_WORKERS } from '@hr/fixtures';
import { DEFAULT_CARD_DIMENSIONS } from '@hr/domain';

describe('Phase 7: Local-Only Landing & Sign-in Specifications', () => {
  it('validates 60x90mm vertical default geometry for landing page showcase', () => {
    expect(DEFAULT_CARD_DIMENSIONS.widthMm).toBe(60);
    expect(DEFAULT_CARD_DIMENSIONS.heightMm).toBe(90);
    expect(DEFAULT_CARD_DIMENSIONS.orientation).toBe('vertical');
  });

  it('validates fictional worker fixture for landing card showcase without PII', () => {
    const worker = FICTIONAL_WORKERS.find((w) => w.employeeNumber === 'EMP-1001');
    expect(worker).toBeDefined();
    expect(worker?.displayNameLatin).toBe('Tanvir Ahmed');
    expect(worker?.displayNameNative).toBe('তানভীর আহমেদ');
    expect(worker?.title).toBe('Senior Production Manager');
  });

  it('verifies absence of SaaS and fake request-access keywords in canonical copy deck', () => {
    const prohibitedKeywords = [
      'revolutionize',
      'AI-powered',
      'request access',
      'hosted enterprise cloud',
      'managed saas',
      'start free trial',
    ];

    const landingHeadlines = [
      'Create accurate employee ID cards in minutes—on your own computer.',
      'A disciplined three-step pipeline for busy HR teams',
      'Honest, responsive tools built for operational speed',
      'Verified features engineered for high-volume ID production',
      'Precision alignment engineered for physical PVC and flatbed printers',
      'Transparent local deployment with zero third-party leakage',
    ];

    for (const headline of landingHeadlines) {
      for (const forbidden of prohibitedKeywords) {
        expect(headline.toLowerCase()).not.toContain(forbidden);
      }
    }
  });
});
