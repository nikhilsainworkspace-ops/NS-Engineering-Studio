# Civil At Hand: version 4 — construction management and redesign (October 2026)

Additive release. Existing contacts, projects, tasks, notes, rates, links, shared databases, imports, exports, backups and security behaviour are preserved; no field is renamed or removed and no migration is needed. See the "Version 4" section of README.md for the feature list.

## Added
- Owner command centre, project workspace with milestones, daily site reports with approval, estimates/BOQ/quotations with revisions and printing, materials/stock ledger/material requests/purchase orders with goods receipts, workers/attendance/wage sheets, client invoices/supplier bills/payments/expenses/project costs, document register with versions and approvals, tenders, owner-built public pages, business settings, business reports, cross-module search.
- 18 new collections, created automatically. Backups (format 5) and merge restore cover them.
- `tests/erp.test.ts` (calculations and validation) and `tests/integration/erp-api.test.ts` (route-level checks with an in-memory database: sign-in required on every new route, locking, payments, receipts, stock, publication).

## Changed
- Unified design system (`app/design-system.css`, `components/ui.tsx`) applied across all screens; grouped navigation with a mobile menu; minimal sign-in page (no marketing copy; username/password fields now allow password managers).
- Project stages gain Estimation, Awarded, Planning, Defects liability period and Closed; labels of Lead/Ongoing read "Enquiry / lead" and "Active (ongoing)". Saved values are unchanged.
- Project create, update, stage change and delete are now written to the activity log.
- Default brand colour is navy `#1f3a5c` (an explicit `NEXT_PUBLIC_BRAND_COLOR` still wins). `robots.txt` allows `/p/` only; each public page decides indexing itself.
- The sidebar scroll arrows were replaced by collapsible navigation groups and a mobile drawer; "Find a panel" search remains.

## Not included in this release
- Staff accounts and role-based permissions, custom form builder for public forms, supplier RFQ comparison beyond the rate book, subcontract running bills, quality/safety checklists as a separate module, email/SMS notifications, dark mode.

---

# Civil At Hand: dashboard visual refresh (October 2026)

The visual update is additive. It retains the existing login, contacts, follow-ups, tasks, private notes, projects, rate book, shared databases, reports, public form links, security and settings functionality.

## Updated
- Redesigned the authenticated shell with navy navigation, blue active states, a clean light canvas, improved spacing, accessible focus styles and responsive layouts.
- Replaced the overview presentation with four metrics, an upcoming-task table, quick actions, private-note preview and promo/quick-stats cards.
- Kept the previous overview's network-category list, recently updated contacts, follow-up reminder, project/work-queue summary and privacy explanation.
- Added a global client-side search across the contacts/projects/tasks/active-notes data already loaded in the private workspace. Contact and project results open their edit forms; task and note results open the corresponding editor.
- Changed the default brand colour to `#1769e8`; the optional `NEXT_PUBLIC_BRAND_COLOR` continues to override it.
- No database migration or new environment variable is required.

## Validation status
Source syntax-transpilation and ZIP integrity checks passed. Full dependency installation timed out in the build environment; run `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` on the merged project before production deployment.

---

# Civil At Hand: incremental productivity/security update

This update is additive. It keeps existing contacts, projects, rates, links, shared databases, exports and security screens. Merge only the files contained in the incremental ZIP into the repository root; allow overwriting files with matching paths. No data migration or new environment variable is needed for the Task Planner or Private Notes.

## Added
- **Persistent Task Planner** (`Task` collection): create, edit, search and filter tasks; due dates, priority, status, notes, and optional links to existing contacts/projects; overdue-first sorting; completion/reopen controls; overdue badge, overview summary, CSV export and activity-log entries.
- **Private Notes** (`PrivateNote` collection): admin-only create, edit, search, tag, pin, archive/restore, copy, Markdown export and permanent delete. Notes are protected by the existing admin session and are not exposed to public forms or shared database links.
- **Protected private-note APIs** (`/api/notes` and `/api/notes/[id]`): admin-only CRUD/actions, input size validation, no-store responses and audit entries that record note actions without note titles or bodies.
- **Complete backup coverage:** the existing full JSON backup adds `tasks` and `privateNotes` while preserving existing backup sections.
- **Authenticator replay-race hardening:** the accepted TOTP time step is atomically claimed after the password is valid, preventing parallel login requests from both accepting the same code.
- Added task and private-note input tests and added the missing `.gitignore` / `.env.example` entries expected by the README. `.env.example` contains placeholders only.

## Verification
Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` after merging. This ZIP is an incremental source patch, not a compiled deployment artifact.

---

# Civil At Hand: version 3.0 update notes

Everything from version 2 still works. No data migration is needed: every new database field is optional, existing records and existing `/join/<token>` links are untouched, and `MONGODB_DB` handling is unchanged.

## New
- **Shared databases** (new `DataRoom` collection, page `/shared/<token>`): sell or share a frozen copy of selected contacts or rates through a private link with required expiry, passcode (scrypt-hashed), open limit, watermark, download switch, price / paid / unpaid tracking, "locked until paid", pause, extend, reset passcode, and an access log.
- **Consent to share:** per-contact "may be shared with clients" (Yes / No / not recorded), an optional checkbox on public forms, and a recommended filter to share only records marked Yes. A contact explicitly marked "No" is never shared; records with no saved answer can be included only when the admin turns off the Yes-only filter and has permission to share them.
- **Rate book** (new `Rate` collection): rates, supplier comparison, stale flags, export, sharing.
- **Security centre:** 2-step verification (authenticator app), server-side sessions with signed-in devices and real sign-out, idle expiry, browser auto-lock, activity log (180 days), full JSON backup, cross-site request blocking, Content-Security-Policy, `__Host-` cookie.
- **Productivity:** bulk actions, merge duplicates, per-contact history (calls, meetings, site visits), 1-5 rating, Preferred / Avoid flag, import template, "Hide numbers" privacy button, project billed / received / to-collect, receivables and data sales in Reports.
- Per-device rate limits on public form submissions and client-link requests.

## Changed
- Login now uses a MongoDB-backed session. **You will be signed out once after deploying** (old cookies are not valid). `ADMIN_SESSION_SECRET` is still required.
- New optional environment variables: `ADMIN_TOTP_SECRET`, `ADMIN_SESSION_HOURS`, `ADMIN_IDLE_MINUTES` (see `.env.example`).
- Exports and imports are written to the activity log. Contact list responses no longer include the per-contact history (loaded on demand).

## Developer notes
- `npm run check` runs typecheck, unit tests and the access-gate integration test (`tests/integration`, uses Node's experimental module mocking).
- Browser-safe room code lives in `lib/room-shared.ts`; `lib/rooms.ts` uses Node crypto and must not be imported by client components.

# Civil At Hand: version 2.0 update notes

Everything from version 1 still works (dashboard, login, contacts, 10 categories, public bilingual forms, share links, import, filtered export, WhatsApp/email, PDF print, manifest, logo pack). Records and `/join/<token>` links are untouched: no field was renamed or removed.

## New
- **Projects & leads** (new `Project` collection): stages, client, location, ₹ value, dates, lead source, linked contacts, stage quick-change, export.
- **Follow-ups page**: overdue / today / next 7 days / later for contacts and projects; Done, Tomorrow, +1 week, Call, WhatsApp; menu counter.
- **Duplicate detection**: warning on add/edit (can override), badge, Duplicates filter; smarter phone matching (last 10 digits) in import too.
- **Reports page**: network, pipeline, overdue, monthly growth, sources, busiest links.
- **Projects export** (`/api/export?scope=projects`).
- Print title now uses your configured business name; print layouts for new pages.
- Larger, easier-to-read text on key controls; Hindi text on the "form unavailable" page and public error messages.
- `.gitignore`, `.env.example` (were missing), `npm run typecheck`, `npm test`, HSTS header.

## Fixed
- Strict-TypeScript problems that break `next build`: untyped Mongoose model unions (`mongoose.models.X || mongoose.model(...)`), untyped `.lean()` results, and the ExcelJS buffer response; validation errors now use a typed `InputError` instead of matching message text.
- A malformed `NEXT_PUBLIC_SITE_URL` (for example without `https://`) could crash the whole site at start-up; it is now normalised safely.
- Public submission counter used read-modify-write; now an atomic `$inc`.
- CSV export protected phone numbers starting with `+` with an apostrophe, which then came back on re-import; import now removes that protective apostrophe.
- Dashboard print title was hard-coded to "Civil At Hand".

## Needs no action
No database migration. Environment variables are the same as before (see README); `MONGODB_DB` must stay as it was.

## Navigation accessibility update — October 2026
- The desktop sidebar menu now has its own vertical scroll area so the lower options stay reachable on short screens.
- A **Find a panel** search filters navigation labels without touching records.
- Beginning/end scroll controls work vertically on desktop and horizontally on tablet/mobile; the selected panel is scrolled into view when possible.
- All existing panels remain in the menu; no environment variables, database migration or dependencies were added for this change.

- Security hardening: auto-lock preference moved from browser `localStorage` into a protected MongoDB preference record; logout revokes the session, expires the HTTP-only cookie, clears app state and browser storage/cache, and broadcasts logout to other tabs. Dashboard/API/tokenised responses receive no-store headers and open tabs periodically revalidate their server session.
- Server activity heartbeat: live admin interactions refresh the server-side idle timestamp on a throttled interval; periodic read-only session probes do not extend an unattended session.

---

# Civil At Hand: contacts and shared-database reliability update (October 2026)

This update builds on the existing dashboard, security, Task Planner, Private Notes and navigation patches. It adds to the contact schema without renaming existing fields or deleting features.

## Added and improved
- **Google Contacts-style contact fields:** first/surname, company, job title, birthday, labelled primary phone/email, multiple labelled phone numbers and email addresses, Team Member / role / department, tags, status, follow-up and category-specific details.
- **Team directory support:** marking an existing CRM contact as a team member surfaces them in the Team directory. This is a contact classification only; it does not grant dashboard login access.
- **Google Contacts CSV import:** accepts the standard `Phone N - Label/Value` and `E-mail N - Label/Value` headers as well as `Type/Value` variants, and maps names, company, job title, birthday, notes and group labels. Google CSVs without a Category column default to General contact.
- **Alias-aware duplicate detection:** checks alternate phone numbers and emails during create/edit/import, and links duplicate groups that share an alternate phone/email.
- **Shared data snapshot repair:** snapshots map selected primary/alternate phone and email fields, labels, job title, team role, birthday and optional tags. Mask/preview mode masks additional phone/email values too. Admin-only notes, relationship metadata and history remain excluded from shared snapshots.
- **Shared-link diagnostics guide:** explains that successful creation saves the snapshot to MongoDB `DataRoom`, how to confirm a link exists after refresh, and how to troubleshoot consent filters, empty selections, expiry, domain mismatches and frozen snapshots.
- **Focused tests:** includes a standard Google Contacts CSV label/value test and alias-aware duplicate tests.

## Verification
The focused logic suite passed 37/37 tests using the globally available TypeScript runtime in transpile-only mode. TypeScript/TSX source syntax and CSS parsing were checked separately. A full project typecheck, lint and production build still require dependencies to be installed in the project environment; do not claim deployment-ready until those checks pass and the Vercel deployment succeeds.
