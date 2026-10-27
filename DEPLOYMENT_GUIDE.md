# Deployment Guide

## Prerequisites

- Node.js 22.x and npm 10+ on local machines/CI.
- A MongoDB instance with TLS, least-privilege database users and network access limited to the deployment environment.
- Vercel or another Next.js-compatible host with server-side environment variable support. A production HTTPS domain is required before sending customer data.
- Optional provider accounts only for enabled features: Resend for email, Google AI Studio/Gemini for the workspace assistant.

## Local run

1. `cp .env.example .env.local` and replace placeholders with locally scoped development values.
2. Create an administrator hash: `npm run admin:hash`. Use the full generated Argon2id hash for `ADMIN_PASSWORD_HASH`; never configure a plain-text password there.
3. Generate a unique random `AUTH_SECRET` with at least 32 characters.
4. `npm install` (the preparation sandbox could not reach npm registry DNS, so this step must be run in a network-enabled environment).
5. `npm run dev`, then check `/`, `/services`, `/projects`, `/engineering-software`, `/contact`, `/admin/login` and `/workspace`.

## Vercel deployment

1. Import the final project root (not the original nested project folder) into Vercel. The framework should be detected as Next.js; use the root directory containing `package.json`.
2. Add environment variables by environment (Development / Preview / Production). Never put credentials in `NEXT_PUBLIC_*` variables.
3. Set `MONGODB_URI`, `MONGODB_DB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL`. Also set a matching `NEXT_PUBLIC_SITE_NAME` and contact details. For legacy workspace preservation, set `CIVIL_AT_HAND_MONGODB_URI` / `_DB` if the correct workspace database is not encoded in `MONGODB_URI`.
4. Add the production domain under Vercel project settings, configure DNS using Vercel's current instructions, verify HTTPS, and set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin without a trailing path.
5. After npm connectivity is available, run `npm install` (this generates the missing complete lockfile; commit it), `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:source`, `npm run test:civil-at-hand`, `npm run test:civil-at-hand:integration`, and `npm run build` in CI. Do not deploy if a check fails; update `TEST_REPORT.md` with actual results.
6. Deploy to Preview first. Check server logs for database, authentication, file storage and provider issues. Test all CRUD on staging-only data.
7. Deploy to Production after backup and access checks. Verify `robots.txt`, `sitemap.xml`, metadata, manifest, favicon, redirects, public enquiry, central admin session and workspace session/logout.

## Configuration of optional integrations

- **Email:** configure `RESEND_API_KEY`, `CONTACT_EMAIL_TO` and `CONTACT_EMAIL_FROM`. Confirm the sender/domain with the provider. Without all three, email notifications remain disabled; saved inquiries may still appear in the admin inbox.
- **Authenticator / TOTP:** set `ADMIN_TOTP_SECRET` only after configuring the authenticator secret outside source control. When enabled, sign in through `/workspace` so the code is validated. Keep server time synchronized and plan recovery procedures.
- **Gemini assistant:** `GEMINI_API_KEY` is required; optional `GEMINI_MODEL` selects the model. No key is shipped in the repository.
- **Backups/scheduled jobs:** configure `CRON_SECRET` only if the scheduled backup/job endpoint is exposed in your deployment, and test restore into staging. `BACKUP_RETENTION_DAYS` is not a substitute for an independent database snapshot policy.
- **WhatsApp:** `NEXT_PUBLIC_WHATSAPP_NUMBER` should be digits only with country code. It is public by design.
- **Payments, OAuth, analytics and subscription plans:** not activated by this archive. Do not add public controls claiming these integrations work until provider credentials, callbacks, signatures, refund/renewal handling and end-to-end tests are completed.

## Initial admin and smoke test

- Set a real admin email and Argon2id password hash; no hardcoded initial password exists.
- Log in and confirm `/admin` displays stored-data counts; use `/admin/projects` to publish one approved test project on staging and verify it appears at `/projects` then archive/unpublish it.
- Add a test software record with a staging URL and check its visible status on `/engineering-software`.
- Submit a contact form with dummy staging data and verify state/city/organization are private in the admin inbox. Delete the test lead after review.
- Sign into `/workspace`, create a test record in each critical module, run an export/backup and restore only into staging, then log out and confirm requests are unauthorized.
- Check `/robots.txt`, `/sitemap.xml`, `/favicon.svg`, `/site.webmanifest`, old route redirects, error pages and responsive layouts.

## Rollback

Keep the last good deployment active until Preview passes. Roll back through the host dashboard to the previous release and revert changed environment settings if necessary. Do not reset or overwrite production databases as a rollback shortcut.
