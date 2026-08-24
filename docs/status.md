# Project Status

## Current Status: Phase 4 Completed (Worker Registry, Employment Records & Sensitive Identity)

- **Active Phase:** Phase 4 Complete -> Ready for Phase 5 (Batch Worker Import, CSV/Excel Ingestion & Data Validation Engine)
- **Last Updated:** 2026-08-24

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

### Next Gate

- **Phase 8**: Card Issuance Lifecycle, Production Print Queues, Batch Imposition Export, and Revocation Workflow.
