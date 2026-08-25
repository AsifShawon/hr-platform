import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import {
  extractAndValidateZip,
  createExportZipBundle,
  ZipSecurityError,
} from '../src/services/zip-archive.service.js';

describe('Phase 9: ZIP Package Security & Decompression Guardrails', () => {
  const testDir = path.resolve(process.cwd(), '../../storage/temp/test_zip_security');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('successfully extracts legitimate zip containing workers.csv and images/', async () => {
    const zip = new AdmZip();
    zip.addFile('workers.csv', Buffer.from('employeeNumber,displayName\nEMP-1,Test Worker\n'));
    zip.addFile(
      'images/EMP-1.webp',
      Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
    );
    const zipBuffer = zip.toBuffer();

    const destDir = path.join(testDir, 'valid_extract');
    const result = await extractAndValidateZip(zipBuffer, destDir);

    expect(result.csvContent).toContain('EMP-1,Test Worker');
    expect(result.extractedFiles).toContain('workers.csv');
    expect(result.extractedFiles).toContain(path.normalize('images/EMP-1.webp'));
  });

  it('rejects zip containing path traversal attempts (../../evil.txt)', async () => {
    const zip = new AdmZip();
    zip.addFile('evil.txt', Buffer.from('malicious payload'));
    const entries = zip.getEntries();
    if (entries[0]) entries[0].entryName = '../../evil.txt';
    const zipBuffer = zip.toBuffer();

    const destDir = path.join(testDir, 'traversal_extract');
    await expect(extractAndValidateZip(zipBuffer, destDir)).rejects.toThrow(
      /Directory traversal attack detected/,
    );
  });

  it('rejects zip containing blocked executable extensions (.exe, .sh, .bat)', async () => {
    const zip = new AdmZip();
    zip.addFile('run.exe', Buffer.from('binary'));
    const zipBuffer = zip.toBuffer();

    const destDir = path.join(testDir, 'exe_extract');
    await expect(extractAndValidateZip(zipBuffer, destDir)).rejects.toThrow(
      /Insecure executable content detected.*\.exe/,
    );
  });

  it('rejects non-zip files or corrupted archives', async () => {
    const fakeBuffer = Buffer.from('Not a zip file');
    const destDir = path.join(testDir, 'fake_extract');
    await expect(extractAndValidateZip(fakeBuffer, destDir)).rejects.toThrow(
      /File is not a valid ZIP archive/,
    );
  });

  it('creates streaming export zip bundle and validates SHA-256 digest', async () => {
    const outputPath = path.join(testDir, 'output_bundle.zip');
    const entries = [
      {
        type: 'buffer' as const,
        name: 'workers.csv',
        data: 'employeeNumber,displayName\nEMP-1001,Tanvir',
      },
      { type: 'buffer' as const, name: 'manifest.json', data: '{"version":"1.0.0"}' },
      { type: 'buffer' as const, name: 'README.txt', data: 'Export documentation' },
    ];

    const result = await createExportZipBundle(outputPath, entries);
    expect(result.fileSizeBytes).toBeGreaterThan(0);
    expect(result.checksumSha256).toHaveLength(64);

    // Verify extracted bundle contents
    const zipData = await fs.readFile(outputPath);
    const readZip = new AdmZip(zipData);
    const names = readZip.getEntries().map((e) => e.entryName);
    expect(names).toContain('workers.csv');
    expect(names).toContain('manifest.json');
    expect(names).toContain('README.txt');
  });
});
