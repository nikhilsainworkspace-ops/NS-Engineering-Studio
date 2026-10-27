# Security Checklist

This is an implementation/operator checklist, not a third-party penetration-test certificate. Items marked “verify” require execution against the actual deployment and databases.

## Present in source

- [x] No real credentials are intended in this archive; `.env.example` contains placeholders only.
- [x] Central administrator password verification uses Argon2id; administrator bootstrap uses `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `AUTH_SECRET`.
- [x] Admin sessions use an HTTP-only, same-site cookie, random token, hashed server-side record, explicit expiration and configurable idle timeout.
- [x] Root contact/admin writes validate request origin and server-side request bodies; the contact endpoint has a honeypot and rate limiter.
- [x] Admin content CRUD requires a valid central session and enforces same-origin writes.
- [x] Workspace APIs check a shared NS administrator session server-side; frontend visibility is not the authorization control.
- [x] Security headers include frame restrictions, MIME-sniff protection, referrer policy, permissions policy, CSP and production HSTS.
- [x] Error responses do not intentionally return raw database errors or provider secrets.
- [x] Project/software records are not public until the publish flag is set; project detail pages reject drafts and archived records.
- [x] Project/gallery image URLs are constrained to same-site paths or HTTP(S) URLs by schema; HTTPS is allowed by CSP for owner-configured remote images.
- [x] Legacy brand image pack is stored outside public routing; generated public assets use the NS monogram.
- [x] Private admin/workspace routes are not added to public sitemap; `/api/` and `/admin` are disallowed by robots policy.

## Required before production

- [ ] Install dependencies from the npm registry, run lockfile generation, `npm audit` and the full source/production checks. This sandbox could not resolve `registry.npmjs.org` and did not finish installation.
- [ ] Configure TLS, least-privilege MongoDB users, IP/network restrictions, encryption at rest, credential rotation and production backups.
- [ ] Verify environment variables in the actual host. Check that no plain-text legacy admin credential remains once central login has been verified.
- [ ] Validate the TOTP setup and recovery path if enabled; ensure clock synchronization and prohibit re-use of a TOTP time step.
- [ ] Test all 98 workspace API routes for expected auth, object-level authorization, input limits, upload validation, error handling and rate limits using staging accounts and a safe test database.
- [ ] Review file upload MIME/type/size validation, public-token lifetime, shared-file access control, backup restore safeguards and export authorization in the real deployment.
- [ ] Test that private docs, images, invoices, notes and contact records cannot be accessed by unauthenticated or other users (where relevant to the workspace data model).
- [ ] Review dependencies and transitive package vulnerabilities once the registry is reachable; pin and resolve a complete lockfile before production deployment.
- [ ] Add provider-side abuse protections and domain authentication for email; configure spam/bot controls appropriate to expected form traffic.
- [ ] Complete a privacy/legal review, retention and deletion process, verified business details and refund/cancellation policy before accepting paid enquiries or subscriptions.
- [ ] Configure monitoring, redacted logs, alerting, backups and restore drills. Do not log passwords, cookies, authorization headers, full contact payloads or connection URI values.
- [ ] If payments, OAuth, analytics, marketing email, customer accounts or subscription entitlement checks are added later, implement verified callbacks/signatures, rate limits, idempotency, cancellation/unsubscribe, consent and access checks before advertising them.

## Known scope limitations

- This merge has not had dependency installation or runtime security tests in the current environment. Security headers and source-level protections do not imply a passed penetration test.
- Role separation among super admin, content manager, project manager, support staff and customer was not added because the supplied canonical app did not expose a working shared identity/permissions schema. Current central session means administrator access; do not issue credentials to less trusted staff until RBAC is implemented.
- Payment gateway, subscription billing, optional analytics/cookie consent manager and customer self-serve data deletion API are not configured by this code. The public legal pages say so rather than implying these features exist.
- The public project gallery CMS does not have its own durable upload pipeline; use validated storage before uploading confidential documents or accepting uncontrolled files through the public site.
