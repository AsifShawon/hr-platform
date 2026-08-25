const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function calculateFileSha256(filePath) {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return {
    path: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    bytes: content.length,
    sha256: hash,
  };
}

async function buildReleaseManifest() {
  console.log('Generating Phase 13 Release Manifest & SBOM...');

  const releaseFiles = [
    'docker-compose.prod.yml',
    'pilot.sh',
    'pilot.ps1',
    '.env.example',
    'docker/caddy/Caddyfile.loopback',
    'docker/caddy/Caddyfile.lan',
    'docker/Dockerfile.api',
    'docker/Dockerfile.worker',
    'docker/Dockerfile.web',
    'docker/Dockerfile.migration',
    'docs/PILOT-RUNBOOK.md',
    'docs/PREREQUISITES.md',
    'docs/TROUBLESHOOTING.md',
    'CHANGELOG.md',
  ];

  const fileDigests = [];
  for (const relPath of releaseFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      fileDigests.push(calculateFileSha256(fullPath));
    }
  }

  const manifest = {
    name: 'hr-platform-onprem-mvp',
    version: 'v1.0.0-pilot.1',
    schemaVersion: '20260825_phase13_init',
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

  // Generate CycloneDX-compatible SBOM
  const apiPkg = JSON.parse(fs.readFileSync('apps/api/package.json', 'utf8'));
  const webPkg = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));
  const workerPkg = JSON.parse(fs.readFileSync('apps/worker/package.json', 'utf8'));

  const components = [];
  const allDeps = {
    ...apiPkg.dependencies,
    ...webPkg.dependencies,
    ...workerPkg.dependencies,
  };

  for (const [name, version] of Object.entries(allDeps)) {
    if (typeof version === 'string' && !version.startsWith('workspace:')) {
      components.push({
        type: 'library',
        name,
        version: version.replace(/^[\^~]/, ''),
        purl: `pkg:npm/${name}@${version.replace(/^[\^~]/, '')}`,
        scope: 'required',
      });
    }
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
    `Release manifest and SBOM generated with ${components.length} production components.`,
  );
}

buildReleaseManifest().catch((err) => {
  console.error(err);
  process.exit(1);
});
