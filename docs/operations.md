# Operations & Deployment Guide

**Project:** Local-First HR Employee ID-Card Platform  
**Status:** Baseline Established (Phase 0)  
**Revision:** 1.0 (2026-08-24)

---

## 1. Prerequisites

- **Node.js**: v20.x, v22.x, or v24.x LTS
- **pnpm**: v10.x / v11.x (`corepack enable && corepack prepare pnpm@10.5.0 --activate`)
- **Docker & Docker Compose**: v24+

---

## 2. Local Development Mode

### Step 1: Clone and Install Dependencies

```bash
pnpm install
```

### Step 2: Start Development PostgreSQL Database

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Step 3: Run Database Migrations & Fictional Seed

```bash
pnpm --filter @hr/db db:migrate
pnpm --filter @hr/db db:seed
```

### Step 4: Run Development Stack (Turborepo)

```bash
pnpm dev
```

- **Web Interface**: `http://localhost:3000`
- **Fastify API**: `http://localhost:3001` (Health: `http://localhost:3001/health`)
- **Worker**: Runs in console with 15s heartbeat loop

---

## 3. Production-Like Local Stack (Docker Compose)

To run the complete production-like stack with Caddy reverse proxy and isolated PostgreSQL:

```bash
docker compose up --build -d
```

- **HTTP Endpoint**: `http://localhost`
- **Health Diagnostics**: `http://localhost/api/health`
- **PostgreSQL**: Isolated inside internal Docker network, data persisted in volume `hr_postgres_prod_data`.

To stop the stack:

```bash
docker compose down
```

---

## 4. Encrypted Backup & Disaster Recovery Operations

### 4.1 Manual & Scheduled Backups

Backups are compiled as AES-256-GCM encrypted `.hrbackup` bundles containing the PostgreSQL tenant data, media assets (photos, logos, derivatives), non-secret settings, and an integrity manifest with SHA-256 digests.

To configure automated backups:

1. Navigate to **Administration → Backup & Restore** (`/admin/backups`).
2. Toggle **Automated Backup Schedule**.
3. Choose a frequency preset (e.g. Daily at 02:00 AM) and retention count (e.g. Keep last 7).
4. Specify a target directory on a separate physical volume or mounted NAS drive (e.g. `/mnt/external-backups`).

### 4.2 Web-Guided Restore Wizard

Restoration is a privileged System Owner operation:

1. Navigate to **Administration → Backup & Restore → Restore Wizard** (`/admin/restore`).
2. **Step 1 (Upload & Passphrase)**: Provide the `.hrbackup` bundle and encryption passphrase.
3. **Step 2 (Dry Run Inspection)**: The system inspects the bundle in-memory and displays tenant name, source app/schema versions, worker counts, and media size without mutating active records.
4. **Step 3 (Owner Authorization)**: Re-enter your System Owner login password and confirm. An automatic pre-restore safety snapshot will be created before database replacement.

### 4.3 Off-Web / CLI Disaster Recovery

If the web UI or API server is unreachable, perform physical server disaster recovery using the CLI utility:

```bash
pnpm --filter @hr/api exec tsx src/scripts/restore-cli.ts \
  --file /path/to/backup.hrbackup \
  --passphrase "YourEncryptionPassphrase"
```

---

## 5. Local LAN Networking & Mobile CA Trust Setup

Mobile device browsers mandate a trusted secure context (HTTPS) for hardware camera access (`getUserMedia`). When operating on a local factory Wi-Fi network:

### Step 1: Enable LAN Mode

System Owner navigates to **Administration → System & Health** (`/admin/system`) and clicks **Enable LAN Mode**.

### Step 2: Install Internal CA Root Certificate on Mobile Devices

Download the internal Caddy CA certificate from `GET /api/system/tls/root-ca` or the System Health UI:

- **Apple iOS (iPhone / iPad)**:
  1. Download `.crt` in Safari.
  2. Open **Settings → Profile Downloaded → Install**.
  3. Go to **Settings → General → About → Certificate Trust Settings**.
  4. Under _"Enable full trust for root certificates"_, toggle ON the internal CA certificate.

- **Google Android**:
  1. Download `.crt` onto device storage.
  2. Open **Settings → Security & privacy → More security settings → Encryption & credentials**.
  3. Tap **Install a certificate → CA certificate** and select the `.crt` file.

- **Windows / macOS**:
  - Windows: Import `.crt` into _Trusted Root Certification Authorities_.
  - macOS: Import `.crt` into Keychain Access and set trust to _Always Trust_.

---

## 6. Diagnostic Support Bundles & Safe Telemetry

To generate a sanitized diagnostic report without leaking credentials, passwords, or employee PII:

1. Navigate to `/admin/system`.
2. Click **Support Bundle**.
3. A redacted ZIP containing sanitized system info, disk metrics, and schema status will be generated.

---

## 7. Quality & Testing Commands

- **Format Check**: `pnpm format:check`
- **Format Write**: `pnpm format:write`
- **Strict Typecheck**: `pnpm typecheck`
- **Unit & Integration Tests**: `pnpm test`
- **E2E Playwright Tests**: `pnpm test:e2e`
