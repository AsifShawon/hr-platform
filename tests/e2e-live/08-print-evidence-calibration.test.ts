import { describe, it, expect, afterAll } from 'vitest';
import {
  CardRenderer,
  BrowserPool,
  inspectPdfDocument,
  createClassicVerticalPreset,
  calculateCardPixelDimensions,
  COMPANY_VERTICAL_60X90_DIMENSIONS,
  generateCalibrationHtmlDocument,
} from '@hr/card-kit/renderer';

describe('Live Print Evidence: Geometry, PDF MediaBox, DPI Scaling & Calibration', () => {
  const renderer = new CardRenderer();

  afterAll(async () => {
    await BrowserPool.getInstance().shutdown();
  });

  describe('Programmatic PDF MediaBox & Page Dimensions', () => {
    it('generates exact 60 x 90 mm duplex vector PDF matching MediaBox tolerance', async () => {
      const layout = createClassicVerticalPreset();
      const result = await renderer.renderCardPdf({
        layout,
        worker: {
          displayName: 'Mohammad Tariqul Islam Chowdhury',
          displayNameLatin: 'Mohammad Tariqul Islam Chowdhury',
          displayNameNative: 'মোহাম্মদ তারিকুল ইসলাম চৌধুরী',
          employeeNumber: 'EMP-LONGLONG-9999',
          jobTitle: 'Principal Industrial Operations Engineer',
          department: 'Senior Quality Assurance & Compliance Section',
          bloodGroup: 'AB+',
          emergencyContact: '+880 1711-999888',
          orgName: 'London Boy Apparel Ltd.',
          orgNameBangla: 'লন্ডন বয় অ্যাপারেল লি.',
        },
        side: 'duplex',
      });

      expect(result.buffer).toBeDefined();
      expect(result.pageCount).toBe(2);
      expect(result.widthMm).toBe(60);
      expect(result.heightMm).toBe(90);

      // Automated PDF MediaBox Inspection via pdf-lib
      const inspection = await inspectPdfDocument(result.buffer, 60, 90, 0.5);
      expect(inspection.pageCount).toBe(2);
      expect(inspection.isValidMediaBox).toBe(true);

      // Page 1 (Front): 60mm * 72 / 25.4 = 170.08 pt x 255.12 pt
      expect(inspection.pages[0]!.widthPt).toBeCloseTo(170.08, 0);
      expect(inspection.pages[0]!.heightPt).toBeCloseTo(255.12, 0);

      // Page 2 (Back): 60mm * 72 / 25.4 = 170.08 pt x 255.12 pt
      expect(inspection.pages[1]!.widthPt).toBeCloseTo(170.08, 0);
      expect(inspection.pages[1]!.heightPt).toBeCloseTo(255.12, 0);
    });

    it('renders edge-case worker with missing optional fields without layout degradation', async () => {
      const layout = createClassicVerticalPreset();
      const result = await renderer.renderCardPdf({
        layout,
        worker: {
          displayName: 'Worker No-Photo',
          displayNameLatin: 'Worker No-Photo',
          displayNameNative: 'ছবিহীন কর্মী',
          employeeNumber: 'EMP-EMPTY-001',
          jobTitle: 'Junior Trainee',
          department: 'Assembly',
          // bloodGroup and emergencyContact intentionally omitted
          orgName: 'London Boy Apparel Ltd.',
          orgNameBangla: 'লন্ডন বয় অ্যাপারেল লি.',
        },
        side: 'duplex',
      });

      expect(result.pageCount).toBe(2);
      const inspection = await inspectPdfDocument(result.buffer, 60, 90, 0.5);
      expect(inspection.isValidMediaBox).toBe(true);
    });
  });

  describe('DPI Pixel Derivation & PNG Rasterization', () => {
    it('verifies deterministic pixel math for 150, 300, and 600 DPI outputs', () => {
      // 150 DPI (Preview)
      const dims150 = calculateCardPixelDimensions(COMPANY_VERTICAL_60X90_DIMENSIONS, 150);
      expect(dims150.widthPx).toBe(354);
      expect(dims150.heightPx).toBe(531);

      // 300 DPI (Standard Print Master)
      const dims300 = calculateCardPixelDimensions(COMPANY_VERTICAL_60X90_DIMENSIONS, 300);
      expect(dims300.widthPx).toBe(709);
      expect(dims300.heightPx).toBe(1063);

      // 600 DPI (High Precision / Dye Sublimation)
      const dims600 = calculateCardPixelDimensions(COMPANY_VERTICAL_60X90_DIMENSIONS, 600);
      expect(dims600.widthPx).toBe(1417);
      expect(dims600.heightPx).toBe(2126);
    });
  });

  describe('A4/Letter Calibration Test Page Generation', () => {
    it('generates valid calibration sheet HTML containing 50mm calibration ruler and registration crosses', () => {
      const calHtml = generateCalibrationHtmlDocument('A4');

      expect(calHtml).toContain('1. Physical Scale Check (50.00 mm Test Line)');
      expect(calHtml).toContain('Scaling is set to "100%" or "Actual Size"');
      expect(calHtml).toContain('50.0 mm');
      expect(calHtml).toContain('HR ID Card Printer Calibration Sheet');
    });
  });
});
