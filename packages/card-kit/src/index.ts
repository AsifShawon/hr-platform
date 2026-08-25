import {
  CardDimensionsMm,
  CardOrientation,
  DEFAULT_CARD_DIMENSIONS,
  CardFormatPreset,
  TemplatePresetId,
  BarcodeType,
  BarcodePayloadType,
  LocaleFallbackPolicy,
  CardLayoutSpecification,
  CardLayoutTheme,
  CardSideLayoutSpecification,
} from '@hr/domain';

// ==============================================================================
// 1. Physical Geometry Constants & Unit Conversion Engine
// ==============================================================================

export const MM_TO_INCH = 1 / 25.4;
export const INCH_TO_MM = 25.4;
export const CM_TO_MM = 10;
export const MM_TO_PDF_POINTS = 72 / 25.4; // 1 mm approx 2.83464567 pt
export const CURRENT_LAYOUT_SCHEMA_VERSION = '1.0.0';

/**
 * Standard Company Vertical 60 x 90 mm (Vertical, English front, Bangla back)
 * Note: This is a custom physical standard, distinct from ISO/CR80.
 */
export const COMPANY_VERTICAL_60X90_DIMENSIONS: CardDimensionsMm = {
  widthMm: 60,
  heightMm: 90,
  bleedMm: 3,
  safeAreaMm: 3,
  orientation: CardOrientation.VERTICAL,
};

/**
 * ISO/IEC 7810 ID-1 Horizontal Preset (85.60 mm x 53.98 mm)
 */
export const ISO_ID1_HORIZONTAL_DIMENSIONS: CardDimensionsMm = {
  widthMm: 85.6,
  heightMm: 53.98,
  bleedMm: 3,
  safeAreaMm: 3,
  orientation: CardOrientation.HORIZONTAL,
};

/**
 * ISO/IEC 7810 ID-1 Vertical Preset (53.98 mm x 85.60 mm)
 */
export const ISO_ID1_VERTICAL_DIMENSIONS: CardDimensionsMm = {
  widthMm: 53.98,
  heightMm: 85.6,
  bleedMm: 3,
  safeAreaMm: 3,
  orientation: CardOrientation.VERTICAL,
};

/**
 * Normalizes any supported input unit ('mm', 'cm', 'in') to decimal millimetres.
 */
export function normalizeToMm(value: number, unit: 'mm' | 'cm' | 'in' = 'mm'): number {
  if (Number.isNaN(value) || value < 0) {
    throw new Error('Card dimension must be a non-negative number.');
  }
  switch (unit) {
    case 'in':
      return Math.round(value * INCH_TO_MM * 100) / 100;
    case 'cm':
      return Math.round(value * CM_TO_MM * 100) / 100;
    case 'mm':
    default:
      return Math.round(value * 100) / 100;
  }
}

export function mmToInches(mm: number): number {
  return Math.round((mm / INCH_TO_MM) * 1000) / 1000;
}

export function inchesToMm(inches: number): number {
  return Math.round(inches * INCH_TO_MM * 100) / 100;
}

export function mmToPdfPoints(mm: number): number {
  return Math.round(mm * MM_TO_PDF_POINTS * 100) / 100;
}

export function pdfPointsToMm(pt: number): number {
  return Math.round((pt / MM_TO_PDF_POINTS) * 100) / 100;
}

export function mmToPixels(mm: number, dpi: 150 | 300 | 600 = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

export interface PixelDimensions {
  widthPx: number;
  heightPx: number;
  bleedPx: number;
  safeAreaPx: number;
  totalWidthWithBleedPx: number;
  totalHeightWithBleedPx: number;
}

export function calculateCardPixelDimensions(
  dimensions: CardDimensionsMm = DEFAULT_CARD_DIMENSIONS,
  dpi: 150 | 300 | 600 = 300,
): PixelDimensions {
  const widthPx = mmToPixels(dimensions.widthMm, dpi);
  const heightPx = mmToPixels(dimensions.heightMm, dpi);
  const bleedPx = mmToPixels(dimensions.bleedMm, dpi);
  const safeAreaPx = mmToPixels(dimensions.safeAreaMm, dpi);

  return {
    widthPx,
    heightPx,
    bleedPx,
    safeAreaPx,
    totalWidthWithBleedPx: widthPx + bleedPx * 2,
    totalHeightWithBleedPx: heightPx + bleedPx * 2,
  };
}

// ==============================================================================
// 2. Default Theme & 6 MVP Preset Layout Generators
// ==============================================================================

export const DEFAULT_CARD_THEME: CardLayoutTheme = {
  primaryColor: '#134E4A', // Deep Teal Primary
  secondaryColor: '#0F766E', // Forest Teal Secondary
  accentColor: '#14B8A6', // Bright Teal Accent
  backgroundColor: '#FFFFFF',
  textColor: '#0F172A',
  fontFamilyLatin: 'Noto Sans',
  fontFamilyBengali: 'Noto Sans Bengali',
};

/**
 * 1. Classic Vertical: Traditional corporate bilingual badge with top brand bar & centered photo.
 */
export function createClassicVerticalPreset(
  themeOverrides?: Partial<CardLayoutTheme>,
  dimOverrides?: Partial<CardDimensionsMm>,
): CardLayoutSpecification {
  return {
    version: CURRENT_LAYOUT_SCHEMA_VERSION,
    presetId: TemplatePresetId.CLASSIC_VERTICAL,
    dimensions: { ...COMPANY_VERTICAL_60X90_DIMENSIONS, ...dimOverrides },
    theme: { ...DEFAULT_CARD_THEME, ...themeOverrides },
    front: {
      header: {
        showLogo: true,
        showOrgName: true,
        customTitle: null,
        heightMm: 12,
      },
      photo: {
        widthMm: 24,
        heightMm: 32,
        borderRadiusMm: 2,
        borderColor: '#0F766E',
        borderWidthMm: 0.5,
      },
      details: {
        enabledFields: ['displayName', 'jobTitle', 'department', 'employeeNumber', 'bloodGroup'],
        customLabels: {
          employeeNumber: 'ID No',
          bloodGroup: 'Blood',
          jobTitle: 'Designation',
          department: 'Department',
        },
      },
      barcode: null,
      footer: {
        showSignatureLine: true,
        signatureLabel: 'Authorized Sign',
        instructionsText: null,
      },
    },
    back: {
      header: {
        showLogo: false,
        showOrgName: true,
        customTitle: 'জরুরি নির্দেশিকা ও তথ্যাবলী',
        heightMm: 10,
      },
      photo: null,
      details: {
        enabledFields: ['displayName', 'emergencyContact', 'bloodGroup'],
        customLabels: {
          displayName: 'নাম',
          emergencyContact: 'জরুরি যোগাযোগ',
          bloodGroup: 'রক্তের গ্রুপ',
        },
      },
      barcode: {
        type: BarcodeType.QR_CODE,
        payloadType: BarcodePayloadType.OPAQUE_CARD_SERIAL,
      },
      footer: {
        showSignatureLine: true,
        signatureLabel: 'কার্ডধারীর স্বাক্ষর',
        instructionsText:
          'এই কার্ডটি প্রতিষ্ঠানের সম্পত্তি। কার্ডটি হস্তান্তরযোগ্য নয়। কার্ডটি হারানো গেলে অবিলম্বে নিরাপত্তা বিভাগে অবহিত করুন।',
      },
    },
    localeConfig: {
      frontLocale: 'en-US',
      backLocale: 'bn-BD',
      fallbackPolicy: LocaleFallbackPolicy.LATIN_FALLBACK,
    },
  };
}

/**
 * 2. Modern Stripe: Vertical accent color ribbon with left alignment and compact styling.
 */
export function createModernStripePreset(
  themeOverrides?: Partial<CardLayoutTheme>,
  dimOverrides?: Partial<CardDimensionsMm>,
): CardLayoutSpecification {
  const base = createClassicVerticalPreset(
    {
      primaryColor: '#1E293B',
      secondaryColor: '#0F766E',
      accentColor: '#06B6D4',
      ...themeOverrides,
    },
    dimOverrides,
  );
  base.presetId = TemplatePresetId.MODERN_STRIPE;
  return base;
}

/**
 * 3. Photo Focus: Security-centric layout with enlarged portrait framing for gate checkpoints.
 */
export function createPhotoFocusPreset(
  themeOverrides?: Partial<CardLayoutTheme>,
  dimOverrides?: Partial<CardDimensionsMm>,
): CardLayoutSpecification {
  const base = createClassicVerticalPreset(themeOverrides, dimOverrides);
  base.presetId = TemplatePresetId.PHOTO_FOCUS;
  base.front.photo = {
    widthMm: 30,
    heightMm: 40,
    borderRadiusMm: 3,
    borderColor: '#134E4A',
    borderWidthMm: 0.8,
  };
  return base;
}

/**
 * 4. Factory / Industrial: High contrast, large employee number and blood group for floor safety.
 */
export function createFactoryIndustrialPreset(
  themeOverrides?: Partial<CardLayoutTheme>,
  dimOverrides?: Partial<CardDimensionsMm>,
): CardLayoutSpecification {
  const base = createClassicVerticalPreset(
    {
      primaryColor: '#0F172A',
      secondaryColor: '#B45309',
      accentColor: '#F59E0B',
      ...themeOverrides,
    },
    dimOverrides,
  );
  base.presetId = TemplatePresetId.FACTORY_INDUSTRIAL;
  base.front.details.enabledFields = [
    'displayName',
    'employeeNumber',
    'bloodGroup',
    'department',
    'jobTitle',
  ];
  return base;
}

/**
 * 5. Contractor: Distinct badge banner with bold "CONTRACTOR" header and vendor info.
 */
export function createContractorPreset(
  themeOverrides?: Partial<CardLayoutTheme>,
  dimOverrides?: Partial<CardDimensionsMm>,
): CardLayoutSpecification {
  const base = createClassicVerticalPreset(
    {
      primaryColor: '#7C2D12',
      secondaryColor: '#C2410C',
      accentColor: '#FB923C',
      ...themeOverrides,
    },
    dimOverrides,
  );
  base.presetId = TemplatePresetId.CONTRACTOR;
  base.front.header.customTitle = 'CONTRACTOR / সরবরাহকারী';
  return base;
}

/**
 * 6. Visitor: Temporary pass style with large issue date, host contact, and escort notice.
 */
export function createVisitorPreset(
  themeOverrides?: Partial<CardLayoutTheme>,
  dimOverrides?: Partial<CardDimensionsMm>,
): CardLayoutSpecification {
  const base = createClassicVerticalPreset(
    {
      primaryColor: '#4338CA',
      secondaryColor: '#6366F1',
      accentColor: '#A5B4FC',
      ...themeOverrides,
    },
    dimOverrides,
  );
  base.presetId = TemplatePresetId.VISITOR;
  base.front.header.customTitle = 'VISITOR PASS / দর্শনার্থী';
  base.front.photo = null;
  base.front.details.enabledFields = ['displayName', 'jobTitle', 'department', 'emergencyContact'];
  return base;
}

/**
 * Preset Resolver Factory
 */
export function getPresetLayout(
  presetId: TemplatePresetId,
  themeOverrides?: Partial<CardLayoutTheme>,
  dimOverrides?: Partial<CardDimensionsMm>,
): CardLayoutSpecification {
  switch (presetId) {
    case TemplatePresetId.MODERN_STRIPE:
      return createModernStripePreset(themeOverrides, dimOverrides);
    case TemplatePresetId.PHOTO_FOCUS:
      return createPhotoFocusPreset(themeOverrides, dimOverrides);
    case TemplatePresetId.FACTORY_INDUSTRIAL:
      return createFactoryIndustrialPreset(themeOverrides, dimOverrides);
    case TemplatePresetId.CONTRACTOR:
      return createContractorPreset(themeOverrides, dimOverrides);
    case TemplatePresetId.VISITOR:
      return createVisitorPreset(themeOverrides, dimOverrides);
    case TemplatePresetId.CLASSIC_VERTICAL:
    default:
      return createClassicVerticalPreset(themeOverrides, dimOverrides);
  }
}

// ==============================================================================
// 3. Bilingual Text Layout & Font Scale Helpers
// ==============================================================================

/**
 * Calculates adaptive font size in points to prevent overflow for long names.
 */
export function calculateAdaptiveFontSizePt(
  text: string,
  baseSizePt: number = 11,
  minSizePt: number = 7.5,
  charLimit: number = 22,
): number {
  if (!text) return baseSizePt;
  const length = text.trim().length;
  if (length <= charLimit) return baseSizePt;

  const excess = length - charLimit;
  const reduction = (excess / 12) * 2;
  return Math.max(minSizePt, Math.round((baseSizePt - reduction) * 10) / 10);
}

// ==============================================================================
// 4. Sheet Imposition & Layout Calculation (A4 / US Letter)
// ==============================================================================

export type SheetType = 'A4' | 'LETTER';

export interface SheetDimensionsMm {
  type: SheetType;
  widthMm: number;
  heightMm: number;
}

export const SHEET_DIMENSIONS: Record<SheetType, SheetDimensionsMm> = {
  A4: { type: 'A4', widthMm: 210, heightMm: 297 },
  LETTER: { type: 'LETTER', widthMm: 215.9, heightMm: 279.4 },
};

export interface SheetImpositionGrid {
  sheet: SheetDimensionsMm;
  columns: number;
  rows: number;
  cardsPerSheet: number;
  marginHorizontalMm: number;
  marginVerticalMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  cardWidthMm: number;
  cardHeightMm: number;
  frontColumns: number[]; // X positions for Front (Page 1)
  backColumns: number[]; // X positions for Back (Page 2) with duplex mirroring
  rowPositions: number[]; // Y positions
}

export function calculateSheetImpositionGrid(
  sheetType: SheetType = 'A4',
  cardDimensions: CardDimensionsMm = DEFAULT_CARD_DIMENSIONS,
  marginMm: number = 10,
  gapMm: number = 4,
): SheetImpositionGrid {
  const sheet = SHEET_DIMENSIONS[sheetType];
  const { widthMm: cardW, heightMm: cardH } = cardDimensions;

  const availableW = sheet.widthMm - marginMm * 2;
  const availableH = sheet.heightMm - marginMm * 2;

  const columns = Math.max(1, Math.floor((availableW + gapMm) / (cardW + gapMm)));
  const rows = Math.max(1, Math.floor((availableH + gapMm) / (cardH + gapMm)));
  const cardsPerSheet = columns * rows;

  // Center the grid on the sheet
  const totalGridW = columns * cardW + (columns - 1) * gapMm;
  const totalGridH = rows * cardH + (rows - 1) * gapMm;

  const actualMarginX = Math.round(((sheet.widthMm - totalGridW) / 2) * 100) / 100;
  const actualMarginY = Math.round(((sheet.heightMm - totalGridH) / 2) * 100) / 100;

  const frontColumns: number[] = [];
  for (let c = 0; c < columns; c++) {
    frontColumns.push(Math.round((actualMarginX + c * (cardW + gapMm)) * 100) / 100);
  }

  // Back columns mirrored along the vertical axis for long-edge duplex flipping
  const backColumns = [...frontColumns].reverse();

  const rowPositions: number[] = [];
  for (let r = 0; r < rows; r++) {
    rowPositions.push(Math.round((actualMarginY + r * (cardH + gapMm)) * 100) / 100);
  }

  return {
    sheet,
    columns,
    rows,
    cardsPerSheet,
    marginHorizontalMm: actualMarginX,
    marginVerticalMm: actualMarginY,
    gapHorizontalMm: gapMm,
    gapVerticalMm: gapMm,
    cardWidthMm: cardW,
    cardHeightMm: cardH,
    frontColumns,
    backColumns,
    rowPositions,
  };
}

// ==============================================================================
// 5. HTML Document Generator for Exact-Size PDF & PNG Render
// ==============================================================================

export interface CardRenderWorkerPayload {
  displayName: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employeeNumber: string;
  bloodGroup?: string | null;
  joinDate?: string | null;
  emergencyContact?: string | null;
  photoUrl?: string | null;
  photoBase64?: string | null;
  orgName?: string | null;
  orgNameBangla?: string | null;
  logoBase64?: string | null;
  serialNumber?: string | null;
}

export interface CardHtmlDocumentOptions {
  layout: CardLayoutSpecification;
  worker: CardRenderWorkerPayload;
  side?: 'front' | 'back' | 'duplex';
  includeBleed?: boolean;
  debugMode?: boolean;
}

/**
 * Escapes special HTML characters to prevent XSS and DOM injection during card rendering.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateCardHtmlDocument(options: CardHtmlDocumentOptions): string {
  const { layout, worker, side = 'duplex', includeBleed = false, debugMode = false } = options;
  const { dimensions, theme, front, back, localeConfig } = layout;

  const widthMm = includeBleed ? dimensions.widthMm + dimensions.bleedMm * 2 : dimensions.widthMm;
  const heightMm = includeBleed
    ? dimensions.heightMm + dimensions.bleedMm * 2
    : dimensions.heightMm;

  const hasNativeName = Boolean(worker.displayNameNative?.trim());
  const banglaName = hasNativeName
    ? worker.displayNameNative!
    : localeConfig.fallbackPolicy === LocaleFallbackPolicy.LATIN_FALLBACK
      ? worker.displayNameLatin || worker.displayName
      : '';

  const frontName = worker.displayNameLatin || worker.displayName;
  const frontNameSizePt = calculateAdaptiveFontSizePt(frontName, 11.5, 7.5, 20);
  const backNameSizePt = calculateAdaptiveFontSizePt(banglaName, 11.5, 7.5, 18);

  const safeFrontName = escapeHtml(frontName);
  const safeBanglaName = escapeHtml(banglaName);
  const safeOrgName = escapeHtml(worker.orgName || 'COMPANY NAME');
  const safeOrgNameBangla = escapeHtml(
    worker.orgNameBangla || worker.orgName || 'প্রতিষ্ঠানের নাম',
  );

  const renderFrontCardHtml = () => `
    <div class="card-page front-page" style="width: ${widthMm}mm; height: ${heightMm}mm; background-color: ${theme.backgroundColor}; color: ${theme.textColor};">
      ${includeBleed && debugMode ? '<div class="bleed-guide"></div>' : ''}
      <div class="card-inner">
        <!-- Front Header -->
        <div class="card-header" style="background-color: ${theme.primaryColor}; min-height: ${front.header.heightMm}mm;">
          <div class="header-brand">
            ${
              front.header.showLogo
                ? worker.logoBase64
                  ? `<img src="${escapeHtml(worker.logoBase64)}" class="org-logo" alt="Logo" />`
                  : `<div class="org-logo-placeholder" style="background-color: ${theme.accentColor}; color: ${theme.primaryColor};">${worker.orgName ? escapeHtml(worker.orgName.charAt(0).toUpperCase()) : 'A'}</div>`
                : ''
            }
            ${front.header.showOrgName ? `<span class="org-name">${safeOrgName}</span>` : ''}
          </div>
          ${front.header.customTitle ? `<span class="header-tag" style="background-color: ${theme.secondaryColor};">${escapeHtml(front.header.customTitle)}</span>` : ''}
        </div>

        <!-- Front Body -->
        <div class="card-body">
          ${
            front.photo
              ? `
            <div class="photo-container" style="width: ${front.photo.widthMm}mm; height: ${front.photo.heightMm}mm; border-radius: ${front.photo.borderRadiusMm}mm; border: ${front.photo.borderWidthMm}mm solid ${front.photo.borderColor || theme.secondaryColor};">
              ${
                worker.photoBase64 || worker.photoUrl
                  ? `<img src="${escapeHtml(worker.photoBase64 || worker.photoUrl)}" class="worker-photo" alt="${safeFrontName}" />`
                  : `<div class="photo-placeholder"><svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>`
              }
            </div>
          `
              : ''
          }

          <h3 class="worker-name" style="font-size: ${frontNameSizePt}pt;">${safeFrontName}</h3>
          ${front.details.enabledFields.includes('jobTitle') && worker.jobTitle ? `<p class="worker-title" style="color: ${theme.secondaryColor};">${escapeHtml(worker.jobTitle)}</p>` : ''}
          ${front.details.enabledFields.includes('department') && worker.department ? `<p class="worker-dept">${escapeHtml(worker.department)}</p>` : ''}

          <div class="details-grid">
            ${
              front.details.enabledFields.includes('employeeNumber')
                ? `
              <div class="detail-cell">
                <span class="detail-label">${escapeHtml(front.details.customLabels.employeeNumber || 'ID NO')}</span>
                <span class="detail-value font-mono">${escapeHtml(worker.employeeNumber)}</span>
              </div>
            `
                : ''
            }
            ${
              front.details.enabledFields.includes('bloodGroup') && worker.bloodGroup
                ? `
              <div class="detail-cell">
                <span class="detail-label">${escapeHtml(front.details.customLabels.bloodGroup || 'BLOOD')}</span>
                <span class="detail-value blood-val">${escapeHtml(worker.bloodGroup)}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- Front Footer -->
        ${
          front.footer
            ? `
          <div class="card-footer">
            <div class="issued-box">
              <span class="issued-label">ISSUED</span>
              <span class="issued-date font-mono">${escapeHtml(worker.joinDate || '2026-01-01')}</span>
            </div>
            ${
              front.footer.showSignatureLine
                ? `
              <div class="signature-box">
                <div class="sig-line"></div>
                <span class="sig-label">${escapeHtml(front.footer.signatureLabel || 'Authorized Sign')}</span>
              </div>
            `
                : ''
            }
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;

  const renderBackCardHtml = () => `
    <div class="card-page back-page" style="width: ${widthMm}mm; height: ${heightMm}mm; background-color: ${theme.backgroundColor}; color: ${theme.textColor};">
      ${includeBleed && debugMode ? '<div class="bleed-guide"></div>' : ''}
      <div class="card-inner">
        <!-- Back Header (Bangla) -->
        <div class="card-header back-header" style="background-color: ${theme.primaryColor}; min-height: ${back.header.heightMm}mm;">
          <span class="back-org-title font-bangla">${safeOrgNameBangla}</span>
        </div>

        <!-- Back Body (Bangla) -->
        <div class="card-body back-body font-bangla">
          <div class="bangla-name-box">
            <span class="bangla-label">${escapeHtml(back.details.customLabels.displayName || 'নাম')}:</span>
            <span class="bangla-name-val" style="font-size: ${backNameSizePt}pt;">${safeBanglaName}</span>
          </div>

          <div class="back-details-list">
            ${
              back.details.enabledFields.includes('emergencyContact') && worker.emergencyContact
                ? `
              <div class="back-row">
                <span class="back-field-lbl">${escapeHtml(back.details.customLabels.emergencyContact || 'জরুরি যোগাযোগ')}:</span>
                <span class="back-field-val font-mono">${escapeHtml(worker.emergencyContact)}</span>
              </div>
            `
                : ''
            }
            ${
              back.details.enabledFields.includes('bloodGroup') && worker.bloodGroup
                ? `
              <div class="back-row">
                <span class="back-field-lbl">${escapeHtml(back.details.customLabels.bloodGroup || 'রক্তের গ্রুপ')}:</span>
                <span class="back-field-val blood-val">${escapeHtml(worker.bloodGroup)}</span>
              </div>
            `
                : ''
            }
          </div>

          ${
            back.barcode && back.barcode.type !== BarcodeType.NONE
              ? `
            <div class="barcode-box" style="border-color: ${theme.primaryColor}30; background-color: ${theme.primaryColor}08;">
              <div class="qr-code-icon" style="color: ${theme.primaryColor};">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 2h2v4h-2v-4zm-4-2h4v2h-4v-2zm2 4h4v2h-4v-2z"/>
                </svg>
              </div>
              <div class="barcode-meta">
                <span class="barcode-title">ডিজিটাল যাচাইকরণ</span>
                <span class="barcode-serial font-mono">${escapeHtml(worker.serialNumber || `${worker.employeeNumber}-SEC`)}</span>
              </div>
            </div>
          `
              : ''
          }

          ${back.footer.instructionsText ? `<p class="terms-text">${escapeHtml(back.footer.instructionsText)}</p>` : ''}
        </div>

        <!-- Back Footer -->
        ${
          back.footer.showSignatureLine
            ? `
          <div class="card-footer back-footer font-bangla">
            <span class="sig-label">${escapeHtml(back.footer.signatureLabel || 'কার্ডধারীর স্বাক্ষর')}</span>
            <div class="sig-line"></div>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Physical Card Print Master</title>
      <style>
        @page {
          size: ${widthMm}mm ${heightMm}mm;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Noto Sans', system-ui, -apple-system, sans-serif;
          background: #FFFFFF;
        }
        .font-mono {
          font-family: 'Courier New', Courier, monospace;
        }
        .font-bangla {
          font-family: 'Noto Sans Bengali', 'Noto Sans', sans-serif;
        }
        .card-page {
          position: relative;
          width: ${widthMm}mm;
          height: ${heightMm}mm;
          overflow: hidden;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .card-inner {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          height: 100%;
        }
        .bleed-guide {
          position: absolute;
          inset: ${dimensions.bleedMm}mm;
          border: 0.2mm dashed rgba(220, 38, 38, 0.6);
          pointer-events: none;
          z-index: 99;
        }
        .card-header {
          padding: 2.5mm 3.5mm;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #FFFFFF;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 2mm;
          overflow: hidden;
        }
        .org-logo-placeholder {
          width: 5mm;
          height: 5mm;
          border-radius: 1mm;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8pt;
          font-weight: bold;
          flex-shrink: 0;
        }
        .org-logo {
          width: 5mm;
          height: 5mm;
          object-fit: contain;
        }
        .org-name {
          font-size: 7pt;
          font-weight: bold;
          letter-spacing: 0.2mm;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .header-tag {
          font-size: 6pt;
          font-weight: bold;
          padding: 0.5mm 1.5mm;
          border-radius: 0.8mm;
          color: #FFFFFF;
          text-transform: uppercase;
        }
        .card-body {
          flex: 1;
          padding: 2mm 3.5mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          justify-content: center;
        }
        .photo-container {
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2mm;
          background: #F1F5F9;
        }
        .worker-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-placeholder {
          color: #94A3B8;
        }
        .worker-name {
          font-weight: bold;
          color: #0F172A;
          line-height: 1.15;
          max-width: 100%;
          word-break: break-word;
        }
        .worker-title {
          font-size: 7.5pt;
          font-weight: 600;
          margin-top: 0.5mm;
        }
        .worker-dept {
          font-size: 6.5pt;
          color: #64748B;
          margin-top: 0.3mm;
        }
        .details-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5mm;
          margin-top: 2.5mm;
          padding: 1.5mm;
          background: #F8FAFC;
          border: 0.2mm solid #E2E8F0;
          border-radius: 1.2mm;
          text-align: left;
        }
        .detail-cell {
          display: flex;
          flex-direction: column;
        }
        .detail-label {
          font-size: 5.5pt;
          font-weight: bold;
          color: #94A3B8;
          text-transform: uppercase;
        }
        .detail-value {
          font-size: 7pt;
          font-weight: bold;
          color: #1E293B;
        }
        .blood-val {
          color: #E11D48;
          font-weight: bold;
        }
        .card-footer {
          padding: 1.5mm 3.5mm 2.5mm 3.5mm;
          border-top: 0.2mm solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 5.5pt;
          color: #64748B;
          background: #FAFAFA;
        }
        .issued-label {
          font-size: 5pt;
          color: #94A3B8;
          display: block;
        }
        .issued-date {
          font-size: 6pt;
          font-weight: bold;
          color: #334155;
        }
        .signature-box {
          text-align: right;
        }
        .sig-line {
          width: 15mm;
          border-bottom: 0.2mm solid #64748B;
          margin-bottom: 0.5mm;
        }
        .sig-label {
          font-size: 5pt;
          color: #64748B;
        }
        /* Back Styles */
        .back-header {
          text-align: center;
          justify-content: center;
        }
        .back-org-title {
          font-size: 8pt;
          font-weight: bold;
          letter-spacing: 0.1mm;
        }
        .back-body {
          text-align: left;
          align-items: stretch;
          justify-content: space-between;
          padding: 2.5mm 3.5mm;
        }
        .bangla-name-box {
          border-bottom: 0.2mm solid #E2E8F0;
          padding-bottom: 1.5mm;
          margin-bottom: 1.5mm;
        }
        .bangla-label {
          font-size: 6pt;
          color: #94A3B8;
          display: block;
        }
        .bangla-name-val {
          font-weight: bold;
          color: #0F172A;
          line-height: 1.2;
        }
        .back-details-list {
          display: flex;
          flex-direction: column;
          gap: 1.2mm;
          font-size: 6.5pt;
        }
        .back-row {
          display: flex;
          justify-content: space-between;
        }
        .back-field-lbl {
          color: #64748B;
        }
        .back-field-val {
          font-weight: 600;
          color: #1E293B;
        }
        .barcode-box {
          display: flex;
          align-items: center;
          gap: 2mm;
          padding: 1.5mm;
          border-radius: 1mm;
          border-width: 0.2mm;
          border-style: solid;
          margin: 1.5mm 0;
        }
        .barcode-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .barcode-title {
          font-size: 6pt;
          font-weight: bold;
        }
        .barcode-serial {
          font-size: 5.5pt;
          color: #64748B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .terms-text {
          font-size: 5pt;
          color: #64748B;
          line-height: 1.35;
          border-top: 0.2mm solid #E2E8F0;
          padding-top: 1mm;
        }
      </style>
    </head>
    <body>
      ${side === 'front' ? renderFrontCardHtml() : side === 'back' ? renderBackCardHtml() : `${renderFrontCardHtml()}${renderBackCardHtml()}`}
    </body>
    </html>
  `;
}

// ==============================================================================
// 6. Calibration Sheet HTML Generator
// ==============================================================================

export function generateCalibrationHtmlDocument(sheetType: SheetType = 'A4'): string {
  const sheet = SHEET_DIMENSIONS[sheetType];

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Physical Print Calibration Sheet</title>
      <style>
        @page {
          size: ${sheet.widthMm}mm ${sheet.heightMm}mm;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: 'Noto Sans', system-ui, sans-serif;
          background: #FFFFFF;
          color: #0F172A;
          width: ${sheet.widthMm}mm;
          height: ${sheet.heightMm}mm;
          padding: 12mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .cal-header {
          border-bottom: 0.5mm solid #0F766E;
          padding-bottom: 4mm;
        }
        .cal-title {
          font-size: 16pt;
          font-weight: bold;
          color: #0F766E;
        }
        .cal-subtitle {
          font-size: 9pt;
          color: #64748B;
          margin-top: 1mm;
        }
        .warning-box {
          background: #FFFBEB;
          border: 0.3mm solid #F59E0B;
          padding: 3mm;
          border-radius: 2mm;
          margin-top: 3mm;
          font-size: 8pt;
          color: #92400E;
          font-weight: bold;
        }
        .cal-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8mm;
        }
        /* 50mm Precision Ruler */
        .ruler-container {
          border: 0.3mm solid #CBD5E1;
          padding: 4mm;
          border-radius: 2mm;
          background: #F8FAFC;
        }
        .ruler-title {
          font-size: 9pt;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .ruler-scale {
          position: relative;
          width: 50mm;
          height: 12mm;
          border: 0.4mm solid #0F172A;
          background: #FFFFFF;
        }
        .ruler-ticks {
          display: flex;
          width: 50mm;
          height: 6mm;
          border-bottom: 0.2mm solid #0F172A;
        }
        .tick-mm {
          width: 1mm;
          height: 3mm;
          border-right: 0.15mm solid #64748B;
        }
        .tick-5mm {
          height: 5mm;
          border-right: 0.25mm solid #0F172A;
        }
        .ruler-labels {
          display: flex;
          justify-content: space-between;
          width: 50mm;
          font-size: 6.5pt;
          font-family: monospace;
          padding-top: 1mm;
        }
        /* 60x90mm Sample Target Box */
        .sample-card-box {
          width: 60mm;
          height: 90mm;
          border: 0.4mm solid #0F766E;
          position: relative;
          padding: 3mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #F0FDFA;
        }
        .crop-corner {
          position: absolute;
          width: 4mm;
          height: 4mm;
          border-color: #0F766E;
          border-style: solid;
        }
        .crop-tl { top: -2mm; left: -2mm; border-width: 0.4mm 0 0 0.4mm; }
        .crop-tr { top: -2mm; right: -2mm; border-width: 0.4mm 0.4mm 0 0; }
        .crop-bl { bottom: -2mm; left: -2mm; border-width: 0 0 0.4mm 0.4mm; }
        .crop-br { bottom: -2mm; right: -2mm; border-width: 0 0.4mm 0.4mm 0; }
        .cal-footer {
          border-top: 0.3mm solid #CBD5E1;
          padding-top: 3mm;
          display: flex;
          justify-content: space-between;
          font-size: 7pt;
          color: #64748B;
        }
      </style>
    </head>
    <body>
      <div class="cal-header">
        <h1 class="cal-title">HR ID Card Printer Calibration Sheet</h1>
        <p class="cal-subtitle">Physical Scale & Duplex Registration Verification (${sheet.type} Format)</p>
        <div class="warning-box">
          CRITICAL: In your printer dialog, ensure Scaling is set to "100%" or "Actual Size". DO NOT select "Fit to Page" or "Shrink oversized pages".
        </div>
      </div>

      <div class="cal-body">
        <!-- 50 mm Ruler Check -->
        <div class="ruler-container">
          <div class="ruler-title">1. Physical Scale Check (50.00 mm Test Line)</div>
          <p style="font-size: 7.5pt; color: #475569; margin-bottom: 2mm;">
            Measure the box below with a precision metric caliper or ruler. It must measure exactly <strong>50.0 mm</strong> across.
          </p>
          <div class="ruler-scale">
            <div class="ruler-ticks">
              ${Array.from({ length: 50 })
                .map((_, i) => `<div class="tick-mm ${(i + 1) % 5 === 0 ? 'tick-5mm' : ''}"></div>`)
                .join('')}
            </div>
            <div class="ruler-labels">
              <span>0mm</span>
              <span>25mm</span>
              <span>50mm</span>
            </div>
          </div>
        </div>

        <!-- 60 x 90 mm Target Box -->
        <div>
          <div class="ruler-title" style="margin-bottom: 2mm;">2. Standard Company Vertical Box (60.0 × 90.0 mm)</div>
          <div class="sample-card-box">
            <div class="crop-corner crop-tl"></div>
            <div class="crop-corner crop-tr"></div>
            <div class="crop-corner crop-bl"></div>
            <div class="crop-corner crop-br"></div>
            <div style="font-size: 8pt; font-weight: bold; color: #0F766E;">
              Standard Card Target
            </div>
            <div style="text-align: center; font-size: 7.5pt; color: #0F766E;">
              Exact Size: 60.00 mm Width × 90.00 mm Height<br/>
              Duplex Alignment Center
            </div>
            <div style="font-size: 6.5pt; color: #64748B; text-align: right;">
              100% Print Scale
            </div>
          </div>
        </div>
      </div>

      <div class="cal-footer">
        <span>HR Identity Platform • Physical Render Engine v1.0</span>
        <span>Generated: ${new Date().toISOString().split('T')[0]}</span>
      </div>
    </body>
    </html>
  `;
}
