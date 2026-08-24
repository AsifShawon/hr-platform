import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import { CropCoordinatesInput, PhotoQualityReportDTO } from '@hr/schemas';
import { prisma } from '@hr/db';

export const MAX_PHOTO_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_INPUT_PIXELS = 16 * 1024 * 1024; // 16 Megapixels
export const MAX_MASTER_DIMENSION_PX = 1600;
export const CARD_READY_WIDTH_PX = 709; // 300 DPI for 60mm width
export const CARD_READY_HEIGHT_PX = 1063; // 300 DPI for 90mm height
export const THUMBNAIL_DIMENSION_PX = 150;

const STORAGE_ROOT = path.resolve(process.cwd(), '../../storage/uploads');
const PHOTOS_DIR = path.join(STORAGE_ROOT, 'photos');

export class PhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoValidationError';
  }
}

export interface PhotoProcessingResult {
  mediaAssetId: string;
  storageKeyMaster: string;
  storageKeyCardReady: string;
  storageKeyThumbnail: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  checksumSha256: string;
  qualityReport: PhotoQualityReportDTO;
}

/**
 * Validates image magic bytes
 */
export function detectImageFormat(buffer: Buffer): {
  format: 'png' | 'jpeg' | 'webp';
  mimeType: string;
} {
  if (!buffer || buffer.length < 8) {
    throw new PhotoValidationError('Invalid or empty image file buffer.');
  }

  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isJpeg =
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp =
    buffer.length >= 12 &&
    buffer.toString('utf8', 0, 4) === 'RIFF' &&
    buffer.toString('utf8', 8, 12) === 'WEBP';

  if (isPng) return { format: 'png', mimeType: 'image/png' };
  if (isJpeg) return { format: 'jpeg', mimeType: 'image/jpeg' };
  if (isWebp) return { format: 'webp', mimeType: 'image/webp' };

  throw new PhotoValidationError(
    'Unsupported or malicious image format. Only standard JPEG, PNG, and WebP images are permitted.',
  );
}

/**
 * Evaluates image quality heuristics without facial biometrics
 */
export async function evaluatePhotoQuality(
  imageBuffer: Buffer,
  metadata: Metadata,
): Promise<PhotoQualityReportDTO> {
  const warnings: string[] = [];
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // 1. Resolution Check
  if (width < 300 || height < 400) {
    warnings.push(
      'Low image resolution. Recommended minimum for physical card printing is 600x900px.',
    );
  }

  // 2. Aspect Ratio Check (Card aspect ratio is 60:90 = 2:3 = 0.667)
  const ratio = width / (height || 1);
  if (ratio > 1.2) {
    warnings.push('Landscape aspect ratio detected. Vertical portrait framing is recommended.');
  }

  // 3. Luminance / Lighting Calculation
  let averageLuminance = 128;
  try {
    const stats = await sharp(imageBuffer).stats();
    // Weighted standard luminance formula: 0.299 R + 0.587 G + 0.114 B
    const rMean = stats.channels[0]?.mean || 128;
    const gMean = stats.channels[1]?.mean || 128;
    const bMean = stats.channels[2]?.mean || 128;
    averageLuminance = Math.round(0.299 * rMean + 0.587 * gMean + 0.114 * bMean);

    if (averageLuminance < 35) {
      warnings.push('Photo appears significantly underexposed (too dark).');
    } else if (averageLuminance > 235) {
      warnings.push('Photo appears overexposed (washed out or too bright).');
    }
  } catch {
    // Quality evaluation is non-blocking
  }

  return {
    isAcceptable: warnings.length === 0,
    warnings,
    width,
    height,
    luminance: averageLuminance,
  };
}

/**
 * Validates, processes, strips EXIF, and generates card-ready derivatives
 */
export async function processAndSavePhoto(
  buffer: Buffer,
  tenantId: string,
  options?: {
    personId?: string;
    crop?: CropCoordinatesInput;
  },
): Promise<PhotoProcessingResult> {
  if (buffer.length > MAX_PHOTO_FILE_SIZE_BYTES) {
    throw new PhotoValidationError('File size exceeds the 10MB maximum limit.');
  }

  // Magic Byte Check
  detectImageFormat(buffer);

  // Parse Metadata & Guard Against Decompression Bombs
  let initialMeta: Metadata;
  try {
    initialMeta = await sharp(buffer).metadata();
  } catch (err: any) {
    throw new PhotoValidationError(`Malformed image file: ${err.message}`);
  }

  const rawWidth = initialMeta.width || 0;
  const rawHeight = initialMeta.height || 0;

  if (rawWidth * rawHeight > MAX_INPUT_PIXELS) {
    throw new PhotoValidationError('Image pixel dimensions exceed the 16 megapixel safety limit.');
  }

  // Auto-orient based on EXIF before stripping metadata
  let pipeline = sharp(buffer).rotate();

  // Apply Rotation if requested
  if (options?.crop?.rotation && [90, 180, 270].includes(options.crop.rotation)) {
    pipeline = pipeline.rotate(options.crop.rotation);
  }

  // Apply Crop if specified
  if (options?.crop) {
    const cropX = Math.max(0, Math.round(options.crop.x));
    const cropY = Math.max(0, Math.round(options.crop.y));
    const cropW = Math.max(50, Math.round(options.crop.width));
    const cropH = Math.max(50, Math.round(options.crop.height));

    pipeline = pipeline.extract({
      left: cropX,
      top: cropY,
      width: Math.min(cropW, rawWidth - cropX || cropW),
      height: Math.min(cropH, rawHeight - cropY || cropH),
    });
  }

  // 1. Generate Master Normalized Image (Max 1600px, sRGB, EXIF stripped, WebP quality 90)
  const masterBuffer = await pipeline
    .clone()
    .resize(MAX_MASTER_DIMENSION_PX, MAX_MASTER_DIMENSION_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toColourspace('srgb')
    .webp({ quality: 90 })
    .toBuffer();

  const masterMeta = await sharp(masterBuffer).metadata();
  const finalWidth = masterMeta.width || 0;
  const finalHeight = masterMeta.height || 0;

  // 2. Generate Card-Ready Derivative (Exact 709x1063 px @ 300 DPI for 60x90mm cards)
  const cardReadyBuffer = await sharp(masterBuffer)
    .resize(CARD_READY_WIDTH_PX, CARD_READY_HEIGHT_PX, {
      fit: 'cover',
      position: 'center',
    })
    .toColourspace('srgb')
    .webp({ quality: 92 })
    .toBuffer();

  // 3. Generate Fast Thumbnail Derivative (150x150 px square avatar)
  const thumbnailBuffer = await sharp(masterBuffer)
    .resize(THUMBNAIL_DIMENSION_PX, THUMBNAIL_DIMENSION_PX, {
      fit: 'cover',
      position: 'center',
    })
    .toColourspace('srgb')
    .webp({ quality: 80 })
    .toBuffer();

  // Non-blocking Quality Heuristics
  const qualityReport = await evaluatePhotoQuality(masterBuffer, masterMeta);

  // Compute Checksum
  const checksumSha256 = crypto.createHash('sha256').update(masterBuffer).digest('hex');

  // Prepare Tenant Storage Directory
  const tenantDir = path.join(PHOTOS_DIR, tenantId);
  await fs.mkdir(tenantDir, { recursive: true });

  const randomKey = crypto.randomUUID();
  const storageKeyMaster = path.join(tenantId, `${randomKey}_master.webp`);
  const storageKeyCardReady = path.join(tenantId, `${randomKey}_card.webp`);
  const storageKeyThumbnail = path.join(tenantId, `${randomKey}_thumb.webp`);

  await fs.writeFile(path.join(PHOTOS_DIR, storageKeyMaster), masterBuffer);
  await fs.writeFile(path.join(PHOTOS_DIR, storageKeyCardReady), cardReadyBuffer);
  await fs.writeFile(path.join(PHOTOS_DIR, storageKeyThumbnail), thumbnailBuffer);

  // Save MediaAsset Record in DB
  const mediaAsset = await prisma.mediaAsset.create({
    data: {
      tenantId,
      personId: options?.personId || null,
      storageKeyMaster,
      storageKeyCardReady,
      storageKeyThumbnail,
      mimeType: 'image/webp',
      fileSizeBytes: masterBuffer.length,
      width: finalWidth,
      height: finalHeight,
      checksumSha256,
    },
  });

  // If personId provided, link Person.photoMediaId
  if (options?.personId) {
    await prisma.person.update({
      where: { id: options.personId, tenantId },
      data: {
        photoMediaId: mediaAsset.id,
      },
    });
  }

  return {
    mediaAssetId: mediaAsset.id,
    storageKeyMaster,
    storageKeyCardReady,
    storageKeyThumbnail,
    mimeType: 'image/webp',
    fileSizeBytes: masterBuffer.length,
    width: finalWidth,
    height: finalHeight,
    checksumSha256,
    qualityReport,
  };
}

/**
 * Streams photo file securely from private storage
 */
export async function getPhotoBuffer(
  storageKey: string,
  tenantId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const sanitized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(PHOTOS_DIR, sanitized);

  // Tenant Boundary Isolation Check
  if (!filePath.startsWith(path.join(PHOTOS_DIR, tenantId))) {
    return null;
  }

  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, mimeType: 'image/webp' };
  } catch {
    return null;
  }
}
