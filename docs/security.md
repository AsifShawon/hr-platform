# Security & Threat Model Documentation

**Project:** Local-First HR Employee ID-Card Platform  
**Status:** Baseline Established (Phase 0)  
**Revision:** 1.0 (2026-08-24)

---

## 1. Core Security Principles & Rules

1. **No Public Registration**: Self-registration endpoints, public signup buttons, or self-service tenant creations are strictly forbidden.
2. **Default-Deny Authorization**: Every API route mandates authentication and explicit permission checks. Hiding UI components does not constitute authorization.
3. **Protected Local Bootstrap**:
   - `admin/admin` is allowed only on a fresh installation.
   - Bound strictly to `127.0.0.1` (loopback).
   - Only activation routes accessible until password is changed.
   - LAN access remains disabled until bootstrap hash is destroyed.
4. **Data Isolation & Tenant Scoping**:
   - Never trust tenant identifiers submitted in request bodies or query params.
   - Tenant scope is derived exclusively from the verified server-side session.
5. **Renderer Isolation**:
   - Playwright / Chromium renderer worker operates in an isolated environment.
   - Network access is disabled for user templates.
   - Arbitrary local filesystem traversal and external resource fetching are forbidden.
6. **Logging & Redaction**:
   - Passwords, session tokens, NIDs, employee photos, and full dates of birth are NEVER logged in stdout, stderr, or audit tables.
