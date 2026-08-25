import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { ZipArchive } from 'archiver';

export const MAX_ZIP_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100 MB safety limit
export const MAX_ZIP_ENTRY_COUNT = 2000;
export const MAX_COMPRESSION_RATIO = 100; // 100:1 ratio ceiling

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.sh',
  '.cmd',
  '.ps1',
  '.vbs',
  '.js',
  '.mjs',
  '.cjs',
  '.py',
  '.elf',
  '.dll',
  '.com',
  '.scr',
  '.hta',
  '.msi',
]);

export class ZipSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipSecurityError';
  }
}

export interface ExtractedZipResult {
  csvFilePath: string | null;
  csvContent: string | null;
  imagesDirPath: string;
  extractedFiles: string[];
  totalBytes: number;
}

/**
 * Extracts and strictly validates a ZIP package against traversal, bombs, and executable payloads
 */
export async function extractAndValidateZip(
  zipBuffer: Buffer,
  destinationDir: string,
): Promise<ExtractedZipResult> {
  if (!zipBuffer || zipBuffer.length === 0) {
    throw new ZipSecurityError('Empty zip archive provided.');
  }

  // Magic bytes check for ZIP (PK\x03\x04 or PK\x05\x06 or PK\x07\x08)
  if (
    zipBuffer.length < 4 ||
    zipBuffer[0] !== 0x50 ||
    zipBuffer[1] !== 0x4b ||
    (zipBuffer[2] !== 0x03 && zipBuffer[2] !== 0x05 && zipBuffer[2] !== 0x07)
  ) {
    throw new ZipSecurityError('File is not a valid ZIP archive.');
  }

  await fs.mkdir(destinationDir, { recursive: true });
  const canonicalDestDir = path.resolve(destinationDir);

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err: any) {
    throw new ZipSecurityError(`Failed to parse ZIP archive: ${err.message}`);
  }

  const entries = zip.getEntries();
  if (entries.length > MAX_ZIP_ENTRY_COUNT) {
    throw new ZipSecurityError(
      `ZIP archive contains too many files (${entries.length}). Maximum allowed is ${MAX_ZIP_ENTRY_COUNT}.`,
    );
  }

  let totalUncompressedSize = 0;
  const extractedFiles: string[] = [];
  let csvFilePath: string | null = null;
  let csvContent: string | null = null;

  for (const entry of entries) {
    // Check uncompressed size & ratio
    const uncompressedSize = entry.header.size;
    const compressedSize = entry.header.compressedSize || 1;
    totalUncompressedSize += uncompressedSize;

    if (totalUncompressedSize > MAX_ZIP_UNCOMPRESSED_BYTES) {
      throw new ZipSecurityError(
        `ZIP bomb detected: Uncompressed size exceeds ${MAX_ZIP_UNCOMPRESSED_BYTES / (1024 * 1024)}MB safety limit.`,
      );
    }

    if (uncompressedSize > 1024 && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO) {
      throw new ZipSecurityError(
        `ZIP bomb detected: Entry '${entry.entryName}' exceeds ${MAX_COMPRESSION_RATIO}:1 compression ratio ceiling.`,
      );
    }

    // Path traversal defense
    const rawEntryName = entry.entryName;
    if (rawEntryName.includes('\0')) {
      throw new ZipSecurityError('Null byte detected in ZIP entry filename.');
    }

    if (
      rawEntryName.includes('..') ||
      path.isAbsolute(rawEntryName) ||
      rawEntryName.startsWith('/') ||
      rawEntryName.startsWith('\\')
    ) {
      throw new ZipSecurityError(
        `Directory traversal attack detected in ZIP entry '${rawEntryName}'.`,
      );
    }

    // Normalize and check for directory traversal
    const normalizedRelative = path.normalize(rawEntryName);
    const targetFilePath = path.resolve(canonicalDestDir, normalizedRelative);

    if (!targetFilePath.startsWith(canonicalDestDir)) {
      throw new ZipSecurityError(
        `Directory traversal attack detected in ZIP entry '${rawEntryName}'.`,
      );
    }

    if (entry.isDirectory) {
      await fs.mkdir(targetFilePath, { recursive: true });
      continue;
    }

    // Rejection of executable extensions
    const ext = path.extname(targetFilePath).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new ZipSecurityError(
        `Insecure executable content detected in ZIP entry '${rawEntryName}'. Files with extension '${ext}' are strictly forbidden.`,
      );
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(targetFilePath), { recursive: true });

    // Write file content safely
    const data = entry.getData();
    await fs.writeFile(targetFilePath, data);
    extractedFiles.push(normalizedRelative);

    // Identify primary CSV file (prefer workers.csv, or any root/first .csv)
    if (ext === '.csv') {
      if (!csvFilePath || normalizedRelative.toLowerCase().endsWith('workers.csv')) {
        csvFilePath = targetFilePath;
        csvContent = data.toString('utf8');
      }
    }
  }

  const imagesDirPath = path.join(canonicalDestDir, 'images');

  return {
    csvFilePath,
    csvContent,
    imagesDirPath,
    extractedFiles,
    totalBytes: totalUncompressedSize,
  };
}

export interface ExportArchiveEntry {
  type: 'buffer' | 'file';
  name: string;
  data?: Buffer | string;
  sourcePath?: string;
}

/**
 * Creates a streaming ZIP archive containing CSV, manifest, README, and relative images
 */
export async function createExportZipBundle(
  outputPath: string,
  entries: ExportArchiveEntry[],
): Promise<{ fileSizeBytes: number; checksumSha256: string }> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = new ZipArchive({
      zlib: { level: 9 }, // Maximum compression
    });

    const hash = crypto.createHash('sha256');
    let totalBytes = 0;

    output.on('close', () => {
      resolve({
        fileSizeBytes: totalBytes,
        checksumSha256: hash.digest('hex'),
      });
    });

    archive.on('data', (chunk: Buffer) => {
      hash.update(chunk);
      totalBytes += chunk.length;
    });

    archive.on('error', (err: any) => {
      reject(err);
    });

    archive.pipe(output);

    for (const entry of entries) {
      if (entry.type === 'buffer' && entry.data) {
        archive.append(entry.data, { name: entry.name });
      } else if (entry.type === 'file' && entry.sourcePath) {
        archive.file(entry.sourcePath, { name: entry.name });
      }
    }

    archive.finalize();
  });
}
