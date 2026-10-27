# Migration and Data Integrity Guide

## Important: no database migration was run

The source archives do not include the production MongoDB databases or credentials. No collection was dropped, reset, renamed or merged, and no user, contact, project, estimate, invoice or workspace record was migrated by this build. This avoids claiming safety without access to the actual collections and indexes.

## Database configuration

**NS website database**

- `MONGODB_URI`: MongoDB connection string used by the NS Node driver.
- `MONGODB_DB`: NS website database name; defaults to `ns_studio` when omitted.
- Contains or will contain NS CMS records (`content`), enquiries (`leads`), sessions (`sessions`), rate-limit records (`rateLimits`) and audit records (`auditEvents`). The root driver creates its own required indexes when it connects.

**Workspace database**

- `CIVIL_AT_HAND_MONGODB_URI`: optional separate connection string. If blank, the workspace uses `MONGODB_URI`.
- `CIVIL_AT_HAND_MONGODB_DB`: optional explicit database name for the workspace. If blank, Mongoose uses the database embedded in the selected workspace URI. This prevents an NS website `MONGODB_DB` override from silently changing the legacy URI's database name.
- Existing workspace models remain in `modules/civil-at-hand/models/` and are not translated to the root MongoDB collection schema.

Before launch, inspect the original deployment settings and set these variables intentionally. To use one database for both drivers, explicitly point both to the same URI and database; first validate collection names and index behavior in a staging clone.

## Safe production migration sequence

1. Record the existing deployment's environment variable names (never export values into source control), current code version, database names, model/collection names, indexes and integrations.
2. Take a provider-native MongoDB snapshot or tested export of each database. Store it outside the deployment account, encrypt it, and restrict access.
3. Restore each backup into a staging database and verify collection counts, representative records, unique indexes, attachment references and all critical workflows before changing environment values.
4. Configure `MONGODB_URI` / `MONGODB_DB` for NS website storage. Keep `CIVIL_AT_HAND_MONGODB_URI` / `_DB` pointed at the legacy workspace database until its records have been verified in staging.
5. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `AUTH_SECRET`; create the first central admin using a generated Argon2id hash. Verify `/admin/login` before removing the legacy admin credential environment variables.
6. Confirm `/workspace` session endpoints authenticate through the same `ns_admin_session` cookie and that central logout revokes the session. The temporary legacy login compatibility branch only exists to assist migration when legacy environment values are intentionally set; remove `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` after verifying the central login.
7. Review the separate `AdminSession` / `LoginAttempt` collections and original audit records in the legacy database. They are not automatically imported into the NS `sessions` collection. Existing sessions may need to sign in again; no user-facing customer identities are automatically translated by this change.
8. Test create/read/update/archive/delete operations in each module against staging. Verify exports and backups, then check rollback. Only proceed to production when the record counts and critical workflows match expected values.
9. Deploy code and environment variables, confirm private route access from a clean browser, test project enquiry, test both database connections, and monitor server logs. Keep pre-migration backups through the agreed rollback window.

## Rollback

- Re-deploy the previous NS release and restore its previous environment values.
- Keep the legacy workspace database unchanged unless an independently reviewed data migration has been approved. This merge performs no data rewrite, so the workspace can be pointed back to its previous deployment database.
- If a new content/CMS record was created after release, export/backup the NS database before rolling back code. Do not restore an entire production snapshot over new customer data without owner approval.
- Preserve the previous release artifact, database snapshots, and a written list of the environment values changed. Verify login, enquiry submission, and workspace routes after rollback.

## Database records / IDs

The NS content API keys records by slug and type in the `content` collection; existing NS services/FAQs retain their current IDs. Workspace models retain their own existing Mongo identifiers, field names and references. No global slug, user ID or collection namespace migration has been introduced.
