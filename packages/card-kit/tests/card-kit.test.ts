import { describe, it, expect } from 'vitest';
import {
  normalizeToMm,
  mmToInches,
  inchesToMm,
  mmToPdfPoints,
  pdfPointsToMm,
  calculateCardPixelDimensions,
  COMPANY_VERTICAL_60X90_DIMENSIONS,
  ISO_ID1_HORIZONTAL_DIMENSIONS,
  ISO_ID1_VERTICAL_DIMENSIONS,
  createClassicVerticalPreset,
  createModernStripePreset,
  createPhotoFocusPreset,
  createFactoryIndustrialPreset,
  createContractorPreset,
  createVisitorPreset,
  calculateAdaptiveFontSizePt,
  calculateSheetImpositionGrid,
  generateCardHtmlDocument,
  generateCalibrationHtmlDocument,
} from '../src/index.js';
import { TemplatePresetId, CardOrientation } from '@hr/domain';

describe('Phase 6 & 7: Card-Kit Geometry, Print Math & Document Engine Tests', () => {
  it('converts units accurately with roundtrip tolerance', () => {
    expect(normalizeToMm(60, 'mm')).toBe(60);
    expect(normalizeToMm(6, 'cm')).toBe(60);
    expect(normalizeToMm(2.3622, 'in')).toBe(60);

    expect(mmToInches(25.4)).toBe(1);
    expect(inchesToMm(1)).toBe(25.4);
  });

  it('converts millimetres to PDF points accurately (72 points / inch)', () => {
    // 25.4 mm = exactly 72 pt
    expect(mmToPdfPoints(25.4)).toBe(72);
    expect(pdfPointsToMm(72)).toBe(25.4);

    // 60 x 90 mm Company Vertical:
    // 60 mm = 60 * 72 / 25.4 = 170.08 pt
    // 90 mm = 90 * 72 / 25.4 = 255.12 pt
    expect(mmToPdfPoints(60)).toBe(170.08);
    expect(mmToPdfPoints(90)).toBe(255.12);
  });

  it('derives exact pixel dimensions for 60x90mm Company Vertical at 150, 300, and 600 DPI', () => {
    // 300 DPI (Print Master)
    const dims300 = calculateCardPixelDimensions(COMPANY_VERTICAL_60X90_DIMENSIONS, 300);
    expect(dims300.widthPx).toBe(709); // round(60 / 25.4 * 300) = 709
    expect(dims300.heightPx).toBe(1063); // round(90 / 25.4 * 300) = 1063
    expect(dims300.bleedPx).toBe(35); // round(3 / 25.4 * 300) = 35
    expect(dims300.totalWidthWithBleedPx).toBe(779); // 709 + 35*2
    expect(dims300.totalHeightWithBleedPx).toBe(1133); // 1063 + 35*2

    // 150 DPI (Preview / Web)
    const dims150 = calculateCardPixelDimensions(COMPANY_VERTICAL_60X90_DIMENSIONS, 150);
    expect(dims150.widthPx).toBe(354);
    expect(dims150.heightPx).toBe(531);

    // 600 DPI (Ultra Fine Print)
    const dims600 = calculateCardPixelDimensions(COMPANY_VERTICAL_60X90_DIMENSIONS, 600);
    expect(dims600.widthPx).toBe(1417);
    expect(dims600.heightPx).toBe(2126);
  });

  it('calculates Sheet Imposition Grid for A4 (3 columns x 2 rows = 6 cards) with duplex mirroring', () => {
    const a4Grid = calculateSheetImpositionGrid('A4', COMPANY_VERTICAL_60X90_DIMENSIONS, 10, 4);

    expect(a4Grid.sheet.type).toBe('A4');
    expect(a4Grid.columns).toBe(3);
    expect(a4Grid.rows).toBe(2);
    expect(a4Grid.cardsPerSheet).toBe(6);

    // Verify duplex mirroring: back columns must be reversed front columns
    expect(a4Grid.backColumns).toEqual([...a4Grid.frontColumns].reverse());
    expect(a4Grid.frontColumns[0]).toBeLessThan(a4Grid.frontColumns[1]!);
    expect(a4Grid.backColumns[0]).toBeGreaterThan(a4Grid.backColumns[1]!);
  });

  it('calculates Sheet Imposition Grid for US Letter (3 columns x 2 rows = 6 cards)', () => {
    const letterGrid = calculateSheetImpositionGrid(
      'LETTER',
      COMPANY_VERTICAL_60X90_DIMENSIONS,
      10,
      4,
    );

    expect(letterGrid.sheet.type).toBe('LETTER');
    expect(letterGrid.columns).toBe(3);
    expect(letterGrid.rows).toBe(2);
    expect(letterGrid.cardsPerSheet).toBe(6);
    expect(letterGrid.backColumns).toEqual([...letterGrid.frontColumns].reverse());
  });

  it('generates valid Card HTML document with exact CSS physical units and page breaks', () => {
    const layout = createClassicVerticalPreset();
    const html = generateCardHtmlDocument({
      layout,
      worker: {
        displayName: 'Tanvir Ahmed',
        displayNameLatin: 'Tanvir Ahmed',
        displayNameNative: 'তানভীর আহমেদ',
        employeeNumber: 'EMP-1001',
        jobTitle: 'Production Manager',
        department: 'Manufacturing',
        bloodGroup: 'O+',
        emergencyContact: '+880 1711-000000',
      },
      side: 'duplex',
    });

    expect(html).toContain('size: 60mm 90mm;');
    expect(html).toContain('Tanvir Ahmed');
    expect(html).toContain('তানভীর আহমেদ');
    expect(html).toContain('EMP-1001');
    expect(html).toContain('Manufacturing');
    expect(html).toContain('front-page');
    expect(html).toContain('back-page');
    expect(html).toContain('page-break-after: always;');
  });

  it('generates valid Calibration Sheet HTML document with 50mm ruler specifications', () => {
    const calHtml = generateCalibrationHtmlDocument('A4');

    expect(calHtml).toContain('size: 210mm 297mm;');
    expect(calHtml).toContain('HR ID Card Printer Calibration Sheet');
    expect(calHtml).toContain('50.00 mm Test Line');
    expect(calHtml).toContain('60.0 × 90.0 mm');
    expect(calHtml).toContain('width: 50mm;');
  });

  it('scales adaptive font size gracefully for extreme long names', () => {
    const shortName = 'Ali Reza';
    const longName = 'Mohammad Saifur Rahman Chowdhury Majumder';

    const shortSize = calculateAdaptiveFontSizePt(shortName, 11, 7.5, 20);
    const longSize = calculateAdaptiveFontSizePt(longName, 11, 7.5, 20);

    expect(shortSize).toBe(11);
    expect(longSize).toBe(7.5); // Scaled down to floor
  });

  it('sanitizes and escapes all user-supplied HTML/scripts in generateCardHtmlDocument (SEC-CRIT-01)', () => {
    const layout = createClassicVerticalPreset();
    const maliciousWorker = {
      displayName: '<script>alert("xss")</script>',
      displayNameLatin: '<img src=x onerror=alert(1)>',
      displayNameNative: '<iframe src="javascript:alert(1)"></iframe>',
      employeeNumber: 'EMP-"><script>bad()</script>',
      jobTitle: 'Lead & Chief <CEO>',
      department: 'R&D "Top Secret"',
      bloodGroup: 'A+ <script>',
      emergencyContact: '+880 1711 <script>',
      orgName: 'Acme & Co <script>',
      orgNameBangla: 'একমি & কোং <script>',
    };

    const html = generateCardHtmlDocument({
      layout,
      worker: maliciousWorker,
      side: 'duplex',
    });

    // Verify unescaped tags are NOT present
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<iframe src="javascript:alert(1)">');
    expect(html).not.toContain('<script>bad()</script>');
    expect(html).not.toContain('<CEO>');

    // Verify properly escaped entity representations
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;iframe src=&quot;javascript:alert(1)&quot;&gt;&lt;/iframe&gt;');
    expect(html).toContain('EMP-&quot;&gt;&lt;script&gt;bad()&lt;/script&gt;');
    expect(html).toContain('Lead &amp; Chief &lt;CEO&gt;');
    expect(html).toContain('R&amp;D &quot;Top Secret&quot;');
    expect(html).toContain('Acme &amp; Co &lt;script&gt;');
    expect(html).toContain('একমি &amp; কোং &lt;script&gt;');
  });
});
