---
name: verify-phase
description: >-
  Executes comprehensive quality gates and browser/print verifications for a completed phase.
  Runs formatters, typechecks, linters, unit/integration tests, Playwright tests, multi-viewport browser checks,
  console/network audit, and produces a verification artifact with pass/fail verdict.
---

# Workflow: /verify-phase

Use this workflow at the conclusion of every bounded phase or feature implementation to rigorously validate quality, stability, responsiveness, security, and print standards.

## Procedure

### 1. Diff Inspection & Scope Validation

- Inspect git diff (`git diff`, `git status`) for the current phase.
- Ensure no out-of-scope files or unrelated changes were introduced.

### 2. Automated Quality Gates

Execute full pipeline checks and capture exact command invocations and outputs. Never weaken, skip, or mock tests to force a pass:

1. **Code Formatting**: Check code style (e.g., `pnpm format:check` or equivalent).
2. **Type Checking**: Run strict TypeScript checks across all monorepo packages (`pnpm typecheck` or `pnpm turbo run typecheck`).
3. **Linting**: Run static analysis and linter rules (`pnpm lint` or `pnpm turbo run lint`).
4. **Unit & Integration Tests**: Run Vitest suite (`pnpm test` or `pnpm turbo run test`) validating domain models, authorization policies, schema parsers, and workers.
5. **Phase-Specific Security & Performance Checks**: Execute security assertions (tenant isolation, EXIF stripping, CSV injection prevention, loopback activation) and load/smoke benchmarks.

### 3. Local Application Startup & Live Verification

- Launch the local development application using the documented local command (e.g. `pnpm dev` or `docker compose up`).
- Ensure all dependent services (PostgreSQL, API server, Next.js frontend, Playwright renderer worker) start cleanly without unhandled exceptions.

### 4. Browser & Responsive Verification

Using automated Playwright tests or browser inspection tools, verify all user-visible changes across required breakpoints:

- **Mobile Viewport**: `360px` width
- **Tablet Viewport**: `768px` width
- **Desktop Standard**: `1280px` width
- **Desktop Widescreen**: `1440px` width

#### Interactive & Accessibility Verification:

- **Keyboard Navigation**: Complete all primary flows using keyboard-only input (`Tab`, `Shift+Tab`, `Enter`, `Space`, arrow keys).
- **Focus States**: Verify high-visibility focus indicators on all interactive controls.
- **UI States**: Validate loading skeletons, empty states, input error feedback, and success notifications.
- **Console & Network Audit**: Inspect browser developer console for zero unhandled warnings/errors and verify zero unauthorized external network requests (strict offline/local-first rule).

### 5. Print & Render Quality Verification (When Relevant)

- **Physical Dimensions**: Check generated PDF/PNG against exact target millimetres (default 60 mm × 90 mm vertical, 3 mm bleed, 3 mm safe margin).
- **Resolution & DPI**: Confirm 150/300/600 DPI output calculations (e.g., ~709 × 1063 px for 60×90mm at 300 DPI).
- **Bilingual Rendering**: Confirm English front and Bangla back text shaping using self-hosted Noto Sans and Noto Sans Bengali.
- **Edge Case Fixtures**: Verify cards with long names, missing optional fields, and missing photo fallback.

### 6. Produce Verification Artifact (`walkthrough.md`)

Record exact evidence in `walkthrough.md` including:

- Exact commands executed and their output summaries.
- Viewport screenshots at 360px, 768px, 1280px, and 1440px.
- Print measurements and visual comparisons.
- Identified defects or known limitations.
- Explicit **PASS** or **FAIL** verdict.
