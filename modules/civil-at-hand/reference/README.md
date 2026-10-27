# Civil At Hand

A private management system for a personal civil engineering business. Keep manpower suppliers, workers, contractors, subcontractors, vendors, material suppliers, clients, investors, business partners and other construction contacts in one MongoDB database, track projects and leads, never miss a follow-up, and collect details from people through bilingual (Hindi + English) public form links.

Built with Next.js (App Router), MongoDB (Mongoose) and Vercel. One admin, no public sign-up.

For detailed contact fields, Team directory, Google Contacts CSV import, and shared-database creation/troubleshooting, read [`CONTACTS-AND-SHARING-GUIDE.md`](./CONTACTS-AND-SHARING-GUIDE.md).

## What you can do

| Area | Features |
|---|---|
| **Contacts** | Google Contacts-style contact cards with first/surname, company, job title, labelled multiple phones and emails, birthday, notes, tags, category-specific details, team member/role/department fields, follow-ups, duplicate detection, and search / filters |
| **Duplicate detection** | Same phone (last 10 digits, so `+91 98765 43210` = `098765-43210`) or same email is caught when you add/edit a contact (you can still save anyway), flagged with a **Duplicate?** badge, and listed with the **Duplicates** filter. Import skips duplicates. |
| **Follow-ups** | One list of everything overdue, due today, next 7 days and later, for contacts and projects. Call, WhatsApp, **Done**, **Tomorrow**, **+1 week**. A red counter shows on the menu. (In-app reminders only; nothing is emailed or pushed.) |
| **Task planner** | Persistent tasks for site visits, quotations, document collection and operations. Due dates, priority, status, notes, links to a contact or project, overdue-first sorting, search, CSV export and completion tracking. |
| **Private notes** | Admin-only MongoDB notebook with autosave, folders/categories, linked projects, tags, pin/favourites, due dates, Markdown-style headings/checklists, clickable links, database-stored images, 20-version history, recycle-bin recovery, Markdown export and expiring/revocable read-only sharing. |
| **Projects & leads** | Lead → Quoted → Negotiation → Ongoing → Completed / On hold / Lost. Client, location, work type, estimated value (₹), dates, lead source, notes, linked contacts (suppliers, subcontractors, workers…), quick stage change, Excel/CSV export |
| **Public forms** | Create a link per category, share by WhatsApp, optional expiry, pause / reactivate / delete. Labels are bilingual (`Name / नाम`). People see only their own form, never your data. |
| **Import / export** | Import the app's CSV / `.xlsx` template or Google Contacts CSV (including repeated Phone / E-mail Label and Value columns); 4 MB, 1,000 rows, errors and duplicates reported. Export contacts and projects as `.xlsx` or `.csv`. |
| **Share / print** | WhatsApp and email (`mailto:`) a contact; **Save PDF** (browser print) on contacts, follow-ups, projects and reports. |
| **Reports** | Contacts by category / status / state / source, new contacts per month, project pipeline by stage with ₹ value, overdue follow-ups, busiest form links. |
| **Shared databases** | Sell or share a frozen copy of selected contacts or rates through a private link with expiry, passcode, open limit, watermark, download switch, price / paid tracking and an access log. |
| **Rate book** | Material, labour and equipment rates with suppliers, supplier comparison, stale-rate flags, export and sharing. |
| **Security centre** | 2-step verification, signed-in devices, activity log, auto-lock, JSON backup with note images, validated merge restore and restore preview. |
| **Branding** | Name, tagline, colour, logo, favicon and domain come from environment variables. |

## Version 4 — construction management (October 2026)

Version 4 turns the CRM into a complete construction business workspace. Everything from earlier versions still works; the new modules sit alongside it and share the same private sign-in.

| Area | What it does |
|---|---|
| **Command centre** | The overview now starts with what needs a decision: overdue tasks and follow-ups, overdue client invoices, supplier bills due, quotations awaiting a decision, material requests to approve, site reports to review, low stock, expiring documents and tender deadlines. Every line opens the matching records. Below it: active projects with budget against actual cost, money in and out for a period, next tasks, upcoming deadlines and recent activity. |
| **Project workspace** | Open any project for tabs covering overview, milestones, estimates, site diary, materials (requested / ordered / received / consumed / on site), labour, money (invoices, bills, expenses), documents and tasks. Projects gain site address, contract reference, manager, scope, cost budget, recorded progress, actual start/finish and milestones. New stages: Estimation, Awarded, Planning, Defects liability period and Closed (the original seven are unchanged). |
| **Site diary** | Daily site reports: work done, measured quantities, labour, materials, equipment, delays, safety, next-day plan. Draft → submitted → approved (approved reports are locked) or returned for changes. Printable. |
| **Estimates & quotations** | BOQ editor with material (plus wastage), labour, equipment and other rates; overheads, contingency, margin, discount and tax; rates picked from the rate book keep their source and date, and manual changes are flagged. Excel/CSV BOQ import with preview. Sent or decided versions are locked — changes go into numbered revisions (QT-2026-0007 R1). Printable client quotation and internal cost sheet. An approved quotation can create or update its project. |
| **Materials & purchasing** | Material master with reorder levels; an immutable stock ledger (receipts, issues to site, transfers, consumption, wastage, returns, adjustments) with reversal instead of editing; material requests with approval; purchase orders with partial goods receipts that update stock exactly once; draft supplier bills from an order. |
| **Labour & attendance** | Worker records (not login accounts; only the last four characters of an ID are stored), daily muster per site, wage sheet with the formula on screen, advances, deductions, bonuses and wage payments. |
| **Invoices, bills & expenses** | Client invoices and supplier/subcontractor bills with retention, part payments and void; status is always calculated from recorded payments and a payment can never exceed the balance. Expenses by category. Project cost summary (bills + expenses + labour, with purchase orders shown separately as commitments). Printable invoices with amount in words. |
| **Documents & approvals** | Document register with categories, project links, numbered versions (PDF, images, DOCX, XLSX, PPTX, DWG, DXF, CSV, TXT up to 4 MB, checked by content), renewal dates and approval status. Files are only downloadable by the signed-in owner. |
| **Tenders & bids** | Opportunities with deadlines, EMD, bid/no-bid decision, eligibility checklist, outcome and win rate; a won tender can create its project. |
| **Public pages** | Optional company profile, services, portfolio, project showcase and contact pages built from text, list, fact, image, gallery, button and contact blocks. Pages are drafts until you publish; unlisted pages need a private link; pages can expire. Only what you type or upload for that page is shown — never contacts, projects, finance, documents or notes. Live at `/p/<address>`. |
| **Settings** | Business profile printed on documents, currency, time zone, tax label and default rate, document number prefixes, quotation terms, bank details, unit/project-type/material/expense/trade lists and overview alerts. |
| **Reports** | New business reports: receivables and payables ageing, expenses by category, purchases by supplier, quotations, tender outcomes, attendance by site, site reports and stock valuation, each with CSV export. |
| **Design** | A calm, consistent interface across every screen: warm neutral background, navy primary actions, grouped navigation with a mobile menu, one global search (Ctrl/⌘ K) across all modules, a minimal sign-in page and accessible dialogs and confirmations. |

**New MongoDB collections** (created automatically on first use): `sitereports`, `estimates`, `materials`, `stockmovements`, `materialrequests`, `purchaseorders`, `workers`, `attendances`, `workertxns`, `invoices`, `expenses`, `projectdocuments`, `documentfiles`, `tenders`, `publicpages`, `pageimages`, `counters`, `businesssettings`. No existing collection or field is renamed or removed and no migration script is needed.

**Backups** include all new collections, document files and page images (backup format version 5; versions 3 and 4 still restore). Restored public pages come back unpublished. Because document files are included, downloaded backups can exceed the 4 MB browser restore limit — use the server-side snapshots in Security for large restores, and keep MongoDB Atlas backups on.

**No new environment variables are required.** The default brand colour is now navy `#1f3a5c`; an existing `NEXT_PUBLIC_BRAND_COLOR` still takes precedence.

**Honest limits:** tax figures are calculated from the rates you enter and are not a certification of GST compliance; the wage sheet is a working calculation, not statutory payroll (no PF/ESI/TDS unless you record them as deductions); there are no email/SMS notifications; staff log-ins and role permissions are not part of this release (the app remains single-owner).

## Dashboard redesign (October 2026)

The admin workspace now uses a clear navy navigation rail, blue active states, a light page background, card-based summaries, consistent icon colours and responsive layouts. The redesign is visual and organizational: it does not remove any existing modules or data-management actions.

- **Left navigation:** Overview, Follow-ups, Task Planner, Private Notes, Contact Database, Projects & Leads, Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings remain available. Counters still show useful record counts and overdue work where available.
- **Workspace search:** search contacts, projects, tasks, rates, active private notes, shared databases and public form links from the top bar. Press **Ctrl+K** (or **⌘K** on Mac) to focus the search. Search is limited to records already loaded in the admin workspace and never makes private records public.
- **Four overview metrics:** total tasks (with open/completed split), contacts (new and qualified/active), projects (active/completed), and active private notes (pinned/archived split). Clicking a metric takes you to its panel.
- **Upcoming Tasks:** the overview lists up to six open tasks, ordered by soonest due date and then priority. Overdue tasks get a warning. Use View all / Manage tasks to edit, complete or otherwise manage tasks in the full Task Planner.
- **Quick Actions:** shortcuts to add a task, write a private note, add a contact or add a project. Collect details stays available in the Overview heading and continues to open the public-form link creator.
- **Private Notes preview:** up to four recent, active notes are shown with title, a short text preview, date and a pin marker. View all opens the full notes notebook.
- **Original overview features retained:** Network categories and their category-filter shortcut, recently updated contacts and contact editing, follow-up reminders, open-lead/ongoing-project figures, the work queue, privacy explanation and Workspace Settings link remain available lower on the dashboard.
- **Recent activity and Quick Stats:** a compact list combines recently updated contacts, projects, tasks and notes (note titles/body text are not shown in this activity list); quick counts show completed/open tasks, active projects and active/qualified contacts.
- **Responsive behavior:** the left navigation becomes a horizontally scrollable navigation strip on narrow screens, cards collapse into fewer columns, tables scroll horizontally rather than crushing their columns, and buttons remain touch friendly. Search and admin controls wrap on small screens.

The default brand accent is blue (`#1769e8`). An explicit `NEXT_PUBLIC_BRAND_COLOR` value in Vercel takes precedence. Notes, image attachments, note-share links and server-side backup snapshots use additional MongoDB collections created automatically on first use. AI assistance is optional and uses Google Gemini when `GEMINI_API_KEY` is configured; all other features operate without it. A Vercel Cron runs `/api/backup/scheduled` daily at 03:00 UTC when `CRON_SECRET` is configured. Because these snapshots are kept in the same MongoDB database, also keep an independent downloaded backup in a separate secure location.

## Environment variables (add these in Vercel)

Vercel → your project → **Settings → Environment Variables**. Add them for **Production** (and Preview if you use it), then **Redeploy**.

| Variable | Required | What to put |
|---|:--:|---|
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `ADMIN_USERNAME` | **Yes** | Your admin username |
| `ADMIN_PASSWORD` | **Yes** | A long, unique password (not stored in the database) |
| `ADMIN_SESSION_SECRET` | **Yes** | Random text, **32+ characters** (`openssl rand -hex 32`) |
| `ADMIN_TOTP_SECRET` | Optional, recommended | Base32 secret generated from Security → Set up 2-step verification. Keep it private; do not use a `NEXT_PUBLIC_` name. |
| `GEMINI_API_KEY` | Optional | Server-side Google Gemini API key for the AI work assistant in Private Notes. Never prefix it with `NEXT_PUBLIC_`. Without it, all non-AI features continue working. |
| `GEMINI_MODEL` | Optional | Gemini model ID. Defaults to `gemini-3.1-flash-lite` when omitted. Use a model available to your Google AI Studio API key. |

The Private Notes AI assistant now uses Gemini only. Any legacy `OPENAI_API_KEY` or `OPENAI_MODEL` variables are ignored by this assistant.
| `CRON_SECRET` | Required for automatic scheduled backups | Random secret of 32+ characters. Vercel sends it to the scheduled backup endpoint as a bearer token. Do not share it or prefix it with `NEXT_PUBLIC_`. Manual snapshots still work without it. |
| `BACKUP_RETENTION_DAYS` | Optional | Automatic cleanup window for server-side snapshots (default `7`, range `1`–`30`). A hard cap of 30 snapshots also applies. |
| `MONGODB_DB` | Only if you already use it | Database name. If you never set it, leave it out; the app uses the database named in `MONGODB_URI`. **Do not change it on an existing site**, or your records will seem to vanish. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | `https://your-domain.com` (no trailing slash). Public form links are built from it. |
| `NEXT_PUBLIC_APP_NAME` | No | Business name (default `Civil At Hand`) |
| `NEXT_PUBLIC_APP_TAGLINE` | No | Short tagline |
| `NEXT_PUBLIC_BRAND_COLOR` | No | Hex colour, e.g. `#1769e8` |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | No | Blank = included logo. Or `/your-logo.png` (file in `public/`) or an `https://` URL |
| `NEXT_PUBLIC_FAVICON_URL` | No | Blank = included favicon |

Only the four required ones matter to get started. `CRON_SECRET` is needed for automated scheduled backups; without it, an admin can still create snapshots manually in Security. Never put secrets in variables starting with `NEXT_PUBLIC_`, and never commit secret values to the repository.

## Deploy (new GitHub repository)

1. Unzip the complete project. Make sure the repository **root** contains `package.json`, `app/`, `components/`, `lib/`, `models/`, `public/` (not one extra folder around them).
2. Create an empty GitHub repository and upload everything. `.gitignore` already keeps `.env*` and `node_modules` out. Never upload `.env.local`.
3. In Vercel choose **Add New → Project**, import the repository. **Framework Preset must be Next.js** and **Root Directory** must be the folder that contains `package.json`.
4. Add the environment variables above, then **Deploy**.
5. Open the `…vercel.app` address, sign in, and test with **Settings → Test connection**.
6. Custom domain: Vercel → Settings → Domains, add it and set the DNS records Vercel shows, then set `NEXT_PUBLIC_SITE_URL` and redeploy.

### Updating an existing repository
For a files-only update ZIP, extract it into the repository root and allow overwrite; it contains only changed and new files with their original paths. Alternatively, apply `changes.patch` from the repository root with `git apply --check changes.patch` and then `git apply changes.patch`. Review the diff, run the checks locally, commit and push. Vercel redeploys automatically. No existing contact, project, task, public-form or shared-database records are intentionally deleted. New MongoDB collections are created automatically. The restore tool is merge-only.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
npm run typecheck            # TypeScript check
npm test                     # logic tests (duplicates, follow-ups, CSV, validation, reports)
npm run build                # what Vercel runs
```

## Daily use

1. **Contact database → Add contact**, or **Public form links → Create link** and send the link on WhatsApp.
2. New submissions appear as status **New**. Set a **Follow-up date** on anyone you need to call.
3. **Follow-ups** shows who to contact today. **Task planner** tracks standalone actions and links them to contacts/projects. **Private notes** holds internal-only writing and reminders. **Projects & leads** tracks work from enquiry to completion. **Reports** summarises everything.
4. Back up: use **Export** now and then, and enable backups in MongoDB Atlas.

For imports, provide a name and at least one phone number or email. The app's template can include Category; when importing a Google Contacts CSV without Category, new records default to **General contact**. Google Contact CSV imports understand Given Name, Family Name, Company/Organization, Job Title, Birthday, Notes, labels/groups, plus multiple `Phone N - Label/Value` and `E-mail N - Label/Value` columns. Import a small test file first and inspect the row results before importing a large contact book.

## Shared databases (sell or share data with a client)

**Shared databases** turns any list of your records into a private, time-limited link for a client or company.

1. Pick the records: tick contacts in the Contact database and press **Share selected…**, or open **Shared databases → Share a database** and filter by category, state, status or (for the Rate book) type and place.
2. Choose which fields they may see. **Private contact notes, relationship status, ratings, follow-ups and interaction history are never shared.** Labels / tags can be shared only if you explicitly tick that field. Phone labels, multiple phone numbers, email labels, additional email addresses, birthdays, company and job title can also be selected. *Preview mode* masks primary and additional phone numbers and emails.
3. Set the rules: **expiry** (required: 1 hour to 1 year, or a date and time), a **passcode** (auto-generated, shown once), an optional **open limit**, **watermark** with the client's name, and whether they may **download Excel/CSV**.
4. Record the money: price, Free / Unpaid / Paid, and optionally **keep the link locked until you mark it Paid**.
5. Send the ready-made message by WhatsApp or copy it.

**Where the share link is saved:** creation writes the selected field list and a frozen record snapshot to MongoDB (`DataRoom` collection). It is not just a browser link or local-storage item. After the response succeeds, the link appears in Shared Databases and can be reloaded after refresh. The one-time passcode is returned for you to copy; only its hash is saved.

What happens next: the client opens `/shared/<secret>`, types the passcode and sees a searchable table. You can **pause, extend, reset the passcode, change the open limit, mark paid or delete** at any time, and see an **access log** (opens, downloads, wrong passcodes, masked IP and browser).

Things worth knowing:
- The link holds a **frozen copy** taken when you created it. Later edits or deletions in your contacts do not change what the client got (so you can prove what was sold). Create a new link for fresh data.
- 5 wrong passcodes lock that link for 15 minutes. Reloading from the same device within 15 minutes does not use up another "open".
- Honest limit: anyone who can *see* data can copy it. Expiry, passcodes, watermarks, logs and a written agreement make misuse costly and traceable; they cannot make copying impossible. Downloads of watermarked files carry the client's name and a reference code.
- **Consent:** contacts explicitly marked **No** are never included. The recommended setting is **Only contacts who explicitly agreed to be shared**; that includes only a recorded Yes. If you turn that filter off, contacts with no recorded answer may be included, but a No still stays excluded. Use that override only when you have a lawful basis and permission to share the information. This is not legal advice.

## Rate book

Save material, labour, equipment and sub-contract rates with unit, supplier (link to a contact), place and validity date. **Compare suppliers** shows the cheapest quote and how much you save. Rates untouched for 90 days are flagged *Old*. Export or share the list as a shared database.

## Other tools

- **Bulk actions:** tick contacts, then set status, add a tag, mark sharing consent, flag Preferred/Avoid, share, or delete.
- **Merge duplicates:** Duplicates filter → *Merge duplicates…*. Missing details, tags, notes and history are copied into the record you keep; projects and rates that pointed at the others are re-pointed.
- **History per contact:** log calls, WhatsApp, meetings and site visits; "last contacted" is tracked. Plus a 1-5 star **rating** and a **Preferred / Avoid** flag.
- **Project money:** billed and received per project, *To collect* tile and report.
- **Task planner:** add operational tasks with priority, due date, notes and a related contact/project. Overdue tasks rise to the top; mark tasks complete or reopen them.
- **Private notes:** store internal notes in MongoDB with debounced autosave, folders, categories, project links, tags, favourites, pin/archive, due dates, Markdown-style headings/checklists, clickable URLs, MongoDB-stored images, search, 20-version history, recycle-bin recovery, Markdown export, and revocable, expiring read-only share links. Only the signed-in admin API can read or change private notes.
- **Import template:** a blank Excel file with the right columns. **Full backup** (JSON) in Security.
- **Hide numbers** button blurs phone numbers and emails while someone looks at your screen.

## Security

This is a private, single-admin portal. Nobody can register; the only outsiders who ever see anything are people holding a link you created.

- **Server-checked sessions.** Signing in creates a session record in MongoDB (only a hash of its id). Sign-out really ends it, idle sessions expire (`ADMIN_IDLE_MINUTES`, default 60 minutes), sessions last at most `ADMIN_SESSION_HOURS` (default 24 hours). **Security → Signed-in devices** lists them and can sign out any or all others. The cookie is HTTP-only, SameSite=Strict, `__Host-` prefixed and Secure in production. The browser also locks itself after 5-60 idle minutes (your choice).
- **No app-managed persistence of private records in browser storage.** Contacts, projects, rates, tasks, notes, links and security preferences are stored in MongoDB. App records are held in React memory while the workspace is open; the app does not write them to `localStorage`, `sessionStorage` or IndexedDB. The auto-lock preference is stored in the MongoDB `AdminPreference` collection so it follows you across devices. The app sends no-store cache headers for its dashboard shell, API responses and tokenised pages.
- **Logout cleanup.** The logout API revokes the current database session, expires the HTTP-only cookie and sends `Clear-Site-Data` for the site's browser cache/storage. The client clears app data in memory, old app-prefixed storage, open editors, searches and selections; other open tabs receive a logout message. The browser rechecks the server session when a tab becomes visible and periodically while open. This helps prevent an old tab or browser Back restore from showing stale data after sign-out.
- **Limits to browser cleanup.** A website cannot delete files a user already downloaded (CSV/XLSX/PDF/JSON/Markdown exports or screenshots), erase clipboard history, clear a browser/password-manager's saved passwords, or control extensions/OS snapshots. `Clear-Site-Data: "storage"` clears storage for this website's origin, which can affect other applications deliberately hosted on the same origin. Use a dedicated app domain, never save passwords in the browser on a shared machine, sign out, close the browser, and manually delete exported files from Downloads when appropriate. No web app can promise that absolutely nothing remains anywhere on a device.
- **2-step verification (optional, recommended).** Security → *Set up 2-step verification* gives you a key for Google/Microsoft Authenticator or Authy; paste it into `ADMIN_TOTP_SECRET` and redeploy. Codes are single-use. If the variable is set but malformed, sign-in is refused rather than silently skipping 2FA. Lost your phone? Delete the variable in Vercel.
- **Cross-site request blocking:** admin APIs reject requests the browser marks cross-site, on top of SameSite cookies.
- **Throttling:** failed logins (8 tries, then 15 minutes); public form submissions (20 per hour per device); client link requests; passcode attempts per link.
- **Activity log:** sign-ins (and failures), deletions, bulk changes, merges, imports, exports, backups and every shared-link change are recorded for 180 days. No secrets are stored in it.
- **Client links:** 192-bit random tokens, `noindex`, no-store, no referrer; passcodes are stored only as scrypt hashes; the client page can read only its own frozen copy.
- **Public pages (`/p/…`):** drafts and expired pages return “not found”; unlisted pages require their private key (compared in constant time); the public loader returns an explicit allowlist of page fields; images are served only while a live page uses them; links are restricted to https, mailto, tel, /p/ and /join/; text is rendered as plain text. Publishing, unpublishing and new private links are recorded in the activity log.
- **Print views (`/print/…`) and document downloads** require the same server-checked session as the dashboard and are sent with no-store and noindex headers.
- **Headers:** Content-Security-Policy, HSTS, nosniff, frame deny and COOP are set in `next.config.ts`. CSV export neutralises spreadsheet formulas. The site is `noindex`.
- **Your part:** use a long unique password, turn on 2-step verification, keep Atlas network access and your Vercel account protected (2FA there too), and download a backup after big changes.

## Troubleshooting

| Problem | Fix |
|---|---|
| Site opens a 404 / blank page with a "successful" deploy | Framework Preset must be **Next.js**; Root Directory must contain `package.json` |
| Login says not configured | Check the three admin variables; secret must be 32+ characters; redeploy |
| Cannot reach MongoDB | Check `MONGODB_URI`, database user/password (special characters URL-encoded), Atlas **Network Access** (allow Vercel, e.g. `0.0.0.0/0`) |
| Records look empty after an update | `MONGODB_DB` / URI database name changed. Restore the previous value |
| Public link says unavailable | Link is paused, expired, deleted, or copied incompletely |
| Wrong domain in a new shared link | Open the admin portal at your intended canonical HTTPS domain and create a new link there. New share URLs use the host serving the create request; check `NEXT_PUBLIC_SITE_URL` only as a fallback if your host/proxy setup does not provide the expected origin. Existing link URLs do not rewrite themselves. |
| Shared database opens but has missing or old contacts | A shared database is a frozen snapshot at creation time. Select the latest records and create a new share link after updating contacts. Recheck the selected fields and consent filter. |
| Shared database creation fails or has 0 rows | Confirm at least one selected record remains after category/place/status, “Only contacts with a phone number”, “Avoid”, and consent filters; select at least one field and set an expiry. Check Vercel function logs and `MONGODB_URI` if the request returns a server error. |
| Logo not updating | Check the URL is public HTTPS or a file in `public/`; redeploy; clear the browser favicon cache |
| Import skips rows | Rows with a duplicate phone/email are skipped on purpose; invalid rows are listed with the reason |

## Project layout

```text
app/api/auth|contacts|projects|tasks|notes|links|public|export|import|health   server routes (admin routes call isAdmin())
app/api/estimates|materials|stock|purchase-orders|material-requests|workers|attendance|worker-transactions|invoices|expenses|documents|tenders|site-reports|public-pages|settings|overview|search|reports   version 4 routes (all via adminHandler → isAdmin())
app/p/[slug]/            owner-published public pages;  app/print/[kind]/[id]/  private print views
app/join/[token]/        public form page
components/              dashboard, follow-ups, task planner, projects, reports, public form
lib/                     auth, brand, db, categories (form fields), duplicates, followups, projects, reports, csv, validation
lib/entities.ts, lib/entity-spec.ts, lib/crud.ts   version 4 field specs, shared validation and the admin route builder
lib/estimates.ts, finance.ts, inventory.ts, workforce.ts   pure calculations (tests/erp.test.ts)
models/                  Contact, Project, Task, PrivateNote, ShareLink, LoginAttempt (Mongoose)
tests/logic.test.ts      unit tests;  tests/erp.test.ts  version 4 calculations;  tests/integration/  route-level tests with an in-memory database
public/                  logo, icons, favicon
```

## Known limits

- Follow-ups and tasks are shown inside the app; there are no email/SMS/push notifications or scheduled background jobs.
- Payments are recorded by you (no payment gateway). Private-note image attachments are stored in MongoDB. Security now offers a validated, merge-only JSON restore for supported core collections and note images; it intentionally does not recreate public share tokens or shared-database row snapshots. Keep MongoDB Atlas automated backups enabled for full disaster recovery.
- One admin user. Up to 5,000 contacts are loaded into the dashboard at once; reports use the loaded records.
- `.xls` (old Excel) is not imported; save as `.xlsx` or CSV.
- Not an accounting, payroll or contract system.


## Detailed portal manual — what each area does and how to use it

This section describes the screens already in the portal plus the dashboard, Task Planner, Private Notes, Google Contacts-style fields/import, and shared-link fixes. The system is designed as a single-admin workspace. The Team directory is a private roster, not a separate teammate login portal; multi-user authentication and per-role permissions are not enabled in this release. Normal records are stored in your configured MongoDB database and protected API routes require a valid admin session. Public form and shared-database links are deliberately separate from your private dashboard.

### 1. Sign-in and dashboard overview

- Open the site's home page. The login form uses the configured admin username and password; when `ADMIN_TOTP_SECRET` is enabled it also asks for a current six-digit authenticator code.
- The dashboard opens only after server-side session verification. The session cookie is HTTP-only and signed; sessions can expire, be revoked, and be reviewed in Security.
- **Overview** shows a high-level view of the contact network, new enquiries, active relationships and active form links. Use the category rows to jump into a contact category. The work-queue card opens the Task Planner.
- **Hide numbers** blurs phone numbers and email addresses in the current browser view when another person is nearby. This is a visual privacy aid, not a substitute for signing out or locking the device.

### 2. Contact database

- **Create:** use Add contact, choose the relevant civil-work category, and fill the clear, grouped form. A primary or additional phone number / email is required. Store first and last name, company, job title, birthday, labelled primary and additional phone numbers and email addresses, city / state, status, follow-up date, tags, sharing consent, private notes, and the category-specific fields. Each phone/email has a label such as Mobile, Work, Home, Main or Other.
- **Team directory:** switch on **Team member** on a contact, then enter their role and department. Those contacts also appear in the Team directory panel. This is a directory flag, not a separate login account; it does not create a new portal user or grant access.
- **Labels / tags:** labels identify a contact's category or relationship (for example `Trusted`, `Architect`, `Punjab`, `Client`); use tags for quick filtering and selected sharing when appropriate. Contact notes and activity history are private admin information and are not part of public/shared snapshots.
- **Edit:** use the pencil action on a row. Editing keeps the record's original source information. Use the status field to distinguish new, contacted, qualified, active, on-hold and closed relationships.
- **Search and filters:** search name, phone, email, organisation, place and related details. Filter by category and status. The Duplicates action finds likely repeat records.
- **Duplicate safety:** add/edit checks matching phone numbers (normalised to the last 10 digits) and email addresses. You can explicitly confirm saving a possible duplicate, but avoid doing so unless they are truly different people/records. Import skips known duplicates.
- **Bulk actions:** select rows to update status, add tags, set sharing consent, mark Preferred/Avoid, share selected records or delete. Check the selection carefully before any bulk delete.
- **Contact actions:** call via the telephone link, message on WhatsApp, share a contact summary, email a contact summary, or open the contact's history. The star rating and Preferred/Avoid flag help prioritise trusted suppliers or contacts to avoid.
- **History:** log calls, WhatsApp messages, meetings, emails, site visits or notes as interaction entries. This makes it easier to see the last contact and what was discussed. The history is private; do not assume it is included in a shared database.
- **Import:** upload the app template as CSV / `.xlsx`, or export your address book from Google Contacts as Google CSV and upload that file directly. Google fields are mapped from Given / Family Name, Organization, Job Title, Birthday, Notes, Group Membership and repeated Phone / E-mail Label and Value columns. Category is optional for Google CSV and defaults to General contact. Review imported / skipped / rejected row counts before importing a large list; limit is 4 MB and 1,000 data rows. Old `.xls` files must be saved as `.xlsx` or CSV first.
- **Export:** download CSV or Excel for the full contact database or the current filters. The export menu also supports browser print / Save as PDF. Treat exported files as sensitive because they contain contact information.
- **Merge duplicates:** select the records to merge, choose which record to keep, and review the combined information before confirming. The merge tool preserves missing data and updates references where supported.

### 3. Follow-ups

- This screen collects dated follow-ups from contacts and projects and groups them by overdue, today, the next seven days and later. Closed contacts and completed projects are excluded from active reminders.
- Use **Done** to clear a follow-up, **Tomorrow** or **+1 week** to reschedule, and Call or WhatsApp to contact the person. Open the linked contact or project when you need more context.
- The navigation badge indicates follow-ups that need attention. These are in-app reminders only; there is no automatic email, SMS, push notification or background scheduler.

### 4. Task Planner (persistent operational checklist)

- Use a task for a specific action such as arrange a site visit, send a quotation, collect drawings, check a payment, call a contractor or prepare documents. Tasks are different from contact follow-up dates and can be used even when no contact is linked.
- Every task has a title, description/checklist details, priority (Low, Normal, High or Urgent), due date, status (To do, In progress, Done or Cancelled), and optional related contact or project.
- **Save / edit:** fill out the form and click Add task. Use Edit and Save task to change it. The tasks are stored in the MongoDB `Task` collection and remain after refresh or sign-out.
- **Work through tasks:** Mark complete using the check action, reopen a completed task, or use Start to move it into progress. Assign work to an existing contact marked as a team member. This is task assignment only; assigned contacts do not receive a separate login. Delete removes a task permanently after confirmation.
- **Find work:** tabs filter Open, Overdue, Completed and All tasks. Search finds words in titles, descriptions, related contact/project names and assignees. Switch between the task list and a responsive monthly calendar; use previous / next month, Today, and click a task on a due date to edit it. Tasks without due dates remain available in List view. The list prioritises urgent and overdue work; the menu and overview show task counts.
- **Export:** Export CSV downloads the tasks currently shown by the search/filter. It is a local file download; it does not send data to a third party.

### 5. Private Notes and work assistant

Private Notes is a personal notebook for internal-only information: meeting summaries, site observations, ideas, draft messages, checklists or reminders. It is separate from the existing `notes` field on each contact and project.

- **Create and autosave:** open Private notes and add a title. Notes autosave to MongoDB after a short pause while you type; use **Save now** when you need immediate confirmation. A title is required.
- **Organise:** add tags, folders, categories, a project association and a due date. Pin or favourite important notes; archive notes that are no longer active.
- **Format and link:** use the formatting controls for headings, bold text, bullets and checklists. Valid pasted HTTP(S) URLs render as clickable links. Images uploaded from the editor are stored in MongoDB (up to 2 MB per image).
- **Search and views:** search titles, content, tags, folders and categories. Filter active, pinned, favourites, archived and recycle-bin notes. Up to 5,000 notes are returned per view; larger installations should paginate before exceeding that amount.
- **History:** edits retain up to 20 prior title/body/tag snapshots. Review a previous version and choose to restore it.
- **Recycle bin:** Delete moves a note to the recycle bin and revokes its active share links. Restore it from Trash, or permanently delete it; permanent deletion also removes its attached images.
- **Private sharing:** create a read-only snapshot link that expires after 1, 7, 30 or 90 days. You can revoke it at any time, which prevents future server access. Shared links expose only the selected snapshot and its images, never the admin dashboard. Important limitation: no website can reliably prevent a recipient from copying visible text or taking a screenshot/photo; share only content the recipient is allowed to see.
- **AI work assistant:** optionally configure `GEMINI_API_KEY` on the server; `GEMINI_MODEL` can select the model and defaults to `gemini-3.1-flash-lite`. The assistant drafts notes, task lists, summaries and reports through Google Gemini. Workspace context is not sent unless you explicitly enable it. Review and confirm any content before saving it; AI output is not authoritative. Do not submit confidential information unless you accept the provider data terms for your API tier.
- **Privacy:** private note API actions require the existing admin session and use no-store responses. Note text and image bytes are stored in MongoDB, not separately application-encrypted. Use a trusted MongoDB account with TLS and network restrictions, and never put passwords, authenticator setup keys, API credentials or payment-card data into notes.
- **Backup and restore:** the full JSON backup includes private notes and note image data. In Security, select a backup JSON, review the validation preview, and then confirm the merge-only restore. The restore adds/updates matching IDs and never deletes records absent from the backup. It deliberately does not restore public tokens, private share tokens or shared-database row snapshots; recreate links that need to remain active.

### 6. Projects & leads

- Create a project or lead when work becomes a distinct opportunity. Store the client, location, type of work, source, estimates, dates, follow-up, notes and linked contacts.
- Move a lead through Lead, Quoted, Negotiation, Ongoing, Completed, On hold or Lost as the deal progresses. Completing or losing a project changes reporting and follow-up behaviour.
- Track estimated value, billed amount and received amount where relevant. The portal derives amounts still to collect for the dashboard/reporting. Monetary values are records you maintain; no payment is taken automatically.
- Export projects to CSV or Excel or use browser print / Save as PDF. Project exports contain business-sensitive information.

### 7. Rate book

- Save item/service, group, specification, unit, rate, supplier, supplier contact, location, validity date and notes. Use it as a reference for materials, labour and equipment.
- Supplier comparison helps compare saved quotes. Rates older than the freshness threshold are flagged so you can request an updated quote.
- Rates can be exported and selected rate data can be included in a Shared Database. Verify the validity date and units before using a rate in a quotation.

### 8. Public form links

- Choose Create link, give it a purpose/name, pick the contact category and optionally set an expiry. Share the generated URL through WhatsApp or any channel.
- The recipient gets a category-specific bilingual form, not access to the dashboard. Public submissions are validated and create new records in the contact database.
- Pause or reactivate a link, rename it, or delete it if it is no longer needed. Expired and paused links stop accepting submissions. Anyone who receives a working URL can open the form, so share links thoughtfully.
- The public form includes a sharing-consent choice where supported. A contact's private fields and activity history do not become public just because they submitted a form.

### 9. Shared databases

- Use this feature when you need to provide a selected, limited dataset to a client or partner. Choose contacts/rates and the columns they may see, then set an expiry and optional rules such as passcode, open limit, watermark and downloads.
- A shared room is a snapshot of data when created. Later edits to the source contact/rate do not automatically change that snapshot. Create a new room if the recipient needs fresh data.
- Configure price and payment status for your own tracking; payment recording does not process a payment. If configured, the room can stay locked until marked paid. You can pause, extend or reset supported link controls and inspect its access log.
- The server filters fields before sharing. Consent is considered by the share flow; review recipients, columns and applicable data protection obligations before sharing personal records. No technical control can stop a recipient from copying information that is visible to them.

### 10. Reports

Reports summarise the data loaded from your database: contacts by category/status/place/source, new contact growth, lead/project pipeline, estimated and ongoing values, overdue follow-ups and activity on form links. Use them to prioritise outreach and review pipeline status, not as a substitute for accounting records. Report figures are based on stored data and may be affected by incomplete entries. Use browser print / Save as PDF when you need a snapshot.

### 11. Security centre

- **Two-step verification:** use the generated Base32 setup key in an authenticator app, verify a current six-digit code, then set the same secret in Vercel as `ADMIN_TOTP_SECRET` and redeploy. The environment variable name must not begin with `NEXT_PUBLIC_`. Do not share the setup key.
- **Signed-in devices:** review sessions and revoke this device or other sessions. Revocation is server-side. After changing security settings, test a fresh private-window login before closing an existing trusted session.
- **Auto-lock:** choose 5, 15, 30 or 60 minutes in Security. The preference is saved in MongoDB, not in browser storage, so it follows you across devices. The server also enforces its own session idle/expiry rules. Browser auto-lock is a convenience, not the server security boundary. “Never” remains for compatibility, but is not recommended.
- **Activity log:** examine recent administrative/security activity. Note event entries intentionally avoid storing private-note bodies.
- **Full backup:** download a JSON backup of contacts, projects, rates, form links (without their tokens), shared-room metadata (sensitive room fields are excluded), tasks, private notes and note images. Protect this file as sensitive business data. Restore in Security by selecting a JSON backup, reviewing the preview, and confirming a merge-only restore. For robust disaster recovery, also enable MongoDB Atlas backups.

### 12. Workspace settings and deployment

- Settings displays branding/database health information relevant to the existing deployment. Branding values such as app name, tagline, brand colour and logo URL are controlled by the documented environment variables.
- Keep `MONGODB_URI`, the optional `MONGODB_DB`, admin credentials and `ADMIN_SESSION_SECRET` the same when updating the app. Changing `MONGODB_DB` can make a valid deployment appear to have lost all records because it is looking at another database. For tighter production defaults, set existing Vercel overrides `ADMIN_IDLE_MINUTES=60` and `ADMIN_SESSION_HOURS=24` unless you intentionally need different values; explicit environment variables override code defaults.
- No existing database migration is required; MongoDB creates the new note asset, note share and backup snapshot collections automatically on first use. This update adds optional `CRON_SECRET` and `BACKUP_RETENTION_DAYS` settings for scheduled backups. Task assignment uses existing team-member contacts; the app still has one authenticated admin and does not create teammate login accounts. Deploy by merging the incremental ZIP into the repository root, installing the declared dependencies, running the checks below, committing and pushing to the existing Vercel project, then testing the deployment logs and core flows.

### Suggested post-deployment smoke test

1. Sign in with the current admin password and authenticator code.
2. Open Contacts, edit a harmless test record and confirm its values remain. Do not delete real data for testing.
3. Create a test task; edit it, mark it complete, reopen it and delete the test task.
4. Create a private note titled `Test note`, add a tag, save, refresh, edit, pin it, archive it, restore it, export Markdown, and finally delete the test note.
5. Check that the note and `adminPreferences` are present in the full JSON backup after test creation (protect the downloaded file), and that public forms/shared database links do not display private notes.
6. Confirm the existing public link, project, rate book, reports and security screens still work before considering deployment complete.

A successful source merge is not the same thing as a verified production build. Run `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` with dependencies installed, and review Vercel's deployment logs before treating the release as production-ready.

### 13. Navigation and finding panels quickly

The sidebar now has a **Find a panel** search. Type part of a panel name such as `note`, `rate`, `security`, or `report` to filter the menu. Select the matching item to open it; the filter clears automatically. If no result appears, use **Clear search** or erase the text. The search filters navigation labels only—it never deletes, edits, or filters database records.

The two arrow controls beside the panel finder scroll the navigation list. On desktop they move vertically through the menu; on tablets and phones they move the horizontal navigation strip. You can also scroll the sidebar with a mouse wheel, touch, or trackpad. The active panel is automatically brought into view when possible. Every existing panel remains available: Overview, Follow-ups, Task Planner, Private Notes, Contact Database, Projects & Leads, Rate Book, Shared Databases, Reports, Public Form Links, Security, and Settings.

For very short desktop windows, scroll inside the sidebar menu rather than expecting every item to fit at once. On phones, swipe the navigation strip sideways or use its arrow controls. All primary sections remain in the same authenticated workspace; no extra environment variable or database change is needed for these navigation improvements.


### 14. Shared-device and browser-storage behaviour

- Normal business records are written to MongoDB through protected API routes. The browser receives copies to display while signed in, and those copies exist temporarily in page memory; logout clears that React state. The app does not use browser storage as its business database.
- The legacy `cah-autolock` browser preference is no longer read or written. It is replaced by the server-backed `AdminPreference` record. The startup and logout cleanup removes old app-prefixed storage keys left by prior versions.
- API calls use `cache: "no-store"`; Next.js response headers also disable caching for `/`, `/api/*`, `/join/*` and `/shared/*` where sensitive or tokenised content may appear. Logout sends `Clear-Site-Data` for `cache` and `storage`, clears the session cookie, and revokes the database session.
- The dashboard broadcasts a logout message to tabs in the same browser and rechecks authentication every 60 seconds and when a tab becomes visible. These read-only checks do not refresh the server idle timer. A throttled protected heartbeat extends the server idle timestamp only after real user interaction, so client-side editing remains usable without letting a background check keep an unattended session alive. If a session is revoked on another computer, that computer's open dashboard should clear after its next session check or protected API response.
- This is strong practical protection, not device forensics: it cannot remove downloaded files, screen captures, clipboard history, browser password-manager entries, OS backups, malicious extensions or data a person deliberately copied. Do not place secrets in notes, do not export private files on a shared PC, and use a separate browser profile or private window for temporary devices.
