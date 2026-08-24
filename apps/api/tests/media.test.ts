import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  validateAndProcessLogo,
  MediaValidationError,
  MAX_LOGO_FILE_SIZE_BYTES,
} from '../src/services/media.service.js';

describe('Phase 3: Secure Media Pipeline & Logo Processing', () => {
  it('successfully processes and sanitizes a valid PNG buffer', async () => {
    // Generate a valid 200x200 PNG with Sharp
    const rawPng = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 19, g: 78, b: 74, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await validateAndProcessLogo(rawPng);
    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.processedBuffer.length).toBeGreaterThan(0);

    const processedMeta = await sharp(result.processedBuffer).metadata();
    expect(processedMeta.width).toBe(200);
    expect(processedMeta.height).toBe(200);
    expect(processedMeta.format).toBe('png');
  });

  it('successfully processes and downscales oversized image buffers to <= 1024px', async () => {
    // Generate an oversized 2000x1200 image
    const largePng = await sharp({
      create: {
        width: 2000,
        height: 1200,
        channels: 4,
        background: { r: 15, g: 118, b: 110, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await validateAndProcessLogo(largePng);
    const meta = await sharp(result.processedBuffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(1024);
    expect(meta.height).toBeLessThanOrEqual(1024);
  });

  it('rejects malicious or invalid binaries with corrupted magic bytes', async () => {
    const fakeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00FakeExecutableHeader');
    await expect(validateAndProcessLogo(fakeBuffer)).rejects.toThrow(MediaValidationError);
  });

  it('rejects files larger than the 2MB size limit', async () => {
    // Create oversized dummy buffer
    const hugeBuffer = Buffer.alloc(MAX_LOGO_FILE_SIZE_BYTES + 1024);
    hugeBuffer[0] = 0x89;
    hugeBuffer[1] = 0x50;
    hugeBuffer[2] = 0x4e;
    hugeBuffer[3] = 0x47; // Fake PNG header

    await expect(validateAndProcessLogo(hugeBuffer)).rejects.toThrow(
      /exceeds maximum allowed size/,
    );
  });

  it('accepts safe SVG and rejects SVG with script tags', async () => {
    const safeSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>',
    );
    const safeResult = await validateAndProcessLogo(safeSvg);
    expect(safeResult.mimeType).toBe('image/svg+xml');

    const maliciousSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    await expect(validateAndProcessLogo(maliciousSvg)).rejects.toThrow(/insecure scripts/);
  });
});
