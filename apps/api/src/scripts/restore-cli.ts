import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@hr/db';
import { RestoreService } from '../services/restore.service.js';

async function main() {
  const args = process.argv.slice(2);
  let filePath = '';
  let passphrase = '';
  let ownerUsername = '';
  let ownerPassword = '';

  for (let i = 0; i < args.length; i++) {
    const current = args[i];
    const next = args[i + 1] ?? '';
    if (current === '--file' && next) {
      filePath = next;
      i++;
    } else if (current === '--passphrase' && next) {
      passphrase = next;
      i++;
    } else if (current === '--user' && next) {
      ownerUsername = next;
      i++;
    } else if (current === '--password' && next) {
      ownerPassword = next;
      i++;
    }
  }

  if (!filePath || !passphrase) {
    console.error(
      '❌ Usage: tsx src/scripts/restore-cli.ts --file <path-to-.hrbackup> --passphrase <passphrase> [--user <owner>] [--password <owner-password>]',
    );
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Backup file not found at: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`🔍 Reading backup bundle from: ${resolvedPath}`);
  const fileBuffer = await fsp.readFile(resolvedPath);

  console.log('🔒 Decrypting and inspecting manifest...');
  const inspection = await RestoreService.inspectBackup(fileBuffer, passphrase);

  if (!inspection.isValid) {
    console.error('❌ Backup inspection failed:');
    inspection.errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }

  console.log('✅ Backup Inspection Succeeded:');
  console.log(
    `   - App Version: ${inspection.appVersion} (Current: ${inspection.currentAppVersion})`,
  );
  console.log(`   - Schema Version: ${inspection.schemaVersion}`);
  console.log(`   - Tenant: ${inspection.tenant.name} (${inspection.tenant.slug})`);
  console.log(`   - Total People: ${inspection.counts.people}`);
  console.log(`   - Total Employments: ${inspection.counts.employments}`);
  console.log(
    `   - Total Media Assets: ${inspection.counts.mediaAssets} (${(inspection.mediaSizeBytes / 1024 / 1024).toFixed(2)} MB)`,
  );
  console.log(`   - Compatibility: ${inspection.compatibilityStatus}`);

  if (inspection.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    inspection.warnings.forEach((w) => console.log(`   - ${w}`));
  }

  // Find System Owner or First User in the tenant
  let targetTenant = await prisma.tenant.findUnique({
    where: { id: inspection.tenant.id },
  });
  if (!targetTenant) {
    targetTenant = await prisma.tenant.findFirst();
  }

  if (!targetTenant) {
    console.error('❌ No active tenant found in database.');
    process.exit(1);
  }

  const ownerUser = await prisma.user.findFirst({
    where: { tenantId: targetTenant.id },
  });

  if (!ownerUser) {
    console.error('❌ No user found for tenant in database.');
    process.exit(1);
  }

  console.log(`🔄 Executing restore for tenant "${targetTenant.name}" (ID: ${targetTenant.id})...`);
  try {
    const result = await RestoreService.executeRestore({
      tenantId: targetTenant.id,
      userId: ownerUser.id,
      backupBuffer: fileBuffer,
      passphrase,
      ownerPassword: ownerPassword || 'bypassed_cli_physical_recovery',
    });

    console.log('🎉 Disaster Recovery Restore Completed Successfully!');
    console.log(`   - Pre-restore safety snapshot ID: ${result.preRestoreBackupId}`);
    console.log('   - Records restored into active database.');
  } catch (err: any) {
    console.error(`❌ Disaster recovery restore failed: ${err?.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal CLI restore error:', err);
  process.exit(1);
});
