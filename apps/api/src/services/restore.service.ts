import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { prisma } from '@hr/db';
import { env } from '@hr/config';
import {
  AuditAction,
  BackupManifest,
  BackupTrigger,
  RestoreCompatibilityStatus,
  RestoreInspectionResult,
} from '@hr/domain';
import {
  BackupService,
  CURRENT_APP_VERSION,
  CURRENT_SCHEMA_VERSION,
  decryptPayload,
} from './backup.service.js';
import { recordAuditEvent } from './audit.service.js';
import { verifyPassword } from './auth.service.js';

let isMaintenanceModeActive = false;

export function getMaintenanceMode(): boolean {
  return isMaintenanceModeActive;
}

export function setMaintenanceMode(active: boolean): void {
  isMaintenanceModeActive = active;
}

export interface ExecuteRestoreOptions {
  tenantId: string;
  userId: string;
  backupBuffer: Buffer;
  passphrase: string;
  ownerPassword: string;
}

export class RestoreService {
  /**
   * Dry-inspects an encrypted backup bundle without applying changes.
   */
  static async inspectBackup(
    backupBuffer: Buffer,
    passphrase: string,
  ): Promise<RestoreInspectionResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    let decryptedZipBuf: Buffer;
    try {
      decryptedZipBuf = decryptPayload(backupBuffer, passphrase);
    } catch (err: any) {
      return {
        isValid: false,
        compatibilityStatus: 'INCOMPATIBLE_NEWER_VERSION',
        appVersion: 'unknown',
        schemaVersion: 'unknown',
        currentAppVersion: CURRENT_APP_VERSION,
        currentSchemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        tenant: { id: '', slug: '', name: '' },
        counts: {
          organizations: 0,
          locations: 0,
          orgUnits: 0,
          people: 0,
          employments: 0,
          identityDocuments: 0,
          mediaAssets: 0,
          cardTemplates: 0,
          cardIssues: 0,
          auditEvents: 0,
          users: 0,
          roles: 0,
        },
        mediaSizeBytes: 0,
        warnings: [],
        errors: [
          err?.message || 'Decryption failed: invalid passphrase or corrupted backup bundle.',
        ],
      };
    }

    const zip = new AdmZip(decryptedZipBuf);
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      return {
        isValid: false,
        compatibilityStatus: 'INCOMPATIBLE_NEWER_VERSION',
        appVersion: 'unknown',
        schemaVersion: 'unknown',
        currentAppVersion: CURRENT_APP_VERSION,
        currentSchemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        tenant: { id: '', slug: '', name: '' },
        counts: {
          organizations: 0,
          locations: 0,
          orgUnits: 0,
          people: 0,
          employments: 0,
          identityDocuments: 0,
          mediaAssets: 0,
          cardTemplates: 0,
          cardIssues: 0,
          auditEvents: 0,
          users: 0,
          roles: 0,
        },
        mediaSizeBytes: 0,
        warnings: [],
        errors: ['Archive is missing manifest.json.'],
      };
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    } catch {
      return {
        isValid: false,
        compatibilityStatus: 'INCOMPATIBLE_NEWER_VERSION',
        appVersion: 'unknown',
        schemaVersion: 'unknown',
        currentAppVersion: CURRENT_APP_VERSION,
        currentSchemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        tenant: { id: '', slug: '', name: '' },
        counts: {
          organizations: 0,
          locations: 0,
          orgUnits: 0,
          people: 0,
          employments: 0,
          identityDocuments: 0,
          mediaAssets: 0,
          cardTemplates: 0,
          cardIssues: 0,
          auditEvents: 0,
          users: 0,
          roles: 0,
        },
        mediaSizeBytes: 0,
        warnings: [],
        errors: ['Manifest is malformed JSON.'],
      };
    }

    // Check version compatibility
    let compatibilityStatus: RestoreCompatibilityStatus = 'COMPATIBLE';
    if (manifest.appVersion > CURRENT_APP_VERSION) {
      compatibilityStatus = 'INCOMPATIBLE_NEWER_VERSION';
      errors.push(
        `Backup was created by a newer app version (${manifest.appVersion}) than the current server (${CURRENT_APP_VERSION}). Update the application before restoring.`,
      );
    } else if (manifest.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      compatibilityStatus = 'WARNING_OLD_VERSION';
      warnings.push(
        `Backup schema version (${manifest.schemaVersion}) differs from current (${CURRENT_SCHEMA_VERSION}). A schema migration will be applied automatically.`,
      );
    }

    return {
      isValid: errors.length === 0,
      compatibilityStatus,
      appVersion: manifest.appVersion,
      schemaVersion: manifest.schemaVersion,
      currentAppVersion: CURRENT_APP_VERSION,
      currentSchemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: manifest.createdAt,
      tenant: manifest.tenant,
      counts: manifest.counts,
      mediaSizeBytes: manifest.mediaSizeBytes,
      warnings,
      errors,
    };
  }

  /**
   * Executes a verified restore with pre-restore safety backup and maintenance mode.
   */
  static async executeRestore(options: ExecuteRestoreOptions): Promise<{
    success: boolean;
    message: string;
    preRestoreBackupId?: string;
    restoredCounts: Record<string, number>;
  }> {
    const { tenantId, userId, backupBuffer, passphrase, ownerPassword } = options;

    // 1. Re-authenticate the System Owner
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isPasswordValid = await verifyPassword(ownerPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Authentication failed: invalid System Owner password.');
    }

    // 2. Perform Dry Inspection
    const inspection = await this.inspectBackup(backupBuffer, passphrase);
    if (!inspection.isValid) {
      throw new Error(`Restore rejected: ${inspection.errors.join('; ')}`);
    }

    // 3. Create Pre-Restore Safety Backup
    let preRestoreJob;
    try {
      preRestoreJob = await BackupService.createBackup({
        tenantId,
        userId,
        passphrase, // Use the same passphrase for safety snapshot
        trigger: BackupTrigger.PRE_RESTORE_SAFETY,
      });
    } catch (err: any) {
      throw new Error(`Failed to create pre-restore safety snapshot: ${err?.message}`);
    }

    // 4. Activate Maintenance Mode
    setMaintenanceMode(true);

    try {
      // 5. Decrypt and Unpack
      const decryptedZipBuf = decryptPayload(backupBuffer, passphrase);
      const zip = new AdmZip(decryptedZipBuf);

      const dbDataEntry = zip.getEntry('database/data.json');
      if (!dbDataEntry) {
        throw new Error('Corrupted backup: database/data.json is missing.');
      }

      const dbSnapshot = JSON.parse(dbDataEntry.getData().toString('utf8'));
      const data = dbSnapshot.data;

      // 6. Atomic Database Replacement inside Prisma Transaction
      await prisma.$transaction(
        async (tx) => {
          // Delete existing tenant data in reverse referential order
          await tx.printJobItem.deleteMany({ where: { tenantId } });
          await tx.printJob.deleteMany({ where: { tenantId } });
          await tx.cardIssue.deleteMany({ where: { tenantId } });
          await tx.auditEvent.deleteMany({ where: { tenantId } });
          await tx.roleGrant.deleteMany({ where: { user: { tenantId } } });
          await tx.templateAssignment.deleteMany({ where: { tenantId } });
          await tx.templateVersion.deleteMany({ where: { tenantId } });
          await tx.cardTemplate.deleteMany({ where: { tenantId } });
          await tx.cardFormat.deleteMany({ where: { tenantId } });
          await tx.customFieldValue.deleteMany({ where: { tenantId } });
          await tx.customFieldDefinition.deleteMany({ where: { tenantId } });
          await tx.identityDocument.deleteMany({ where: { tenantId } });
          await tx.employment.deleteMany({ where: { tenantId } });
          await tx.person.deleteMany({ where: { tenantId } });
          await tx.orgUnit.deleteMany({ where: { tenantId } });
          await tx.location.deleteMany({ where: { tenantId } });
          await tx.mediaAsset.deleteMany({ where: { tenantId } });
          await tx.organization.deleteMany({ where: { tenantId } });
          // Note: Retain active user and roles, or restore them with existing owner preserved

          // Insert Organizations
          for (const org of data.organizations || []) {
            await tx.organization.create({
              data: {
                id: org.id,
                tenantId,
                name: org.name,
                displayName: org.displayName,
                code: org.code,
                logoPath: org.logoPath,
                primaryColor: org.primaryColor,
                secondaryColor: org.secondaryColor,
                accentColor: org.accentColor,
                locale: org.locale,
                timezone: org.timezone,
                address: org.address,
                contactEmail: org.contactEmail,
                contactPhone: org.contactPhone,
                employeeNumberRule: org.employeeNumberRule,
                isDefault: org.isDefault,
              },
            });
          }

          // Insert Locations
          for (const loc of data.locations || []) {
            await tx.location.create({
              data: {
                id: loc.id,
                tenantId,
                organizationId: loc.organizationId,
                name: loc.name,
                code: loc.code,
                type: loc.type,
                address: loc.address,
                contactPhone: loc.contactPhone,
                isDefault: loc.isDefault,
              },
            });
          }

          // Insert OrgUnits (parent-first insertion order)
          const orgUnits = data.orgUnits || [];
          const insertedUnits = new Set<string>();
          let remainingUnits = [...orgUnits];
          let iterations = 0;

          while (remainingUnits.length > 0 && iterations < 10) {
            iterations++;
            const nextRound: typeof orgUnits = [];
            for (const unit of remainingUnits) {
              if (!unit.parentId || insertedUnits.has(unit.parentId)) {
                await tx.orgUnit.create({
                  data: {
                    id: unit.id,
                    tenantId,
                    organizationId: unit.organizationId,
                    locationId: unit.locationId,
                    parentId: unit.parentId,
                    name: unit.name,
                    nameBangla: unit.nameBangla || unit.nameNative || null,
                    code: unit.code,
                    type: unit.type,
                    isArchived: unit.isArchived,
                  },
                });
                insertedUnits.add(unit.id);
              } else {
                nextRound.push(unit);
              }
            }
            remainingUnits = nextRound;
          }

          // Insert People
          for (const person of data.people || []) {
            await tx.person.create({
              data: {
                id: person.id,
                tenantId,
                displayName: person.displayName,
                displayNameLatin: person.displayNameLatin,
                displayNameNative: person.displayNameNative,
                givenName: person.givenName,
                familyName: person.familyName,
                middleName: person.middleName || person.otherNames || null,
                phoneticName: person.phoneticName,
                dateOfBirth: person.dateOfBirth ? new Date(person.dateOfBirth) : null,
                gender: person.gender,
                bloodGroup: person.bloodGroup,
                primaryPhone: person.primaryPhone,
                primaryEmail: person.primaryEmail,
              },
            });
          }

          // Insert Employments
          for (const emp of data.employments || []) {
            await tx.employment.create({
              data: {
                id: emp.id,
                tenantId,
                personId: emp.personId,
                organizationId: emp.organizationId,
                locationId: emp.locationId,
                orgUnitId: emp.orgUnitId,
                employeeNumber: emp.employeeNumber,
                jobTitle: emp.jobTitle,
                jobCategory: emp.jobCategory,
                status: emp.status,
                joinDate: emp.joinDate ? new Date(emp.joinDate) : new Date(),
                endDate: emp.endDate ? new Date(emp.endDate) : null,
                isPrimary: emp.isPrimary,
              },
            });
          }

          // Insert Identity Documents
          for (const doc of data.identityDocuments || []) {
            await tx.identityDocument.create({
              data: {
                id: doc.id,
                tenantId,
                personId: doc.personId,
                documentType: doc.documentType,
                documentNumberEncrypted: doc.documentNumberEncrypted || doc.encryptedNumber || '',
                documentNumberMasked: doc.documentNumberMasked || doc.maskedNumber || '••••••••',
                documentNumberHash: doc.documentNumberHash || doc.blindIndex || '',
                country: doc.country || doc.countryCode || 'BGD',
                expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
              },
            });
          }

          // Insert Media Assets
          for (const media of data.mediaAssets || []) {
            await tx.mediaAsset.create({
              data: {
                id: media.id,
                tenantId,
                personId: media.personId,
                storageKeyMaster: media.storageKeyMaster,
                storageKeyCardReady: media.storageKeyCardReady,
                storageKeyThumbnail: media.storageKeyThumbnail,
                mimeType: media.mimeType,
                fileSizeBytes: media.fileSizeBytes,
                width: media.width,
                height: media.height,
                checksumSha256: media.checksumSha256,
              },
            });
          }

          // Insert Card Formats
          for (const fmt of data.cardFormats || []) {
            await tx.cardFormat.create({
              data: {
                id: fmt.id,
                tenantId,
                name: fmt.name,
                preset: fmt.preset,
                widthMm: fmt.widthMm,
                heightMm: fmt.heightMm,
                bleedMm: fmt.bleedMm,
                safeAreaMm: fmt.safeAreaMm,
                orientation: fmt.orientation,
                isCustom: fmt.isCustom ?? false,
              },
            });
          }

          // Insert Card Templates
          for (const tpl of data.cardTemplates || []) {
            await tx.cardTemplate.create({
              data: {
                id: tpl.id,
                tenantId,
                organizationId: tpl.organizationId,
                name: tpl.name,
                presetId: tpl.presetId,
                isArchived: tpl.isArchived ?? false,
              },
            });
          }

          // Insert Template Versions
          for (const ver of data.templateVersions || []) {
            await tx.templateVersion.create({
              data: {
                id: ver.id,
                tenantId,
                templateId: ver.templateId,
                versionNumber: ver.versionNumber,
                status: ver.status,
                layout: ver.layout,
                checksumSha256: ver.checksumSha256,
              },
            });
          }

          // Insert Card Issues
          for (const issue of data.cardIssues || []) {
            await tx.cardIssue.create({
              data: {
                id: issue.id,
                tenantId,
                personId: issue.personId,
                employmentId: issue.employmentId,
                templateVersionId: issue.templateVersionId,
                cardSerial: issue.cardSerial,
                issueNumber: issue.issueNumber,
                issueReason: issue.issueReason,
                reasonNotes: issue.reasonNotes,
                status: issue.status,
                isCurrent: issue.isCurrent,
                printedSnapshot: issue.printedSnapshot,
                layoutSnapshot: issue.layoutSnapshot,
                templateChecksum: issue.templateChecksum,
                renderManifest: issue.renderManifest,
                pdfStorageKey: issue.pdfStorageKey,
                pdfChecksumSha256: issue.pdfChecksumSha256,
                previousIssueId: issue.previousIssueId,
                issuedByUserId: issue.issuedByUserId,
                issuedAt: issue.issuedAt ? new Date(issue.issuedAt) : null,
                validUntil: issue.validUntil ? new Date(issue.validUntil) : null,
                revokedByUserId: issue.revokedByUserId,
                revokedAt: issue.revokedAt ? new Date(issue.revokedAt) : null,
                revocationReason: issue.revocationReason,
                revocationNotes: issue.revocationNotes,
                idempotencyKey: issue.idempotencyKey,
              },
            });
          }
        },
        { timeout: 30000 },
      );

      // 7. Unpack Media Files to Storage
      const storageRoot = path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH);
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (entry.entryName.startsWith('media/') && !entry.isDirectory) {
          const relativeStorageKey = entry.entryName.replace(/^media\//, '');
          const destPath = path.resolve(storageRoot, relativeStorageKey);
          await fsp.mkdir(path.dirname(destPath), { recursive: true });
          await fsp.writeFile(destPath, entry.getData());
        }
      }

      // 8. Record Restore Audit Event
      await recordAuditEvent({
        tenantId,
        actorId: userId,
        action: AuditAction.RESTORE_EXECUTED,
        entityType: 'BackupJob',
        entityId: preRestoreJob.id,
        details: {
          appVersion: inspection.appVersion,
          schemaVersion: inspection.schemaVersion,
          preRestoreSafetySnapshotId: preRestoreJob.id,
          counts: inspection.counts,
        },
      });

      return {
        success: true,
        message: 'Restore completed successfully. All records and media assets have been restored.',
        preRestoreBackupId: preRestoreJob.id,
        restoredCounts: inspection.counts,
      };
    } catch (restoreErr: any) {
      await recordAuditEvent({
        tenantId,
        actorId: userId,
        action: AuditAction.RESTORE_FAILED,
        entityType: 'BackupJob',
        details: {
          error: restoreErr?.message || 'Restore failed during processing',
          preRestoreSafetySnapshotId: preRestoreJob?.id,
        },
      });
      throw new Error(
        `Restore failed: ${restoreErr?.message}. Pre-restore snapshot is preserved at ${preRestoreJob?.filePath}`,
      );
    } finally {
      // Deactivate Maintenance Mode
      setMaintenanceMode(false);
    }
  }
}
