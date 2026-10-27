# Test Report — NS Engineering Studio Final

**Assessment date:** 27 October 2026  
**Environment:** Node.js v22.16.0, npm 10.9.2, Linux sandbox.  
**Important:** the source package was not fully installed or built in this sandbox. npm registry DNS requests failed with `EAI_AGAIN registry.npmjs.org`; therefore no production build, real TypeScript typecheck, ESLint run, Vitest suite, or original TypeScript workspace tests can honestly be marked as passed.

## Executed checks

| Check | Result | Evidence / scope |
|---|---|---|
| `node scripts/verify-source.mjs` | Passed | Existing source/structure validator executed successfully. |
| `node --test tests/project.test.mjs` | Passed (10/10) | Original NS source checks rerun after the public-route and branding edits. |
| `node --test tests/*.test.mjs` | Passed (18/18) | 10 original NS source checks plus 8 merge-specific checks for route counts, brand, workspace auth, coverage, follow-up fields, docs and assets. |
| TypeScript/TSX syntax transpilation (`transpileModule`, all application TS/TSX outside reference-only legacy tests) | Passed, 307 files / 0 syntax diagnostics | Parses source syntax; it does not resolve module types or replace `tsc --noEmit`. |
| Internal import/path scan (integrated workspace/API/module source) | Passed, 0 unresolved internal imports | Checks relative and `@/` source paths for existence. |
| `tinycss2` stylesheet parse | Passed, 3 files / 0 top-level errors | Checks site and scoped workspace CSS syntax. |
| CSS parser (`tinycss2`) | Passed, 0 top-level CSS parse errors | All app CSS and scoped workspace styles. Does not replace browser visual testing. |
| `npm install --no-audit --no-fund` | Blocked | npm could not reach `registry.npmjs.org` because DNS returned `EAI_AGAIN`; no dependency tree was installed. The supplied root lockfile had no resolved package entries and was omitted rather than shipping a misleading `npm ci` lock. |
| `tsc --noEmit` | Blocked / inconclusive | Global TypeScript exists, but app dependencies and type declarations are not installed; most diagnostics are unresolved framework/module types. Full typecheck must be rerun with dependencies present. |
| `npm run lint` | Not run | Requires project dependencies that could not be installed. |
| `npm test` / Vitest | Not run | Vitest is not installed in this sandbox. |
| `npm run test:civil-at-hand` | Not run | `tsx` and the runtime dependency tree could not be installed. Original tests are preserved under `modules/civil-at-hand/reference/tests/`. |
| `npm run build` | Not run | Requires Next.js and resolved dependency tree; production build remains unverified. |
| `npm audit` | Not run | Registry access unavailable, so dependency advisory data could not be fetched. |

## What has been verified by source checks

- 98 original construction-workspace API route handlers are present under `app/api/civil-at-hand/`.
- The integrated workspace dashboard and all original model/component source folders are retained.
- New project/software CMS schemas, public pages, admin routes, service coverage settings, public search and route aliases are present.
- The shared auth wrapper references the NS central session rather than the legacy `cah_session` cookie.
- SVG/raster NS mark, favicon and social preview assets are present; social preview raster is 1200×630.
- `.env.example` contains placeholder configuration only; no production credentials are supplied.
- No real database records or production connection were available, so no database migration, integration workflow, payment, email, OAuth or production-domain test occurred. A read-only billing status route and generic disabled environment template are included; no provider adapter is activated. The source-supplied CivilMargin outbound URL could not be verified during this release check; its public launch button is disabled until the owner supplies a verified destination. A read-only Billing page and role-status page explicitly report unsupported capabilities instead of simulating them.

## Required release gate after registry access is restored

Run from the project root:

```bash
npm install # generates a complete package-lock.json
npm run typecheck
npm run lint
npm test
npm run test:source
npm run test:civil-at-hand
npm run test:civil-at-hand:integration
npm run build
npm audit
```

Before production, additionally smoke-test admin login/logout, TOTP when enabled, database connectivity to both configured data stores, project/software publishing, enquiry CRUD/status/assignment/follow-up, all critical workspace routes, file and shared-link permissions, backup/restore in staging, responsive layouts, HTTPS headers, robots/sitemap, and any activated external provider integrations. Update this report with command output before claiming release verification.
