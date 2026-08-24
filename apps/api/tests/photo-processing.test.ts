import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sharp from 'sharp';
import {
  detectImageFormat,
  processAndSavePhoto,
  getPhotoBuffer,
  PhotoValidationError,
  evaluatePhotoQuality,
  CARD_READY_WIDTH_PX,
  CARD_READY_HEIGHT_PX,
  THUMBNAIL_DIMENSION_PX,
} from '../src/services/photo-processing.service.js';
import { prisma } from '@hr/db';

describe('Phase 5: Secure Photo Processing & Derivative Generation Tests', () => {
  let tenantId: string;

  beforeEach(async () => {
    const slug = `photo-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Photo Test Workspace' },
    });
    tenantId = tenant.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  it('detects magic bytes for PNG, JPEG, and WebP and rejects invalid/malformed formats', async () => {
    // Generate valid sample PNG buffer
    const pngBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const detectedPng = detectImageFormat(pngBuffer);
    expect(detectedPng.format).toBe('png');
    expect(detectedPng.mimeType).toBe('image/png');

    // Generate valid sample JPEG buffer
    const jpegBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const detectedJpeg = detectImageFormat(jpegBuffer);
    expect(detectedJpeg.format).toBe('jpeg');
    expect(detectedJpeg.mimeType).toBe('image/jpeg');

    // Invalid format (e.g. text/binary payload)
    const malformedBuffer = Buffer.from('NOT_AN_IMAGE_FILE_PAYLOAD_123456');
    expect(() => detectImageFormat(malformedBuffer)).toThrow(PhotoValidationError);
  });

  it('evaluates photo quality heuristics and non-blocking warnings', async () => {
    // Dark image
    const darkBuffer = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 5, g: 5, b: 5 } },
    })
      .png()
      .toBuffer();
    const darkMeta = await sharp(darkBuffer).metadata();
    const qualityDark = await evaluatePhotoQuality(darkBuffer, darkMeta);
    expect(qualityDark.isAcceptable).toBe(false);
    expect(qualityDark.warnings.some((w) => w.includes('Low image resolution'))).toBe(true);
    expect(qualityDark.warnings.some((w) => w.includes('underexposed'))).toBe(true);

    // Normal good resolution image
    const goodBuffer = await sharp({
      create: { width: 800, height: 1200, channels: 3, background: { r: 120, g: 150, b: 180 } },
    })
      .png()
      .toBuffer();
    const goodMeta = await sharp(goodBuffer).metadata();
    const qualityGood = await evaluatePhotoQuality(goodBuffer, goodMeta);
    expect(qualityGood.isAcceptable).toBe(true);
    expect(qualityGood.warnings.length).toBe(0);
  });

  it('processes valid portrait, strips EXIF, generates card-ready & thumbnail derivatives, and persists MediaAsset', async () => {
    // Create high-res 1200x1600 image with simulated EXIF
    const inputBuffer = await sharp({
      create: { width: 1200, height: 1600, channels: 3, background: { r: 19, g: 78, b: 74 } },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await processAndSavePhoto(inputBuffer, tenantId, {
      crop: { x: 100, y: 100, width: 900, height: 1350, rotation: 0 },
    });

    expect(result.mediaAssetId).toBeDefined();
    expect(result.mimeType).toBe('image/webp');
    expect(result.checksumSha256).toBeDefined();

    // Verify Master file on disk
    const masterFile = await getPhotoBuffer(result.storageKeyMaster, tenantId);
    expect(masterFile).not.toBeNull();
    expect(masterFile!.mimeType).toBe('image/webp');

    // Verify Card-Ready file on disk has exact 709x1063 px @ 300 DPI
    const cardReadyFile = await getPhotoBuffer(result.storageKeyCardReady, tenantId);
    expect(cardReadyFile).not.toBeNull();
    const cardMeta = await sharp(cardReadyFile!.buffer).metadata();
    expect(cardMeta.width).toBe(CARD_READY_WIDTH_PX);
    expect(cardMeta.height).toBe(CARD_READY_HEIGHT_PX);

    // Verify Thumbnail file on disk has exact 150x150 px
    const thumbFile = await getPhotoBuffer(result.storageKeyThumbnail, tenantId);
    expect(thumbFile).not.toBeNull();
    const thumbMeta = await sharp(thumbFile!.buffer).metadata();
    expect(thumbMeta.width).toBe(THUMBNAIL_DIMENSION_PX);
    expect(thumbMeta.height).toBe(THUMBNAIL_DIMENSION_PX);

    // Verify database record exists
    const dbAsset = await prisma.mediaAsset.findUnique({
      where: { id: result.mediaAssetId },
    });
    expect(dbAsset).not.toBeNull();
    expect(dbAsset?.tenantId).toBe(tenantId);
  });

  it('rejects image files with decompression bomb dimensions', async () => {
    // 5000 x 4000 = 20 MP (> 16MP limit)
    const hugeBuffer = await sharp({
      create: { width: 5000, height: 4000, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    await expect(processAndSavePhoto(hugeBuffer, tenantId)).rejects.toThrow(/safety limit|exceed/i);
  });
});
