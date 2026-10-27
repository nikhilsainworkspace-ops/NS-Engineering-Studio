# Civil At Hand — incremental update and launch guide

## Important: this is not the entire project
The ZIP contains only files that are new or updated relative to the original uploaded project. Keep all other project files. Do not delete files just because they are not listed in the patch.

## Safe merge
1. Make a backup of your repository or create a Git commit before applying the patch.
2. Download and unzip this patch.
3. Copy its contents into your current repository root, preserving directory paths. Allow overwrite only for matching files.
4. Review `PATCH-MANIFEST.md`, `NAVIGATION-ACCESSIBILITY-UPDATE.md`, `CONTACTS-AND-SHARING-GUIDE.md`, `README.md`, and `UPDATES.md`.
5. Keep the existing Vercel variables and MongoDB configuration; do not replace secrets with the placeholder values in `.env.example`.
6. From the project root, run:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

7. Fix any reported errors before pushing. Push to the same GitHub repository connected to Vercel and verify the production deployment logs.

## Verify the portal after deployment

### Navigation and visual layout
- On a short desktop screen, scroll the sidebar and confirm every panel including Security and Settings can be opened.
- Test `Find a panel` using `notes`, `rate`, `report`, and a query with no matches.
- On a phone, swipe the horizontal navigation strip and use its beginning/end arrow controls.
- Check that the active panel comes into view and that the existing dark sidebar/blue active state remains consistent.

### Sign-in and security
- Keep an existing trusted session open until you have confirmed the authenticator works.
- Test both normal credentials and the current six-digit code in a private window.
- Confirm the authenticator setup secret is stored only in the server environment variable `ADMIN_TOTP_SECRET`, never under a `NEXT_PUBLIC_` name.
- Check automatic lock, signed-in sessions and the activity log. Keep a safe recovery path for the authenticator.

### Contacts and projects
- Create and edit a test contact with alternate labelled phones/emails, company, job title, birthday, tags and a team role; search it; check duplicate warnings including alternate numbers/emails, filters, multi-select/bulk actions, and import/export. Test a small Google Contacts CSV containing `Phone 1 - Label/Value` and `E-mail 1 - Label/Value` before importing a full address book.
- Create and edit a test project/lead, change its status, and check links to contacts.

### Follow-ups and Task Planner
- Add a test task with a due date, priority and description; edit it, complete it, reopen it if supported, search it and delete it.
- Confirm overdue counts only include tasks that are not complete or cancelled.
- Confirm the task remains after a refresh.

### Private Notes
- Create a note, add tags, save, refresh, edit and save it again.
- Test search, pin/unpin, archive/restore, Markdown export, clipboard copy and confirmed permanent deletion.
- Confirm note contents are not written to the activity-log messages. Do not store passwords, authenticator keys, API secrets or payment-card data in notes.

### Other panels and records
- Check Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings one by one.
- Create a shared database from dummy records, wait for the success response, refresh Shared Databases and confirm the saved room remains. Use Test link in a signed-out/private window; it must open only the selected frozen snapshot, never the admin dashboard or private notes. Check extra phone/email fields only appear when selected, and Preview mode masks all primary/alternate values. Changing source contacts should not mutate an existing frozen snapshot; create a new one for current data.
- Use a full JSON backup and verify it includes the new task and private notes data. Backups contain sensitive content and must be stored securely; the current patch does not supply a separate one-click restore screen.
- In Settings, use Test connection and confirm the expected MongoDB database status.

## Data and configuration
- No new environment variables or database migration are needed for Tasks, Private Notes, navigation, or the browser-storage hardening.
- MongoDB creates the `tasks`, `privatenotes` and `adminpreferences` collections when the application first writes corresponding data. Auto-lock preferences now persist in `adminpreferences`; they are no longer stored in localStorage.
- Keep `MONGODB_URI`, optional `MONGODB_DB`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and your existing TOTP secret configured as intended. Keep server secrets out of source control and away from `NEXT_PUBLIC_*` variables. For stronger session defaults, set `ADMIN_IDLE_MINUTES=60` and `ADMIN_SESSION_HOURS=24` in Vercel if old overrides currently specify longer values.
- Back up sensitive data before replacing a production deployment and test with dummy records first.

## Existing feature preservation
The sidebar retains Overview, Follow-ups, Task Planner, Private Notes, Contact Database, Projects & Leads, Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings. The navigation finder filters only those labels; it does not change records. The new menu scroll controls change only the visible scroll position.

## Verification note
Syntax checks and ZIP integrity can be run without installing the project dependencies. A complete production readiness claim requires the four commands above to pass and a successful Vercel deployment. In this generation environment the package install timed out, so do not skip the project-side verification.


### Shared-device and logout validation (added)
- Open the portal in a private/incognito window, sign in, and verify contact records load from MongoDB. Do not rely on a local browser copy; the protected APIs must return 401 after logout.
- Change the auto-lock setting, sign out, reopen the portal on a second device/browser, and confirm the preference follows because it is stored in MongoDB.
- Sign in in two tabs, log out in one, and confirm the other tab clears its workspace. Then test remote revocation from Security → Signed-in devices; an open tab should clear on the next periodic/visibility session check. While actively typing or working in client-side forms, user interactions send a throttled, protected heartbeat so a legitimate active session does not expire mid-edit.
- After logout, use Back/Forward and refresh. The login screen should show, and protected APIs must not return data. Confirm `/` and `/api/*` responses include no-store cache headers in browser DevTools.
- Important limits: web code cannot delete downloads, screenshots, clipboard history, password-manager entries, extensions' data, or operating-system/browser backups. Do not leave exported private files on shared computers. The logout `Clear-Site-Data` header clears browser cache/storage for this website's origin; use a dedicated origin if unrelated apps share it.
