# Merge Plan and Architecture Decisions

## Outcome

- Product identity and repository name: **NS Engineering Studio**.
- Host architecture: existing Next.js App Router application remains the root project; no framework rewrite was introduced.
- Construction operations: integrated under `/workspace` with source modules under `modules/civil-at-hand/` and server handlers under `/api/civil-at-hand/*`.
- Website CMS: existing MongoDB collection-based NS content system now also stores projects and software records; the existing content system continues to manage services and FAQs.
- Identity: the NS `ns_admin_session` HTTP-only cookie and MongoDB `sessions` collection are the canonical session source for `/admin` and the workspace. Workspace login/logout/session routes now delegate to that canonical identity. Optional TOTP is verified through the workspace login when `ADMIN_TOTP_SECRET` is set.
- Data: preserve legacy workspace Mongoose models and their URI database selection; keep NS site's MongoDB driver-based collections and default DB behavior distinct. No live data migration or database reset was performed.

## Why modules are namespaced

Both original projects had App Router APIs with overlapping generic paths such as authentication, contact, projects, settings and health. Copying the legacy app directly into the root would silently shadow or overwrite NS routes. Namespaced handlers prevent these collisions. Non-conflicting old API paths are maintained through `afterFiles` rewrite aliases, and the legacy public forms/join/share/print page routes redirect to `/workspace/...`.

## Feature consolidation

1. NS remains the source of truth for public navigation, website settings, contact inquiries, CMS content, audit/rate-limiting collections, and administrator sessions.
2. Civil At Hand's operational models, API handlers, dashboard components, calculators/helpers, import/export and backup modules remain in a clearly bounded workspace module. This avoids destructive model renaming and preserves existing persisted fields.
3. `getContent()` supports `services`, `faqs`, `projects`, and `software`; CRUD handlers validate with Zod, require an administrator session, enforce same-origin writes and audit create/update/delete operations.
4. Public project pages only show published records in non-draft/non-archived states. No project data is seeded or represented as authentic work. Public project listings are searchable and filterable by category; published software listings are searchable and filterable by category/status.
5. Published custom software items are managed from `/admin/software`, with explicit status labels and configured launch links; no paid features or provider integration is represented as live without configuration.

## Design and security changes

- New NS monogram/logo/favicon/social preview and manifest; legacy logo pack moved out of `public/` and into the workspace reference directory.
- Workspace styles are scoped below `.cah-workspace-scope`; no Google Fonts import is required at runtime.
- Central admin session now tracks `lastSeenAt` and enforces a configurable inactivity expiration.
- Contact form validation and backend validation align, with organization/state/city fields, a state/territory selector, structured project references, priority/assignment/follow-up tracking, and server-side anti-spam/rate-limit handling.
- Existing security headers/CSP were retained and adjusted for configured HTTPS project imagery.
- No frontend-only control is treated as authorization; APIs continue to perform server-side session checks.

## Constraints / deliberate non-changes

- Existing root data stores and workspace data stores use different drivers and potentially different MongoDB database names. Combining every collection into one canonical model without production samples/backups would risk data loss, so this merge retains their boundaries and documents how to configure each safely.
- No payment or subscription activation was invented. Full customer RBAC, per-product subscription entitlements, MFA enrollment self-service, public-gallery file storage and third-party analytics remain unimplemented or unconfigured where the supplied code did not support verified activation.
- Legal text is an editable draft, not a claim of compliance. The owner must review it against actual practices and applicable Indian and other laws.
- npm registry DNS failed in the build environment. Dependency installation, typecheck, lint, unit test, and build execution status are disclosed in `TEST_REPORT.md` rather than marked successful.
