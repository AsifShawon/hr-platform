import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import { DiagnosticsService } from './diagnostics.service.js';

describe('DiagnosticsService', () => {
  it('should calculate disk space and verify metrics structure', async () => {
    const disk = await DiagnosticsService.getDiskSpace();

    expect(typeof disk.totalBytes).toBe('number');
    expect(typeof disk.freeBytes).toBe('number');
    expect(typeof disk.usedBytes).toBe('number');
    expect(typeof disk.usedPercentage).toBe('number');
    expect(typeof disk.isLowDisk).toBe('boolean');
    expect(disk.totalBytes).toBeGreaterThan(0);
  });

  it('should generate complete system diagnostics payload without exposing secrets', async () => {
    const diagnostics = await DiagnosticsService.getSystemDiagnostics();

    expect(['ok', 'degraded', 'error', 'maintenance']).toContain(diagnostics.status);
    expect(diagnostics.components.database).toBeDefined();
    expect(diagnostics.components.storage).toBeDefined();
    expect(diagnostics.components.storage.path).not.toContain('password');
    expect(diagnostics.components.backups).toBeDefined();
    expect(diagnostics.disk).toBeDefined();
  });

  it('should generate a sanitized support bundle ZIP with diagnostics and readme', async () => {
    const zipBuffer = await DiagnosticsService.createSupportBundle(
      'test-tenant-id',
      'test-user-id',
    );
    expect(zipBuffer.length).toBeGreaterThan(0);

    const zip = new AdmZip(zipBuffer);
    const diagEntry = zip.getEntry('diagnostics.json');
    const infoEntry = zip.getEntry('system-info.json');
    const readmeEntry = zip.getEntry('README.txt');

    expect(diagEntry).toBeDefined();
    expect(infoEntry).toBeDefined();
    expect(readmeEntry).toBeDefined();

    const readmeContent = readmeEntry!.getData().toString('utf8');
    expect(readmeContent).toContain('HR Platform Diagnostic Support Bundle');
    expect(readmeContent).toContain('redacted');
  });
});
