# HR Platform Release Changelog

All notable changes to the HR Platform MVP are documented in this file.

---

## [v1.0.0-pilot.1] - 2026-08-25

### Milestone: On-Premises MVP Production Packaging & Clean-Machine Pilot
- **Production Container Mesh**: Pinned `docker-compose.prod.yml` specification with resource caps (CPU/RAM limits), `json-file` log rotation (10MB, 5 files), health checks, isolated internal mesh, and named persistent volumes (`hr_postgres_prod_data`, `hr_media_prod_data`, `hr_backup_prod_data`, `hr_caddy_prod_data`).
- **Pilot Management Scripts**: Transparent, auditable `pilot.sh` (Linux) and `pilot.ps1` (Windows) scripts providing `install`, `start`, `stop`, `status`, `backup`, `upgrade`, `lan-enable`, `lan-disable`, and `support-bundle`.
- **Protected Loopback Gating**: Fresh installations strictly bind to `127.0.0.1` until the initial activation ceremony replaces temporary bootstrap credentials and LAN mode is deliberately activated.
- **Release Manifest & SBOM**: Automated bundler script generating cryptographic SHA-256 integrity digests in `release-manifest.json` and CycloneDX `sbom.json` documenting all production package dependencies with zero development fixtures.
- **Operational Documentation**: Complete Administrator Runbook (`docs/PILOT-RUNBOOK.md`), Hardware/Software Prerequisites (`docs/PREREQUISITES.md`), and Troubleshooting/Disaster Recovery Guide (`docs/TROUBLESHOOTING.md`).

---

## [v0.12.0] - 2026-08-25
### Milestone: Release-Quality Test Matrix, Accessibility & Chaos Validation
- Full 10-journey functional E2E test matrix passing 10/10 journeys on Chromium.
- WCAG 2.2 AA accessibility audit passing with 0 axe-core violations across all application routes.
- Multi-viewport responsive verification (90/90 tests passing across Desktop, Mobile 360px, Tablet 768px, and Wide 1440px).
- Chaos and fault injection test suite verifying AES-256-GCM ciphertext tampering detection, optimistic locking collision handling, and CSV formula injection sanitization.

---

## [v0.11.0] - 2026-08-25
### Milestone: Security & Privacy Review, Threat Modeling & Defensive Remediation
- Comprehensive threat model covering all 12 operational attack vectors.
- Strict HTML entity escaping in physical card HTML generation (`@hr/card-kit`).
- CSRF Origin/Referer verification hook on mutating endpoints.
- Non-root user execution (`USER node`) across container images.

---

## [v0.10.0] - 2026-08-24
### Milestone: Local Product Recoverability, Encrypted Backups & System Health
- Authenticated AES-256-GCM encrypted backup bundles (`.hrbackup`) with Argon2id key derivation and self-verifying manifests.
- Privileged 3-step restore wizard with pre-flight dry inspection and automatic rollback safety snapshots.
- Internal LAN TLS integration with Caddy Root CA certificate management.

---

## [v0.7.0] - 2026-08-24
### Milestone: Deterministic, Physically Accurate Card Rendering & Print Calibration
- Headless Chromium print renderer generating exact-size master PDFs and high-resolution 300/600 DPI PNGs (exact 709 × 1063 px for 60 × 90 mm).
- A4/Letter duplex sheet imposition math with long-edge column mirroring.
- Physical printer calibration studio (`/cards/calibration`) with caliper measurement logging.

---

## [v0.6.0] - 2026-08-24
### Milestone: Physical Card-Format Engine & Constrained Bilingual Template System
- Physical millimetre geometry engine with 60 × 90 mm vertical factory standard preset.
- Versioned immutable card template snapshots with SHA-256 digests.
- 6 constrained MVP card presets with bilingual English/Bengali typography.

---

## [v0.5.0] - 2026-08-24
### Milestone: Secure Employee-Photo Workflow & Phone Handoff
- In-browser portrait camera capture studio with live 60 × 90 mm aspect ratio overlay.
- Zero-PII phone handoff via single-use QR codes and real-time SSE.
- Sharp defensive media pipeline stripping EXIF and generating 300 DPI card derivatives.

---

## [v0.4.0] - 2026-08-24
### Milestone: Worker Registry, Employment Records & Sensitive Identity Protection
- Separation of immutable Person human identity from historical Employment records.
- AES-256-GCM encryption at rest for government IDs with HMAC-SHA256 blind indexing.
- Ephemeral audited NID reveal countdown dialogs.

---

## [v0.3.0] - 2026-08-24
### Milestone: Company Administration & Organization Hierarchy Model
- Multi-organization model with branding palettes, timezone, and logo processing.
- N-level organizational unit tree hierarchy with depth-first cycle prevention.

---

## [v0.2.0] - 2026-08-24
### Milestone: Authentication, Account Activation, Sessions & Audit Trail
- Loopback-only bootstrap ceremony replacing initial credentials with Argon2id parameters.
- Server-side opaque sessions with dual-timer expiry and session rotation.
- Default-deny RBAC and immutable audit logging.

---

## [v0.1.0] - 2026-08-24
### Milestone: Shared Design System, Landing Page & Sign-In Shell
- Deep Teal design system and owned accessible Radix UI primitives.
- Self-hosted Noto Sans and Noto Sans Bengali font assets.
