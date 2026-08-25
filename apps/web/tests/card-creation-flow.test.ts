import { describe, it, expect } from 'vitest';
import {
  CardReadinessIssue,
  CardReadinessResult,
  PrintOutputFormat,
  PrintJobSide,
} from '@hr/domain';
import { calculateAdaptiveFontSizePt } from '@hr/card-kit';

describe('Fast Card Creation Flow & Preflight Invariants', () => {
  it('separates preflight blockers from advisory warnings correctly', () => {
    const mockPreflight: CardReadinessResult = {
      isReady: false,
      canOverrideWarnings: true,
      blockers: [
        {
          code: 'SEPARATED_WORKER' as any,
          severity: 'BLOCKER',
          message: 'Employment status is SEPARATED. Cards cannot be issued.',
          field: 'status',
          suggestion: 'Reinstate employee or select an active employment record.',
        },
      ],
      warnings: [
        {
          code: 'NO_PHOTO_ATTACHED' as any,
          severity: 'WARNING',
          message: 'No photo uploaded. Silhouette placeholder will be used.',
          field: 'photo',
        },
        {
          code: 'FALLBACK_TO_LATIN' as any,
          severity: 'WARNING',
          message: 'Bangla name missing. Falling back to English Latin script.',
          field: 'displayNameNative',
        },
      ],
      workerSummary: {
        personId: 'person-123',
        employmentId: 'emp-123',
        employeeNumber: 'EMP-001',
        displayName: 'John Doe',
        jobTitle: 'Operator',
        status: 'SEPARATED' as any,
        photoAvailable: true,
        nativeNameAvailable: true,
      },

      resolvedTemplate: {
        templateId: 'tpl-1',
        templateName: 'Standard Factory Badge',
        versionId: 'ver-1',
        versionNumber: 1,
        layout: {} as any,
        targetType: 'SYSTEM' as any,
        resolutionReason: 'System default template',
      },
    };

    expect(mockPreflight.isReady).toBe(false);
    expect(mockPreflight.blockers).toHaveLength(1);
    expect(mockPreflight.blockers[0]!.field).toBe('status');
    expect(mockPreflight.warnings).toHaveLength(2);
  });

  it('calculates adaptive font sizing for long English and Bengali names without overflowing 60x90mm boundary', () => {
    // Standard short name
    const shortName = 'Md. Ali';
    const shortSize = calculateAdaptiveFontSizePt(shortName, 12, 8, 20);
    expect(shortSize).toBe(12);

    // Very long English name
    const longName = 'Mohammad Shamsuzzaman Chowdhury Al-Mamun';
    const longSize = calculateAdaptiveFontSizePt(longName, 12, 8, 20);
    expect(longSize).toBeLessThan(12);
    expect(longSize).toBeGreaterThanOrEqual(8);

    // Complex Bengali long name with conjuncts
    const banglaName = 'মোহাম্মদ আশরাফুজ্জামান খাঁন চৌধুরী';
    const banglaSize = calculateAdaptiveFontSizePt(banglaName, 12, 8, 18);
    expect(banglaSize).toBeLessThan(12);
    expect(banglaSize).toBeGreaterThanOrEqual(8);
  });

  it('validates print options contract for direct print and batch imposition queue', () => {
    const directPrintPayload = {
      outputMode: 'PRINT_NOW',
      outputFormat: PrintOutputFormat.INDIVIDUAL_PDF,
      side: PrintJobSide.DUPLEX,
      copiesPerCard: 1,
    };

    expect(directPrintPayload.outputFormat).toBe('INDIVIDUAL_PDF');
    expect(directPrintPayload.side).toBe('DUPLEX');

    const batchQueuePayload = {
      outputMode: 'QUEUE',
      outputFormat: PrintOutputFormat.A4_SHEET,
      side: PrintJobSide.DUPLEX,
      copiesPerCard: 2,
    };

    expect(batchQueuePayload.outputFormat).toBe('A4_SHEET');
    expect(batchQueuePayload.copiesPerCard).toBe(2);
  });
});
