# Civil At Hand — cumulative incremental patch manifest

This ZIP is an **incremental source patch, not a full project**. It contains 21 new files and 29 updated files (50 paths total) compared with the original uploaded `CivilAtHand-main` project. Existing files not listed below are unchanged and must stay in place. No original files are deleted.

## New files (21)
- `.env.example`
- `.gitignore`
- `CONTACTS-AND-SHARING-GUIDE.md`
- `INCREMENTAL-UPDATE-GUIDE.md`
- `NAVIGATION-ACCESSIBILITY-UPDATE.md`
- `PATCH-MANIFEST.md`
- `app/api/auth/activity/route.ts`
- `app/api/notes/[id]/route.ts`
- `app/api/notes/route.ts`
- `app/api/security/preferences/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/api/tasks/route.ts`
- `components/private-notes-panel.tsx`
- `components/tasks-panel.tsx`
- `lib/google-contacts.ts`
- `lib/private-notes.ts`
- `lib/tasks.ts`
- `models/AdminPreference.ts`
- `models/PrivateNote.ts`
- `models/Task.ts`
- `tests/private-notes.test.ts`

## Updated files (29)
- `README.md`
- `UPDATES.md`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/session/route.ts`
- `app/api/backup/route.ts`
- `app/api/contacts/[id]/route.ts`
- `app/api/contacts/route.ts`
- `app/api/export/route.ts`
- `app/api/import/route.ts`
- `app/api/rooms/route.ts`
- `app/globals.css`
- `components/dashboard.tsx`
- `components/rooms-panel.tsx`
- `components/security-panel.tsx`
- `lib/auth.ts`
- `lib/brand.ts`
- `lib/categories.ts`
- `lib/client-api.ts`
- `lib/contact-input.ts`
- `lib/duplicate-check.ts`
- `lib/duplicates.ts`
- `lib/room-shared.ts`
- `lib/rooms.ts`
- `lib/types.ts`
- `models/Contact.ts`
- `next.config.ts`
- `tests/logic.test.ts`
- `tests/v3.test.ts`

## What this patch adds or fixes

- Professional responsive dashboard and menu navigation, including a searchable/scrollable sidebar that keeps lower sections accessible.
- MongoDB-backed Task Planner and Private Notes; full backup includes those datasets and the auto-lock preference record.
- Shared-device session hardening, logout cleanup, no-store response headers, DB-backed auto-lock preference, and authenticator replay protection.
- Google Contacts-style contact fields: first/last name, company, job title, birthday, labelled multiple phone/email values, team role/department, tags and categories.
- Google Contacts CSV import using standard `Phone N - Label/Value` and `E-mail N - Label/Value` headers; duplicate checking considers alternate phones/emails.
- Shared database snapshot mapping for selected phone/email aliases; preview masking covers additional values while private notes and history remain excluded.
- Detailed installation, contacts/import and sharing troubleshooting documentation. No schema migration is required; new optional fields/collections are backward-compatible.

## Safe merge and launch sequence

1. Create a backup or Git commit of your current repository.
2. Extract the ZIP into the existing project root, preserving paths and allowing overwrite for matching paths only. Do not replace the whole repository with this ZIP.
3. Keep existing Vercel secrets and MongoDB URI/database unchanged; never copy placeholder values from `.env.example` into production.
4. Read `INCREMENTAL-UPDATE-GUIDE.md`, `CONTACTS-AND-SHARING-GUIDE.md`, `NAVIGATION-ACCESSIBILITY-UPDATE.md` and `README.md`.
5. Run `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` with project dependencies installed.
6. Push to the existing repository connected to Vercel. Test login/2FA, Contacts, Team directory, Google CSV import, Task Planner, Private Notes, rates, projects, public forms and shared-link creation/access before switching to real daily use.

## Verification status

- Focused tests: **37/37 passed** (`tests/logic.test.ts`, `tests/v3.test.ts`, `tests/private-notes.test.ts`) using the globally available TypeScript runtime in transpile-only mode.
- Source syntax: **96 `.ts` / `.tsx` files checked** with TypeScript `transpileModule`; no syntax diagnostics. CSS parsed successfully with PostCSS.
- The full TypeScript typecheck, full npm test command, lint and production build have **not** been fully verified because project dependencies were unavailable and package installation timed out in this environment. Treat deployment as unverified until the four project commands pass and the Vercel deployment succeeds.

## Important sharing behavior

A shared database is a **snapshot saved in MongoDB** when the link is created, not a live view of the current Contacts/Rate collection. It should appear in Shared Databases after successful creation and refresh. New or edited contact data does not mutate an existing link; create a new share for fresh data. Use Test link and verify selected fields, passcode/expiry and preview masking with dummy records first.
