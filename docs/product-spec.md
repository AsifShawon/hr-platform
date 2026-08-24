# Local-First HR ID Card Platform — MVP Product Brief

**Working concept:** an international, local-first employee registry and bilingual ID-card issuance product that can later become a hosted SaaS.  
**Prepared:** 24 August 2026  
**Revision:** 2 — landing/authentication, protected local bootstrap, card-dimension system, bilingual default and final technology stack

## 1. Executive recommendation

Build an **employee identity and card-issuance system**, not a generic graphic-design tool and not a full HR/payroll system.

The MVP should let an authorized company user:

1. Move from a polished public landing page to a branded sign-in page without public self-signup.
2. Configure a company, its sites, users, roles and flexible department/section hierarchy.
3. Add or import workers, including employment details and an optional government identity record.
4. Capture a photo from an attached camera or phone, or upload a file; crop and approve it.
5. Choose among professional card designs and dimensions, with a default **60 mm × 90 mm vertical card: English front and Bangla back**.
6. Generate one or many print-ready cards, record issuance/reprints/revocation, and retain an audit trail.
7. Export portable data as a ZIP containing UTF-8 CSV plus image files, and create encrypted backups that can be restored.

For the first release, use a **constrained template builder**—logo, colors, front/back layout, enabled fields, QR/barcode, and typography—rather than an unrestricted Canva-like canvas. A full drag-and-drop designer is a separate product-sized feature and is not necessary to prove the core workflow.

The recommended first deployment is an **on-premises web application on one Windows/Linux PC or small company server**, accessed from browsers on the local network. Hosted customers are provisioned by the product operator; there is no public signup endpoint. A local installation starts with a tightly restricted temporary `admin` / `admin` bootstrap only if that credential is required: it is loopback-only, forces an immediate password change, blocks all data access and keeps LAN access disabled until activation is complete. There must be no vendor backdoor.

Keep one tenant/workspace in the local product but put `tenant_id` on domain records from day one, so the same core can later serve many SaaS tenants.

## 2. What the research says

The market separates into three groups:

| Product category                                                    | What it does well                                                                     | Gap to exploit                                                                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Broad HR systems such as Jibika Plexus                              | HR records, attendance, payroll, approvals, mobile functions                          | Card issuance is one module inside a much larger and locally oriented suite                                                                                            |
| Design-first tools such as Canva                                    | Attractive templates, branding, collaborative visual editing                          | Weak employee database, issuance lifecycle, permissions, privacy, batch operations, and auditability                                                                   |
| Traditional badge software such as BadgeMaker and CardPresso ID-ALL | Card layout, record binding, photo capture, barcodes, database import, batch printing | Often desktop/licence-centric; less naturally suited to browser/mobile capture, flexible company structure, local-network collaboration, future SaaS, and modern HR UX |

CardPresso's current ID-ALL offering explicitly combines layout creation, photo capture, barcode/QR support, an internal database, CSV connection and batch printing. BadgeMaker similarly connects layouts to identity records, supports capture/cropping and Excel import. These are the functional baseline, not optional extras. Sources: [CardPresso ID-ALL](https://www.cardpresso.com/id-all-software/), [BadgeMaker](https://badgemaker.info/en/), [Canva employee ID templates](https://www.canva.com/id-cards/templates/employee/), [Jibika Plexus](https://jibikaplexus.com/).

The product opportunity is therefore:

> **“The easiest private, local-first way for an HR team to register workers and issue professional, traceable company ID cards—from desktop or phone—without buying a full HR/payroll suite.”**

## 3. Product principles

1. **Registry before designer.** A card is an issued credential tied to an employment record, not only an image.
2. **Local by default, portable by design.** The company owns its database, photos, exports, and backups.
3. **Privacy by default.** Government ID/NID is optional, masked, permission-controlled, excluded from cards and exports unless deliberately selected.
4. **Fast for repetitive HR work.** Optimise tables, filters, keyboard navigation, batch actions and duplicate detection—not only the first demo.
5. **International data model.** Do not assume every person has a “first name” and “last name.” W3C documents major global differences in names and recommends avoiding assumptions in forms. Store a required `display_name`, with optional given/family/other/native-script components. Source: [W3C, Personal names around the world](https://www.w3.org/International/questions/qa-personal-names).
6. **Issue snapshots are immutable.** Editing a worker later must not silently rewrite the history of a card already issued.
7. **Progressive complexity.** Excellent presets first; advanced design, encoding, and HR modules later.

## 4. Primary users, roles and permissions

| Role           | Main job                                                               | Default access                                                        |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| System Owner   | Activate the installation, manage owners, security, backup and updates | Everything; the last active owner cannot be removed                   |
| Company Admin  | Configure company, users, roles, organization and card templates       | All company functions except system-level recovery/update controls    |
| HR Manager     | Maintain organization and worker records; approve/issue cards; export  | People/cards plus controlled sensitive-data reveal/export             |
| HR Operator    | Add/edit records and photos quickly                                    | No user/role management, backup, full export or permanent deletion    |
| Print Operator | Review queue, generate/print cards and record outcomes                 | Only the worker/card fields required for production; no government ID |
| Auditor/Viewer | Inspect issued/revoked cards and audit history                         | Read only; no exports by default                                      |

The MVP includes built-in roles plus an **Add role** screen with a permission checklist. Permissions—not role names—are enforced by the API. Suggested permission groups are `people.view`, `people.edit`, `identity.reveal`, `identity.edit`, `cards.design`, `cards.print`, `cards.issue`, `cards.revoke`, `exports.create`, `organization.manage`, `users.manage`, `roles.manage`, `audit.view`, `backup.manage` and `system.manage`.

Use least privilege and default-deny authorization. OWASP defines least privilege as granting only the minimum access necessary for a user's job. Source: [OWASP Authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## 5. Information architecture and page experience

### Public hosted website

The hosted product root is a polished marketing page. Its main navigation is:

- Product
- How it works
- Local installation
- Security
- Pricing or Request demo
- **Sign in**

Recommended landing-page sections:

1. **Hero:** “Professional employee ID cards—from your server or ours.” Show one English-front/Bangla-back card pair and the product interface.
2. **Primary CTAs:** **Request access** and **Sign in**. Do not show “Start free” or public “Sign up.”
3. **Three-step explanation:** Register people → Capture photos → Print and track cards.
4. **Interactive product preview:** organization tree, employee record and card preview—not a fake analytics chart.
5. **Local vs hosted:** explain data location, setup and support in a concise comparison.
6. **Privacy/security:** roles, audit history, backups and local ownership. Do not claim certifications that have not been earned.
7. **Template gallery:** the bilingual default plus several alternate visual styles.
8. **FAQ:** offline operation, printers, phone camera, data ownership, backups and account provisioning.
9. **Final CTA:** Request access / Talk to sales.

Keep the landing page fast: statically cache public content, self-host fonts/images, avoid a background video, reserve image dimensions to prevent layout shift, and load the authenticated app separately. The local installation makes no external analytics, font or CDN requests.

### Sign-in page

Use a calm two-column desktop layout and a single-column mobile layout:

- Left: product/company branding, one card visual and a short privacy statement.
- Right: company/workspace name, username or email, password, show/hide, **Sign in**, and recovery/contact guidance.
- Hosted mode: **Forgot password?** and **Request access**.
- Local mode: a visible **Local system** badge and “Contact your administrator” recovery guidance.
- Never display a public signup form or reveal whether a username exists.
- Preserve keyboard order, visible focus, labels and actionable error messages.

After authentication, use a persistent left navigation on desktop and compact navigation on mobile:

- **Overview** — incomplete records, cards ready to print, recent activity and backup health.
- **People** — worker table, filters, add/import and bulk actions.
- **Organization** — company/site/unit tree and people counts.
- **Cards** — production queue, issued cards, templates and format presets.
- **Import & Export** — CSV mapping, export bundles and job history.
- **Administration** — users, roles, branding, printer/PDF settings, backup/restore and system health.

If there is one company, do not force a company chooser. Show the current company in the top bar and expose a switcher only when several legal entities exist.

## 6. Core UX and account flows

### 6.1 Hosted account provisioning—no public signup

1. An internal platform operator creates the tenant, plan and first owner email through a separate platform-admin console.
2. The owner receives a single-use, time-limited activation link.
3. The owner sets a password, enrolls recovery/MFA if enabled and accepts the terms.
4. The owner completes company setup and creates or invites company users.
5. Company admins manage their own users; the vendor cannot read or reset local-installation data.

The platform-admin console is hosted-only, separately authorized and never included in the on-premises customer build.

### 6.2 Protected local bootstrap

The safest installation flow is to ask the installer for the first owner password. If the product requirement is specifically `admin` / `admin`, implement it only as a temporary bootstrap:

1. The fresh service binds only to `127.0.0.1`; LAN access is off.
2. The only allowed login is username `admin`, temporary password `admin`.
3. Successful login enters an activation screen—not the dashboard or API.
4. The owner must set a strong new password, optionally rename the account, generate/print a recovery code and confirm backup responsibility.
5. The temporary password hash is destroyed; `must_change_password` becomes false.
6. Only then may the owner enable LAN access and create other users/roles.

There is no hard-coded master password, hidden vendor account or reusable reset token. If the local owner loses all credentials and the recovery code, vendor support cannot bypass authentication; recovery requires a documented restore/rekey procedure with physical server access.

Passwords are stored using Argon2id with unique salts, never plaintext or fast general-purpose hashes. OWASP specifically recommends strong, slow password hashing such as Argon2id, and NIST requires rate limiting and blocking commonly compromised passwords. Sources: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html).

### 6.3 Company first-run setup

1. Enter company name, legal/display name, logo, brand colours, locale and timezone.
2. Choose installation mode: this PC only or company LAN.
3. Add sites and organizational units, or import them later.
4. Confirm the default card: **60 mm width × 90 mm height, vertical, English front, Bangla back**.
5. Choose a visual preset and add company-specific fields/instructions.
6. Run a sample front/back PDF and calibrate print scale.
7. Configure an encrypted backup destination and perform the first test backup.

Finish with **Add your first worker**, **Import CSV** and **Print a test card** rather than an empty dashboard.

### 6.4 Add one worker

Use one page with progressive sections or a short three-step flow.

**Employment:** employee number, display/native name, company, site, unit, category/title, join date and status (`preboarding`, `active`, `on_leave`, `inactive`, `separated`).  
**Identity and photo:** optional birth date; optional sensitive government document; **Use camera**, **Use phone** or **Upload file**.  
**Review:** duplicate warnings, missing card fields, selected template and live front/back preview; **Save**, **Save & add another**, or **Save & issue card**.

Validate date/status combinations, unique employee number and required card bindings. Preserve Unicode and punctuation; warn on possible duplicates rather than silently merging them.

### 6.5 Photo capture

Include a permission explanation, camera selector, front/rear choice, framing overlay, countdown, three-shot selection, crop/rotate/zoom, retake, file fallback and quality checks. Strip unnecessary EXIF metadata and create a normalized derivative.

Browser camera access uses `getUserMedia` and is exposed in secure contexts. `localhost` is potentially trustworthy; a phone reaching a LAN address needs trusted HTTPS. Sources: [W3C Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/), [W3C Secure Contexts](https://www.w3.org/TR/secure-contexts/).

For **Use phone**, display a five-minute, one-use QR token. The phone captures and uploads directly to the local server; the desktop updates through server-sent events. The URL contains no employee data. The installer must support company certificates or an internal CA and explain device trust. Source: [Caddy local/internal HTTPS](https://caddyserver.com/docs/automatic-https).

### 6.6 Card formats, designs and bilingual preview

Provide three design experiences:

1. **Template gallery:** Classic Vertical, Modern Stripe, Photo Focus, Factory/Industrial, Contractor and Visitor.
2. **Quick customize (MVP):** logo, colours, fonts, enabled fields, labels, photo style, QR/barcode, background and front/back instructions.
3. **Advanced studio (post-MVP):** free placement, snapping, layers, alignment, keyboard movement, undo/redo and conditional elements.

The dimension engine stores physical size in millimetres:

| Preset                         |   Width × height | Orientation | Notes                                 |
| ------------------------------ | ---------------: | ----------- | ------------------------------------- |
| **Company Vertical — default** |   **60 × 90 mm** | Vertical    | Front English; back Bangla            |
| ISO ID-1 vertical              | 53.98 × 85.60 mm | Vertical    | Standard ID-1 rotated                 |
| ISO ID-1 horizontal            | 85.60 × 53.98 mm | Horizontal  | Common CR80 format                    |
| Custom                         |     User-defined | Either      | Units: mm, cm or inches; stored as mm |

ISO/IEC 7810 defines identification-card dimensions; the standard ID-1 size is 85.60 × 53.98 mm. The requested 60 × 90 mm default is therefore a supported custom company format, not labelled ISO/CR80. Source: [ISO/IEC 7810](https://www.iso.org/standard/70483.html).

Dimension rules:

- Content size is 60 × 90 mm; bleed is separately configurable, default 3 mm per edge.
- Safe area is separately configurable, default 3 mm inside the trim.
- PDF is the print master. PNG export offers 150/300/600 DPI.
- Pixel conversion is `round(mm / 25.4 × DPI)`; 60 × 90 mm at 300 DPI is approximately **709 × 1063 px**.
- Preview uses a scale transform but all saved positions/sizes remain physical millimetres.
- PDF pages declare exact width/height and print with “actual size / 100%.”

The default front binds English labels and `display_name_latin`; the back uses Bangla labels and `display_name_native`, with a defined fallback when a native value is absent. Bundle and self-host Noto Sans and Noto Sans Bengali so preview and printed output use the same glyphs. [Noto Sans Bengali](https://fonts.google.com/noto/specimen/Noto%2BSans%2BBengali)

Users can preview **Front**, **Back** or **Both**, switch between sample and real employees, and test longest-name/missing-photo cases. Every template is versioned. Templates can be assigned by organization, site, worker category or explicit override, with one deterministic priority order.

Do not put NID/government ID in the QR. Use an opaque random card serial.

### 6.7 Produce and issue cards

Select workers, run readiness checks, preview both sides, generate exact-size PDF/PNG or A4/Letter sheets, print at 100%, then record issued/failed/test/cancelled outcomes. Reprinting requires a reason and preserves the original issue.

An issued card stores its serial, worker/employment reference, format, template version, printed-value snapshot, issue/expiry time, issuer and lifecycle (`issued`, `revoked`, `expired`, `lost`, `replaced`). PDF-first printing keeps the MVP hardware-neutral; native printer SDKs and RFID/NFC/magnetic encoding remain post-MVP.

### 6.8 CSV export “with images”

CSV is text and does not portably contain binary images, so export a ZIP with `workers.csv`, an `images/` folder, `manifest.json` and `README.txt`. The CSV points to relative paths such as `images/EMP-0001.jpg`. Source: [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180.html).

Use UTF-8 and ISO dates, let authorized users choose fields, exclude government ID by default and audit each export. Sanitize spreadsheet-formula prefixes to prevent CSV injection. Source: [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection).

CSV/ZIP import includes column mapping, ten-row preview, duplicate-key choice, validation report and a dry run before commit.

## 7. Recommended domain model

| Entity                                       | Key responsibility                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `Tenant`                                     | Future SaaS boundary; one tenant in a local installation                          |
| `Organization`                               | Legal/display company; a tenant may later hold several                            |
| `Location`                                   | Site, factory, branch or office                                                   |
| `OrgUnit`                                    | Self-referencing tree with configurable type: division, department, section, team |
| `Person`                                     | Name, birth date and non-employment identity                                      |
| `Employment`                                 | Employee number, organization/unit/location, title, join/end dates, status        |
| `IdentityDocument`                           | Optional country/type/number/expiry; sensitive access policy                      |
| `MediaAsset`                                 | Original/normalized photo metadata, storage key, checksum, owner                  |
| `CustomFieldDefinition/Value`                | Limited typed fields without schema changes                                       |
| `CardFormat`                                 | Width/height in mm, orientation, bleed, safe area and supported export DPIs       |
| `CardTemplate` / `TemplateVersion`           | Front/back layout JSON, locale, bindings, branding and immutable revisions        |
| `TemplateAssignment`                         | Deterministic template rule by organization, site, worker category or override    |
| `CardIssue`                                  | Serial, format/template version, printed snapshot, lifecycle and issuer           |
| `PrintJob` / `PrintJobItem`                  | Batch production and per-card outcome                                             |
| `User`, `Role`, `Permission`, `RoleGrant`    | Customizable, default-deny authorization                                          |
| `Session`, `ActivationToken`, `RecoveryCode` | Hosted activation, protected local bootstrap and session lifecycle                |
| `AuditEvent`                                 | Actor, action, entity, time, result and safe change summary                       |
| `ExportJob`, `BackupJob`                     | Sensitive operational history                                                     |

Separate `Person` from `Employment`: a person can leave and rejoin, change employee number, move company, or hold more than one assignment without overwriting personal identity.

Avoid a single `working: true/false`. A status enum plus effective dates supports preboarding, leave and separation and makes future HR modules possible.

## 8. Local-first technical architecture

### Final recommended technology stack

Use one TypeScript monorepo so layout rules, validation schemas and domain types are shared across the landing page, authenticated app, API and renderer.

| Layer             | Choice                                                                                                       | Why                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Monorepo/runtime  | TypeScript, Node.js LTS, pnpm workspaces + Turborepo                                                         | One language and shared packages reduce integration defects and speed a small team         |
| Public site + app | Next.js App Router + React                                                                                   | SSR/static landing performance, polished application routes and supported self-hosting     |
| UI system         | Tailwind CSS, Radix primitives/shadcn-style owned components, design tokens                                  | Rapid consistent UI without locking business screens into a third-party theme              |
| Data-intensive UI | TanStack Query, TanStack Table, React Hook Form + Zod                                                        | Reliable caching, server-side tables and typed form validation                             |
| Localization      | `next-intl` (or equivalent ICU messages), bundled Noto Sans + Noto Sans Bengali                              | English/Bangla messages, dates and correct complex-script rendering                        |
| API               | Fastify with TypeBox/JSON Schema, versioned REST endpoints                                                   | Low overhead, compiled schema validation/serialization and structured logging              |
| Database          | PostgreSQL + Prisma ORM and reviewed SQL migrations                                                          | Transactions, constraints, indexes, portability, backup/restore and future SaaS tenancy    |
| Authentication    | Opaque server-side sessions in PostgreSQL; Argon2id password hashing; secure `HttpOnly` cookies              | Easier revocation and safer local operation than long-lived browser JWTs                   |
| Job queue         | PostgreSQL-backed job table/worker; no Redis in MVP                                                          | Fewer services, transactional enqueue and sufficient throughput for PDF/import/export jobs |
| File storage      | Private local filesystem adapter; S3-compatible adapter for hosted mode                                      | Customer-owned on-prem files without rewriting hosted storage logic                        |
| Images            | Sharp/libvips                                                                                                | Resize, re-encode, crop, metadata removal and fast thumbnails                              |
| PDF/PNG renderer  | Pinned Playwright/Chromium worker using exact CSS mm dimensions                                              | Browser text shaping correctly handles Bangla; preview and print share layout semantics    |
| QR/barcode        | Maintained server-side QR and Code 128 libraries, outputs embedded as SVG                                    | Crisp print output and deterministic generation                                            |
| Real-time capture | Server-sent events                                                                                           | Simple one-way desktop update when the phone upload completes                              |
| Reverse proxy/TLS | Caddy                                                                                                        | Public HTTPS in SaaS and internal/company-certificate support on-premises                  |
| Testing           | Vitest, Playwright E2E/visual tests, axe accessibility tests, Testcontainers PostgreSQL, k6 smoke load tests | Covers domain logic, real browsers, print regressions, permissions and operational limits  |
| Observability     | Pino structured logs, health/readiness endpoints, optional OpenTelemetry                                     | Useful diagnostics without sending local customer data externally by default               |
| Packaging         | Docker images + Docker Compose; later a signed Windows bootstrap installer                                   | Same services in development, on-premises and hosted deployments                           |

Next.js officially supports self-hosting on a Node server or Docker and can produce a minimal standalone deployment. Fastify uses compiled JSON Schema for validation and serialization. Sources: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Next.js standalone output](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output), [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).

Playwright's Chromium PDF API accepts physical `mm`/`cm` dimensions and can prioritize CSS `@page` size, which matches the card-format model. Sharp uses libvips for efficient image processing and removes metadata by default when producing new output. Prisma supports atomic transactions and reviewable migrations. Sources: [Playwright PDF API](https://playwright.dev/docs/api/class-page#page-pdf), [W3C CSS Paged Media](https://www.w3.org/TR/css-page-3/), [Sharp](https://sharp.pixelplumbing.com/), [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions), [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate).

Repository shape:

```text
apps/
  web/       landing, sign-in and authenticated UI
  api/       REST API and authorization
  worker/    image, import/export, backup and print jobs
packages/
  domain/    entities, permissions and business rules
  schemas/   request/response and CSV schemas
  card-kit/  physical layout model and preview components
  i18n/      English/Bangla messages and fonts
  config/    environment and deployment validation
```

Use PostgreSQL row security as additional SaaS defense-in-depth, but do not treat it as a replacement for application permission checks. PostgreSQL's row-security model becomes default-deny when enabled without a matching policy. Source: [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

### Speed and reliability budgets

- Public landing: Lighthouse performance/accessibility target ≥90; LCP under 2.5 seconds on a mid-range mobile connection.
- Normal local API reads/writes: p95 under 250 ms with 10,000 workers; use pagination, composite indexes and no unbounded list endpoints.
- Worker list first useful render: under 1 second on the local network for a normal filtered view.
- Approved-photo processing: under 2 seconds for a typical phone image; originals never block the form after upload is safely queued.
- 100-card PDF batch: background job with visible progress, cancellation and retry; target under 60 seconds on supported pilot hardware.
- Every create/issue/revoke/import request has transaction boundaries and idempotency protection.
- Jobs use leases, retry limits and dead-letter status so a process restart does not duplicate issued cards.
- Database migrations run only after a pre-upgrade backup and schema compatibility check.
- Health page reports database, file volume, free disk, backup age, certificate expiry and worker status.
- Local mode contains no required internet dependency after installation and certificate setup.

The renderer image, Chromium version and Noto fonts are pinned. Visual regression fixtures cover English-only, Bangla-only, mixed text, long names, missing values, both dimensions and both sides. This is essential for reliable bilingual print output.

### Deployment editions

| Edition       | Data location                                       | Users/devices                   | Camera implication                                       | When                           |
| ------------- | --------------------------------------------------- | ------------------------------- | -------------------------------------------------------- | ------------------------------ |
| Local Desktop | Same PC, local database/files                       | One primary PC; attached webcam | `localhost` camera works; phone requires LAN server mode | Pilot/small office             |
| On-Prem Team  | Company PC/server, PostgreSQL + private file volume | Browsers on LAN                 | Trusted LAN HTTPS enables phone/PC camera                | MVP target                     |
| Hosted SaaS   | Managed regional DB/object storage                  | Internet browsers/mobile        | Standard public HTTPS                                    | After local product validation |

Use the same frontend, API contract, migrations, renderer and storage interface. Differences should be configuration, infrastructure and tenancy—not separate products.

Service workers can cache the application shell and help with brief network interruptions, but “the server is local” is not the same as fully offline client-side data sync. Do not add multi-device conflict resolution to the first MVP. Source: [W3C Service Workers](https://www.w3.org/TR/service-workers/).

## 9. Security, privacy and reliability baseline

This product stores employee photos, dates of birth and possibly government identifiers. Treat it as a sensitive system from the first schema migration.

### Required controls

- No public signup route or API. Hosted tenant creation requires platform-operator authorization and an expiring activation token.
- The local `admin` / `admin` bootstrap exists only before activation, only on loopback, and cannot reach company data. It is irreversibly disabled after the forced password change; LAN binding is blocked until then.
- Passwords use Argon2id with unique salts, a compromised-password blocklist and a minimum length policy. Never store or log plaintext passwords.
- Login responses do not reveal whether an account exists. Apply account-based throttling with progressive delay, audit failed/successful logins and support MFA for owners/admins.
- Use opaque random session IDs stored server-side, rotate on authentication/privilege change, set `HttpOnly`, `Secure` and appropriate `SameSite` cookies, and revoke sessions when a password/role changes or a user is disabled.
- Require recent re-authentication for role/owner changes, NID reveal/export, backup restore, recovery-code regeneration and system configuration.
- Never allow removal/demotion of the final active System Owner. Prevent a user from granting permissions they do not possess.
- Default-deny authorization on every API action; role checks are server-side.
- NID/government ID masked in lists and revealed only through a separately audited action.
- TLS for every non-loopback connection; secure session cookies and session timeout.
- Uploaded files: allowlist JPEG/PNG/WebP, inspect real content, set size/pixel limits, re-encode images, store outside the web root, and serve only after authorization. OWASP recommends authenticated/authorized uploads, least-privilege storage and upload limits. Source: [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- Immutable audit events for login, sensitive reveal, create/update/archive, import/export, template publication, print/issue/revoke, user/role change, backup and restore. Do not log full NIDs, passwords, session tokens or raw photos. OWASP notes that logging supports security auditing but excessive logging can itself expose sensitive data. Source: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- Encrypted backups, retention schedule and a tested restore button. Backup must include database, photos, templates, settings and an integrity manifest. PostgreSQL provides portable dump/restore formats, but the product must orchestrate and test the complete bundle, not only the database. Source: [PostgreSQL backup and restore](https://www.postgresql.org/docs/current/backup.html).
- At-rest protection uses OS full-disk encryption plus application encryption for especially sensitive fields where the key can be managed separately. Encryption with a key stored beside the same database is not a complete theft defense.
- Soft-delete/archive workers by default; permanent deletion is admin-only, previewed, audited and governed by policy.
- Dependency/SBOM and signed-release process before commercial deployment.

For international readiness, build settings for purpose, retention, access and deletion rather than claiming one universal compliance mode. GDPR principles include purpose limitation, data minimisation, storage limitation, accuracy, security and accountability; privacy by design/default restricts data and access from the beginning. Source: [European Commission, GDPR processing principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en).

Target **WCAG 2.2 AA**: keyboard-accessible tables/actions, visible focus, adequate contrast, labels and error suggestions, no colour-only status, large touch targets and non-drag alternatives in the template builder. Source: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## 10. MVP scope

### P0 — required for pilot

- Fast public landing page, product/local/security sections, request-access CTA and polished hosted sign-in page.
- No public signup; hosted operator provisions tenant/owner through a separate platform-admin console.
- Protected loopback-only local `admin` / `admin` activation, forced credential change and recovery code.
- User management, built-in roles, custom role creation, permission matrix and protected last-owner rule.
- First-run company setup, branding and system health.
- Company/site/flexible org-unit hierarchy.
- Worker CRUD/archive, status history, search/filter/sort and duplicate warnings.
- Optional sensitive government identity record with masking and permissions.
- Single and ZIP/CSV bulk import with dry-run validation.
- Webcam/mobile camera capture, upload, crop/rotate/quality validation and normalized image.
- At least six visual presets with three strong MVP-ready styles; controlled branding/field configuration.
- Dimension engine using canonical millimetres, presets/custom size, orientation, bleed, safe area and 150/300/600-DPI export.
- Default 60 × 90 mm vertical template with English front and Bangla back; ISO ID-1 vertical/horizontal alternatives.
- Exact-size bilingual preview and pinned-Chromium PDF/PNG output; A4/Letter batch sheets.
- Readiness checks, print queue, card serial, issue/reprint/revoke lifecycle and audit.
- ZIP export containing CSV + photos; field selection and export history.
- Encrypted one-click backup, scheduled backup, restore verification and low-disk warning.
- English + Bangla application/card localization; self-hosted Noto fonts, Unicode data and ISO date storage.
- Local Desktop and On-Prem Team packages; documented LAN HTTPS/mobile trust setup.

### P1 — immediately after a successful pilot

- Full template canvas with snapping, safe areas, conditional fields and reusable components.
- Custom typed worker fields in UI.
- XLSX import/export option; import saved mappings.
- Public/cloud card-status verifier with privacy-preserving response.
- Approval workflow before issuing cards.
- Read-only auditor role, richer reports and expiration reminders.
- Hosted SaaS billing, regional storage, SSO and automated upgrades. Basic hosted tenant provisioning is already P0.

### Explicitly out of MVP

- Payroll, attendance, leave, recruitment and performance management.
- Face recognition/biometric identification.
- RFID/NFC/magnetic stripe encoding and access-control integrations.
- Native drivers for every card-printer model.
- Employee self-service app.
- Fully offline multi-device sync/conflict resolution.
- AI background replacement or beauty retouching.

## 11. Delivery plan

Assumption: one product designer, two full-stack engineers and part-time QA/DevOps. A solo developer should expect materially longer.

| Stage                                 |  Duration | Output / exit criterion                                                                                                |
| ------------------------------------- | --------: | ---------------------------------------------------------------------------------------------------------------------- |
| 0. Discovery and print spike          | 1–2 weeks | Interview 5 HR/print users; test 60 × 90 mm and ID-1 on 2 printers; approve schema, bilingual layouts and threat model |
| 1. Design system, landing and auth    |   2 weeks | Responsive landing/sign-in, hosted provisioning, protected local activation, sessions and role model                   |
| 2. Foundation and organization        |   2 weeks | Local install, tenant/company hierarchy, migrations, permission enforcement and audit skeleton                         |
| 3. People and photos                  |   2 weeks | Worker list/forms/import, capture/upload/crop and mobile LAN proof                                                     |
| 4. Dimensions, templates and renderer | 2–3 weeks | 60 × 90 default, ID-1 presets, English/Bangla bindings, deterministic PDF/PNG and visual tests                         |
| 5. Production and portability         |   2 weeks | Queue, batch generation, issue/reprint/revoke and CSV+images export                                                    |
| 6. Hardening and packaging            |   2 weeks | Backup/restore, upload security, accessibility, performance budgets, installer/update flow                             |
| 7. Pilot                              |   2 weeks | One real company, 100+ records, real batch print, permission tests, restore drill and go/no-go                         |

With design/backend work overlapping, the practical MVP range is **14–17 weeks for the stated small team**, after requirements are fixed. The largest risks are local HTTPS/device trust, correct Bangla PDF shaping, reliable printing across hardware and an over-ambitious template editor.

## 12. Acceptance criteria and success metrics

### Functional acceptance

- Public hosted root has no signup form; request access and sign-in routes are clear and accessible.
- A platform operator can provision a tenant without obtaining access to an on-premises customer's data.
- On a fresh local installation, `admin` / `admin` works only on loopback, forces a change and cannot be reused after activation.
- LAN access cannot be enabled until bootstrap credentials are replaced and recovery is configured.
- Admin can add users/custom roles; every permission is enforced in both UI and direct API tests.
- Fresh machine can install and reach the app without developer commands.
- Admin can produce a correctly scaled 60 × 90 mm vertical test card with English front and Bangla back.
- ISO ID-1 and custom dimensions render to exact physical PDF pages; 300-DPI PNG dimensions match the conversion rule.
- HR can add a worker with camera photo in under two minutes.
- Mobile capture transfers directly to the local server without using the vendor cloud.
- 100-worker CSV/ZIP import provides a dry-run report and never partially commits on validation failure.
- A 100-card batch generates without wrong person/photo pairing.
- Reprinting never erases original issue history and always asks for a reason.
- Export ZIP opens with valid UTF-8 CSV and every `photo_file` path resolves.
- Backup restored on a clean machine reproduces records, images, templates and issuance history.
- Data Entry and Print Operator cannot reveal/export government ID through UI or API.
- App remains usable when internet is disconnected; local LAN functions continue.

### Product metrics

- Landing-page LCP: **<2.5 seconds** on the agreed mobile test profile; performance/accessibility score **≥90**.
- Successful first-login activation: **>95%** without support intervention.
- Setup-to-first-test-card: **<15 minutes**.
- Median complete worker entry after training: **<90 seconds**, including photo.
- Records ready to print without correction after import: **>95%**.
- Correct card/photo pairing in test suite: **100%**.
- Successful first-pass print jobs in supported pilot hardware: **>98%**.
- Pilot HR satisfaction: **≥4/5** for speed, clarity and confidence.
- Restore drill success: **100%**, measured at least monthly during pilot.

## 13. Main risks and decisions

| Risk                                      | Why it matters                                                    | Mitigation/decision                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Default `admin` / `admin` is attacked     | Fixed credentials are widely guessed and unsafe on a LAN          | Loopback-only activation gate, forced change, no data access, LAN disabled and irreversible bootstrap removal |
| “Full designer” consumes the MVP          | Canvas, text fitting, print parity and undo/history are complex   | Start with excellent constrained presets; validate demand before full canvas                                  |
| Phone camera fails on LAN HTTP            | Camera/service-worker APIs require secure contexts                | Supported HTTPS install and trust workflow; test iOS/Android early                                            |
| Bangla differs between preview and PDF    | Complex-script shaping/font differences can corrupt the back side | Same pinned Chromium renderer and bundled Noto fonts for preview fixtures and final output                    |
| Printer differences create support burden | Margins, scaling and duplex behavior vary                         | Exact-size PDF, 100% scale, calibration card, supported-printer matrix                                        |
| NID becomes over-collected                | High privacy and breach impact                                    | Optional field, documented purpose, mask, permission, no default card/export                                  |
| “Local” data is lost with the PC          | Customers assume local means safe                                 | Backup wizard, health warning, encrypted external/NAS destination, restore drill                              |
| SaaS rewrite                              | Local shortcuts can bake in one-company/filesystem assumptions    | Tenant key, API boundary, versioned schema, storage adapter from day one                                      |
| CSV exports become an attack vector       | Spreadsheet formula interpretation                                | Sanitize dangerous prefixes, warn, audit and test exports                                                     |

## 14. Decisions to lock before design begins

1. First supported operating system: Windows-only pilot or Windows + Linux server.
2. Pilot printer models and whether duplex card printers are available.
3. Is phone capture mandatory in the first pilot, and can pilot devices install/trust a company CA certificate?
4. Exact English-front and Bangla-back field labels, values, legal text and fallback when `display_name_native` is absent.
5. Whether 60 × 90 mm is the trimmed card size and whether the target printer accepts that media; confirm 3 mm bleed/safe-area defaults.
6. Whether expiry is required and which template is assigned to each worker category.
7. Whether the company truly needs NID for card issuance, and its retention/access policy.
8. Expected company size, concurrent users, photos per worker and backup destination.
9. Whether hosted MFA is mandatory for owners at launch or enabled as a strongly recommended setting.

The best immediate next step is a **one-week discovery/print spike** producing: five user interviews, clickable landing/sign-in/employee/card flows, front/back 60 × 90 mm bilingual print fixtures, two printer calibration tests, a finalized permission and field dictionary, and a tested local HTTPS phone-capture proof. That removes the most expensive unknowns before production engineering starts.
