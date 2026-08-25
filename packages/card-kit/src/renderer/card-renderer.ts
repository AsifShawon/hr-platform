import crypto from 'node:crypto';
import { CardLayoutSpecification } from '@hr/domain';
import {
  generateCardHtmlDocument,
  generateBatchCardHtmlDocument,
  generateCalibrationHtmlDocument,
  calculateCardPixelDimensions,
  CardRenderWorkerPayload,
  SheetType,
  COMPANY_VERTICAL_60X90_DIMENSIONS,
} from '../index.js';

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
        formatName: layout.presetId,
        widthMm,
        heightMm,
        bleedMm: dimensions.bleedMm,
        dpi: 300,
        pixelDimensions: {
          widthPx: pxDims.totalWidthWithBleedPx,
          heightPx: pxDims.totalHeightWithBleedPx,
        },
        outputFormat: 'PDF',
        templateVersionId: options.templateVersionId || null,
        rendererVersion: this.rendererVersion,
        checksumSha256,
        renderedAt: new Date().toISOString(),
      };

      logger.info(
        { checksumSha256, pageCount, format: layout.presetId },
        '✅ Card PDF render complete',
      );

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
   * Renders high-DPI raster PNG export (150, 300, or 600 DPI).
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

    const widthMm = includeBleed ? dimensions.widthMm + dimensions.bleedMm * 2 : dimensions.widthMm;
    const heightMm = includeBleed
      ? dimensions.heightMm + dimensions.bleedMm * 2
      : dimensions.heightMm;

    const targetWidthPx = Math.round((widthMm / 25.4) * dpi);
    const targetHeightPx = Math.round((heightMm / 25.4) * dpi);

    const html = generateCardHtmlDocument({
      layout,
      worker,
      side,
      includeBleed,
      debugMode: false,
    });

    const deviceScaleFactor = dpi === 600 ? 2 : 1;
    const viewportWidth = dpi === 600 ? Math.round(targetWidthPx / 2) : targetWidthPx;
    const viewportHeight = dpi === 600 ? Math.round(targetHeightPx / 2) : targetHeightPx;

    const { page, close } = await this.pool.createIsolatedPage(viewportWidth, viewportHeight);

    try {
      await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
      await page.setContent(html, { waitUntil: 'load', timeout: 10000 });

      const element = await page.$('.card-page');
      if (!element) {
        throw new Error('Card DOM root element not found during PNG rasterization');
      }

      const pngBuffer = await element.screenshot({
        type: 'png',
        omitBackground: false,
      });

      const buffer = Buffer.from(pngBuffer);
      const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      const manifest: CardRenderManifest = {
        formatName: layout.presetId,
        widthMm,
        heightMm,
        bleedMm: dimensions.bleedMm,
        dpi,
        pixelDimensions: {
          widthPx: targetWidthPx,
          heightPx: targetHeightPx,
        },
        outputFormat: 'PNG',
        templateVersionId: options.templateVersionId || null,
        rendererVersion: this.rendererVersion,
        checksumSha256,
        renderedAt: new Date().toISOString(),
      };

      logger.info(
        { checksumSha256, widthPx: targetWidthPx, heightPx: targetHeightPx, dpi },
        '✅ Card PNG render complete',
      );

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
   * Generates printable physical calibration sheet PDF (A4 or US Letter).
   */
  public async renderCalibrationPdf(sheetType: SheetType = 'A4'): Promise<{
    buffer: Buffer;
    checksumSha256: string;
    sheetType: SheetType;
  }> {
    const html = generateCalibrationHtmlDocument(sheetType);

    const { page, close } = await this.pool.createIsolatedPage(1200, 1600);

    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 10000 });

      const pdfBuffer = await page.pdf({
        format: sheetType === 'LETTER' ? 'Letter' : 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      const buffer = Buffer.from(pdfBuffer);
      const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

      logger.info({ checksumSha256, sheetType }, '✅ Calibration PDF render complete');

      return {
        buffer,
        checksumSha256,
        sheetType,
      };
    } finally {
      await close();
    }
  }

  /**
   * Renders a multi-card physical batch PDF master.
   */
  public async renderBatchCardPdf(options: {
    items: Array<{ layout: CardLayoutSpecification; worker: CardRenderWorkerPayload }>;
    side?: 'front' | 'back' | 'duplex';
    includeBleed?: boolean;
    debugMode?: boolean;
  }): Promise<{
    buffer: Buffer;
    checksumSha256: string;
    totalCards: number;
    pageCount: number;
  }> {
    const { items, side = 'duplex', includeBleed = false, debugMode = false } = options;
    if (items.length === 0) {
      throw new Error('Cannot render an empty card batch PDF.');
    }

    const html = generateBatchCardHtmlDocument({
      items,
      side,
      includeBleed,
      debugMode,
    });

    const first = items[0]!;
    const { dimensions } = first.layout;
    const widthMm = includeBleed ? dimensions.widthMm + dimensions.bleedMm * 2 : dimensions.widthMm;
    const heightMm = includeBleed
      ? dimensions.heightMm + dimensions.bleedMm * 2
      : dimensions.heightMm;

    const { page, close } = await this.pool.createIsolatedPage(
      Math.round((widthMm / 25.4) * 300),
      Math.round((heightMm / 25.4) * 300),
    );

    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      const buffer = Buffer.from(pdfBuffer);
      const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const pagesPerCard = side === 'duplex' ? 2 : 1;
      const pageCount = items.length * pagesPerCard;

      logger.info(
        { checksumSha256, totalCards: items.length, pageCount },
        '✅ Batch Card PDF render complete',
      );

      return {
        buffer,
        checksumSha256,
        totalCards: items.length,
        pageCount,
      };
    } finally {
      await close();
    }
  }
}
