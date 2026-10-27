# Feature Inventory — NS Engineering Studio Final

Inventory compiled from the two supplied source archives. “Preserved” means source modules/routes/assets are included in this repository; it does not imply every integration was runtime-tested. Empty database state, missing provider credentials, and external service configuration are documented separately.

## NS Engineering Studio source project

| Area | Source files / current location | Status |
|---|---|---|
| Public homepage, about, industries, process | `app/(site)/` | Preserved and brand copy refreshed |
| Product directory and product overviews | `app/(site)/products`, `lib/product-content.ts` | Preserved; legacy construction product renamed in public UI to Engineering Workspace |
| Engineering calculators | `app/(site)/tools`, `components/EngineeringTools.tsx` | Preserved; source tests cover formulas and actions |
| Practical guide library and search | `app/(site)/resources`, `lib/resources.ts`, `components/ResourceExplorer.tsx` | Preserved |
| Service listing and detail routes | `app/(site)/services` | Updated for engineering, architectural, estimating, planning, manpower and software enquiries |
| Central enquiry API and private inbox | `app/api/contact`, `app/api/admin/leads`, `components/AdminDashboard.tsx` | Preserved and extended with organization/state/city fields |
| Central admin identity and sessions | `lib/auth.ts`, `app/api/auth/*` | Central session source; shared with workspace routes |
| Website content/settings/lead administration | `app/api/admin/*`, `app/admin/*` | Preserved; projects and software CRUD added |
| Database/audit/rate-limit plumbing | `lib/db.ts`, `lib/audit.ts`, `lib/rate-limit.ts` | Preserved; runtime DB needs configuration |
| Metadata, robots, sitemap, CSP/security headers | `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `next.config.ts` | Updated for final routes and brand |
| Brand mark, favicon, social preview, manifest | `public/brand`, `public/favicon.svg`, `public/site.webmanifest` | NS geometric SVG identity provided; raster icon sizes regenerated |

## Civil At Hand source project incorporated as Engineering Workspace

| Feature group | Included implementation | Status / boundary |
|---|---|---|
| Workspace home/dashboard | `app/workspace/page.tsx`, `modules/civil-at-hand/components/dashboard.tsx` | Preserved under `/workspace`; uses central NS admin session |
| Contacts/CRM | Contact models, CRUD, interactions, merge/bulk routes | Preserved; existing data stays in configured workspace MongoDB database |
| Projects and site diary | Project models, site reports, review APIs | Preserved |
| Tasks and follow-ups | Task routes and components | Preserved |
| Estimates, quotations, rates | Estimate, rate and conversion/revision routes | Preserved |
| Materials, stock and procurement | Materials, balances/movements, material requests, purchase orders and receipt routes | Preserved |
| Workforce and attendance | Worker, transactions and attendance routes | Preserved |
| Finance and invoices | Expenses, invoices, payments, project cost route | Preserved; no payment-gateway activation added |
| Documents, notes and sharing | Document, note asset/share and shared-download routes | Preserved; authorization must be verified in deployment |
| Tenders and reporting | Tenders, business report and export routes | Preserved |
| Custom forms/public pages | Custom form, public token, public pages/images APIs | Preserved; legacy public URLs redirect to `/workspace/...` |
| Backups and restore tooling | Backup, scheduled backup/restore APIs | Preserved; backup destination and restore procedures require deployment review |
| Security/preferences/sessions/2FA | Security API components/routes | Shared NS session for authentication; optional TOTP requires `ADMIN_TOTP_SECRET` |
| AI assistant | Assistant API | Preserved but inactive unless `GEMINI_API_KEY` is configured |
| Excel exports/imports | `exceljs` and related APIs | Preserved; runtime needs dependency installation and DB |
| Public-share and join pages | `app/workspace/{forms,join,p,print,shared}` | Preserved under namespaced workspace routes; old paths redirect |

## Exact construction-workspace models

- `modules/civil-at-hand/models/AdminPreference.ts`
- `modules/civil-at-hand/models/AdminSession.ts`
- `modules/civil-at-hand/models/Attendance.ts`
- `modules/civil-at-hand/models/AuditLog.ts`
- `modules/civil-at-hand/models/BackupSnapshot.ts`
- `modules/civil-at-hand/models/BackupSnapshotChunk.ts`
- `modules/civil-at-hand/models/BusinessSetting.ts`
- `modules/civil-at-hand/models/Contact.ts`
- `modules/civil-at-hand/models/Counter.ts`
- `modules/civil-at-hand/models/CustomForm.ts`
- `modules/civil-at-hand/models/CustomFormResponse.ts`
- `modules/civil-at-hand/models/DataRoom.ts`
- `modules/civil-at-hand/models/DocumentFile.ts`
- `modules/civil-at-hand/models/Estimate.ts`
- `modules/civil-at-hand/models/Expense.ts`
- `modules/civil-at-hand/models/Invoice.ts`
- `modules/civil-at-hand/models/LoginAttempt.ts`
- `modules/civil-at-hand/models/Material.ts`
- `modules/civil-at-hand/models/MaterialRequest.ts`
- `modules/civil-at-hand/models/NoteAsset.ts`
- `modules/civil-at-hand/models/NoteShare.ts`
- `modules/civil-at-hand/models/PageImage.ts`
- `modules/civil-at-hand/models/PrivateNote.ts`
- `modules/civil-at-hand/models/Project.ts`
- `modules/civil-at-hand/models/ProjectDocument.ts`
- `modules/civil-at-hand/models/PublicPage.ts`
- `modules/civil-at-hand/models/PurchaseOrder.ts`
- `modules/civil-at-hand/models/Rate.ts`
- `modules/civil-at-hand/models/ShareLink.ts`
- `modules/civil-at-hand/models/SiteReport.ts`
- `modules/civil-at-hand/models/StockMovement.ts`
- `modules/civil-at-hand/models/Task.ts`
- `modules/civil-at-hand/models/Tender.ts`
- `modules/civil-at-hand/models/Worker.ts`
- `modules/civil-at-hand/models/WorkerTxn.ts`

## Workspace UI components

- `modules/civil-at-hand/components/business-reports.tsx`
- `modules/civil-at-hand/components/custom-forms-panel.tsx`
- `modules/civil-at-hand/components/custom-public-form.tsx`
- `modules/civil-at-hand/components/dashboard.tsx`
- `modules/civil-at-hand/components/documents-panel.tsx`
- `modules/civil-at-hand/components/entity-manager.tsx`
- `modules/civil-at-hand/components/estimates-panel.tsx`
- `modules/civil-at-hand/components/finance-panel.tsx`
- `modules/civil-at-hand/components/followups-panel.tsx`
- `modules/civil-at-hand/components/interaction-log.tsx`
- `modules/civil-at-hand/components/merge-modal.tsx`
- `modules/civil-at-hand/components/overview-panel.tsx`
- `modules/civil-at-hand/components/print-button.tsx`
- `modules/civil-at-hand/components/private-notes-panel.tsx`
- `modules/civil-at-hand/components/procurement-panel.tsx`
- `modules/civil-at-hand/components/project-workspace.tsx`
- `modules/civil-at-hand/components/projects-panel.tsx`
- `modules/civil-at-hand/components/public-intake-form.tsx`
- `modules/civil-at-hand/components/public-pages-panel.tsx`
- `modules/civil-at-hand/components/rates-panel.tsx`
- `modules/civil-at-hand/components/reports-panel.tsx`
- `modules/civil-at-hand/components/rooms-panel.tsx`
- `modules/civil-at-hand/components/security-panel.tsx`
- `modules/civil-at-hand/components/settings-panel.tsx`
- `modules/civil-at-hand/components/shared-room-viewer.tsx`
- `modules/civil-at-hand/components/site-reports-panel.tsx`
- `modules/civil-at-hand/components/tasks-panel.tsx`
- `modules/civil-at-hand/components/tenders-panel.tsx`
- `modules/civil-at-hand/components/ui.tsx`
- `modules/civil-at-hand/components/workforce-panel.tsx`

## Public additions in this merge

- `/projects` and `/projects/:slug`: searchable/category-filtered project directory with empty state and search-engine metadata. There is no seeded/fake project work.
- `/engineering-software`: searchable/category/status-filtered catalogue for the in-repository calculator/workspace and admin-managed software records. The source-supplied CivilMargin launch URL is not displayed until owner verification.
- `/admin/projects` and `/admin/software`: administrator CRUD for public records; projects accept same-site media paths/HTTPS image URLs, not a new public-gallery file-upload pipeline. An enquiry carries a structured project slug and offers a direct link into the project editor.
- `/cookies` and `/refund-cancellation`: policy drafts marked for business/legal review.
- Contact form now records organization, state/union territory and city/district when submitted; project details attach a structured project slug, and the admin inbox supports status, priority, assignment and follow-up date. No location-specific availability is guaranteed.
- `/service-coverage`: owner-editable coverage note, with language that accepts enquiries across India without promising operational offices or guaranteed capacity.
- `/search`: public search across published service/project/software content, products, FAQs and guides; private admin/workspace data is excluded.
- `/admin/billing`: read-only activation status. No provider adapter or customer subscription model is present, so checkout remains disabled and is not simulated.
- `/admin/roles`: read-only access-model status. Only the environment-configured Super Admin is active; extra staff/customer roles are documented but not fabricated.
- Legacy workspace API route aliases are created for non-conflicting API paths; `/api/auth/*` and `/api/contact` remain owned by the NS website.

## Not implemented or not verifiable from supplied code/configuration

- Customer-facing paid subscription activation, payment gateway and webhook verification were not present as configured live integrations and are not invented here.
- Full multi-role RBAC (Content Manager, Project Manager, Support Staff, Customer), MFA self-service enrollment, and per-product entitlements are not newly implemented. The central shared identity remains administrator-oriented; workspace domain authorization continues to use the existing admin check.
- Project-gallery managed storage/upload service is not integrated into the CMS. Use a validated durable media provider before accepting uploaded project documents/images.
- Email notifications, Gemini AI, OAuth, analytics and payment-provider flows require credentials/configuration; email/AI only activate when the documented keys are provided.
- The source has no verified real project portfolio, client testimonials, certifications, office network, subscription plans or published pricing; none has been fabricated.
- No existing production database was attached. No live data migration, production integration test, payment test or production-domain test was possible.

## Raw route inventory (98 handler files)

- `/api/civil-at-hand/assistant`
- `/api/civil-at-hand/attendance/bulk`
- `/api/civil-at-hand/attendance`
- `/api/civil-at-hand/auth/activity`
- `/api/civil-at-hand/auth/login`
- `/api/civil-at-hand/auth/logout`
- `/api/civil-at-hand/auth/session`
- `/api/civil-at-hand/backup/restore`
- `/api/civil-at-hand/backup`
- `/api/civil-at-hand/backup/scheduled/:id/restore`
- `/api/civil-at-hand/backup/scheduled`
- `/api/civil-at-hand/contacts/:id/interactions`
- `/api/civil-at-hand/contacts/:id`
- `/api/civil-at-hand/contacts/bulk`
- `/api/civil-at-hand/contacts/merge`
- `/api/civil-at-hand/contacts`
- `/api/civil-at-hand/custom-forms/:id/responses/export`
- `/api/civil-at-hand/custom-forms/:id/responses`
- `/api/civil-at-hand/custom-forms/:id`
- `/api/civil-at-hand/custom-forms`
- `/api/civil-at-hand/custom-public/:token`
- `/api/civil-at-hand/documents/:id/files`
- `/api/civil-at-hand/documents/:id`
- `/api/civil-at-hand/documents/files/:fileId`
- `/api/civil-at-hand/documents`
- `/api/civil-at-hand/estimates/:id/convert`
- `/api/civil-at-hand/estimates/:id/revise`
- `/api/civil-at-hand/estimates/:id`
- `/api/civil-at-hand/estimates/:id/status`
- `/api/civil-at-hand/estimates/import`
- `/api/civil-at-hand/estimates`
- `/api/civil-at-hand/expenses/:id`
- `/api/civil-at-hand/expenses`
- `/api/civil-at-hand/export`
- `/api/civil-at-hand/finance/project-costs`
- `/api/civil-at-hand/health`
- `/api/civil-at-hand/import`
- `/api/civil-at-hand/invoices/:id/payments/:paymentId`
- `/api/civil-at-hand/invoices/:id/payments`
- `/api/civil-at-hand/invoices/:id`
- `/api/civil-at-hand/invoices/:id/state`
- `/api/civil-at-hand/invoices`
- `/api/civil-at-hand/links/:id`
- `/api/civil-at-hand/links`
- `/api/civil-at-hand/material-requests/:id`
- `/api/civil-at-hand/material-requests`
- `/api/civil-at-hand/materials/:id`
- `/api/civil-at-hand/materials`
- `/api/civil-at-hand/notes/:id/assets`
- `/api/civil-at-hand/notes/:id`
- `/api/civil-at-hand/notes/:id/share/:shareId`
- `/api/civil-at-hand/notes/:id/share`
- `/api/civil-at-hand/notes/assets/:id`
- `/api/civil-at-hand/notes`
- `/api/civil-at-hand/overview`
- `/api/civil-at-hand/projects/:id`
- `/api/civil-at-hand/projects/:id/summary`
- `/api/civil-at-hand/projects`
- `/api/civil-at-hand/public/:token`
- `/api/civil-at-hand/public-pages/:id/publish`
- `/api/civil-at-hand/public-pages/:id`
- `/api/civil-at-hand/public-pages/images/:id`
- `/api/civil-at-hand/public-pages/images`
- `/api/civil-at-hand/public-pages`
- `/api/civil-at-hand/purchase-orders/:id/receive`
- `/api/civil-at-hand/purchase-orders/:id`
- `/api/civil-at-hand/purchase-orders/:id/status`
- `/api/civil-at-hand/purchase-orders`
- `/api/civil-at-hand/rates/:id`
- `/api/civil-at-hand/rates`
- `/api/civil-at-hand/reports/business`
- `/api/civil-at-hand/rooms/:id`
- `/api/civil-at-hand/rooms`
- `/api/civil-at-hand/search`
- `/api/civil-at-hand/security/2fa`
- `/api/civil-at-hand/security/audit`
- `/api/civil-at-hand/security/preferences`
- `/api/civil-at-hand/security/sessions`
- `/api/civil-at-hand/settings`
- `/api/civil-at-hand/shared/:token/assets/:assetId`
- `/api/civil-at-hand/shared/:token/download`
- `/api/civil-at-hand/shared/:token`
- `/api/civil-at-hand/site/images/:id`
- `/api/civil-at-hand/site-reports/:id/review`
- `/api/civil-at-hand/site-reports/:id`
- `/api/civil-at-hand/site-reports`
- `/api/civil-at-hand/stock/balances`
- `/api/civil-at-hand/stock/movements/:id/reverse`
- `/api/civil-at-hand/stock/movements`
- `/api/civil-at-hand/tasks/:id`
- `/api/civil-at-hand/tasks`
- `/api/civil-at-hand/tenders/:id/convert`
- `/api/civil-at-hand/tenders/:id`
- `/api/civil-at-hand/tenders`
- `/api/civil-at-hand/worker-transactions/:id`
- `/api/civil-at-hand/worker-transactions`
- `/api/civil-at-hand/workers/:id`
- `/api/civil-at-hand/workers`
