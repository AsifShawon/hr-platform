import { PDFDocument } from 'pdf-lib';
import { pdfPointsToMm } from '../index.js';

export interface PdfInspectionResult {
  pageCount: number;
  pages: Array<{
    pageIndex: number;
    widthPt: number;
    heightPt: number;
    widthMm: number;
    heightMm: number;
  }>;
  isValidMediaBox: boolean;
}

export async function inspectPdfDocument(
  pdfBuffer: Buffer,
  expectedWidthMm?: number,
  expectedHeightMm?: number,
  toleranceMm = 0.5,
): Promise<PdfInspectionResult> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  const pages: PdfInspectionResult['pages'] = [];

  let isValidMediaBox = true;

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const widthPt = Math.round(page.getWidth() * 100) / 100;
    const heightPt = Math.round(page.getHeight() * 100) / 100;

    const widthMm = pdfPointsToMm(widthPt);
    const heightMm = pdfPointsToMm(heightPt);

    pages.push({
      pageIndex: i + 1,
      widthPt,
      heightPt,
      widthMm,
      heightMm,
    });

    if (expectedWidthMm !== undefined && expectedHeightMm !== undefined) {
      const widthDiff = Math.abs(widthMm - expectedWidthMm);
      const heightDiff = Math.abs(heightMm - expectedHeightMm);
      if (widthDiff > toleranceMm || heightDiff > toleranceMm) {
        isValidMediaBox = false;
      }
    }
  }

  return {
    pageCount,
    pages,
    isValidMediaBox,
  };
}
