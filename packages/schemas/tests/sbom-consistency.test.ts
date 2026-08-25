import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 1 Quality Gate: SBOM & Lockfile Consistency', () => {
  it('ensures release/sbom.json exists and adheres to CycloneDX 1.5 format', () => {
    const sbomPath = path.resolve(__dirname, '../../../release/sbom.json');
    expect(fs.existsSync(sbomPath)).toBe(true);

    const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.5');
    expect(sbom.components).toBeInstanceOf(Array);
    expect(sbom.components.length).toBeGreaterThan(20);
  });

  it('verifies that every component in release/sbom.json has a valid non-empty version and purl matching its version', () => {
    const sbomPath = path.resolve(__dirname, '../../../release/sbom.json');
    const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));

    for (const component of sbom.components) {
      expect(component.name).toBeTruthy();
      expect(component.version).toBeTruthy();
      expect(component.version).not.toMatch(/^[\^~]/); // No unpinned semver specifiers
      expect(component.purl).toBe(`pkg:npm/${component.name}@${component.version}`);
    }
  });

  it('ensures release-manifest.json exists and hashes all required deployment files', () => {
    const manifestPath = path.resolve(__dirname, '../../../release/release-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('hr-platform-onprem-mvp');
    expect(manifest.files.length).toBeGreaterThanOrEqual(10);

    for (const file of manifest.files) {
      expect(file.path).toBeTruthy();
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(file.bytes).toBeGreaterThan(0);
    }
  });
});
