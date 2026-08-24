import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_LOGO_DIMENSION_PX = 1024;
export const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

// Root storage directory outside public web root
const STORAGE_ROOT = path.resolve(process.cwd(), '../../storage/uploads');
const LOGOS_DIR = path.join(STORAGE_ROOT, 'logos');

export interface ProcessedMedia {
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
}

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

/**
 * Validate image buffer using magic bytes and Sharp parsing
 */
export async function validateAndProcessLogo(
  buffer: Buffer,
): Promise<{ processedBuffer: Buffer; mimeType: string; extension: string }> {
  if (!buffer || buffer.length === 0) {
    throw new MediaValidationError('No file data provided.');
  }

  if (buffer.length > MAX_LOGO_FILE_SIZE_BYTES) {
    throw new MediaValidationError(`File exceeds maximum allowed size of 2MB.`);
  }

  // Check magic bytes
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
  const isSvg = buffer.toString('utf8', 0, 100).toLowerCase().includes('<svg');

  if (!isPng && !isJpeg && !isWebp && !isSvg) {
    throw new MediaValidationError(
      'Unsupported or invalid image format. Only PNG, JPEG, WebP, and SVG are accepted.',
    );
  }

  if (isSvg) {
    // Basic SVG sanitization: reject script tags, event handlers, and external entities
    const svgText = buffer.toString('utf8');
    if (/<script[\s>]/i.test(svgText) || /on\w+=/i.test(svgText) || /<!ENTITY/i.test(svgText)) {
      throw new MediaValidationError('SVG file contains insecure scripts or entity declarations.');
    }
    return {
      processedBuffer: Buffer.from(svgText, 'utf8'),
      mimeType: 'image/svg+xml',
      extension: 'svg',
    };
  }

  // Raster image processing via Sharp: strip EXIF, resize if oversized, normalize to PNG or WebP
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new MediaValidationError('Invalid image dimensions.');
    }

    // Strip EXIF / metadata, auto-rotate based on orientation, and resize if exceeds max bounds
    let pipeline = sharp(buffer).rotate();

    if (metadata.width > MAX_LOGO_DIMENSION_PX || metadata.height > MAX_LOGO_DIMENSION_PX) {
      pipeline = pipeline.resize(MAX_LOGO_DIMENSION_PX, MAX_LOGO_DIMENSION_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to PNG for clean lossless storage with alpha transparency support
    const processedBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();

    return {
      processedBuffer,
      mimeType: 'image/png',
      extension: 'png',
    };
  } catch (err: any) {
    if (err instanceof MediaValidationError) throw err;
    throw new MediaValidationError(`Failed to process image: ${err.message}`);
  }
}

/**
 * Save processed logo to isolated private storage
 */
export async function saveLogo(buffer: Buffer, extension: string): Promise<string> {
  await fs.mkdir(LOGOS_DIR, { recursive: true });

  const randomId = crypto.randomUUID();
  const filename = `${randomId}.${extension}`;
  const filePath = path.join(LOGOS_DIR, filename);

  await fs.writeFile(filePath, buffer);
  return filename;
}

/**
 * Read logo from private storage
 */
export async function getLogoFile(
  filename: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  // Prevent directory traversal attacks
  const sanitized = path.basename(filename);
  const filePath = path.join(LOGOS_DIR, sanitized);

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(sanitized).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';

    return { buffer, mimeType };
  } catch {
    return null;
  }
}
