# Build and release report

**Project:** NS Engineering Studio — civil engineering product ecosystem  
**Prepared:** October 26, 2026  
**Brand asset:** Supplied NS monogram at `public/brand/ns-logo-original.png`  
**Official product destinations:** [CivilMargin](https://civilmarzin.civilathand.in/) · [Civil At Hand](https://civilathand.in/)

## Final update

- Rebuilt the main page around the two supplied products, with clearer audience pathways and direct external links to the official destinations.
- Added and linked the `/products` directory. Updated About, FAQ, Process, Services and Contact copy for civil engineering, architecture, construction, BOQ/quantity surveying, site/QC workflows, professional learning and cost/margin visibility.
- Retained the uploaded NS identity and black/ivory/gold design language; created responsive product cards and capability sections for mobile and desktop.
- Fixed administrator readiness diagnostics. The login page now names which of `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` or `AUTH_SECRET` is absent/invalid without printing values. Admin checks are independent from optional public-site variables; escaped dollar signs in Argon2id hashes are normalized.
- Updated the `.env.example` and README instructions: Vercel needs raw hash text and the correct environment (Production/Preview/Development) plus a redeploy; local `.env.local` values must escape literal `$` characters as `\$` because Next.js expands environment references.
- Changed the Node engine declaration to `22.x` instead of a floating `>=20.9.0` range to avoid automatic major-version drift.
- Preserved owner-edited MongoDB content; unedited generic starter records are retired/migrated to the current civil/architecture product copy.

## Checks actually run in this authoring environment

| Check | Result | Detail |
| --- | --- | --- |
| `node --test tests/project.test.mjs` | **PASS** | 7 tests passed, 0 failed. |
| `node scripts/verify-source.mjs` | **PASS** | 7 source checks passed, 0 failed. |
| TypeScript/TSX parser syntax check | **PASS** | Parsed 59 `.ts`/`.tsx` files; 0 syntax diagnostics. This is not a full semantic typecheck. |
| `node --check scripts/hash-password.mjs` | **PASS** | Password hash script syntax valid. |
| `node --experimental-strip-types --check scripts/seed.ts` | **PASS** | Seed script syntax valid. |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=15000` | **BLOCKED** | Timed out while resolving the npm registry. The included `package-lock.json` is a root-manifest bootstrap, not a fully resolved lockfile. Run `npm install` on a network-enabled machine and commit the generated lockfile before relying on `npm ci`. |
| ESLint / `npm run typecheck` | **NOT RUN** | Dependencies are not installed in this container. |
| Vitest / Playwright | **NOT RUN** | Dependencies and browser binaries are unavailable. The environment-readiness Vitest tests are included but have not run here. |
| Next.js production build | **NOT RUN** | The full framework build could not be repeated because npm dependency installation timed out. Do not treat the parser check as build validation. |
| MongoDB Atlas persistence, admin login/logout, email notifications | **NOT LIVE-TESTED** | Requires the owner’s working Atlas/Resend configuration and deployment. |
| ZIP integrity / file inventory | **PASS** | Verified with `unzip -t`; no `.env.local`, `node_modules`, `.next`, or cache directories are packaged. |

## Required final release checks

1. On a network-enabled checkout, run `npm install` and commit the resulting complete `package-lock.json`; use the lockfile produced by that exact package manifest.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:source`, and `npm run build`. Resolve all errors before production.
3. Run `npx playwright install chromium` and `npm run test:e2e`.
4. Set `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `AUTH_SECRET` for the exact Vercel environment used by the deployment. Use the raw Argon2id hash from `npm run admin:hash`, set the correct HTTPS `NEXT_PUBLIC_SITE_URL`, save values and redeploy.
5. Open `/admin/login`: it should list any missing/invalid environment checks without exposing secrets. If the form unlocks but login returns a service error, verify MongoDB Atlas network access, database user permissions, URL-encoded special characters in credentials, and that the database is reachable from Vercel.
6. Submit a test contact inquiry; confirm that it persists in the admin inbox, can be status-updated and deleted, and any configured email notification behaves as expected. Test external product links, keyboard navigation, and 320px-wide mobile layout.
7. Review Privacy and Terms templates with qualified counsel before relying on them. Configure the real domain/DNS and verify Vercel production deployment before announcing a worldwide launch.

**Release status:** Updated source and source-level checks are packaged. A fully resolved dependency lockfile, clean framework build, live database/auth tests and verified Vercel deployment remain release gates; no worldwide launch is claimed until those pass.
