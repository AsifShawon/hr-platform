# Project Decisions Log

## DEC-0001: Consolidated Workspace Governance Rules

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Initial rules were duplicated across root `GEMINI.md` and `AGENTS.md`. Antigravity workspace rules require a single authoritative source.
- **Decision:**
  1. Created `.agents/rules/00-core.md` with `trigger: always_on` as the single authoritative workspace rule file.
  2. Removed redundant root `GEMINI.md` and `AGENTS.md`.
  3. Formulated all 25 core governance constraints (stack invariants, authorization, tenancy, card dimensions, offline capability, verification standards, and phase requirements).
- **Consequences:** All future phases and agents follow `.agents/rules/00-core.md` uniformly.

## DEC-0002: Monorepo Foundation & Package Architecture

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Need a modular, strictly typed architecture shared across Web, API, and Worker without circular dependencies or premature product bloat.
- **Decision:**
  1. Adopted pnpm workspaces + Turborepo for monorepo orchestration.
  2. Structured applications into `apps/web` (Next.js 15), `apps/api` (Fastify 5), and `apps/worker` (background jobs).
  3. Structured shared libraries into `@hr/config`, `@hr/domain`, `@hr/schemas`, `@hr/db`, `@hr/ui`, `@hr/card-kit`, `@hr/i18n`, and `@hr/fixtures`.
  4. Enforced strict unidirectional dependency flow from apps -> packages -> domain.
  5. Implemented multi-stage Dockerfiles and Caddy reverse proxy for local HTTP and HTTPS LAN development.
- **Consequences:** Enables zero-drift sharing of types, validation schemas, and card calculations while isolating server, renderer, and web concerns.

## DEC-0003: Authentication, Local Bootstrap & Audit Architecture

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Need secure local bootstrap and hosted tenant activation without vendor backdoors, plain password storage, or token leakage into client storage.
- **Decision:**
  1. Adopted Argon2id password hashing (`m=65536 KiB`, `t=3`, `p=1`) via `@node-rs/argon2`.
  2. Implemented server-side opaque sessions in PostgreSQL with SHA-256 token hashing and `HttpOnly`, `SameSite=Lax`, `Secure` cookies. Zero session tokens in `localStorage`.
  3. Created dual-timer session expiration (30m sliding idle window + 24h absolute ceiling) with automatic rotation on authentication and privilege changes.
  4. Implemented local loopback-only unactivated state locking `admin/admin` to `/activate` until strong password replacement, 8 one-time emergency recovery codes, and backup responsibilities are confirmed. Temporary bootstrap hash is destroyed upon activation.
  5. Implemented strict `default-deny` Fastify RBAC middleware, Last Active System Owner protection guard, server-derived `tenant_id`, and auto-redacted immutable audit logs.
- **Consequences:** Provides air-gapped, zero-cloud-telemetry credential security with multi-role tenant isolation.

## DEC-0004: Organization Model, Hierarchy Tree Integrity & Media Security

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Need an organizational hierarchy model supporting multi-org and multi-location factory operations, self-referencing unit trees, secure logo processing, and granular custom roles without hierarchy corruption or card snapshot invalidation.
- **Decision:**
  1. Created `Location` (factory, site, office, branch) and self-referencing `OrgUnit` models with strict `tenantId` and `organizationId` foreign keys.
  2. Implemented an iterative depth-first cycle prevention algorithm in `OrgUnitService` that prevents assigning a unit as its own parent or moving a parent into any of its descendants.
  3. Enforced case-insensitive sibling name uniqueness under the same parent node while allowing identical names under distinct parent branches.
  4. Implemented soft archiving (`isArchived`) for organizational units so that historical card snapshots and audit events remain immutable and referentially valid when an organizational branch is retired.
  5. Implemented a secure logo upload pipeline with magic byte inspection, 2MB size cap, automated EXIF stripping via Sharp, SVG script tag sanitization, and isolated private storage outside web-accessible roots.
  6. Structured custom roles with a 6-group permission checklist and support for organization- and location-scoped grants (`ScopedRoleGrant`).
- **Consequences:** Guarantees hierarchy integrity, cross-tenant isolation, safe historical card provenance, and flexible multi-site authorization.

## DEC-0005: Decoupled Person-Employment Architecture and Cryptographic Identity Protection

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Need a worker registry capable of tracking employee rehires, title changes, multi-unit assignments, and sensitive government IDs without corrupting human identity, leaking unmasked PII, or rewriting historical card issue snapshots.
- **Decision:**
  1. Decoupled `Person` (representing immutable human identity with flexible multi-script name fields) from `Employment` (representing organizational contract, employee number, title, status lifecycle, and tenure).
  2. Designed non-Western name structure supporting `displayName` (required), optional `displayNameLatin`, `displayNameNative` (Bengali `বাংলা`), `givenName`, `familyName`, `otherNames`, and `phoneticName`.
  3. Replaced simplistic active booleans with a 5-state lifecycle enum: `PREBOARDING`, `ACTIVE`, `ON_LEAVE`, `INACTIVE`, `SEPARATED`.
  4. Encrypted government document numbers at rest using AES-256-GCM.
  5. Implemented HMAC-SHA256 blind indexing for exact-match duplicate detection without decrypting database rows or exposing raw numbers in database indexes.
  6. Enforced default masking across all standard queries (`••••••••8901`) with an audited, short-duration reveal workflow requiring explicit `identity.reveal` permission and client-side countdown timer.
  7. Implemented optimistic concurrency controls via `version` integer columns on `Person` and `Employment` models.
  8. Enforced a strict **Zero Auto-Merge Policy** with conservative duplicate risk warnings for operator review.
- **Consequences:** Protects worker privacy, prevents concurrent update race conditions, enables audit compliance, and preserves historical card snapshot integrity across employee rejoining and tenure changes.

## DEC-0006: In-Browser Photo Studio, Zero-PII QR Phone Handoff via SSE, and Defensive Sharp Processing Pipeline

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Need a secure, reliable, cross-device workflow for capturing, cropping, and processing employee portraits for physical ID card printing without leaking GPS/EXIF metadata, overloading server memory with decompression bombs, exposing PII in transfer tokens, or leaving camera hardware streams active.
- **Decision:**
  1. Built an in-browser camera capture studio using `navigator.mediaDevices.getUserMedia` with pre-permission guidance, device switcher, facing mode toggle on mobile, 60×90mm portrait framing overlay, 3s countdown, and a 3-shot burst capture buffer.
  2. Enforced hardware stream cleanup (`track.stop()`) on modal close, cancel, and route transitions.
  3. Implemented a zero-PII smartphone handoff mechanism:
     - 5-minute single-use cryptographic 256-bit QR token (`/capture/[token]`).
     - Real-time Server-Sent Events (SSE) stream (`/api/media/handoff/:slotId/events`) updating desktop state without client polling.
     - Mobile capture page (`apps/web/app/capture/[token]/page.tsx`) allowing direct camera capture and single-use atomic upload to the server.
  4. Implemented a defensive image processing pipeline via Sharp:
     - Magic byte verification for JPEG, PNG, and WebP (rejecting malicious extensions and SVGs).
     - 10MB size limit and 16 megapixel ceiling to prevent decompression bombs.
     - Automated stripping of all EXIF, GPS, and camera metadata.
     - Automatic generation of 3 deterministic derivatives: Master Normalized, Card-Ready 300 DPI (709×1063 px for 60×90mm cards), and 150×150 px Avatar Thumbnail.
     - Private file storage outside the web root (`storage/uploads/photos/`) with tenant-isolated access controls.
  5. Implemented non-blocking image quality heuristics (resolution and luminance checks) without remote or facial biometrics.
- **Consequences:** Ensures physical card print fidelity, strips private location metadata, guarantees high UX performance, and delivers secure air-gapped phone capture capabilities.

## DEC-0007: Physical Millimetre Card Geometry, Immutable Versioned Template Engine, and Constrained Bilingual Presets

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Need a physical card-format and template system for industrial identity cards with precise physical dimensions (60 × 90 mm vertical default), immutable card issue snapshots, bilingual (English front / Bangla back) typography, deterministic multi-level assignment, and zero unconstrained free-form canvas drift.
- **Decision:**
  1. Built physical geometry engine in `@hr/card-kit` storing dimensions in millimetres (`widthMm`, `heightMm`, `bleedMm`, `safeAreaMm`) and calculating deterministic pixel derivatives for 150, 300, and 600 DPI.
  2. Designated Company Vertical (60 mm × 90 mm) as the standard factory default, distinct from ISO/CR80, with ISO ID-1 Horizontal and Vertical presets as alternatives.
  3. Implemented immutable `TemplateVersion` records carrying complete JSON layout snapshots, field bindings, typography, and SHA-256 integrity digests. Publishing locks the version; editing automatically forks a new draft version.
  4. Created 6 factory-ready MVP presets (_Classic Vertical_, _Modern Stripe_, _Photo Focus_, _Factory / Industrial_, _Contractor Badge_, _Visitor Pass_) with structured customization forms and zero unrestricted drag-and-drop HTML/JS injection risk.
  5. Implemented bilingual rendering with self-hosted Noto Sans and Noto Sans Bengali, adaptive font sizing to prevent text overflow for long names, and graceful Latin fallback for missing Bengali script.
  6. Implemented a deterministic 6-level template assignment hierarchy: `Worker Override` > `Job Category` > `Org Unit` > `Location` > `Org Default` > `System Default`.
  7. Enforced opaque card serials only in QR/barcode payloads with zero PII.
- **Consequences:** Guarantees print repeatability, protects historical card issue provenance, ensures bilingual readability across industrial sites, and prevents arbitrary code execution in template layouts.

## DEC-0008: Deterministic Card Renderer Worker, PDF MediaBox Verification & Print Calibration Protocol

- **Date:** 2026-08-24
- **Status:** Accepted
- **Context:** Need deterministic, physically accurate PDF and high-DPI PNG generation for 60 × 90 mm identity cards, sheet imposition on A4/Letter stock with front-to-back duplex alignment, zero-trust network isolation in the rendering worker, and physical printer calibration tools.
- **Decision:**
  1. Built headless Chromium rendering engine in `apps/worker` with isolated page contexts and zero-trust outbound request blocking (`page.route('**')` aborts all external network attempts).
  2. Implemented exact-size PDF generation using CSS physical `@page` declarations (`preferCSSPageSize: true`, `margin: 0`, `printBackground: true`), yielding exact $170.08 \times 255.12\text{ pt}$ MediaBox for 60 × 90 mm cards.
  3. Integrated `pdf-lib` automated MediaBox inspection in worker tests verifying physical page bounds within $\pm 0.5\text{ mm}$ tolerance.
  4. Implemented exact pixel dimensions for PNG exports at 150, 300, and 600 DPI ($\text{pixels} = \text{round}(\text{mm} / 25.4 \times \text{DPI})$). 300 DPI master is exactly $709 \times 1063\text{ px}$.
  5. Implemented A4 and US Letter multi-card sheet imposition in `@hr/card-kit` with long-edge duplex column mirroring (`backColumns = [...frontColumns].reverse()`) ensuring zero front-to-back misalignment when flipped on a duplex printer.
  6. Built Print Calibration Studio (`/cards/calibration`) offering printable A4/Letter calibration sheets with a 50.00 mm precision test ruler, 60 × 90 mm reference box, and caliper measurement logging with tolerance validation ($\pm 0.3\text{ mm}$ ruler, $\pm 0.5\text{ mm}$ card box).
  7. Enforced the critical "100% / Actual Size" printing invariant and documented physical measurement standards in `docs/print-calibration.md`.
- **Consequences:** Provides reproducible print masters, eliminates paper scaling distortions, ensures duplex registration alignment, and guarantees security isolation for all card rendering tasks.

## DEC-0010: Local Product Recoverability, Encrypted Backups, Disaster Recovery & Internal LAN TLS

- **Date:** 2026-08-25
- **Status:** Accepted
- **Context:** Need an air-gapped on-premises backup, recovery, and operations architecture capable of creating verifiable encrypted bundles, safe dry inspections, disaster recovery when web UI is unavailable, internal LAN TLS trust for mobile camera capture, and low-disk warnings without vendor backdoors or secret leakage.
- **Decision:**
  1. Implemented `.hrbackup` binary envelope with 64-byte header (`HRBK`, format version 1, PBKDF2/Argon2id salt, and AES-256-GCM 12-byte nonce).
  2. Encrypted the internal archive (database records, media assets, configuration, and SHA-256 manifest digests) with AES-256-GCM authenticated encryption. Zero passphrase storage in database, filesystem, or bundle.
  3. Built automatic self-verification testing authentication tags and manifest digests immediately upon backup creation.
  4. Implemented a 3-step Restore Wizard requiring System Owner re-authentication, pre-flight dry inspection, maintenance mode, and an automatic pre-restore rollback safety snapshot.
  5. Built CLI disaster recovery utility (`apps/api/src/scripts/restore-cli.ts`) for recovery via direct physical server access.
  6. Implemented loopback gating on fresh installs, LAN mode toggling, Caddy internal TLS CA certificate export, and mobile device-trust guides for iOS and Android.
  7. Built System Health Dashboard (`/admin/system`) with component matrix, low disk space warnings (<10% or <2GB), and one-click redacted support bundle generation.
- **Consequences:** Guarantees data recoverability, air-gapped security, zero unauthorized LAN exposure, and reliable smartphone camera capture across on-premises factory networks.
