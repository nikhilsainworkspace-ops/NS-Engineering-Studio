# NS Engineering Studio

Unified Next.js platform for NS Engineering Studio. The root application owns the public website, service and project enquiries, public project portfolio, software catalogue, content CMS and central administrator session. The integrated construction operations workspace lives at `/workspace`; its API handlers are namespaced under `/api/civil-at-hand/*` and continue to use Mongoose models for existing workspace records.

## Requirements

- Node.js 22.x (the project declares this engine)
- npm 10 or a compatible modern npm release
- MongoDB database access for persistent website CMS/admin sessions and for workspace records
- Optional provider credentials only for features you choose to enable (Resend email, Gemini assistant, authenticator-based 2FA)

## Local setup

1. Copy `.env.example` to `.env.local` and set a valid MongoDB connection string, a database name, an administrator email, an Argon2id password hash, and a random `AUTH_SECRET` of at least 32 characters.
2. Generate the password hash with `npm run admin:hash`; enter a strong password only in the local terminal prompt. Put the resulting hash in `ADMIN_PASSWORD_HASH`, never the password itself.
3. Install dependencies with `npm install`.
4. Run `npm run dev` and visit `http://localhost:3000`.
5. Sign in at `/admin/login`. Use `/admin/projects` and `/admin/software` to manage public catalogue records; use `/workspace` for construction operations.

The code environment used to produce this archive had no working npm registry DNS, so a full dependency download, production build, and lockfile generation could not be run here. The supplied archive only contained a root-entry lockfile without resolved packages, so it is omitted rather than implying that `npm ci` is reproducible. Run `npm install` in a network-enabled environment to resolve dependencies, generate a complete `package-lock.json`, and commit that lockfile before release. See `TEST_REPORT.md` for what was and was not verified in this session.

## Database separation and data safety

- `MONGODB_URI` and `MONGODB_DB` configure the NS website CMS, enquiries, central admin sessions, rate limits, and audit events. If `MONGODB_DB` is omitted, the website uses `ns_studio`.
- The workspace uses `CIVIL_AT_HAND_MONGODB_URI` when set; otherwise it uses `MONGODB_URI`. `CIVIL_AT_HAND_MONGODB_DB` can explicitly select the workspace database. If that override is blank, the workspace retains the database path embedded in its connection URI rather than automatically inheriting the NS website `MONGODB_DB` override.
- No database collections were copied, dropped, reset, or migrated in this session. See `MIGRATION_GUIDE.md` and back up each source database before changing production connection settings.

## Main routes

| Route | Purpose |
|---|---|
| `/` | NS Engineering Studio public homepage |
| `/services` and `/services/:slug` | Service descriptions and enquiries |
| `/projects` and `/projects/:slug` | Searchable, admin-published project portfolio |
| `/engineering-software` | Searchable engineering software catalogue and admin-published software records |
| `/service-coverage` | Owner-editable coverage note and India-wide enquiry guidance |
| `/search` | Search published services, projects, software, products, FAQs and guides |
| `/tools`, `/resources`, `/products` | Existing NS tools, guides, and product directory |
| `/contact` | Central enquiry form (service, manpower, and project enquiries) |
| `/admin` | Central website admin, enquiry inbox, public settings |
| `/admin/projects`, `/admin/software` | Admin CRUD for projects and software listings |
| `/workspace` | Integrated construction workspace dashboard |
| `/api/civil-at-hand/*` | Namespaced construction workspace API |

The former `/products/civil-at-hand` public URL redirects to `/products/engineering-workspace`. Redirects preserve the former workspace page paths `/forms/:token`, `/join/:token`, `/shared/:token`, `/p/:slug`, and `/print/:kind/:id`. Non-conflicting legacy API paths are rewritten to the namespaced handlers. The former `/api/auth/*` and `/api/contact` paths remain owned by NS Engineering Studio to avoid authentication/contact collisions.

## Scripts

- `npm run dev` — local development server
- `npm run build` — Next.js production build
- `npm run start` — start the production build
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm test` — root Vitest suite
- `npm run test:source` — Node-based source/structure tests
- `npm run test:civil-at-hand` — original workspace unit tests preserved in the reference directory
- `npm run test:civil-at-hand:integration` — original workspace integration tests
- `npm run check:all` — sequential typecheck, lint, root tests, source tests, preserved workspace tests, and build
- `npm run admin:hash` — generate an Argon2id administrator password hash
- `npm run seed` — original NS starter-data seed script; review it before running against a non-test database

## Important boundaries

- The project/software CMS accepts same-site asset paths or HTTPS URLs; a dedicated media-store upload flow for the public project gallery is not wired into that CMS. The workspace contains its own document/note/public-page upload features.
- No payment processor, subscription billing activation, customer self-service identity system, cookie banner for optional tracking, marketing email subscription, or role-based content staff accounts were configured in the supplied source. Do not advertise these as live. See the merge plan and security checklist.
- Privacy, terms, cookie, and refund/cancellation text are editable drafts that require business and legal review before launch.
- The CivilMargin destination supplied with the original source could not be verified in this build, so no public launch link is rendered. Its source configuration is retained internally; the owner should replace it with a verified destination before enabling launch.

## Release documentation

- `FEATURE_INVENTORY.md` — feature and route inventory from both supplied projects
- `MERGE_PLAN.md` — merge architecture and decisions
- `MIGRATION_GUIDE.md` — database, identity and rollback guidance
- `DEPLOYMENT_GUIDE.md` — local and Vercel deployment procedure
- `SECURITY_CHECKLIST.md` — operational security review
- `TEST_REPORT.md` — actual checks and blockers from this session

The ZIP is a code integration deliverable, not evidence of a production deployment. Configure real provider credentials, verify database access and backup/restore in a non-production environment, run the release checks, and complete owner/legal review before go-live.
