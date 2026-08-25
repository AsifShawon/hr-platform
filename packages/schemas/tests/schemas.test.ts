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

  describe('Phase 2: Card Issuance & Print Job Schemas', () => {
    it('validates DirectIssueCardRequest', async () => {
      const { directIssueCardRequestSchema } = await import('../src/index.js');
      const valid = {
        employmentId: 'clxxxxxxxxxxxxxxxxx',
        issueReason: 'INITIAL',
        idempotencyKey: 'idemp-12345678',
      };
      expect(directIssueCardRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('validates ReprintCardRequest with required reason and notes', async () => {
      const { reprintCardRequestSchema } = await import('../src/index.js');
      const valid = {
        reason: 'DAMAGED',
        reasonNotes: 'Card chipped at punch hole',
      };
      expect(reprintCardRequestSchema.safeParse(valid).success).toBe(true);

      const invalidNoNotes = {
        reason: 'DAMAGED',
      };
      expect(reprintCardRequestSchema.safeParse(invalidNoNotes).success).toBe(false);
    });

    it('validates RevokeCardRequest with reason and notes', async () => {
      const { revokeCardRequestSchema } = await import('../src/index.js');
      const valid = {
        reason: 'SEPARATION',
        reasonNotes: 'Employee resigned and surrendered ID badge.',
      };
      expect(revokeCardRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('validates CreatePrintJobRequest', async () => {
      const { createPrintJobRequestSchema } = await import('../src/index.js');
      const valid = {
        employmentIds: ['emp-1', 'emp-2'],
        outputFormat: 'A4_SHEET',
        side: 'DUPLEX',
        copiesPerCard: 1,
      };
      expect(createPrintJobRequestSchema.safeParse(valid).success).toBe(true);

      const invalidEmpty = {
        employmentIds: [],
      };
      expect(createPrintJobRequestSchema.safeParse(invalidEmpty).success).toBe(false);
    });

    it('validates ConfirmPrintJobRequest', async () => {
      const { confirmPrintJobRequestSchema } = await import('../src/index.js');
      const valid = {
        status: 'CONFIRMED_PRINTED',
        notes: 'Printed on Epson Stylus with matte PVC overlay.',
        autoActivateIssues: true,
      };
      expect(confirmPrintJobRequestSchema.safeParse(valid).success).toBe(true);
    });
  });
});
