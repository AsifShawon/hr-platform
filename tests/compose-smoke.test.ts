import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 1 Quality Gate: Docker Compose & Runtime Configuration Smoke', () => {
  it('validates that docker-compose.prod.yml adheres to security and network isolation rules', () => {
    const composePath = path.resolve(__dirname, '../docker-compose.prod.yml');
    expect(fs.existsSync(composePath)).toBe(true);

    const content = fs.readFileSync(composePath, 'utf8');

    // 1. Mandatory environment assertions (no hardcoded passwords)
    expect(content).toContain('POSTGRES_PASSWORD: ${DB_PASSWORD:?');
    expect(content).toContain('SYSTEM_ENCRYPTION_KEY: ${SYSTEM_ENCRYPTION_KEY:?');
    expect(content).toContain('APP_SECRET: ${APP_SECRET:?');

    // 2. Loopback-only port binding default
    expect(content).toContain('${HOST_BIND_IP:-127.0.0.1}:80:80');

    // 3. PostgreSQL is isolated in internal network with zero published host ports
    expect(content).not.toMatch(/ports:\s*-\s*["']?5432:5432["']?/);

    // 4. API internal URL passed to Next.js web container
    expect(content).toContain('API_INTERNAL_URL: http://api:3001');

    // 5. Caddy health and reverse proxy dependencies
    expect(content).toContain('caddy:2.8.4-alpine');
    expect(content).toContain('postgres:16.4-alpine');
  });

  it('validates that root docker-compose.yml has no fallback production secrets', () => {
    const composePath = path.resolve(__dirname, '../docker-compose.yml');
    expect(fs.existsSync(composePath)).toBe(true);

    const content = fs.readFileSync(composePath, 'utf8');

    // Ensure no fallback password strings exist
    expect(content).not.toContain('postgres_secure_production_password');
    expect(content).not.toContain('production_secure_secret_min32characterslong');

    // Ensure loopback host binding
    expect(content).toContain('${HOST_BIND_IP:-127.0.0.1}:80:80');
  });

  it('validates that all multi-stage Dockerfiles enforce --frozen-lockfile', () => {
    const dockerfiles = [
      'docker/Dockerfile.api',
      'docker/Dockerfile.worker',
      'docker/Dockerfile.web',
      'docker/Dockerfile.migration',
    ];

    for (const relPath of dockerfiles) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toContain('pnpm install --frozen-lockfile');
      expect(content).not.toContain('--frozen-lockfile=false');
    }
  });

  it('validates that Dockerfile.worker installs Alpine Chromium and font packages', () => {
    const workerDockerPath = path.resolve(__dirname, '../docker/Dockerfile.worker');
    const content = fs.readFileSync(workerDockerPath, 'utf8');

    expect(content).toContain('chromium');
    expect(content).toContain('font-noto');
    expect(content).toContain('font-noto-bengali');
    expect(content).toContain('PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1');
    expect(content).toContain('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser');
  });

  it('validates that Caddyfiles configure reverse proxy paths correctly', () => {
    const loopbackCaddy = fs.readFileSync(
      path.resolve(__dirname, '../docker/caddy/Caddyfile.loopback'),
      'utf8',
    );
    expect(loopbackCaddy).toContain('reverse_proxy api:3001');
    expect(loopbackCaddy).toContain('reverse_proxy web:3000');

    const lanCaddy = fs.readFileSync(
      path.resolve(__dirname, '../docker/caddy/Caddyfile.lan'),
      'utf8',
    );
    expect(lanCaddy).toContain('tls internal');
    expect(lanCaddy).toContain('reverse_proxy api:3001');
    expect(lanCaddy).toContain('reverse_proxy web:3000');
  });
});
