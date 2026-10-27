# Instructions for coding agents working on Civil At Hand

## Product purpose
Civil At Hand is a private, personal management workspace for a civil engineering/construction business network. It organises:
- Manpower suppliers and skilled labour teams
- Material, equipment and safety suppliers / vendors
- Subcontractors and contractors
- Project liaisoning, coordination and outsourcing
- Investors and project execution partners
- Business development opportunities and client introductions
- Working capital / financial resources contacts
- Joint ventures and strategic partnerships
- Clients including builders, EPC companies, factories and infrastructure developers

Do not add unrelated consumer/social-media features. Keep the product simple for one admin to operate, phone responsive, and understandable to professionals with different literacy levels. Public form prompts should use English and Hindi together where practical.

## Non-negotiable architecture
- Next.js App Router deployed on Vercel.
- MongoDB persistence via Mongoose. Never replace database persistence with browser-only storage.
- Admin credentials live only in `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The signed-cookie key is `ADMIN_SESSION_SECRET`. Never hardcode real credentials or expose secrets through `NEXT_PUBLIC_*`.
- Every admin API route must call `isAdmin()` before reading or changing private records. `isAdmin()` validates a MongoDB-backed session (`models/AdminSession.ts`) and rejects cross-site requests; sign-in goes through `startSession()`. Never go back to stateless cookies.
- Client access to shared data goes only through `lib/room-access.ts` (`accessRoom`). Shared snapshots are built by whitelist in `lib/rooms.ts`: never add notes, tags, status, ratings, follow-ups or history to a snapshot. Never import `lib/rooms.ts` from a client component (use `lib/room-shared.ts`).
- Public pages are limited to `/join/[token]` (submit one form), `/shared/[token]` (read one frozen, expiring, optionally passcode-protected copy) and `/p/[slug]` (an owner-published page). Nothing else is public. `/p/[slug]` and `/api/site/images/[id]` may only read data through `lib/public-page-server.ts` (`loadLivePage`), which returns an explicit allowlist of page fields for published, unexpired pages (unlisted pages need their key). Never let a public page read contacts, projects, finance, documents or notes.
- `/print/[kind]/[id]` renders private documents and must call `isAdmin()` first. Document file downloads (`/api/documents/files/[fileId]`) are admin-only. Contacts are shared only with recorded consent unless the admin overrides, and never when consent is "no".
- Public registration is permitted only through `/join/[token]`, where the unguessable token maps to an active `ShareLink`. Public users must never be able to list/search records, see the admin panel, or see another form's submissions.
- A link can be paused, expired, or revoked. Keep that behaviour intact.
- Brand name, tagline, canonical URL, colour, logo and favicon are configurable by environment variables. The included default logo pack lives in `public/`; keep local defaults working when optional environment variables are blank.
- This project is designed as a personal single-admin app, not a multi-tenant/SaaS product.

## Where to extend it
- Add a civil-work contact type and its bilingual fields in `lib/categories.ts`. The dashboard form editor, link generator and export builder consume this schema.
- Contact-specific answers live in `Contact.details`; preserve them during editing and include them in Excel/CSV export. Preserve the admin-only CSV/XLSX import flow in `app/api/import/route.ts` and keep the CSV/XLSX exporter filter-aware without changing full-export defaults: validate each row, cap file size/row count, and skip duplicates by phone/email.
- Add any new server endpoint under `app/api` and protect admin routes with `isAdmin()`.
- Projects/leads live in `models/Project.ts` with validation in `lib/projects.ts`; follow-up bucketing in `lib/followups.ts`; duplicate rules in `lib/duplicates.ts` (phone = last 10 digits, email lower-case) and `lib/duplicate-check.ts`; report maths in `lib/reports.ts`. Keep these pure and covered by `tests/logic.test.ts`.
- Validation errors must be thrown as `InputError` (`lib/errors.ts`) so routes return 400; anything else is a 503.
- Mongoose models are exported with an explicit `Model<Doc>` type (`lib/types.ts`) via `as unknown as Model<...>`. Do not go back to `mongoose.models.X || mongoose.model(...)` without that cast: the union type breaks `next build` under strict TypeScript.
- Contact create/edit returns HTTP 409 with `duplicates` when a phone/email matches; the client retries with `allowDuplicate: true` only after the admin confirms. Public submissions are always accepted (never reveal whether a record exists).
- Never change `MONGODB_DB` handling or existing field names: records and `/join/<token>` links in production must keep working. Only add optional fields.
- Keep the dashboard and public forms responsive at both small phone widths and desktop widths. Preserve the lightweight installable-app manifest and never add offline caching of private contact data. Avoid breaking unrelated sections when fixing a component.
- For database changes, update the corresponding Mongoose model under `models/` and validate all untrusted input server-side.

## Version 4 modules
- Field definitions live in `lib/entities.ts` and are validated with `lib/entity-spec.ts` (`normalizeRecord`). The same specs drive the browser forms (`SpecForm` in `components/ui.tsx`) and the Mongoose schemas (`lib/model-builder.ts`), so add a field in one place.
- Admin CRUD routes are built with `lib/crud.ts` (`collectionRoutes` / `itemRoutes`), which wrap every handler in `adminHandler` (session check, safe errors), apply optimistic concurrency on `updatedAt` and write audit entries. Custom routes must use `adminHandler` from `lib/api-helpers.ts`.
- Money and quantity rules are pure functions: `lib/estimates.ts` (quotation totals, revisions), `lib/finance.ts` (invoice status from payments, project cost without double counting), `lib/inventory.ts` (stock ledger, receipts), `lib/workforce.ts` (wage sheet). Keep them pure and covered by `tests/erp.test.ts`.
- Stock movements are immutable; correct them with the reverse endpoint. Sent/approved quotations are immutable; create a revision. Invoice status is derived from payments; never store a typed "paid" flag.
- Document numbers come from `nextNumber()` in `lib/server-settings.ts` (atomic counters). Business settings are one record validated by `lib/settings.ts`; every displayed setting must affect behaviour.
- New collections must be added to `lib/workspace-backup.ts` and `lib/backup-restore.ts`.

## Before finishing a change
1. Run `npm run typecheck`, `npm test`, `npm run test:integration` and `npm run build`, and resolve every error.
2. Check login, dashboard session/logout, contact create/edit/delete, duplicate warning, follow-up done/snooze, project create/edit/stage change, link create/pause/reactivate, public submission, import and export paths.
3. Do not commit `.env.local`, database URIs, passwords, session secrets or real contact data.
4. Keep README setup and environment-variable documentation current.
