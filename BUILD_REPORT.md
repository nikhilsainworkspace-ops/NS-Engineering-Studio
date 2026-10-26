# Build and release report

**Project:** NS Engineering Studio — civil engineering, architecture and construction product ecosystem  
**Prepared:** October 26, 2026  
**Brand asset:** Supplied NS monogram at `public/brand/ns-logo-original.png`  
**Official products:** [CivilMargin](https://civilmarzin.civilathand.in/) · [Civil At Hand](https://civilathand.in/)

## What this release contains

- Premium black/graphite, warm-gold, ivory and restrained-sage visual system; responsive layouts and clear type hierarchy across home, product, service, role, tool, guide, contact, about and policy pages.
- Product pathways for CivilMargin and Civil At Hand, with internal explainer pages and direct links to each supplied official destination. Content explains intended use without fabricated reviews, customer figures, certifications or business outcomes.
- Audience routes for contractors/subcontractors, quantity surveyors/estimators, architecture/BIM teams, site quality/planning teams, students/graduates, and owners/project leaders.
- Four interactive client-side engineering tools: rectangular concrete volume, paint/coating estimate, theoretical reinforcement bar weight (`d²/162 kg/m`), and simplified project margin with contingency. Each shows assumptions/formulas, supports reset and can copy/print summaries where supported. Results are indicative planning aids, not engineering approvals or financial advice.
- Searchable, topic-filterable guide library with seven full article routes, unique metadata, related content and professional-review disclaimers.
- Existing inquiry and protected admin system retained: MongoDB-backed contact leads/content/settings, Argon2id password hash, secure HTTP-only sessions, login throttling, audit events and admin readiness diagnostics. Production database/admin operation remains dependent on the owner's environment configuration.
- Search metadata, canonical URLs, Open Graph metadata, sitemap, robots rules, SVG/ICO/PNG icons, web manifest, error/not-found/loading routes, keyboard-operable controls, reduced-motion styles, and narrow-screen responsive CSS.

## Checks actually run in this environment

| Check | Result | Detail |
|---|---|---|
| `node --test tests/project.test.mjs` | **PASS** | 10 tests passed, 0 failed. Covers key paths/files, safe packaging, product links, inquiry API source patterns, no `href="#"`, icon dimensions, calculators and resource navigation. |
| `node scripts/verify-source.mjs` | **PASS** | Runs the same dependency-free 10-test source suite; 10 passed, 0 failed. |
| TypeScript/TSX parser syntax check | **PASS** | Parsed 68 `.ts`/`.tsx` files; 0 syntax diagnostics. This checks syntax only, not semantic types. |
| `node --check scripts/hash-password.mjs` | **PASS** | Password hash script syntax valid. |
| `node --experimental-strip-types --check scripts/seed.ts` | **PASS** | Seed script syntax valid on Node 22. |
| `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline` | **BLOCKED** | Installation timed out while dependencies/registry metadata were unavailable in the authoring container. |
| `tsc --noEmit --pretty false` | **BLOCKED** | Could not provide a meaningful semantic typecheck because the project dependencies and React/Next type declarations are not installed. |
| ESLint / Vitest / Playwright | **NOT RUN** | The required dependencies and Playwright browser binary are unavailable locally. |
| Next.js production build | **NOT RUN** | Must be run on a network-enabled checkout after resolving the lockfile and installing dependencies. No successful production build is claimed. |
| MongoDB Atlas, admin sign-in, Resend email, Vercel production | **NOT LIVE-TESTED** | Requires the owner's real secrets, network configuration and deployment. |

## Packaging and repository notes

- The ZIP is intended to include the project root folder and all source/configuration/assets, excluding `.env.local`, other real `.env` files, `node_modules`, `.next`, TypeScript build caches and local backups.
- `.env.example` contains placeholder values only. No real credentials, live database URI or known admin password are packaged.
- The repository's `package-lock.json` is a bootstrap-only lockfile (root package metadata only); it is **not** a complete resolved dependency lock. On a network-enabled machine, run `npm install`, commit the fully resolved lockfile for this exact `package.json`, then use `npm ci` for reproducible release builds. Do not treat the package as release-build-verified until this is done.

## Required release gates before announcing a public launch

1. In a network-enabled checkout, run `npm install`, commit the generated full lockfile, then run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:source`, and `npm run build`. Fix all framework/type errors before merging.
2. Install a browser for end-to-end tests with `npx playwright install chromium`; run `npm run test:e2e`.
3. Configure `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET`, and `NEXT_PUBLIC_SITE_URL` for the exact Vercel environment. Generate an Argon2id hash with `npm run admin:hash`; do not store a plain password in `ADMIN_PASSWORD_HASH`. Save environment variables and redeploy.
4. Test `/admin/login`, failed login, successful login, logout/session revocation, anonymous API denial, and rate limiting against the live deployment. Confirm the admin readiness page does not list configuration errors and does not expose secret values.
5. Submit a real contact test. Verify the database write succeeds before success is shown, the lead is private in Admin, status/notes/delete work, rate limits and duplicate-submit guards behave correctly, and optional email delivery is configured before expecting mail.
6. Check the supplied official product links, all page titles and canonical URLs, 320px mobile layout, keyboard-only navigation, contrast/focus behavior and reduced-motion mode.
7. Restrict MongoDB Atlas access using appropriate network/database-user rules; confirm backups and retention rather than assuming they are enabled. Review the Privacy and Terms starter templates with qualified counsel; they have not been legally reviewed.

## Known boundaries

- No Vercel deployment has been made or verified from this workspace. Domain ownership, DNS, environment variables and third-party accounts remain owner-controlled.
- No image upload UI is included because durable upload credentials were not supplied. Put properly licensed assets in `public/brand/` and configure a local asset path.
- The calculator tools are simple estimates and do not replace project drawings, BOQs, bar bending schedules, local codes, product data or qualified professional review.
- Privacy and Terms are editable starter templates, not legal advice. Product availability and current capabilities should be checked on the official product sites.
