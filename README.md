# NS Engineering Studio — Civil Engineering Product Ecosystem

A responsive, premium product-ecosystem website built around the supplied black, white and gold **NS** monogram. The site introduces two distinct official products: **CivilMargin** for civil construction project cost and margin visibility, and **Civil At Hand** for civil engineering/architecture learning, practical tools, mentorship and career resources. The original NS mark is retained at `public/brand/ns-logo-original.png`; visual tokens live in `app/globals.css`.

**Brand and content basis:** the supplied repository name supports **NS Engineering Studio** as the parent brand, and the two product URLs were supplied in the brief. Product descriptions were checked against the current official websites. Product availability, plans and exact capabilities can change, so each product card links to its own official site. The site does not invent client work, testimonials, customer counts, awards, certifications, results or invented statistics. The editable Privacy and Terms pages remain starter templates and require owner/legal review.

## What is included

- Next.js App Router, React, strict TypeScript, Tailwind CSS 4 and Lucide icons.
- Public home, product directory at `/products`, about, built-world focus areas and detail pages, contact, FAQ, privacy and terms pages; branded 404, loading and error states.
- Supplied logo in the header, footer and hero; original retained under `public/brand/`. PNG icons at 16×16, 32×32, 180×180, 192×192 and 512×512, ICO, SVG favicon, web manifest and 1200×630 social preview.
- Responsive accessible navigation with direct product discovery, high-contrast CivilMargin/Civil At Hand cards, audience pathways, an interactive mobile menu, keyboard-operable native disclosure FAQs, reduced-motion support, visible focus states and a skip link.
- Project inquiry form with server-side Zod validation, topic and timeline selectors, same-origin checks, honeypot, MongoDB-backed fixed-window rate limit, idempotency key, duplicate-submit protection, safe error states, private lead storage and optional Resend notification. Project area and timeline are available in the protected admin inbox.
- `/admin/login` plus protected `/admin`, with an Argon2id hash-based credential, HMAC-protected random session tokens, HTTP-only cookies, eight-hour session expiration, DB revocation on logout, login rate limiting and audit records.
- Admin overview, inquiry search/status/notes/delete, service CRUD, FAQ CRUD, brand/contact/SEO/homepage settings, publishing controls and confirmation for deletes. Writes are persisted to MongoDB.
- Server-only environment validation, pooled MongoDB driver client, indexes, security headers, robots and sitemap.
- Unit, source-integrity and Playwright end-to-end tests; password hash generator; optional idempotent starter-content seed script.

## Design and technical decisions

- The supplied mark sets the core palette: graphite/black, warm gold, cream text and an ivory content surface for visual contrast. CSS custom properties are centralised in `app/globals.css`; the hero diagram is composed from local CSS and icon primitives, with no remote assets.
- No remote photos, third-party fonts, analytics, advertising pixels or cookie-consent UI are enabled by default. The product-led home page uses an original CSS-built visual, the supplied NS logo, and direct links to the official CivilMargin and Civil At Hand sites; it does not depend on hotlinked marketing imagery.
- Server Components are used for public pages; client-side code is limited to menus and the form/admin interactions. Every admin API operation checks the session in the handler itself; hiding an admin control is not treated as authorization.
- Contact leads, editable settings, content, sessions, rate limits and security audit events use MongoDB. MongoDB is not replaced by localStorage or in-memory storage. If Atlas is unavailable, public pages can fall back to the illustrative static content, but lead submission and admin writes fail truthfully rather than claiming success.
- Built-world focus areas and FAQs can be edited in the database. Editing creates an owner-managed version; deleting a starter item writes a tombstone. Unedited records from the earlier generic digital-studio starter are retired so they do not reappear beside the civil product content; owner-edited content is preserved. No automatic production seeding occurs.
- File uploads are intentionally not shown in Admin because no durable media-storage credential was supplied. Place a licensed asset under `public/brand/` and set `logoPath` to a local `/brand/...` URL. Do not store uploads on the Vercel function filesystem.
- The admin has no built-in default login. The sign-in page now lists safe, specific configuration checks without showing any environment values. The runtime normalizes whitespace, surrounding quotes and `\$` escapes on the Argon2id hash to help with common copy/paste mistakes. It still fails closed unless the MongoDB URI, email, valid Argon2id hash and 32+ character auth secret are present. Rotate credentials through environment variables and redeploy; there is no password-reset email integration by default.

### Official references reviewed

The package pins are retained from the supplied repository and were not broadly upgraded during this visual/feature refresh to avoid introducing unverified major-version changes. The Next.js production checklist recommends running a production build and evaluating accessibility, security, metadata and Core Web Vitals before release. Use current advisory/compatibility notes before future dependency upgrades.

- [Next.js App Router docs](https://nextjs.org/docs/app) · [Production checklist](https://nextjs.org/docs/app/guides/production-checklist) · [Installation/system requirements](https://nextjs.org/docs/app/getting-started/installation) · [Route handlers](https://nextjs.org/docs/app/getting-started/route-handlers) · [Environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Tailwind CSS Next.js setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [MongoDB Node.js driver](https://www.mongodb.com/docs/drivers/node/current/) · [Connection pools](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/) · [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
- [Argon2 password hashing](https://www.npmjs.com/package/argon2) · [Zod schema validation](https://zod.dev/)
- [Resend with Next.js](https://resend.com/nextjs)
- [Vercel environments](https://vercel.com/docs/deployments/environments) · [Environment variables](https://vercel.com/docs/environment-variables)
- [CivilMargin official site](https://civilmarzin.civilathand.in/) · [Civil At Hand official site](https://civilathand.in/) · [Civil At Hand about page](https://www.civilathand.in/about)

Package pins: Next.js `16.4.3`, React/React DOM `19.3.0`, Tailwind `4.3.3`, MongoDB driver `7.7.0`, Zod `4.6.5`, Argon2 `0.45.1`, Lucide React `1.61.0`. TypeScript is pinned to `5.9.3` for a conservative compiler baseline. Do not upgrade a single framework peer without reviewing compatibility and rebuilding.

## Requirements

- Node.js **22.x** (the project pins the Node major version in `package.json` for predictable Vercel builds).
- npm compatible with the Node release.
- MongoDB Atlas for persistent leads/admin content and sessions.
- An owner-controlled production domain for canonical metadata and production contact links.
- Optional: a Resend account and verified sending domain for admin email notifications.

## Local installation

1. Download and extract this directory, then open a terminal at the project root.
2. On a network-enabled machine, run `npm install`. This resolves the package tree and writes a complete `package-lock.json` for repeatable installs; commit that generated lockfile before deployment. **The authoring environment could not resolve `registry.npmjs.org`, so it could not generate a fully resolved dependency lock or install dependencies here. The included `package-lock.json` is a bootstrap manifest only; do not use `npm ci` until `npm install` has regenerated it.**
3. Copy `.env.example` to `.env.local` and fill the required settings below. Keep `.env.local` private; it is gitignored.
4. Run `npm run dev` and visit `http://localhost:3000`.

## Environment variables

Set variables in `.env.local` for local development and in Vercel Project → Settings → Environment Variables for deployment. Select **Development**, **Preview** and/or **Production** explicitly for each value. Vercel changes apply only to new deployments; redeploy after changes.

| Variable | Required? | Exposure | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | Set by framework | Server | Runtime mode; normally leave to Next.js. |
| `MONGODB_URI` | Required for contact persistence and admin | Server-only | Atlas connection string. Never use a `NEXT_PUBLIC_` prefix. |
| `MONGODB_DB` | Optional; defaults to `ns_studio` | Server-only | Database name. |
| `ADMIN_EMAIL` | Required for admin | Server-only | Single administrator's login email. |
| `ADMIN_PASSWORD_HASH` | Required for admin | Server-only | Argon2id hash created by `npm run admin:hash`. Never commit it. |
| `AUTH_SECRET` | Required for admin | Server-only | Random secret, at least 32 characters, used to HMAC session tokens and hash rate-limit identifiers. |
| `NEXT_PUBLIC_SITE_URL` | Strongly required for canonical URLs | Public | Full origin, e.g. `https://www.example.com`. Use your actual production domain in Production. |
| `NEXT_PUBLIC_SITE_NAME` | Optional; defaults to `NS Engineering Studio` | Public | Site name used for initial settings if there is no saved settings record. |
| `NEXT_PUBLIC_CONTACT_PHONE` | Optional; defaults to `7703977002` | Public | Initial phone setting. The owner can also edit it under Admin → Site settings. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Public | Initial displayed contact email; leave empty if none is supplied. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Optional | Public | Complete international digits-only number (11–15 digits in this starter, including country code). Leave blank to hide WhatsApp. Never derive the country code from the supplied phone. |
| `RESEND_API_KEY` | Optional | Server-only | Enables email notification when the two following values are also present. |
| `CONTACT_EMAIL_TO` | Optional with Resend | Server-only | Owner's notification recipient; no recipient is hard-coded. |
| `CONTACT_EMAIL_FROM` | Optional with Resend | Server-only | Verified sender address/domain in Resend. |

There are no Cloudinary, Blob, analytics or payment variables because those integrations are not included or presented as active. Optional email configuration failing does not invalidate an inquiry after MongoDB has saved it.

### Configure MongoDB Atlas

1. Create a project and cluster in Atlas. Create a dedicated database user with only the database permissions this application requires; do not reuse an account-wide administrator.
2. Add `ns_studio` as `MONGODB_DB` (or the name you chose) and copy the URI from Atlas. URL-encode special characters in the database username/password.
3. Configure the Atlas IP access list with the narrowest network access your deployment can use. Vercel outbound networking depends on plan and configuration; if static egress is available to your project, configure it and allow only the relevant egress addresses. For local development, allow your current workstation IP. Avoid leaving `0.0.0.0/0` enabled in production.
4. Set `MONGODB_URI` and `MONGODB_DB` in local and Vercel environments. The server opens a pooled driver client and creates the application indexes automatically on first successful connection.
5. Optional local content seed: `npm run seed`. This inserts missing illustrative service/FAQ records only and does not overwrite existing records. Production is not seeded automatically. Review and replace all starter copy before hiding the starter-content notice.
6. Test a contact inquiry, verify it appears in the Admin inbox, then delete the test inquiry. Configure Atlas backup/snapshot policy separately and periodically test a restore/export; this project does not claim backups are enabled.

### Configure administrator credentials

1. Set `ADMIN_EMAIL` to an owner-controlled address.
2. Run `npm run admin:hash` in an interactive terminal. The script hides password input and uses Argon2id. Use a unique password of at least 14 characters and keep it in a password manager.
3. Copy only the generated `$argon2id$...` hash to `ADMIN_PASSWORD_HASH`. In the Vercel dashboard, paste the exact generated hash with no quotes or `ADMIN_PASSWORD_HASH=` prefix. In `.env.local`, escape each dollar sign as `\$` because Next.js expands `$NAME` references in `.env` files; the app normalizes that escaped form. If a direct Vercel value still fails the hash check, re-enter it with each `$` escaped as `\$`, save, and redeploy. Do not paste the password itself or surrounding command output.
4. Generate an `AUTH_SECRET` locally, for example with `openssl rand -base64 48`, and store it only in local environment/Vercel server variables.
5. Do not enable admin in a shared preview environment unless the database and credentials are intentionally separated. On credential rotation, update the hash/secret and redeploy; changing the secret invalidates existing sessions. Sessions also expire after eight hours and logout deletes the stored session record.

The login route fails closed if configuration is missing. The login page lists which environment checks are incomplete without revealing values. After correcting any displayed item, make sure its Vercel environment matches the live deployment (normally Production) and redeploy. The route returns generic credential errors, rate-limits by a hashed connection identifier, and never logs passwords. Session tokens are random, stored as hashes, HMACed with `AUTH_SECRET`, and kept in `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production). Admin APIs separately authorize every request and require same-origin requests for mutations.

### Optional Resend email

1. Create a Resend account, add and verify a sender domain, and generate an API key.
2. Set `RESEND_API_KEY`, `CONTACT_EMAIL_TO` and `CONTACT_EMAIL_FROM` in the chosen environment.
3. Redeploy, send a test contact inquiry and confirm the owner receives the notice. The inquiry is persisted before notification is attempted. If notification delivery fails, the website reports the saved inquiry truthfully and the server logs only a generic provider failure message.

## Content, branding and media

- Keep the supplied source image at `public/brand/ns-logo-original.png`. The standard icon files are derived by proportional resampling on a matching dark background; `public/favicon.svg` is a simplified small-size derivative of the monogram.
- Change brand name, tagline, main hero/about copy, contact phone/email, local logo path, SEO title/description and social URLs under **Admin → Site settings** after configuring MongoDB/admin credentials.
- Manage offerings under **Admin → Services** and FAQs under **Admin → FAQs**. Draft content is not shown publicly. Delete actions ask for confirmation and use a tombstone for default starter records so deleted defaults stay deleted.
- For another logo asset, add the properly licensed file to `public/brand/` and set `logoPath` to a local path beginning with `/brand/`. A durable upload integration is intentionally absent, so there is no upload control to imply that uploads persist.
- Update the starter Privacy and Terms templates to the actual entity, jurisdiction, processors, retention policy, rights/process and service terms. They have not received legal review.
- Admin writes plain text; strings are rendered as text, not injected as HTML.

## QA and release commands

After `npm install` on a network-enabled machine:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
# In another terminal, install a Playwright browser if needed and run:
npx playwright install chromium
npm run test:e2e
```

`npm test` runs Vitest validation tests. `node --test tests/project.test.mjs` is a dependency-free structural/source integrity test and can be run immediately. Playwright tests cover the public navigation, form-required fields, anonymous admin access and unknown routes. Live MongoDB persistence, valid admin login/logout and notification delivery require the relevant environment credentials; use the post-deployment verification below for those boundaries.

## GitHub → Vercel deployment

1. Regenerate/commit the complete package lock with `npm install` on a network-enabled machine. Run type-check, lint, tests and a clean production build; address any warnings relevant to the changed source.
2. Create a new, private or public GitHub repository as appropriate. From the project root: `git init`, `git add .`, `git commit -m "Initial NS Engineering Studio website"`, set your new repository as `origin`, then push the `main` branch. Inspect `git status` and the staged file list first; `.env.local`, `.env*` except `.env.example`, `node_modules`, `.next`, logs and backups are gitignored.
3. In Vercel choose **Add New → Project**, import the GitHub repo and keep the Next.js framework preset. Build command should be `npm run build`; the output directory should remain the framework default. Set Node.js 22.x (or another version supported by your chosen Next.js release). Do not commit secrets to fix a build error.
4. Add environment variables for the correct environments. Production needs `MONGODB_URI`, `MONGODB_DB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, and `NEXT_PUBLIC_CONTACT_PHONE`. Add the optional email values only when configured. Preview environments should use an intentional preview URL and preferably a separate database and admin credentials.
5. Deploy. Add the real domain through Vercel Project → Settings → Domains, update DNS as Vercel instructs, wait for domain/HTTPS verification, and change `NEXT_PUBLIC_SITE_URL` to the canonical production origin; redeploy so canonical, Open Graph and sitemap links use it.
6. Check Vercel logs for generic runtime errors without sharing secret values. Do not expose Atlas credentials or dump environment variables in logs.

## Post-deployment verification / security checklist

- Open `/`, `/products`, `/about`, `/services`, a focus-area detail page, `/contact`, `/faq`, `/privacy`, `/terms`, `/robots.txt` and `/sitemap.xml` on mobile and desktop. Verify the external CivilMargin and Civil At Hand cards open their official sites in a separate tab.
- Verify the phone is displayed exactly as `7703977002` unless intentionally changed in Admin; confirm the telephone link works. Verify WhatsApp is absent unless a complete international number has been configured.
- Submit a valid contact inquiry, confirm the success reference appears only after a database write, verify the lead is private in Admin and test rate limiting/duplicate-submit handling. Test a disconnected/invalid database configuration and confirm the UI reports failure rather than success.
- Open `/admin` in a private browser. It must redirect to `/admin/login`; protected APIs must return 401 without the session. Test wrong credentials, valid login, session cookie flags, logout/revocation and retry throttling.
- Edit/publish a service and FAQ, verify the public page changes, try a draft, then delete a test record and check the public site. Update a contact setting, verify the header/footer/form details, and keep the starter notice until sample copy has been reviewed.
- Check keyboard navigation, focus rings, form labels/errors, accordion keyboard use, 320px layout, a tablet layout, wide desktop, reduced-motion behavior and page-level metadata.
- Restrict Atlas access, rotate the admin secret on handover if necessary, set a real retention schedule, configure/verify Atlas backups, review the legal templates and document the privacy contact before production promotion.

## Troubleshooting

- **Admin locked:** `/admin/login` lists safe configuration checks without displaying secrets. Confirm all four variables exist for the exact deployment environment (normally Production for the live domain), then redeploy. `ADMIN_PASSWORD_HASH` must be the complete Argon2id hash generated by `npm run admin:hash`, not the password, a bcrypt hash, a variable assignment, or sample text. Use the exact hash in the Vercel dashboard; in `.env.local`, escape each `$` as `\$`. If the Vercel value is still rejected, try saving the hash with each `$` escaped as `\$` and redeploy. The app normalizes escaped values and can extract the hash if surrounding command output was accidentally copied. `AUTH_SECRET` must be at least 32 characters. A valid-looking URI does not prove Atlas connectivity; if sign-in is unlocked but reports a service error, check Atlas network access, username/password URL encoding, and the database name.
- **Admin login returns a generic service error:** verify Atlas network access, URI encoding, database name and Vercel egress/allowlist settings. No connection string is returned to visitors.
- **Contact form cannot save:** the form requires a working MongoDB connection; optional email is not required. Inspect server logs for the generic request failure and correct the database connection.
- **Email notice absent:** verify all three Resend variables, sender verification and recipient address. A saved inquiry remains in the private inbox even if email fails.
- **Wrong canonical or sitemap origin:** set `NEXT_PUBLIC_SITE_URL` to the exact canonical HTTPS origin in Vercel and redeploy.
- **Logo doesn't update:** ensure the file exists under `public/brand/`, use a local `/brand/...` path and confirm the file extension/path is correct. Uploaded assets are not supported by the admin panel.

## Current build report / known limitations

The authoring container could not resolve `registry.npmjs.org` (`curl` returned a DNS resolution failure), so a clean dependency install, generated full lockfile, Next.js production build, TypeScript compiler run, ESLint run and Vitest/Playwright execution could not be truthfully reported from this environment. These are mandatory next release gates on a network-enabled machine. The dependency-free `node --test tests/project.test.mjs` and archive verification are provided separately in the hand-off report. No live Atlas, Resend or Vercel credentials were supplied, so database, admin credential, email delivery and deployment integrations have not been live-tested here.
