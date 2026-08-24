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

## 4. Quality & Testing Commands

- **Format Check**: `pnpm format:check`
- **Format Write**: `pnpm format:write`
- **Strict Typecheck**: `pnpm typecheck`
- **Unit & Integration Tests**: `pnpm test`
- **E2E Playwright Smoke Tests**: `pnpm test:e2e`
