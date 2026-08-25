# Project Status

## Current Status: Phase 12 Completed (Release-Quality Test Matrix, Accessibility & Validation Execution)

- **Active Phase:** Phase 12 Complete -> Ready for General Release & Deployment Packaging
- **Last Updated:** 2026-08-25

### Completed Milestones

#### Phase 0: Repository Foundation & Quality Gates

- [x] Workspace governance rules normalized into `.agents/rules/00-core.md` (Always On).
- [x] Antigravity workflows established (`/plan-phase` and `/verify-phase`).
- [x] Monorepo structure initialized with pnpm workspaces and Turborepo.
- [x] Core shared packages implemented: `@hr/config`, `@hr/domain`, `@hr/schemas`, `@hr/db`, `@hr/ui`, `@hr/card-kit`, `@hr/i18n`, `@hr/fixtures`.
- [x] Applications scaffolded: `apps/web`, `apps/api`, `apps/worker`.
- [x] Infrastructure & Docker: Docker Compose dev and multi-container setups with Caddy.

#### Phase 1: Shared Design System, Landing Page & Sign-In Shell

- [x] **Deep Teal Design Tokens & System**: Semantic palette (`#134E4A` primary, `#0F766E` secondary, `#14B8A6` accent, `#F0FDFA` background, `#0F172A` text) and focus rings.
- [x] **Owned Accessible UI Primitives**: `Button`, `Input`, `ShowHidePasswordInput`, `Badge`, `CardPreviewChrome`, `Dialog`, `Accordion`, `Tabs`, `TableShell`, `Skeleton`, `EmptyState`.
- [x] **Self-Hosted Font Declarations**: Noto Sans (Latin) and Noto Sans Bengali with complex script shaping support.
- [x] **Polished Marketing Landing Page (`apps/web/app/page.tsx`)**.
- [x] **Sign-In Presentation Shell (`apps/web/app/login/page.tsx`)**.

#### Phase 2: Authentication, Account Activation, Sessions, Authorization & Audit Foundations

- [x] **Protected Local Bootstrap & Activation Ceremony**:
  - `admin/admin` allowed only on fresh unactivated installation bound to loopback.
  - Activation wizard (`/activate`): replaces password with Argon2id parameters, optional username rename, 8 one-time emergency recovery codes display & copy, local backup responsibility confirmation.
  - Destroys temporary bootstrap credential hash upon activation completion.
- [x] **Hosted First-Owner Provisioning**:
  - CLI provisioning tool (`apps/api/src/scripts/provision-hosted-tenant.ts`) creating tenant and first-owner activation token.
  - Token-based activation endpoint (`POST /api/auth/hosted/activate`).
- [x] **Argon2id & Opaque Session Security**:
  - OWASP-compliant Argon2id parameters (`memoryCost: 65536 KiB`, `timeCost: 3`, `parallelism: 1`).
  - Offline 10k compromised & common password blocklist embedded in `@hr/domain`.
  - Server-side opaque sessions with SHA-256 token hashing and `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
  - Dual-timer expiry: 30-minute sliding idle window + 24-hour absolute ceiling.
  - Session rotation on authentication, privilege elevation, and password change.
  - Device/session listing, individual session revocation, and "revoke all other sessions".
  - Login rate limiting (5 failed attempts -> 15 min lock) and generic authentication error messages.
- [x] **Default-Deny RBAC & Tenant Scoping**:
  - Fastify permission middleware enforcing `default-deny` on all protected endpoints.
  - 6 Built-in roles + custom roles with explicit permissions.
  - Last Active System Owner protection invariant preventing accidental lockout.
  - Server-derived `tenant_id` from authenticated session state.
- [x] **Immutable Audit Trail Foundation**:
  - Structured audit logging helper with auto-redaction of passwords, tokens, recovery codes, and full PII.
  - Read-only paginated audit log inspection view (`/audit` and `/api/audit-events`).

#### Phase 3: Company Administration & Organization Hierarchy Model

- [x] **Organization Model & Multi-Org Support**:
  - `Organization` domain entity and database schema with tenant isolation, branding colors (`primaryColor`, `secondaryColor`, `accentColor`), locale, timezone, physical address, and customizable `EmployeeNumberRule`.
  - Automatic single-organization ergonomics (no forced chooser dropdown when only 1 organization exists).
- [x] **Secure Media & Logo Processing Pipeline**:
  - File upload pipeline with magic byte validation (PNG, JPEG, WebP, SVG), 2MB file size cap, automatic EXIF / metadata stripping via Sharp, and downscaling of oversized images.
  - SVG XSS prevention scanning rejecting `<script>` tags and embedded handlers.
  - Stored in private filesystem storage outside public directories with secure streaming endpoint `GET /api/organizations/:id/logo`.
- [x] **Multi-Location Management**:
  - `Location` model supporting factories, corporate offices, headquarters, branches, sites, and warehouses.
  - Safe deletion prevention blocking removal of locations referenced by organizational units.
- [x] **Self-Referencing OrgUnit Tree Hierarchy**:
  - N-level organizational unit tree (`DIVISION`, `DEPARTMENT`, `SECTION`, `TEAM`, `LINE`, `OTHER`) with parent/child relations.
  - Bilingual support with native Bengali (`বাংলা`) script rendering and full Unicode round-trip.
  - Depth-first cycle detection and prevention algorithm guarding against self-assignment and descendant cyclic moves.
  - Cross-tenant and cross-organization parent validation.
  - Case-insensitive sibling name uniqueness under the same parent.
  - Safe archiving mechanism preserving historical card snapshots and audit trail integrity.
- [x] **Granular Role Builder & Site-Scoped Grants**:
  - Custom role creator with 6-group categorized permission checklist.
  - User role assignment with optional Organization or Location scope.
  - Built-in roles protected against mutation and deletion.
- [x] **Interactive Web Frontend UI**:
  - Tree Explorer with collapsible nodes, sub-unit counts, and breadcrumbs (`/organization`).
  - Company Administration & Branding page with live logo preview and employee number formatting (`/admin/company`).
  - Locations management grid and modal dialogs (`/admin/locations`).
  - Roles & Permissions checklist builder (`/admin/roles`).
  - User Accounts with scoped role badges (`/admin/users`).

#### Phase 4: Worker Registry, Employment Records & Sensitive Identity Protection

- [x] **Decoupled Person & Employment Data Architecture**:
  - Strict separation of immutable `Person` human identity from historical & active `Employment` records.
  - Comprehensive multi-script name support: `displayName` (required), optional `displayNameLatin`, `displayNameNative` (Bengali `বাংলা`), `givenName`, `familyName`, `otherNames`, and `phoneticName` without assuming Western order.
  - 5-state lifecycle enum (`PREBOARDING`, `ACTIVE`, `ON_LEAVE`, `INACTIVE`, `SEPARATED`) eliminating simplistic working booleans.
  - Employment history tracking (rehire/rejoin events create new records while preserving historical snapshots).
  - Optimistic concurrency control via integer `version` columns on Person and Employment preventing silent overwrites.
- [x] **Sensitive Government Identity Protection & Cryptography**:
  - AES-256-GCM authenticated encryption at rest for sensitive numbers (Smart NID, Traditional NID, Passport, Birth Certificate).
  - Blind indexing via HMAC-SHA256 allowing deterministic duplicate detection without decrypting database records or leaking plaintext in indexes.
  - Masked values returned by default across all standard API queries (`••••••••8901`).
  - Ephemeral audited reveal workflow (`POST /api/people/:id/identity-documents/:docId/reveal`):
    - Strict `identity.reveal` permission check.
    - Immutable audit event recorded (`identity.revealed`).
    - Client-side 30-second countdown timer auto-masking sensitive plaintext.
- [x] **Typed Custom Fields & Dynamic Attributes**:
  - `CustomFieldDefinition` with strict type validation (`TEXT`, `NUMBER`, `BOOLEAN`, `DATE`, `SELECT`).
  - Granular `accessLevel` scoping (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`).
- [x] **Conservative Duplicate Detection Engine**:
  - Multi-criteria heuristic duplicate evaluation (employee number, encrypted blind index document number, phone, email, name + birth date).
  - Strict **Zero Auto-Merge Policy** with rich operator risk warnings.
- [x] **Server-Side Scalable Table & Multi-Criteria Filtering**:
  - Fast TanStack Table with server-side pagination, sorting, search, column toggles, and status filter.
  - Permission-aware bulk status actions.
  - Performance verified under 50ms database latency budget.
- [x] **Interactive Web Frontend UI**:
  - Fast People Registry table (`/people`).
  - 3-Step Add Worker Wizard (`/people/new`) with live dry-run duplicate check and card readiness preview.
  - Worker Detail Profile (`/people/[id]`) with timeline, employment history, and audited NID reveal dialog.
  - Optimistic Concurrency Worker Edit form (`/people/[id]/edit`).
- [x] **Comprehensive Quality Gates**:
  - Strict TypeScript typechecking passing across all 19 turbo tasks (`pnpm typecheck`).
  - Code formatting checked and compliant (`pnpm format:check`).
  - Vitest unit & integration tests passing across all packages (`pnpm test` -> 46 API tests, 19 turbo tasks).
  - Playwright E2E test suite passing 120/120 tests across 5 browser viewports (`pnpm test:e2e`).
  - Production Next.js build clean and passing (`pnpm build`).

#### Phase 5: Secure Employee-Photo Workflow & Phone Handoff

- [x] **Direct In-Browser Camera Studio**:
  - In-UI pre-permission explanation before invoking `navigator.mediaDevices.getUserMedia`.
  - Camera device selector and front/rear switching on mobile devices.
  - Live portrait framing overlay aligned to exact 60 × 90 mm physical card aspect ratio (2:3).
  - 3-second snapshot countdown, 3-shot burst capture buffer, and interactive selection.
  - In-browser interactive crop, 90° rotation, and zoom controls.
  - Automatic hardware camera track cleanup (`track.stop()`) on modal exit, route change, or retake.
  - Always-available local file upload fallback.
- [x] **Zero-PII Phone Handoff via QR & Real-Time SSE**:
  - Single-use, 5-minute cryptographic QR token allowing an operator to hand off photo capture to any smartphone camera.
  - Token URL contains zero PII (no employee name, number, NID, or tenant identifier).
  - Real-time Server-Sent Events (SSE) stream (`/api/media/handoff/:slotId/events`) on the desktop without client polling.
  - Mobile capture page (`/capture/[token]`) uploads directly to the local server, atomically consumes the token, and pushes the photo to the desktop canvas.
- [x] **Cryptographic & Defensive Media Pipeline (Sharp)**:
  - Strict magic byte validation and MIME verification (JPEG, PNG, WebP).
  - File size caps (10MB upload max) and pixel dimensions safety ceiling (max 16 megapixels) to prevent decompression bombs.
  - Automated EXIF and GPS metadata stripping via Sharp.
  - Generates three clean derivatives: **Master Normalized**, **Card-Ready 300 DPI** (exact 709×1063 px for 60×90mm cards), and **Thumbnail** (150×150 px).
  - Storage outside web root (`storage/uploads/photos/{tenantId}/{uuid}.webp`) served exclusively through authorized streaming routes (`GET /api/people/:id/photo`).
- [x] **Non-Blocking Image Quality UX**:
  - Heuristic luminance and resolution warnings (extreme darkness, overexposure, low resolution) without intrusive facial biometrics.
- [x] **Comprehensive Quality Gates**:
  - Strict TypeScript typechecking passing across all 19 turbo tasks (`pnpm typecheck`).
  - Code formatting checked and compliant (`pnpm format:check`).
  - Vitest unit & integration tests passing across all packages (`pnpm test` -> 54 API tests, 19 turbo tasks).
  - Playwright E2E test suite passing **135/135 tests across 5 browser viewports** (`pnpm test:e2e`).
  - Production Next.js build clean and passing (`pnpm build`).

#### Phase 6: Physical Card-Format Engine & Constrained Bilingual Template System

- [x] **Physical Millimetre Geometry Engine (`@hr/card-kit`)**:
  - High-precision physical dimensions in millimetres (`widthMm`, `heightMm`, `bleedMm`, `safeAreaMm`, `orientation`).
  - **Company Vertical Standard Preset**: 60 mm × 90 mm (Vertical) explicitly marked as custom factory standard.
  - **ISO ID-1 Presets**: ISO ID-1 Horizontal (85.60 × 53.98 mm) and ISO ID-1 Vertical (53.98 × 85.60 mm).
  - Unit normalization from `mm`, `cm`, and `inches` to decimal millimetres with high-precision tolerance round-tripping.
  - Boundary validation (40–200 mm width/height, 0–10 mm bleed/safe area).
- [x] **Immutable Versioned Template Architecture (`CardTemplate` & `TemplateVersion`)**:
  - Immutable `TemplateVersion` records carrying complete JSON layout snapshots, zone definitions, field bindings, typography, and SHA-256 integrity digests.
  - Publishing a draft version locks the snapshot and creates a cryptographic SHA-256 integrity checksum.
  - Editing a published template automatically forks a new `DRAFT` version, preserving historical card issue provenance.
  - Soft-archiving preserving historical records while preventing new assignments.
- [x] **6 Constrained MVP Presets (Zero Free-Form Canvas Drift)**:
  - _Classic Vertical_, _Modern Stripe_, _Photo Focus_, _Factory / Industrial_, _Contractor Badge_, and _Visitor Pass_.
  - Structured form customization for logos, brand palettes, self-hosted Noto fonts, photo border treatments, enabled fields, bilingual labels, and back-side instructions.
- [x] **Bilingual Typography & Fallback Engine**:
  - English front / Bangla back with self-hosted Noto Sans and Noto Sans Bengali.
  - Visible, graceful fallback when Bengali native script name is missing.
  - Defensive line clamping and adaptive font scaling preventing text overflow for long names.
- [x] **Deterministic 6-Level Template Assignment Hierarchy**:
  - Priority order: `Worker Override` > `Job Category` > `Org Unit` > `Location` > `Org Default` > `System Default`.
  - Resolution diagnostic explaining _why_ a template was chosen with conflict detection.
- [x] **QR & Barcode Security Invariants**:
  - Strictly opaque random card serials (`CARD-UUID-V4` or internal tokens); zero sensitive PII in barcode payloads.
- [x] **Comprehensive Quality Gates**:
  - TypeScript typechecking passing 100% across all 19 turbo tasks (`pnpm typecheck`).
  - Code formatting checked and compliant (`pnpm format:check`).
  - Vitest unit & integration tests passing across all packages (`pnpm test` -> 60 API tests, 7 card-kit tests, 19 turbo tasks).

#### Phase 7: Deterministic, Physically Accurate Card Rendering & Print Calibration

- [x] **Headless Chromium Print Renderer (`apps/worker`)**:
  - Isolated Chromium browser pool with strict sandbox and single-context page isolation.
  - Zero-trust outbound network blocking (`page.route('**')` aborts all external network attempts).
  - Exact-size physical master PDF generation via `@page` CSS sizing (`margin: 0`, `preferCSSPageSize: true`, `printBackground: true`).
  - High-resolution PNG generation at 150, 300, and 600 DPI with exact pixel geometry formula: $\text{pixels} = \text{round}\left(\frac{\text{mm}}{25.4} \times \text{DPI}\right)$.
  - 60 × 90 mm Content Area at 300 DPI: exact **709 × 1063 px** before bleed.
  - Generates zero-PII render manifests with deterministic SHA-256 digests.
- [x] **Automated PDF MediaBox Inspection & Verification (`pdf-lib`)**:
  - Validates physical page count and MediaBox dimensions ($170.08 \times 255.12\text{ pt}$ for 60×90mm) within $\pm 0.5\text{ mm}$ tolerance.
- [x] **A4 & US Letter Duplex Sheet Imposition Math (`@hr/card-kit`)**:
  - Imposes multi-card grids with long-edge duplex column mirroring (`backColumns = [...frontColumns].reverse()`) for exact front-to-back card alignment without drift.
- [x] **Physical Printer Calibration Studio (`/cards/calibration`)**:
  - Printable calibration sheets with 50.00 mm precision test line, 60 × 90 mm reference box, and duplex crosshairs.
  - Caliper measurement logging with automated tolerance status badges.
  - Strict "100% / Actual Size" invariant warnings against "Fit to Page".
- [x] **Card Studio Direct Export Actions**:
  - Direct "Print PDF (Exact)" and "PNG (300 DPI)" master downloads from the customizer studio.
- [x] **Comprehensive Quality Gates**:
  - TypeScript typechecking passing 100% across all 20 turbo tasks (`pnpm typecheck`).
  - Code formatting checked and compliant (`pnpm format:check`).
  - Vitest unit & integration tests passing across all packages (`pnpm test` -> 60 API tests, 8 card-kit tests, 6 worker renderer tests, 20 turbo tasks).
  - Playwright multi-viewport E2E test suite passing **165/165 tests across 5 browser viewports** (`pnpm test:e2e`).
  - Production Next.js build clean and passing (`pnpm build`).

#### Phase 10: Local Product Recoverability, Encrypted Backups & System Health

- [x] **AES-256-GCM Encrypted Backup Bundles (`.hrbackup`)**:
  - Binary envelope with 64-byte `HRBK` header, format version, PBKDF2/Argon2id salt, and AES-256-GCM nonce.
  - Complete packaging of database records, media assets, configuration, and SHA-256 manifest digests.
  - Zero stored passphrases; keys derived in-memory on demand.
  - Post-creation self-verification testing authentication tag and manifest digests immediately upon creation.
  - Configurable retention schedule (keep last $N$ backups) and storage safety advisories for external directories.
- [x] **Privileged 3-Step Restore Wizard & Disaster Recovery**:
  - Pre-flight dry inspection reporting entity counts, media volume, and schema/app version compatibility without mutating state.
  - Mandatory System Owner re-authentication.
  - Automatic pre-restore rollback safety snapshot created prior to database replacement.
  - Offline CLI disaster recovery tool (`apps/api/src/scripts/restore-cli.ts`) for physical server recovery when the web UI is unreachable.
- [x] **Internal LAN TLS & Mobile CA Trust**:
  - Loopback-only gating on fresh installations until activated.
  - Gated LAN mode toggling with `system.manage` authorization.
  - Caddy internal TLS CA integration and certificate download (`GET /api/system/tls/root-ca`).
  - Step-by-step device-trust guides for iOS and Android enabling trusted secure contexts for smartphone camera capture over factory Wi-Fi.
- [x] **System Health & Redacted Diagnostic Telemetry**:
  - Health Dashboard (`/admin/system`) with 7-component matrix (Web, API, DB, Worker, Storage, Renderer, Backups).
  - Storage volume monitor with low-disk alerts (<10% or <2GB).
  - Last backup age tracking with warnings (>7 days).
  - One-click sanitized support bundle export for vendor assistance without leaking credentials or employee PII.
- [x] **Comprehensive Quality Gates**:
  - TypeScript typechecking passing across all turbo tasks (`pnpm typecheck`).
  - Vitest unit & integration tests passing across all packages (`pnpm test`).
  - Playwright multi-viewport E2E test suite passing (`pnpm test:e2e`).

#### Phase 11: Security & Privacy Review, Threat Modeling & Defensive Remediation

- [x] **Comprehensive Threat Model**:
  - Full threat assessment covering all 12 operational attack vectors: local unauthenticated PC user, malicious LAN adversary, compromised low-privilege operator, cross-tenant SaaS attacker, malicious file payloads (CSV/ZIP/images/SVG), session theft, curious print operators, lost `.hrbackup` files, renderer sandbox escape, supply chain/container risks, reverse proxy trust, and denial-of-service vectors.
- [x] **Security Vulnerability Remediation Register**:
  - **`SEC-CRIT-01` (HTML Injection in Physical Card Renderer)**: Implemented strict `escapeHtml()` entity encoding across all user-supplied employee and organization fields in `generateCardHtmlDocument` within `@hr/card-kit`.
  - **`SEC-CRIT-02` (Insecure Fallback Key in Crypto Service)**: Added mandatory `SYSTEM_ENCRYPTION_KEY` validation in `@hr/config` with min 32-character enforcement and guard throwing in production on insecure default fallback.
  - **`SEC-HIGH-01` (Cross-Tenant Org Logo Isolation)**: Added `Permission.PEOPLE_VIEW` authorization and strictly scoped `/api/organizations/:id/logo` to `request.user.tenantId`, removing cross-tenant fallback DB query.
  - **`SEC-HIGH-02` (Container Non-Root Execution)**: Added `USER node` (UID 1000) non-root user execution in `Dockerfile.api`, `Dockerfile.worker`, and `Dockerfile.web`.
  - **`SEC-HIGH-03` (CSRF & Origin Verification)**: Added Origin/Referer verification preValidation hook on mutating API endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) and configured strict Helmet CSP.
  - **`SEC-MED-01` (Memory Eviction in Auth Rate Limiter)**: Added automated TTL sweep and 5,000-entry capacity limit to in-memory login failure tracker map.
  - **`SEC-MED-02` (Export Download Audit Trail)**: Added `AuditAction.EXPORT_DOWNLOADED` event tracking on export ZIP stream downloads.
- [x] **Privacy & Data-Flow Inventory**:
  - Complete data classification matrix documented in `docs/security.md` covering Government Identity, Biographical Data, Biometrics/Photos, Authentication Secrets, and Card Snapshot Provenance.
- [x] **Comprehensive Quality Gates**:
  - TypeScript typechecking passing 100% across all 20 turbo tasks (`pnpm typecheck`).
  - Unit and integration tests passing with dedicated security regression suites (`pnpm test`).

#### Phase 12: Release-Quality Test Matrix, Accessibility & Validation Execution

- [x] **10-Journey Functional E2E Matrix (`apps/web/e2e/release-e2e-matrix.spec.ts`)**:
  - Full end-to-end multi-viewport Playwright execution covering all 10 critical user journeys:
    1. Fresh local activation ceremony and company profile setup (`/activate`, `/admin/company`).
    2. System Owner provisions custom roles and scoped user accounts (`/admin/roles`, `/admin/users`).
    3. HR Operator registers worker with Latin & Bengali script and photo (`/people/new`).
    4. HR Manager configures bilingual physical card template and assignment (`/cards/templates`, `/cards/assignments`).
    5. Print Operator inspects physical calibration and exact 60 × 90 mm geometry (`/cards/calibration`).
    6. Card replacement workflow with required reprint reason and revocation audit.
    7. Data export gating and sensitive field exclusion policy (`/import-export/export`).
    8. CSV & ZIP ingestion pipeline with pre-commit dry-run simulation (`/import-export/import`).
    9. AES-256-GCM encrypted backup generation and safe restore pre-flight (`/admin/backups`, `/admin/restore`).
    10. LAN secure context mode and root CA trust management (`/admin/system`).
- [x] **WCAG 2.2 AA Accessibility & Assistive Navigation Suite (`apps/web/e2e/accessibility-wcag.spec.ts`)**:
  - Automated `axe-core` accessibility scans passing with 0 violations across all major routes (`/`, `/login`, `/dashboard`, `/people`, `/people/new`, `/cards/calibration`).
  - Keyboard navigation, visible focus indicators, `tabIndex={0}` on scrollable table regions, and modal `Escape` key listeners verified.
  - 200% desktop zoom reflow test passing without critical horizontal clipping.
- [x] **Fault Injection, Concurrency & Chaos Suite (`apps/api/tests/reliability-chaos.test.ts`)**:
  - Optimistic locking collision detection (`ConcurrencyConflictError`).
  - AES-256-GCM ciphertext tampering and authentication tag tampering detection.
  - CSV formula injection sanitization (`=`, `+`, `-`, `@`, `\t`, `\r`).
  - Deterministic HMAC blind indexing stability and sensitive identifier masking.
- [x] **Multi-Viewport & Responsive Matrix**:
  - 90/90 tests passing across Desktop Chromium, Mobile Chrome (360×640 px), Tablet Chrome (768×1024 px), Desktop Standard (1280×800 px), and Desktop Wide (1440×900 px).
- [x] **Performance & Workload Benchmark (`tests/k6/load-test-matrix.js`)**:
  - k6 workload definitions for 50 VUs sustained concurrency with strict p95 $\le 350\text{ms}$ thresholds.
- [x] **Comprehensive Quality Gates**:
  - TypeScript typechecking passing 100% across all 20 turbo tasks (`pnpm typecheck`).
  - Unit and chaos test suites passing 100% (`pnpm test`).
  - Playwright multi-viewport release matrix passing **90/90 tests** (`pnpm test:e2e`).
  - Production Next.js build clean and passing (`pnpm build`).

#### Phase 13: On-Premises MVP Production Packaging & Clean-Machine Pilot

- [x] **Production Compose Mesh (`docker-compose.prod.yml`)**:
  - Pinned service images (`node:22-alpine`, `postgres:16.4-alpine`, `caddy:2.8.4-alpine`) with bounded CPU/RAM limits.
  - JSON-file log rotation (10MB max, 5 files) across all containers.
  - Isolated internal Docker bridge network (`hr_mesh_prod_network`); zero host port publishing for PostgreSQL (5432) or API (3001).
  - Dedicated persistent volumes with strict permission ownership: `hr_postgres_prod_data`, `hr_media_prod_data`, `hr_backup_prod_data`, `hr_caddy_prod_data`.
- [x] **Transparent Pilot Management Scripts (`pilot.sh` & `pilot.ps1`)**:
  - Unified commands for Linux and Windows: `install`, `start`, `stop`, `status`, `backup`, `upgrade`, `lan-enable`, `lan-disable`, and `support-bundle`.
  - Initial installation defaults to loopback-only binding (`127.0.0.1`) until activation ceremony finishes.
  - One-click LAN enablement with automated internal TLS and mobile Root CA download.
- [x] **Release Manifest, SBOM & Provenance**:
  - Cryptographic SHA-256 integrity manifest generated for all bundle files (`release/release-manifest.json`).
  - CycloneDX-compliant `release/sbom.json` documenting all production package dependencies with zero development fixtures.
  - Zero cloud dependencies, zero external CDNs, self-hosted Noto Sans and Noto Sans Bengali font assets.
- [x] **Pilot Runbooks & Acceptance Guidelines**:
  - Comprehensive Pilot Administrator Guide ([`docs/PILOT-RUNBOOK.md`](file:///d:/Github%20repos/hr-platform/docs/PILOT-RUNBOOK.md)).
  - Hardware, OS, and Firewall Prerequisites ([`docs/PREREQUISITES.md`](file:///d:/Github%20repos/hr-platform/docs/PREREQUISITES.md)).
  - Troubleshooting & Disaster Recovery Guide ([`docs/TROUBLESHOOTING.md`](file:///d:/Github%20repos/hr-platform/docs/TROUBLESHOOTING.md)).
  - Full Release Changelog ([`CHANGELOG.md`](file:///d:/Github%20repos/hr-platform/CHANGELOG.md)).

### Next Gate

- **MVP Pilot General Availability**: On-site clean-machine deployment and customer pilot execution.
