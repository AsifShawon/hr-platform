import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { prisma } from '@hr/db';
import { env } from '@hr/config';
import {
  AuditAction,
  BackupJobRecord,
  BackupManifest,
  BackupScheduleRecord,
  BackupStatus,
  BackupTrigger,
} from '@hr/domain';
import { recordAuditEvent } from './audit.service.js';

export const BACKUP_MAGIC_BYTES = Buffer.from('HRBK', 'utf8'); // 4 bytes
export const BACKUP_HEADER_VERSION = 1; // 2 bytes UInt16BE
export const BACKUP_KDF_PBKDF2 = 1; // 1 byte
export const BACKUP_HEADER_SIZE = 64; // Total 64 bytes
export const CURRENT_APP_VERSION = '0.1.0';
export const CURRENT_SCHEMA_VERSION = '20260825100000_add_backup_and_recovery';

export interface CreateBackupOptions {
  tenantId: string;
  userId?: string;
  passphrase: string;
  targetDirectory?: string;
  trigger?: BackupTrigger;
}

export interface EncryptedHeaderInfo {
  magic: string;
  version: number;
  kdfType: number;
  salt: Buffer;
  iv: Buffer;
}

/**
 * Derives a 256-bit AES key from a passphrase and salt using PBKDF2-HMAC-SHA256 (100,000 iterations).
 */
export function deriveKeyFromPassphrase(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
}

/**
 * Builds the 64-byte unencrypted binary header for .hrbackup container files.
 */
export function buildBackupHeader(salt: Buffer, iv: Buffer): Buffer {
  const header = Buffer.alloc(BACKUP_HEADER_SIZE);
  BACKUP_MAGIC_BYTES.copy(header, 0); // 0..3: "HRBK"
  header.writeUInt16BE(BACKUP_HEADER_VERSION, 4); // 4..5: version 1
  header.writeUInt8(BACKUP_KDF_PBKDF2, 6); // 6: KDF type (1 = PBKDF2)
  salt.copy(header, 7, 0, 32); // 7..38: 32 bytes salt
  iv.copy(header, 39, 0, 12); // 39..50: 12 bytes IV
  // 51..63: 13 reserved zero bytes
  return header;
}

/**
 * Parses and validates the 64-byte unencrypted binary header.
 */
export function parseBackupHeader(headerBuffer: Buffer): EncryptedHeaderInfo {
  if (headerBuffer.length < BACKUP_HEADER_SIZE) {
    throw new Error('Invalid backup file: header is smaller than 64 bytes.');
  }

  const magic = headerBuffer.subarray(0, 4);
  if (!magic.equals(BACKUP_MAGIC_BYTES)) {
    throw new Error('Invalid backup file: unrecognized magic bytes (expected HRBK).');
  }

  const version = headerBuffer.readUInt16BE(4);
  if (version > BACKUP_HEADER_VERSION) {
    throw new Error(
      `Unsupported backup bundle version (${version}). Please update the application.`,
    );
  }

  const kdfType = headerBuffer.readUInt8(6);
  const salt = Buffer.from(headerBuffer.subarray(7, 39));
  const iv = Buffer.from(headerBuffer.subarray(39, 51));

  return {
    magic: magic.toString('utf8'),
    version,
    kdfType,
    salt,
    iv,
  };
}

/**
 * Encrypts an unencrypted zip buffer into a .hrbackup envelope.
 * Structure: [64-byte Header] + [Ciphertext] + [16-byte Auth Tag]
 */
export function encryptPayload(plainZipBuffer: Buffer, passphrase: string): Buffer {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const key = deriveKeyFromPassphrase(passphrase, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encryptedPayload = Buffer.concat([cipher.update(plainZipBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  const header = buildBackupHeader(salt, iv);
  return Buffer.concat([header, encryptedPayload, authTag]);
}

/**
 * Decrypts a .hrbackup envelope into the unencrypted zip buffer.
 */
export function decryptPayload(encryptedBundle: Buffer, passphrase: string): Buffer {
  if (encryptedBundle.length < BACKUP_HEADER_SIZE + 16) {
    throw new Error('Corrupted or truncated backup file (too small for valid envelope).');
  }

  const headerBuffer = encryptedBundle.subarray(0, BACKUP_HEADER_SIZE);
  const headerInfo = parseBackupHeader(headerBuffer);

  const authTag = encryptedBundle.subarray(encryptedBundle.length - 16);
  const ciphertext = encryptedBundle.subarray(BACKUP_HEADER_SIZE, encryptedBundle.length - 16);

  const key = deriveKeyFromPassphrase(passphrase, headerInfo.salt);

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, headerInfo.iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err: any) {
    throw new Error(
      'Failed to decrypt backup: incorrect passphrase or tampered/corrupted backup bundle.',
    );
  }
}

/**
 * Backup Service for creating, verifying, scheduling, and retaining encrypted backups.
 */
export class BackupService {
  /**
   * Creates a full encrypted backup bundle for a tenant.
   */
  static async createBackup(options: CreateBackupOptions): Promise<BackupJobRecord> {
    const startTime = Date.now();
    const { tenantId, userId, passphrase, trigger = BackupTrigger.MANUAL } = options;

    if (!passphrase || passphrase.length < 10) {
      throw new Error('Backup encryption passphrase must be at least 10 characters long.');
    }

    // 1. Resolve Target Directory
    let targetDir = options.targetDirectory;
    if (!targetDir) {
      const schedule = await prisma.backupSchedule.findUnique({ where: { tenantId } });
      targetDir = schedule?.targetDirectory || './backups';
    }

    const resolvedTargetDir = path.resolve(process.cwd(), targetDir);
    await fsp.mkdir(resolvedTargetDir, { recursive: true });

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${tenant.slug}-${timestamp}.hrbackup`;
    const filePath = path.join(resolvedTargetDir, fileName);

    // 2. Initialize BackupJob in database
    const backupJob = await prisma.backupJob.create({
      data: {
        tenantId,
        status: BackupStatus.RUNNING,
        trigger,
        fileName,
        filePath,
        appVersion: CURRENT_APP_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdByUserId: userId,
      },
    });

    try {
      // 3. Export all tenant records in referential order
      const [
        organizations,
        locations,
        orgUnits,
        people,
        employments,
        identityDocuments,
        mediaAssets,
        customFieldDefinitions,
        customFieldValues,
        cardFormats,
        cardTemplates,
        templateVersions,
        templateAssignments,
        users,
        roles,
        roleGrants,
        auditEvents,
        systemInstallation,
      ] = await Promise.all([
        prisma.organization.findMany({ where: { tenantId } }),
        prisma.location.findMany({ where: { tenantId } }),
        prisma.orgUnit.findMany({ where: { tenantId } }),
        prisma.person.findMany({ where: { tenantId } }),
        prisma.employment.findMany({ where: { tenantId } }),
        prisma.identityDocument.findMany({ where: { tenantId } }),
        prisma.mediaAsset.findMany({ where: { tenantId } }),
        prisma.customFieldDefinition.findMany({ where: { tenantId } }),
        prisma.customFieldValue.findMany({ where: { tenantId } }),
        prisma.cardFormat.findMany({ where: { tenantId } }),
        prisma.cardTemplate.findMany({ where: { tenantId } }),
        prisma.templateVersion.findMany({ where: { tenantId } }),
        prisma.templateAssignment.findMany({ where: { tenantId } }),
        prisma.user.findMany({ where: { tenantId } }),
        prisma.role.findMany({ where: { tenantId } }),
        prisma.roleGrant.findMany({ where: { user: { tenantId } } }),
        prisma.auditEvent.findMany({ where: { tenantId } }),
        prisma.systemInstallation.findFirst(),
      ]);

      const databaseSnapshot = {
        exportedAt: new Date().toISOString(),
        tenant,
        systemInstallation: systemInstallation
          ? {
              isActivated: systemInstallation.isActivated,
              deploymentMode: systemInstallation.deploymentMode,
              lanEnabled: systemInstallation.lanEnabled,
            }
          : null,
        data: {
          organizations,
          locations,
          orgUnits,
          people,
          employments,
          identityDocuments,
          mediaAssets,
          customFieldDefinitions,
          customFieldValues,
          cardFormats,
          cardTemplates,
          templateVersions,
          templateAssignments,
          users,
          roles,
          roleGrants,
          auditEvents,
        },
      };

      const totalRecords =
        organizations.length +
        locations.length +
        orgUnits.length +
        people.length +
        employments.length +
        identityDocuments.length +
        mediaAssets.length +
        cardTemplates.length +
        users.length +
        roles.length +
        auditEvents.length;

      // 4. Assemble In-Memory Zip Archive
      const zip = new AdmZip();
      const checksums: Record<string, string> = {};

      // A. Database data.json
      const dbDataBuffer = Buffer.from(JSON.stringify(databaseSnapshot, null, 2), 'utf8');
      zip.addFile('database/data.json', dbDataBuffer);
      checksums['database/data.json'] = crypto
        .createHash('sha256')
        .update(dbDataBuffer)
        .digest('hex');

      // B. System config/settings.json (no runtime secrets!)
      const configSnapshot = {
        appVersion: CURRENT_APP_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        defaultLocale: env.DEFAULT_LOCALE,
        storageDriver: env.STORAGE_DRIVER,
        defaultCardDimensions: {
          widthMm: env.DEFAULT_CARD_WIDTH_MM,
          heightMm: env.DEFAULT_CARD_HEIGHT_MM,
        },
      };
      const configBuffer = Buffer.from(JSON.stringify(configSnapshot, null, 2), 'utf8');
      zip.addFile('config/settings.json', configBuffer);
      checksums['config/settings.json'] = crypto
        .createHash('sha256')
        .update(configBuffer)
        .digest('hex');

      // C. Media Assets (worker photos, logos)
      let totalMediaSizeBytes = 0;
      let totalMediaFiles = 0;
      const storageRoot = path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH);

      for (const asset of mediaAssets) {
        const keysToInclude = [
          asset.storageKeyMaster,
          asset.storageKeyCardReady,
          asset.storageKeyThumbnail,
        ].filter(Boolean) as string[];

        for (const key of keysToInclude) {
          const absPath = path.resolve(storageRoot, key);
          try {
            if (fs.existsSync(absPath)) {
              const fileBuf = await fsp.readFile(absPath);
              const zipPath = `media/${key.replace(/\\/g, '/')}`;
              zip.addFile(zipPath, fileBuf);
              checksums[zipPath] = crypto.createHash('sha256').update(fileBuf).digest('hex');
              totalMediaSizeBytes += fileBuf.length;
              totalMediaFiles++;
            }
          } catch {
            // Non-fatal if a specific cached derivative is missing
          }
        }
      }

      // D. Manifest
      const manifest: BackupManifest = {
        bundleVersion: 1,
        appVersion: CURRENT_APP_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
        counts: {
          organizations: organizations.length,
          locations: locations.length,
          orgUnits: orgUnits.length,
          people: people.length,
          employments: employments.length,
          identityDocuments: identityDocuments.length,
          mediaAssets: mediaAssets.length,
          cardTemplates: cardTemplates.length,
          cardIssues: 0,
          auditEvents: auditEvents.length,
          users: users.length,
          roles: roles.length,
        },
        mediaSizeBytes: totalMediaSizeBytes,
        checksums,
      };

      const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
      zip.addFile('manifest.json', manifestBuf);

      // 5. Encrypt Zip Payload into .hrbackup Envelope
      const plainZipBuffer = zip.toBuffer();
      const encryptedBundle = encryptPayload(plainZipBuffer, passphrase);
      const checksumSha256 = crypto.createHash('sha256').update(encryptedBundle).digest('hex');

      // 6. Write to Target File
      await fsp.writeFile(filePath, encryptedBundle);
      const fileSizeBytes = encryptedBundle.length;

      // 7. Post-Creation Self-Verification
      await this.verifyBackupFile(filePath, passphrase);

      const durationMs = Date.now() - startTime;

      // 8. Update BackupJob Status to COMPLETED
      const updatedJob = await prisma.backupJob.update({
        where: { id: backupJob.id },
        data: {
          status: BackupStatus.COMPLETED,
          fileSizeBytes,
          checksumSha256,
          totalRecords,
          totalMediaFiles,
          isVerified: true,
          verifiedAt: new Date(),
          durationMs,
        },
      });

      // 9. Record Immutable Audit Event
      await recordAuditEvent({
        tenantId,
        actorId: userId,
        action: AuditAction.BACKUP_CREATED,
        entityType: 'BackupJob',
        entityId: backupJob.id,
        details: {
          fileName,
          fileSizeBytes,
          totalRecords,
          totalMediaFiles,
          trigger,
          durationMs,
        },
      });

      // 10. Run Retention Pruning
      await this.pruneOldBackups(tenantId, resolvedTargetDir);

      return updatedJob as unknown as BackupJobRecord;
    } catch (err: any) {
      await prisma.backupJob.update({
        where: { id: backupJob.id },
        data: {
          status: BackupStatus.FAILED,
          errorMessage: err?.message || 'Backup creation failed',
        },
      });
      throw err;
    }
  }

  /**
   * Verifies an encrypted backup bundle by decrypting the header, verifying auth tag, and checking manifest digests.
   */
  static async verifyBackupFile(
    filePath: string,
    passphrase: string,
  ): Promise<{ isValid: boolean; manifest: BackupManifest }> {
    const fileBuf = await fsp.readFile(filePath);
    const decryptedZipBuf = decryptPayload(fileBuf, passphrase);

    const zip = new AdmZip(decryptedZipBuf);
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      throw new Error('Invalid backup archive: missing manifest.json.');
    }

    const manifest: BackupManifest = JSON.parse(manifestEntry.getData().toString('utf8'));

    // Verify all checksums recorded in the manifest
    for (const [relativePath, expectedChecksum] of Object.entries(manifest.checksums)) {
      const entry = zip.getEntry(relativePath);
      if (!entry) {
        throw new Error(`Backup integrity check failed: missing internal file ${relativePath}.`);
      }
      const actualChecksum = crypto.createHash('sha256').update(entry.getData()).digest('hex');
      if (actualChecksum !== expectedChecksum) {
        throw new Error(`Backup integrity check failed: checksum mismatch for ${relativePath}.`);
      }
    }

    return { isValid: true, manifest };
  }

  /**
   * Prunes older backups according to the tenant's retention policy.
   */
  static async pruneOldBackups(tenantId: string, targetDir: string): Promise<number> {
    const schedule = await prisma.backupSchedule.findUnique({ where: { tenantId } });
    const retentionCount = schedule?.retentionCount ?? 7;

    const completedBackups = await prisma.backupJob.findMany({
      where: {
        tenantId,
        status: BackupStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (completedBackups.length <= retentionCount) {
      return 0;
    }

    const toDelete = completedBackups.slice(retentionCount);
    let deletedCount = 0;

    for (const job of toDelete) {
      try {
        if (fs.existsSync(job.filePath)) {
          await fsp.unlink(job.filePath);
        }
        await prisma.backupJob.delete({ where: { id: job.id } });
        deletedCount++;
      } catch {
        // Continue cleaning remaining items
      }
    }

    return deletedCount;
  }

  /**
   * Checks if a target backup directory is on the same path/volume as active storage and returns warnings.
   */
  static evaluateStorageSafety(targetDirectory: string): { isExternal: boolean; warning?: string } {
    const resolvedTarget = path.resolve(process.cwd(), targetDirectory);
    const resolvedUploads = path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH);

    const isInsideActiveData =
      resolvedTarget.startsWith(resolvedUploads) || resolvedTarget === process.cwd();

    return {
      isExternal: !isInsideActiveData,
      warning: isInsideActiveData
        ? 'Warning: The backup directory is located within the active application data directory. Storing backups on an external drive or dedicated NAS volume is strongly recommended.'
        : undefined,
    };
  }
}
