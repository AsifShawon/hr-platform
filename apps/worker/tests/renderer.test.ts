import { describe, it, expect, afterAll } from 'vitest';
import {
  CardRenderer,
  inspectPdfDocument,
  BrowserPool,
  createClassicVerticalPreset,
  createPhotoFocusPreset,
  createFactoryIndustrialPreset,
  ISO_ID1_HORIZONTAL_DIMENSIONS,
} from '@hr/card-kit/renderer';

describe('Phase 7: Deterministic Card Renderer & PDF Inspector Tests', () => {
  const renderer = new CardRenderer();

  afterAll(async () => {
    await BrowserPool.getInstance().shutdown();
  });

  it('renders exact-size 60x90mm Duplex PDF and passes MediaBox dimension inspection', async () => {
    const layout = createClassicVerticalPreset();
    const result = await renderer.renderCardPdf({
      layout,
      worker: {
        displayName: 'Tanvir Ahmed',
        displayNameLatin: 'Tanvir Ahmed',
        displayNameNative: 'তানভীর আহমেদ',
        employeeNumber: 'EMP-1001',
        jobTitle: 'Senior Quality Auditor',
        department: 'Quality Assurance',
        bloodGroup: 'O+',
        emergencyContact: '+880 1711-000000',
        orgName: 'London Boy Apparel Ltd.',
        orgNameBangla: 'লন্ডন বয় অ্যাপারেল লি.',
      },
      side: 'duplex',
    });

    expect(result.buffer).toBeDefined();
    expect(result.checksumSha256).toHaveLength(64);
    expect(result.pageCount).toBe(2);
    expect(result.widthMm).toBe(60);
    expect(result.heightMm).toBe(90);

    // Automated PDF MediaBox Inspection via pdf-lib
    const inspection = await inspectPdfDocument(result.buffer, 60, 90, 0.5);
    expect(inspection.pageCount).toBe(2);
    expect(inspection.isValidMediaBox).toBe(true);

    // Page 1 (Front): ~170.08 pt x 255.12 pt
    expect(inspection.pages[0]!.widthPt).toBeCloseTo(170.08, 0);
    expect(inspection.pages[0]!.heightPt).toBeCloseTo(255.12, 0);

    // Page 2 (Back): ~170.08 pt x 255.12 pt
    expect(inspection.pages[1]!.widthPt).toBeCloseTo(170.08, 0);
    expect(inspection.pages[1]!.heightPt).toBeCloseTo(255.12, 0);
  });

  it('renders exact-size ISO ID-1 Horizontal PDF (85.60 x 53.98 mm)', async () => {
    const layout = createClassicVerticalPreset({}, ISO_ID1_HORIZONTAL_DIMENSIONS);
    const result = await renderer.renderCardPdf({
      layout,
      worker: {
        displayName: 'Farhana Akter',
        displayNameLatin: 'Farhana Akter',
        displayNameNative: 'ফারহানা আক্তার',
        employeeNumber: 'EMP-2002',
        jobTitle: 'Production Lead',
        bloodGroup: 'B+',
      },
      side: 'front',
    });

    expect(result.pageCount).toBe(1);
    const inspection = await inspectPdfDocument(result.buffer, 85.6, 53.98, 0.5);
    expect(inspection.isValidMediaBox).toBe(true);
    expect(inspection.pages[0]!.widthPt).toBeCloseTo(242.65, 0);
    expect(inspection.pages[0]!.heightPt).toBeCloseTo(153.01, 0);
  });

  it('renders PNG images with exact pixel dimensions at 150, 300, and 600 DPI', async () => {
    const layout = createClassicVerticalPreset();
    const worker = {
      displayName: 'Tanvir Ahmed',
      employeeNumber: 'EMP-1001',
    };

    // 150 DPI -> 354 x 531 px
    const png150 = await renderer.renderCardPng({ layout, worker, dpi: 150 });
    expect(png150.widthPx).toBe(354);
    expect(png150.heightPx).toBe(531);
    expect(png150.manifest.dpi).toBe(150);

    // 300 DPI (Print Master) -> 709 x 1063 px
    const png300 = await renderer.renderCardPng({ layout, worker, dpi: 300 });
    expect(png300.widthPx).toBe(709);
    expect(png300.heightPx).toBe(1063);
    expect(png300.manifest.dpi).toBe(300);

    // 600 DPI -> 1417 x 2126 px
    const png600 = await renderer.renderCardPng({ layout, worker, dpi: 600 });
    expect(png600.widthPx).toBe(1417);
    expect(png600.heightPx).toBe(2126);
    expect(png600.manifest.dpi).toBe(600);
  });

  it('renders A4 printer calibration sheet PDF with 50mm precision ruler', async () => {
    const result = await renderer.renderCalibrationPdf('A4');
    expect(result.buffer).toBeDefined();
    expect(result.checksumSha256).toHaveLength(64);

    const inspection = await inspectPdfDocument(result.buffer, 210, 297, 0.5);
    expect(inspection.pageCount).toBe(1);
    expect(inspection.isValidMediaBox).toBe(true);
    expect(inspection.pages[0]!.widthPt).toBeCloseTo(595.28, 0); // A4 Width in pt
    expect(inspection.pages[0]!.heightPt).toBeCloseTo(841.89, 0); // A4 Height in pt
  });

  it('handles stress test with maximum length Bengali name without throwing', async () => {
    const layout = createFactoryIndustrialPreset();
    const result = await renderer.renderCardPdf({
      layout,
      worker: {
        displayName: 'Mohammad Saifur Rahman Chowdhury Majumder',
        displayNameLatin: 'Mohammad Saifur Rahman Chowdhury Majumder',
        displayNameNative: 'মুহাম্মদ সাইফুর রহমান চৌধুরী মজুমদার',
        jobTitle: 'Chief Compliance & Factory Operations Executive Director',
        department: 'Quality Assurance & Social Compliance Division',
        employeeNumber: 'EMP-999999',
        bloodGroup: 'AB+',
        emergencyContact: '+880 1711-999888',
      },
      side: 'duplex',
    });

    expect(result.buffer.length).toBeGreaterThan(5000);
    const inspection = await inspectPdfDocument(result.buffer, 60, 90, 0.5);
    expect(inspection.isValidMediaBox).toBe(true);
  });
});
