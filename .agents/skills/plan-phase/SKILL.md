---
name: plan-phase
description: >-
  Prepares a comprehensive, structured implementation plan for a bounded phase of the HR platform.
  Reads specifications, inspects repository state, analyzes UX/data/security/permissions, and produces
  an implementation plan artifact before execution.
---

# Workflow: /plan-phase

Use this workflow whenever planning a new bounded phase, multi-file feature, schema migration, authorization adjustment, or architectural update.

## Procedure

### 1. Specification & Context Intake

Read and synthesize requirements from repository documentation before formulating any changes:

- `docs/product-spec.md`
- `docs/project-inputs.md`
- `docs/decisions.md`
- `docs/status.md`
- `docs/architecture.md` (if present)
- `docs/data-model.md` (if present)
- `docs/security.md` (if present)

### 2. Codebase & State Discovery

- Run safe, read-only discovery commands and file inspections to determine what is already implemented versus what remains.
- Verify dependency graph, package boundaries (`apps/web`, `apps/api`, `apps/worker`, `packages/*`), database models, and existing tests.

### 3. Produce Implementation Plan Artifact

Generate or update the `implementation_plan.md` artifact covering all required architectural and quality sections:

1. **Phase Scope & Objectives**: Clear boundaries of what is built in this phase.
2. **Assumptions & Prerequisites**: Baseline state, dependencies, and environment constraints.
3. **UX & User Flows**: Step-by-step user interaction, responsive layouts (360px, 768px, 1280px, 1440px), empty/loading/error states.
4. **Data & Schema Changes**: Entities, fields, Prisma schema updates, migrations, and seed fixture updates (fictional data only).
5. **API & Contract Specifications**: Endpoints, schemas (TypeBox/Zod), request/response models, SSE channels.
6. **Authorization & Permission Matrix**: Explicit permissions checked (`default-deny`), tenant isolation scoping (`tenant_id`), audit logging requirements.
7. **Security & Privacy Safeguards**: Sensitive data masking (e.g. NID), EXIF stripping, upload validation, loopback/LAN boundaries, renderer isolation.
8. **Affected Files & Directory Changes**: Grouped by component with clear `[NEW]`, `[MODIFY]`, or `[DELETE]` annotations.
9. **Test Plan**: Unit tests, integration tests, contract tests, security tests, and performance benchmarks.
10. **Browser & Print Verification Plan**: Viewport checks (360px, 768px, 1280px, 1440px), keyboard accessibility, focus indicators, physical print dimensions (e.g., 60×90mm, DPI scaling).
11. **Migration & Rollback Strategy**: Forward-fix strategy and reversible migration instructions.
12. **Risks & Blockers**: Unresolved technical decisions, hardware assumptions, or third-party constraints.
13. **Explicit Out-of-Scope Items**: Features reserved for subsequent phases (e.g., payroll, attendance, RFID, unrestricted canvas).

### 4. Stop for User Approval

- **Do NOT execute or write application code immediately.**
- Present the plan artifact and highlight critical design choices or open questions for user review.
- Wait for explicit user approval before proceeding to implementation.
