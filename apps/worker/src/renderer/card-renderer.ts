import crypto from 'node:crypto';
import { CardLayoutSpecification, CardOrientation } from '@hr/domain';
import {
  generateCardHtmlDocument,
  generateCalibrationHtmlDocument,
  calculateCardPixelDimensions,
  CardRenderWorkerPayload,
  SheetType,
  COMPANY_VERTICAL_60X90_DIMENSIONS,
} from '@hr/card-kit';
import { BrowserPool } from './browser-pool.js';
import { pino } from 'pino';

const logger = pino({ name: 'card-renderer' });

export interface CardRenderManifest {
  formatName: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  dpi: number;
  pixelDimensions: {
    widthPx: number;
    heightPx: number;
  };
  outputFormat: 'PDF' | 'PNG';
  templateVersionId?: string | null;
  rendererVersion: string;
  checksumSha256: string;
  renderedAt: string;
}

export interface RenderCardPdfOptions {
  layout: CardLayoutSpecification;
  worker: CardRenderWorkerPayload;
  side?: 'front' | 'back' | 'duplex';
  includeBleed?: boolean;
  debugMode?: boolean;
  templateVersionId?: string | null;
}

export interface RenderCardPngOptions {
  layout: CardLayoutSpecification;
  worker: CardRenderWorkerPayload;
  side?: 'front' | 'back';
  dpi?: 150 | 300 | 600;
  includeBleed?: boolean;
  templateVersionId?: string | null;
}

export class CardRenderer {
  private pool = BrowserPool.getInstance();
  private rendererVersion = '1.0.0-chromium-pinned';

  /**
   * Renders an exact-size physical PDF master using CSS physical units.
   */
  public async renderCardPdf(options: RenderCardPdfOptions): Promise<{
    buffer: Buffer;
    checksumSha256: string;
    pageCount: number;
    widthMm: number;
    heightMm: number;
    manifest: CardRenderManifest;
  }> {
    const { layout, worker, side = 'duplex', includeBleed = false, debugMode = false } = options;
    const { dimensions } = layout;

    const widthMm = includeBleed ? dimensions.widthMm + dimensions.bleedMm * 2 : dimensions.widthMm;
    const heightMm = includeBleed
      ? dimensions.heightMm + dimensions.bleedMm * 2
      : dimensions.heightMm;

    const html = generateCardHtmlDocument({
      layout,
      worker,
      side,
      includeBleed,
      debugMode,
    });

    const { page, close } = await this.pool.createIsolatedPage(
      Math.round((widthMm / 25.4) * 300),
      Math.round((heightMm / 25.4) * 300),
    );

    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 10000 });

      const pdfBuffer = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      const buffer = Buffer.from(pdfBuffer);
      const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const pageCount = side === 'duplex' ? 2 : 1;

      const pxDims = calculateCardPixelDimensions(dimensions, 300);

      const manifest: CardRenderManifest = {
        formatName:
          dimensions.orientation === CardOrientation.VERTICAL ? 'Company Vertical' : 'ISO ID-1',
        widthMm,
        heightMm,
        bleedMm: includeBleed ? dimensions.bleedMm : 0,
        dpi: 300,
        pixelDimensions: {
          widthPx: includeBleed ? pxDims.totalWidthWithBleedPx : pxDims.widthPx,
          heightPx: includeBleed ? pxDims.totalHeightWithBleedPx : pxDims.heightPx,
        },
        outputFormat: 'PDF',
        templateVersionId: options.templateVersionId,
        rendererVersion: this.rendererVersion,
        checksumSha256,
        renderedAt: new Date().toISOString(),
      };

      return {
        buffer,
        checksumSha256,
        pageCount,
        widthMm,
        heightMm,
        manifest,
      };
    } finally {
      await close();
    }
  }

  /**
   * Renders a high-resolution PNG image at exact calculated pixel dimensions.
   */
  public async renderCardPng(options: RenderCardPngOptions): Promise<{
    buffer: Buffer;
    checksumSha256: string;
    widthPx: number;
    heightPx: number;
    dpi: number;
    manifest: CardRenderManifest;
  }> {
    const { layout, worker, side = 'front', dpi = 300, includeBleed = false } = options;
    const { dimensions } = layout;

    const pxDims = calculateCardPixelDimensions(dimensions, dpi);
    const targetWidthPx = includeBleed ? pxDims.totalWidthWithBleedPx : pxDims.widthPx;
    const targetHeightPx = includeBleed ? pxDims.totalHeightWithBleedPx : pxDims.heightPx;

    const html = generateCardHtmlDocument({
      layout,
      worker,
      side,
      includeBleed,
      debugMode: false,
    });

    const { page, close } = await this.pool.createIsolatedPage(targetWidthPx, targetHeightPx);

    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 10000 });

      const cardLocator = page.locator('.card-page').first();
      const pngBuffer = await cardLocator.screenshot({
        type: 'png',
        omitBackground: false,
      });

      const buffer = Buffer.from(pngBuffer);
      const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      const manifest: CardRenderManifest = {
        formatName:
          dimensions.orientation === CardOrientation.VERTICAL ? 'Company Vertical' : 'ISO ID-1',
        widthMm: dimensions.widthMm,
        heightMm: dimensions.heightMm,
        bleedMm: includeBleed ? dimensions.bleedMm : 0,
        dpi,
        pixelDimensions: {
          widthPx: targetWidthPx,
          heightPx: targetHeightPx,
        },
        outputFormat: 'PNG',
        templateVersionId: options.templateVersionId,
        rendererVersion: this.rendererVersion,
        checksumSha256,
        renderedAt: new Date().toISOString(),
      };

      return {
        buffer,
        checksumSha256,
        widthPx: targetWidthPx,
        heightPx: targetHeightPx,
        dpi,
        manifest,
      };
    } finally {
      await close();
    }
  }

  /**
   * Renders the printer calibration PDF sheet with 50 mm measurement check.
   */
  public async renderCalibrationPdf(sheetType: SheetType = 'A4'): Promise<{
    buffer: Buffer;
    checksumSha256: string;
  }> {
    const html = generateCalibrationHtmlDocument(sheetType);
    const { page, close } = await this.pool.createIsolatedPage(1200, 1600);

    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 10000 });

      const pdfBuffer = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      const buffer = Buffer.from(pdfBuffer);
      const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      return { buffer, checksumSha256 };
    } finally {
      await close();
    }
  }
}
