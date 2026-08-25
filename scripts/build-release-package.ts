import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface FileDigest {
  path: string;
  bytes: number;
  sha256: string;
}

interface ReleaseManifest {
  name: string;
  version: string;
  schemaVersion: string;
  releaseDate: string;
  targetArchitecture: string;
  minDockerVersion: string;
  files: FileDigest[];
  containerImages: {
    service: string;
    image: string;
    tag: string;
  }[];
}

function calculateFileSha256(filePath: string): FileDigest {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return {
    path: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    bytes: content.length,
    sha256: hash,
  };
}

/**
 * Parses pnpm-lock.yaml (v9.0 format) to extract exact resolved dependency versions.
 */
function extractResolvedDependenciesFromLockfile(lockfilePath: string): Map<string, string> {
  const content = fs.readFileSync(lockfilePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const resolved = new Map<string, string>();

  let currentPkgName: string | null = null;
  let inImporters = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('importers:')) {
      inImporters = true;
      continue;
    }
    if (inImporters && line.startsWith('packages:')) {
      inImporters = false;
      break;
    }

    if (!inImporters) continue;

    // Matches package name like "  '@fastify/cors':" or "  adm-zip:"
    const pkgMatch = line.match(/^ {4,6}['"]?(@?[a-zA-Z0-9_\-\.\/]+)['"]?:$/);
    if (pkgMatch) {
      currentPkgName = pkgMatch[1];
      continue;
    }

    // Matches resolved version like "      version: 10.1.0" or "      version: 10.1.0(peerDependency...)"
    if (currentPkgName && line.match(/^ {6,8}version:\s*(.+)$/)) {
      const versionMatch = line.match(/^ {6,8}version:\s*(.+)$/);
      if (versionMatch) {
        let rawVersion = versionMatch[1].trim();
        // Ignore internal workspace links like "link:../../packages/db"
        if (!rawVersion.startsWith('link:')) {
          // Strip peer dependency hashes like "10.1.0(@fastify/cors@10.0.0)"
          const cleanVersion = rawVersion.split('(')[0].replace(/['"]/g, '').trim();
          resolved.set(currentPkgName, cleanVersion);
        }
      }
      currentPkgName = null;
    }
  }

  return resolved;
}

async function buildReleaseManifest() {
  console.log('Generating Phase 1 Release Manifest & Lockfile-Verified SBOM...');

  const releaseFiles = [
    'docker-compose.prod.yml',
    'docker-compose.yml',
    'pilot.sh',
    'pilot.ps1',
    '.env.example',
    'README.md',
    'docker/caddy/Caddyfile.loopback',
    'docker/caddy/Caddyfile.lan',
    'docker/Dockerfile.api',
    'docker/Dockerfile.worker',
    'docker/Dockerfile.web',
    'docker/Dockerfile.migration',
    'docs/PILOT-RUNBOOK.md',
    'docs/PREREQUISITES.md',
    'docs/TROUBLESHOOTING.md',
  ];

  const fileDigests: FileDigest[] = [];
  for (const relPath of releaseFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      fileDigests.push(calculateFileSha256(fullPath));
    }
  }

  const manifest: ReleaseManifest = {
    name: 'hr-platform-onprem-mvp',
    version: 'v1.0.0-pilot.1',
    schemaVersion: '20260825_phase1_init',
    releaseDate: '2026-08-25',
    targetArchitecture: 'linux/amd64, windows/amd64 (Docker Desktop/Engine)',
    minDockerVersion: '24.0.0+ / Compose v2.20+',
    files: fileDigests,
    containerImages: [
      { service: 'caddy', image: 'caddy:2.8.4-alpine', tag: '2.8.4-alpine' },
      { service: 'postgres', image: 'postgres:16.4-alpine', tag: '16.4-alpine' },
      { service: 'api', image: 'hr-api:v1.0.0-pilot.1', tag: 'v1.0.0-pilot.1' },
      { service: 'web', image: 'hr-web:v1.0.0-pilot.1', tag: 'v1.0.0-pilot.1' },
      { service: 'worker', image: 'hr-worker:v1.0.0-pilot.1', tag: 'v1.0.0-pilot.1' },
    ],
  };

  fs.mkdirSync(path.join(process.cwd(), 'release'), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), 'release', 'release-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  // Extract resolved dependencies from pnpm-lock.yaml
  const lockfilePath = path.join(process.cwd(), 'pnpm-lock.yaml');
  const resolvedMap = extractResolvedDependenciesFromLockfile(lockfilePath);

  const components: any[] = [];
  const sortedPkgNames = Array.from(resolvedMap.keys()).sort();

  for (const name of sortedPkgNames) {
    const version = resolvedMap.get(name)!;
    components.push({
      type: 'library',
      name,
      version,
      purl: `pkg:npm/${name}@${version}`,
      scope: 'required',
    });
  }

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: {
        type: 'application',
        name: 'hr-platform',
        version: '1.0.0-pilot.1',
        description: 'Local-first on-premises HR ID card platform MVP',
      },
    },
    components,
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'release', 'sbom.json'),
    JSON.stringify(sbom, null, 2),
    'utf8',
  );

  console.log(
    `✅ Release manifest and CycloneDX SBOM generated with ${components.length} resolved components from pnpm-lock.yaml.`,
  );
}

buildReleaseManifest().catch((err) => {
  console.error(err);
  process.exit(1);
});
