---
trigger: always_on
---

# Workspace Rules

## 1. Context & Specification Review

- Read `docs/product-spec.md`, `docs/project-inputs.md`, `docs/decisions.md`, `docs/status.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/security.md`, and relevant architecture/security documents before planning a change.

## 2. Approved Technology Stack & Architecture Invariants

- Use the approved stack: TypeScript monorepo with pnpm workspaces + Turborepo, Next.js App Router, Tailwind CSS with owned Radix-based primitives, TanStack Query and Table, React Hook Form + Zod, Fastify (with TypeBox/JSON Schema), PostgreSQL with Prisma ORM, private filesystem / S3-compatible storage adapters, Sharp, Playwright/Chromium renderer worker, PostgreSQL-backed job queue, SSE for real-time capture, Caddy for reverse proxy/TLS, Docker Compose, Vitest, Playwright, axe-core, and self-hosted Noto Sans and Noto Sans Bengali.
- No substitutions or addition of extraneous infrastructure (e.g., Redis) without an approved architecture plan.

## 3. Code Inspection & Established Patterns

- Inspect existing code before editing.
- Preserve working behavior and do not replace established patterns without evidence.

## 4. Planning & Approval Workflow

- For any multi-file feature, database change, security change, or deployment change, create a plan artifact first.
- The plan must list affected files, data migrations, authorization checks, tests, rollback, risks, and unresolved decisions.
- Wait for approval before implementation.

## 5. Scope & Bounded Phases

- Work on one bounded phase at a time.
- Do not expand the product into payroll, attendance, unrestricted graphic design, RFID, native printer drivers, or other post-MVP features.

## 6. Data Sensitivity & Privacy

- Treat employee records, photos, dates of birth, government IDs, authentication data, exports, backups, and audit events as sensitive.
- Government identity is optional, sensitive, masked, and excluded by default from cards and exports unless explicitly requested.

## 7. Secrets & Fixtures Hygiene

- Never put secrets or real personal data in source, fixtures, screenshots, logs, telemetry, prompts, or Git.
- Use fictional fixtures and redacted evidence.

## 8. Registration & Account Creation Constraints

- Do not create a public signup route, endpoint, button, or hidden self-registration flow.
- Hosted first owners are provisioned solely by a separate vendor platform-admin flow.

## 9. Initial Bootstrap & Admin Credentials

- The local `admin/admin` credential may exist only on a brand-new installation, bound to loopback, with only activation routes allowed.
- Force immediate replacement, destroy the temporary hash, and keep LAN access disabled until activation finishes.
- Never create a vendor backdoor.

## 10. Authorization, Tenancy & Audit Logging

- Enforce authorization in the API with explicit permissions and default deny. Hiding a UI control is not authorization.
- Authentication, permission, and tenant enforcement apply to API routes, jobs, media, storage, SSE, imports, exports, backups, and renderer inputs.
- All tenant-owned records carry `tenant_id` from day one. Never trust a tenant identifier supplied by the browser; derive tenant scope from the authenticated session and enforce it in data access.
- Every sensitive mutation, reveal, and export needs an audit event.

## 11. Renderer Security & Isolation

- The renderer must not fetch arbitrary remote URLs, execute template-supplied code, or access arbitrary local files.

## 12. ID Card Dimensions & Layout Standards

- The default card format is custom 60 mm × 90 mm vertical, not ISO/CR80.
- The front is English and the back is Bangla.
- ISO ID-1 presets are alternatives.

## 13. Card Geometry & Deterministic Rendering

- Store card geometry in millimetres. PDF pages and PNG pixels must be derived deterministically.
- Exact-size PDF is the print master. PNG supports 150/300/600 DPI.
- The 60 × 90 mm content size at 300 DPI is about 709 × 1063 px before bleed.

## 14. Card Issue Immutability

- Issued cards store immutable printed-value and template-version snapshots.
- Updating a worker must not rewrite historical card issues.

## 15. Local-First & Offline-Capable Operation

- Local mode must work without external CDNs, hosted fonts, analytics, telemetry, or mandatory cloud calls.
- Bundle all runtime assets.

## 16. Logging & Redaction

- Do not log passwords, tokens, NIDs, full birth dates, images, exported rows, or backup contents.
- Mask sensitive identifiers.

## 17. File Upload Safety & Processing

- Validate file type by decoded content, not only extension or Content-Type.
- Limit size and pixels, strip EXIF, randomize storage keys, and keep uploads outside any executable/public directory.

## 18. Database Migrations & Backup Safety

- Use migrations for schema changes.
- Add reversible or forward-fix instructions.
- Create and verify a backup before a local production upgrade.

## 19. Verification & Quality Gates

- Every implementation must finish with formatter, typecheck, lint, unit tests, relevant integration/end-to-end tests.
- Browser verification is required for all user-visible changes. Backend-only changes require relevant API, integration, worker, and security verification.
- Report exact commands and results. Do not claim tests passed without running them.

## 20. Responsive UI & Accessibility Testing

- Verify UI work at 360, 768, 1280, and 1440 pixel widths, keyboard-only operation, visible focus, useful empty/loading/error states, and WCAG-conscious contrast.

## 21. Print Quality & Robustness Verification

- For print work, verify exact dimensions, long English and Bangla names, missing optional fields, no-photo fallback, both sides, 150/300/600 DPI, and 100% print instructions.

## 22. Documentation Synchronization

- Keep `docs/status.md`, `docs/decisions.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/security.md`, and operations documentation synchronized with accepted changes.

## 23. Subagent Roles & Area Ownership

- Use subagents only for independent, read-only discovery, testing, or review tasks with non-overlapping ownership.
- One agent owns a code area at a time.

## 24. Destructive & High-Risk Operation Safeguards

- Never delete user data, reset a database, rotate credentials, provision paid cloud resources, change DNS, or deploy to production without an explicit approved target and confirmation.
- Do not commit, push, publish, provision infrastructure, or deploy without explicit authorization.

## 25. Phase Completion Requirements

- End every phase with: summary, files changed, migrations, permissions enforced, test evidence, screenshots/artifacts, known limitations, operational notes, and the recommended commit message.
