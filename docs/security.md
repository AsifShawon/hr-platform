# Security Architecture, Threat Model & Privacy Governance

**Project:** Local-First HR Employee ID-Card Platform  
**Status:** Comprehensive Security & Privacy Review Verified (Phase 11)  
**Revision:** 2.0 (2026-08-25)

---

## 1. Core Security Principles & Invariants

1. **Zero Public Registration**: Self-registration endpoints, public signup buttons, or self-service tenant creations are strictly forbidden. All users are provisioned by authenticated administrators or platform owners.
2. **Default-Deny Authorization**: Every API route mandates authentication and explicit role-based permission checks (`fastify.requirePermission(...)`). Hiding UI controls does not constitute authorization.
3. **Protected Local Bootstrap**:
   - `admin/admin` is allowed only on a fresh installation.
   - Bound strictly to `127.0.0.1` (loopback).
   - Only activation routes are accessible until the password is changed.
   - LAN access remains disabled until the bootstrap hash is destroyed.
4. **Data Isolation & Tenant Scoping**:
   - Never trust tenant identifiers submitted in request bodies or query params.
   - Tenant scope is derived exclusively from the verified server-side session and enforced across all database queries.
5. **Renderer Isolation & HTML Sanitization**:
   - Playwright / Chromium renderer operates with severed outbound network access (`page.route('**')` aborts all requests).
   - All user-supplied worker names, departments, titles, and labels are HTML-entity-escaped via `escapeHtml()` in `@hr/card-kit` before template interpolation.
6. **Logging & Redaction**:
   - Passwords, session tokens, NIDs, employee photos, and full dates of birth are NEVER logged in stdout, stderr, or audit tables.
7. **Container Non-Root Execution**:
   - Production Dockerfiles run as unprivileged `USER node` (UID 1000).

---

## 2. Threat Model Matrix

| Threat Vector | Description & Scenario | Controls & Mitigations |
| :--- | :--- | :--- |
| **Local Host PC Attacker** | Unauthenticated user sitting at factory workstation attempts loopback access or local file inspection. | Activation wizard destroys bootstrap `admin/admin`; encrypted backups; storage stored outside public web roots. |
| **Malicious LAN User** | Attacker on factory Wi-Fi intercepts or queries unauthenticated endpoints. | 5-minute single-use QR camera tokens with 256-bit entropy; Caddy internal TLS; IP-based rate limiting. |
| **Compromised Low-Privilege User** | HR Operator or Print Operator attempts privilege escalation or unauthorized data access. | Default-deny RBAC; explicit permission checks (`identity.reveal`, `exports.create`, `users.manage`); Last Owner lockout prevention. |
| **Cross-Tenant SaaS Attacker** | Attacker tampers with tenant UUIDs in request bodies or query paths to access other tenant records. | Session-derived `tenant_id` used across all core services and DB queries. All media and org assets strictly tenant-scoped. |
| **Malicious Input (CSV/ZIP/Images)** | Attacker uploads CSV formula injection, Zip Slip traversal, decompression bombs, or SVG scripts. | RFC 4180 CSV parser neutralizes formulas (`=`, `+`, `-`, `@`); Zip Slip & ratio limits enforced; Sharp EXIF stripped. |
| **Print Template / Renderer Abuse** | Attacker injects HTML/JS scripts or SSRF payloads in worker names or custom labels. | `escapeHtml` sanitization in `@hr/card-kit`; Playwright network abortion; isolated browser contexts. |
| **Lost Backup Bundle** | `.hrbackup` bundle stolen from removable media or backup network share. | AES-256-GCM binary envelope with PBKDF2 (100k iters); 16-byte auth tag; self-verification. |
| **Container Breakout & Supply Chain** | Compromised runtime dependency attempting root privilege escalation. | Multi-stage Docker builds with non-root `USER node` runtime execution. |

---

## 3. Privacy & Data-Flow Inventory

### Data Classification Matrix

| Data Category | Sensitive Fields | Storage Format | Masking & Redaction Policy | Required Permission |
| :--- | :--- | :--- | :--- | :--- |
| **Government Identity** | Smart NID, NID, Passport, Birth Certificate | AES-256-GCM ciphertext + HMAC blind index in DB | Masked by default (`••••••••8901`). Plaintext only on audited 30s reveal. Excluded from exports unless explicitly selected. | `identity.reveal`, `identity.edit` |
| **Biographical Data** | Date of Birth, Gender, Blood Group, Names | Normalized DB columns | Masked year-only (`YYYY-••-••`) in non-sensitive exports; full DOB never logged in audit details. | `people.view`, `people.edit` |
| **Biometric & Media** | Portrait Photos, Master Raw, Card 300 DPI, Avatar Thumbnails | Private filesystem `/storage/uploads/photos/` outside web root | EXIF metadata stripped; served via authorized streaming route with cache controls. | `people.view`, `people.edit` |
| **Authentication Secrets** | Passwords, Session Tokens, Recovery Codes, Backup Passphrases | Argon2id hashes, SHA-256 token hashes, PBKDF2 in memory | Plaintext NEVER stored or logged in stdout/stderr/audit events. | System only |
| **Card Snapshot Provenance** | Printed Serial, Snapshot Layout, Worker Name at Issue | Immutable JSON snapshot in `template_versions` / `card_issues` | Opaque random UUID card serial; zero sensitive NIDs embedded in barcodes/QRs. | `cards.print`, `cards.issue` |

---

## 4. Remediation Register & Residual Risk Analysis

| Finding ID | Severity | Status | Remediation Summary |
| :--- | :--- | :--- | :--- |
| `SEC-CRIT-01` | **CRITICAL** | **RESOLVED** | Implemented `escapeHtml` utility in `@hr/card-kit` escaping all dynamic worker, organization, and label fields in `generateCardHtmlDocument`. |
| `SEC-CRIT-02` | **CRITICAL** | **RESOLVED** | Added `SYSTEM_ENCRYPTION_KEY` validation in `@hr/config` with min 32-char enforcement and production insecure key guard in `crypto.service.ts`. |
| `SEC-HIGH-01` | **HIGH** | **RESOLVED** | Enforced `Permission.PEOPLE_VIEW` and session-derived `tenant_id` on `/api/organizations/:id/logo`. |
| `SEC-HIGH-02` | **HIGH** | **RESOLVED** | Added `USER node` non-root execution directive in `Dockerfile.api`, `Dockerfile.worker`, and `Dockerfile.web`. |
| `SEC-HIGH-03` | **HIGH** | **RESOLVED** | Added Origin/Referer verification preValidation hook for mutating API requests and configured strict Helmet CSP. |
| `SEC-MED-01` | **MEDIUM** | **RESOLVED** | Added automated TTL eviction and 5,000-entry capacity cap to in-memory login failure rate limiter. |
| `SEC-MED-02` | **MEDIUM** | **RESOLVED** | Added audit logging (`AuditAction.EXPORT_DOWNLOADED`) on export ZIP download stream. |

### Residual Risk Report
- **Zero Critical or High unresolved findings remain.**
- Accepted operational invariants (Playwright `--no-sandbox` with offline interception, phone handoff 256-bit token entropy, blind indexing) operate with verified compensating controls.
