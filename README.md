# HR ID Platform (Local-First On-Premises MVP)

> **Enterprise Employee Registry & High-Precision Bilingual Physical ID Card Issuance System**  
> _100% Local-First • Air-Gapped Operation • 60 mm × 90 mm Physical Standard • Zero Telemetry_

---

## 1. System Overview

The HR ID Platform is a secure, local-first on-premises employee registry and industrial identity card issuance system. It is designed to run entirely on a single workstation PC or within a private factory Local Area Network (LAN) with zero external cloud dependencies, zero remote biometrics, and zero third-party telemetry.

### Core Capabilities

- **Local-First & Air-Gapped:** Operates 100% offline. All fonts (Noto Sans, Noto Sans Bengali), database transactions, asset processing, and rendering engines are self-hosted.
- **Physical Card Geometry Engine:** Generates exact-scale 300/600 DPI vector PDFs and raster PNGs for the industrial 60 mm × 90 mm vertical standard (English front / Bangla back) as well as ISO/IEC 7810 ID-1 (CR80) formats.
- **Direct & Mobile Photo Capture:** In-browser webcam studio with live 2:3 card aspect ratio framing, burst capture, and zero-PII smartphone handoff over local Wi-Fi via short-lived QR tokens and real-time Server-Sent Events (SSE).
- **Default-Deny RBAC & Tenant Scoping:** Explicit authorization matrix, server-derived tenant boundaries, and immutable structured audit trails.
- **Disaster Recovery & Encrypted Backups:** AES-256-GCM authenticated `.hrbackup` binary archives with self-verification and offline CLI recovery.

---

## 2. Prerequisites

| Component            | Minimum Version                                                    | Notes                                          |
| :------------------- | :----------------------------------------------------------------- | :--------------------------------------------- |
| **Operating System** | Linux (Ubuntu 22.04+), Windows 10/11 (WSL2 / PowerShell), or macOS | Verified on amd64 architecture                 |
| **Node.js**          | `v22.x LTS`                                                        | Managed via Corepack / pnpm                    |
| **pnpm**             | `v10.5.0+`                                                         | Corepack-enabled (`corepack enable`)           |
| **Docker & Compose** | Docker Engine `24.0.0+` & Compose `v2.20+`                         | Required for multi-container production stack  |
| **Memory & CPU**     | 4 GB RAM / 2 CPU cores                                             | Minimum for headless Chromium rendering worker |

---

## 3. Clean-Clone Quickstart & Installation

### Step 1: Clone and Install Dependencies with Frozen Lockfile

```bash
git clone https://github.com/AsifShawon/hr-platform.git
cd hr-platform

# Enable Corepack and install exact workspace dependencies
corepack enable
pnpm install --frozen-lockfile
```

### Step 2: Configure Environment & Generate Cryptographic Secrets

Create a `.env` file from the production template and populate cryptographically strong secrets:

```bash
cp .env.example .env
```

Generate random 32-byte / 64-hex-character secrets:

```bash
# On Linux / macOS / WSL:
openssl rand -hex 32
# Generate separate values for DB_PASSWORD, SYSTEM_ENCRYPTION_KEY, and APP_SECRET
```

Ensure `.env` contains:

```env
DB_PASSWORD=<random-32-char-password>
SYSTEM_ENCRYPTION_KEY=<random-64-hex-chars-or-32-byte-key>
APP_SECRET=<random-64-hex-chars-or-32-byte-key>
HOST_BIND_IP=127.0.0.1
CADDYFILE_PATH=./docker/caddy/Caddyfile.loopback
APP_URL=http://localhost
API_INTERNAL_URL=http://api:3001
API_URL=http://localhost:3001
```

### Step 3: Run Database Migrations and Fixture Seeding

```bash
# Generate Prisma Client bindings
pnpm db:generate

# Deploy schema migrations to PostgreSQL
pnpm db:migrate

# Seed default organization and initial roles
pnpm db:seed
```

### Step 4: Start the Production Mesh in Protected Loopback Mode

Using the automated pilot management script:

```bash
# On Linux / macOS:
./pilot.sh start

# On Windows (PowerShell):
.\pilot.ps1 start
```

_Or directly via Docker Compose:_

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 4. Verification & Initial Activation Ceremony

1. **Verify API Health via Reverse Proxy:**
   ```bash
   curl -fsS http://127.0.0.1/api/health
   # Expected: {"status":"healthy","version":"...","uptime":...}
   ```
2. **Access Web Interface:** Open `http://127.0.0.1` in your browser.
3. **Sign In & Mandatory Activation:**
   - Sign in with initial credentials: Username `admin`, Password `admin`.
   - The platform will immediately redirect to `/activate` (Loopback-only activation ceremony).
   - Set a strong permanent password, review and copy the 8 emergency recovery codes, and confirm backup responsibilities.
   - Upon completion, the temporary bootstrap credential is permanently destroyed.

---

## 5. Opt-In Factory LAN & Mobile Trust Setup

To allow operators on the local network or smartphone cameras to connect to the platform:

1. **Enable LAN Mode:**

   ```bash
   # On Linux:
   ./pilot.sh lan-enable

   # On Windows:
   .\pilot.ps1 lan-enable
   ```

   This switches `HOST_BIND_IP` to `0.0.0.0` and activates Caddy's internal TLS engine (`Caddyfile.lan`).

2. **Mobile CA Certificate Installation:**
   - Navigate to `https://<server-ip>/api/system/tls/root-ca` on your mobile device.
   - Install the root CA certificate into your device's trusted credentials store (Settings -> Security -> Install Certificate).
   - Mobile camera scanning over HTTPS will now function securely without untrusted certificate warnings.

3. **Disable LAN Mode (Return to Loopback-Only):**
   ```bash
   ./pilot.sh lan-disable
   ```

---

## 6. Safe Shutdown, Backups & Rollback

### Stop Containers Without Losing Data

Persistent volumes (`hr_postgres_prod_data`, `hr_media_prod_data`, `hr_backup_prod_data`) are preserved across stops:

```bash
./pilot.sh stop
# or: docker compose -f docker-compose.prod.yml down
```

### Create Pre-Upgrade Backup

Before upgrading versions or applying schema migrations:

```bash
./pilot.sh backup
```

Encrypted `.hrbackup` bundles are saved to `./storage/backups/`.

### Disaster Recovery CLI

In the event that the web UI is unreachable:

```bash
pnpm --filter @hr/api exec tsx src/scripts/restore-cli.ts --inspect ./storage/backups/<backup-file>.hrbackup
pnpm --filter @hr/api exec tsx src/scripts/restore-cli.ts --restore ./storage/backups/<backup-file>.hrbackup
```

---

## 7. Developer & Quality Gate Commands

```bash
# Run all unit and integration tests
pnpm test

# Run ESLint validation
pnpm lint

# Check code formatting
pnpm format:check

# Validate TypeScript typechecking across all packages
pnpm typecheck

# Re-generate release manifest and lockfile-verified SBOM
pnpm release:manifest

# Run end-to-end Playwright tests
pnpm test:e2e
```

---

## 8. License & Operational Governance

Governed by workspace rules in [`.agents/rules/00-core.md`](file:///c:/Users/User/Documents/Shawon/hr-platform/.agents/rules/00-core.md). Private on-premises deployment edition.
