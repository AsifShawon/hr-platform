import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@hr/db';
import { ExportJobStatus } from '@hr/domain';

const STORAGE_ROOT_IMPORTS = path.resolve(process.cwd(), '../../storage/temp/imports');
const STORAGE_ROOT_EXPORTS = path.resolve(process.cwd(), '../../storage/temp/exports');

export interface CleanupReport {
  expiredExportsCleaned: number;
  importDirectoriesPurged: number;
  errors: string[];
}

/**
 * Periodically purges expired export ZIP archives and temporary import staging folders older than 24 hours
 */
export async function purgeExpiredArtifacts(): Promise<CleanupReport> {
  const errors: string[] = [];
  let expiredExportsCleaned = 0;
  let importDirectoriesPurged = 0;
  const now = new Date();

  // 1. Purge Expired Export Jobs from Disk & DB
  try {
    const expiredJobs = await prisma.exportJob.findMany({
      where: {
        expiresAt: { lt: now },
        status: { not: ExportJobStatus.EXPIRED },
      },
    });

    for (const job of expiredJobs) {
      if (job.storageKeyZip) {
        const jobDir = path.join(STORAGE_ROOT_EXPORTS, job.id);
        try {
          await fs.rm(jobDir, { recursive: true, force: true });
        } catch (err: any) {
          errors.push(`Failed to remove export directory ${jobDir}: ${err.message}`);
        }
      }

      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: ExportJobStatus.EXPIRED },
      });
      expiredExportsCleaned++;
    }
  } catch (err: any) {
    errors.push(`Error querying expired export jobs: ${err.message}`);
  }

  // 2. Purge Temporary Import Directories Older than 24h
  try {
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oldImportJobs = await prisma.importJob.findMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    for (const job of oldImportJobs) {
      const jobDir = path.join(STORAGE_ROOT_IMPORTS, job.id);
      try {
        await fs.rm(jobDir, { recursive: true, force: true });
        importDirectoriesPurged++;
      } catch (err: any) {
        // Directory may already be removed
      }
    }
  } catch (err: any) {
    errors.push(`Error purging old import directories: ${err.message}`);
  }

  return {
    expiredExportsCleaned,
    importDirectoriesPurged,
    errors,
  };
}
