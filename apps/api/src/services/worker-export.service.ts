import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '@hr/db';
import { ExportJobStatus, ExportManifest, AuditAction, Permission } from '@hr/domain';
import { serializeCsv } from './csv-parser.service.js';
import { createExportZipBundle, ExportArchiveEntry } from './zip-archive.service.js';
import { getPhotoBuffer } from './photo-processing.service.js';
import { decryptSensitiveValue, maskSensitiveIdentifier } from './crypto.service.js';
import { recordAuditEvent } from './audit.service.js';

const STORAGE_ROOT = path.resolve(process.cwd(), '../../storage/temp/exports');
const EXPORT_EXPIRY_HOURS = 24;
const DOWNLOAD_TOKEN_EXPIRY_HOURS = 1;

export class ExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportValidationError';
  }
}

export interface ExportWorkersOptions {
  organizationId?: string;
  locationId?: string;
  orgUnitId?: string;
  status?: string;
  jobCategory?: string;
  includedFields: string[];
  includeSensitive: boolean;
}

/**
 * Executes portable export generation: queries database, builds CSV, copies photos, generates manifest & README
 */
export async function executeWorkerExport(
  tenantId: string,
  userId: string,
  userPermissions: string[],
  options: ExportWorkersOptions,
): Promise<{
  exportJobId: string;
  status: ExportJobStatus;
  downloadToken: string;
  downloadUrl: string;
  totalWorkers: number;
  totalImages: number;
  fileSizeBytes: number;
  checksumSha256: string;
}> {
  if (options.includeSensitive && !userPermissions.includes(Permission.IDENTITY_REVEAL)) {
    throw new ExportValidationError(
      "Unauthorized: Exporting sensitive identity documents requires the 'identity.reveal' permission.",
    );
  }

  const exportJobId = crypto.randomUUID();
  const jobDir = path.join(STORAGE_ROOT, exportJobId);
  await fs.mkdir(jobDir, { recursive: true });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000);
  const downloadTokenExpires = new Date(
    now.getTime() + DOWNLOAD_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );
  const downloadToken = crypto.randomBytes(32).toString('hex');

  // Build query filter
  const where: any = { tenantId };
  if (options.organizationId) where.organizationId = options.organizationId;
  if (options.locationId) where.locationId = options.locationId;
  if (options.orgUnitId) where.orgUnitId = options.orgUnitId;
  if (options.status) where.status = options.status;
  if (options.jobCategory) where.jobCategory = options.jobCategory;

  const employments = await prisma.employment.findMany({
    where,
    include: {
      person: {
        include: {
          identityDocuments: true,
          photoMedia: true,
        },
      },
      organization: true,
      location: true,
      orgUnit: true,
    },
    orderBy: { employeeNumber: 'asc' },
  });

  const orgInfo =
    employments[0]?.organization ||
    (options.organizationId
      ? await prisma.organization.findUnique({ where: { id: options.organizationId } })
      : null);

  const csvRows: Array<Record<string, unknown>> = [];
  const archiveEntries: ExportArchiveEntry[] = [];
  const imageChecksums: Record<string, string> = {};
  let imageCount = 0;

  for (const emp of employments) {
    const person = emp.person;
    const row: Record<string, unknown> = {};

    let photoFileRelative = '';
    if (person.photoMedia?.storageKeyCardReady || person.photoMedia?.storageKeyMaster) {
      const storageKey =
        person.photoMedia.storageKeyCardReady || person.photoMedia.storageKeyMaster;
      const photoResult = await getPhotoBuffer(storageKey, tenantId);
      if (photoResult) {
        const photoFilename = `EMP-${emp.employeeNumber}.webp`;
        photoFileRelative = `images/${photoFilename}`;
        archiveEntries.push({
          type: 'buffer',
          name: photoFileRelative,
          data: photoResult.buffer,
        });
        const photoHash = crypto.createHash('sha256').update(photoResult.buffer).digest('hex');
        imageChecksums[photoFileRelative] = photoHash;
        imageCount++;
      }
    }

    // Map selected fields
    const fieldMap: Record<string, unknown> = {
      employeeNumber: emp.employeeNumber,
      displayName: person.displayName,
      displayNameLatin: person.displayNameLatin || '',
      displayNameNative: person.displayNameNative || '',
      givenName: person.givenName || '',
      familyName: person.familyName || '',
      middleName: person.middleName || '',
      phoneticName: person.phoneticName || '',
      jobTitle: emp.jobTitle,
      jobCategory: emp.jobCategory,
      joinDate: emp.joinDate.toISOString().split('T')[0],
      endDate: emp.endDate ? emp.endDate.toISOString().split('T')[0] : '',
      status: emp.status,
      organizationName: emp.organization?.name || '',
      organizationCode: emp.organization?.code || '',
      locationName: emp.location?.name || '',
      locationCode: emp.location?.code || '',
      orgUnitName: emp.orgUnit?.name || '',
      orgUnitCode: emp.orgUnit?.code || '',
      gender: person.gender,
      bloodGroup: person.bloodGroup || '',
      primaryPhone: person.primaryPhone || '',
      primaryEmail: person.primaryEmail || '',
      photoFile: photoFileRelative,
    };

    // Sensitive field handling
    if (options.includeSensitive) {
      row.dateOfBirth = person.dateOfBirth ? person.dateOfBirth.toISOString().split('T')[0] : '';
      if (person.identityDocuments && person.identityDocuments.length > 0) {
        const doc = person.identityDocuments[0]!;
        row.identityDocumentType = doc.documentType;
        row.identityDocumentNumber = decryptSensitiveValue(doc.documentNumberEncrypted);
      } else {
        row.identityDocumentType = '';
        row.identityDocumentNumber = '';
      }
    } else {
      if (options.includedFields.includes('dateOfBirth')) {
        // Return masked year only if non-sensitive export
        row.dateOfBirth = person.dateOfBirth ? `${person.dateOfBirth.getFullYear()}-••-••` : '';
      }
      if (
        options.includedFields.includes('identityDocumentNumber') &&
        person.identityDocuments?.[0]
      ) {
        row.identityDocumentNumber = person.identityDocuments[0].documentNumberMasked;
      }
    }

    for (const field of options.includedFields) {
      if (row[field] !== undefined) {
        // already assigned by sensitive check
      } else {
        row[field] = fieldMap[field] ?? '';
      }
    }

    csvRows.push(row);
  }

  // 1. Generate workers.csv
  const csvColumns = options.includedFields.map((f) => ({ key: f, label: f }));
  const csvContent = serializeCsv(csvRows, csvColumns, { includeUtf8Bom: true });
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const csvSha256 = crypto.createHash('sha256').update(csvBuffer).digest('hex');

  archiveEntries.unshift({
    type: 'buffer',
    name: 'workers.csv',
    data: csvBuffer,
  });

  // 2. Generate manifest.json
  const manifest: ExportManifest = {
    schemaVersion: '1.0.0',
    exportVersion: '1.0.0',
    generatedAt: now.toISOString(),
    appVersion: '0.1.0',
    tenantId,
    organization: orgInfo
      ? {
          id: orgInfo.id,
          name: orgInfo.name,
          code: orgInfo.code,
        }
      : undefined,
    counts: {
      totalWorkers: employments.length,
      totalImages: imageCount,
      totalIdentityDocuments: options.includeSensitive
        ? employments.filter((e) => e.person.identityDocuments.length > 0).length
        : 0,
    },
    locale: 'en-US',
    timezone: 'Asia/Dhaka',
    includedFields: options.includedFields,
    sensitiveFieldsIncluded: options.includeSensitive,
    checksums: {
      'workers.csv': csvSha256,
      ...imageChecksums,
    },
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  archiveEntries.push({
    type: 'buffer',
    name: 'manifest.json',
    data: Buffer.from(manifestJson, 'utf8'),
  });

  // 3. Generate README.txt
  const readmeText = `================================================================================
HR Platform Portable Worker Export Package
================================================================================
Generated: ${now.toUTCString()}
Organization: ${orgInfo?.name || 'All Organizations'} (${orgInfo?.code || 'N/A'})
Total Workers: ${employments.length}
Total Photos: ${imageCount}
Sensitive Fields Included: ${options.includeSensitive ? 'YES (Privileged Reveal)' : 'NO (Masked / Excluded)'}

PACKAGE CONTENTS:
-----------------
1. workers.csv     - UTF-8 CSV containing exported worker records and metadata.
2. images/         - Directory containing employee portrait photos referenced by 'photoFile'.
3. manifest.json   - Machine-readable export provenance, schema version, and SHA-256 checksums.
4. README.txt      - This documentation file.

CSV FORMAT & ENCODING:
----------------------
- Character Encoding: UTF-8 with Byte Order Mark (BOM) for seamless Excel compatibility.
- Date Format: ISO 8601 (YYYY-MM-DD).
- CSV Injection Protection: Cell values starting with dangerous formula characters
  (=, +, -, @) have been neutralized with an escaping single quote.

RE-IMPORTING:
-------------
To re-import this data into the HR Platform, upload this complete ZIP file directly
via the 'Import & Export' -> 'Worker Import' studio. The platform will automatically
extract the CSV, link relative photos, and validate integrity checksums.
================================================================================
`;

  archiveEntries.push({
    type: 'buffer',
    name: 'README.txt',
    data: Buffer.from(readmeText, 'utf8'),
  });

  // 4. Build streaming ZIP bundle
  const storageKeyZip = path.join(exportJobId, 'workers_export.zip');
  const zipOutputPath = path.join(STORAGE_ROOT, storageKeyZip);

  const { fileSizeBytes, checksumSha256 } = await createExportZipBundle(
    zipOutputPath,
    archiveEntries,
  );

  // 5. Persist ExportJob in DB
  await prisma.exportJob.create({
    data: {
      id: exportJobId,
      tenantId,
      organizationId: options.organizationId || null,
      status: ExportJobStatus.COMPLETED,
      totalWorkers: employments.length,
      totalImages: imageCount,
      fileSizeBytes,
      storageKeyZip,
      checksumSha256,
      downloadToken,
      downloadTokenExpires,
      filterCriteria: options as any,
      includedFields: options.includedFields as any,
      includeSensitive: options.includeSensitive,
      manifestSnapshot: manifest as any,
      expiresAt,
      createdByUserId: userId,
    },
  });

  // 6. Record Audit Event
  await recordAuditEvent({
    tenantId,
    actorId: userId,
    action: AuditAction.DATA_EXPORTED,
    entityType: 'export_job',
    entityId: exportJobId,
    details: {
      totalWorkers: employments.length,
      totalImages: imageCount,
      includeSensitive: options.includeSensitive,
      includedFields: options.includedFields,
    },
  });

  return {
    exportJobId,
    status: ExportJobStatus.COMPLETED,
    downloadToken,
    downloadUrl: `/api/exports/download/${downloadToken}`,
    totalWorkers: employments.length,
    totalImages: imageCount,
    fileSizeBytes,
    checksumSha256,
  };
}

/**
 * Retrieves the exported ZIP file buffer given a valid download token
 */
export async function getExportDownloadStream(
  downloadToken: string,
): Promise<{
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  tenantId: string;
  jobId: string;
}> {
  const job = await prisma.exportJob.findUnique({
    where: { downloadToken },
  });

  if (!job || !job.storageKeyZip) {
    throw new ExportValidationError('Invalid or expired export download token.');
  }

  const now = new Date();
  if (job.downloadTokenExpires && job.downloadTokenExpires < now) {
    throw new ExportValidationError('Export download link has expired.');
  }

  if (job.expiresAt < now) {
    throw new ExportValidationError('Export file has been purged according to retention policy.');
  }

  const fullPath = path.join(STORAGE_ROOT, job.storageKeyZip);
  try {
    await fs.access(fullPath);
  } catch {
    throw new ExportValidationError('Export file not found on disk.');
  }

  // Increment download count
  await prisma.exportJob.update({
    where: { id: job.id },
    data: { downloadCount: { increment: 1 } },
  });

  const timestampStr = now.toISOString().split('T')[0];
  return {
    filePath: fullPath,
    fileName: `workers_export_${timestampStr}.zip`,
    fileSizeBytes: job.fileSizeBytes || 0,
    mimeType: 'application/zip',
    tenantId: job.tenantId,
    jobId: job.id,
  };
}
