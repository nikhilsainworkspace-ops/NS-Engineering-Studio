# Civil At Hand — FINAL v4.1.0

Incremental patch for CivilAtHand-main (v3.0.0 → v4.1.0, includes the Vercel type fix and the redesigned public form and public pages). Contains only new and changed
files at their original paths. Nothing is deleted. No environment files, secrets or data.

## Apply
1. Back up first: commit or copy your current project, and take a backup from
   Security → Backups (or rely on your MongoDB Atlas backup).
2. Unzip at the project root so files overwrite in place:
   `unzip -o CivilAtHand-FINAL-v4.1.0.zip -x PATCH-README.md`
3. `npm install` (no new dependencies; refreshes the lock to version 4.0.0 metadata)
4. `npm run check`  (typecheck + unit tests + integration tests)
5. `npm run lint` and `npm run build` — these could NOT be run where the patch was made; run them before deploying.
6. Deploy as usual (e.g. push to the branch Vercel builds).

## Environment variables
None added. Existing MONGODB_URI, MONGODB_DB, admin and session variables are used unchanged.
Optional existing NEXT_PUBLIC_BRAND_COLOR still overrides the new navy default (#1f3a5c).

## Database / migration
No migration script is needed. 18 new collections are created on first use. New Project
fields are optional; existing records and field names are unchanged. Backup format is now 5;
older backups (3, 4) still restore.

## Rollback
Restore the previous files (git revert / checkout of your pre-patch commit) and redeploy.
Records written to the new collections stay in MongoDB but are ignored by v3. Projects saved
with the new stages (Estimation, Awarded, Planning, Defects, Closed) should be moved back to
one of the original seven stages before rolling back, because v3 validation rejects them on edit.

## Files
Modified (23, incl. components/public-intake-form.tsx, app/p/[slug]/page.tsx is new):
  AGENTS.md
  README.md
  UPDATES.md
  app/api/projects/[id]/route.ts
  app/api/projects/route.ts
  app/globals.css
  app/layout.tsx
  app/robots.ts
  components/dashboard.tsx
  components/projects-panel.tsx
  components/reports-panel.tsx
  components/security-panel.tsx
  lib/backup-restore.ts
  lib/brand.ts
  lib/followups.ts
  lib/projects.ts
  lib/reports.ts
  lib/types.ts
  lib/workspace-backup.ts
  models/Project.ts
  next.config.ts
  package.json

New (112):
  app/api/attendance/bulk/route.ts
  app/api/attendance/route.ts
  app/api/documents/[id]/files/route.ts
  app/api/documents/[id]/route.ts
  app/api/documents/files/[fileId]/route.ts
  app/api/documents/route.ts
  app/api/estimates/[id]/convert/route.ts
  app/api/estimates/[id]/revise/route.ts
  app/api/estimates/[id]/route.ts
  app/api/estimates/[id]/status/route.ts
  app/api/estimates/import/route.ts
  app/api/estimates/route.ts
  app/api/expenses/[id]/route.ts
  app/api/expenses/route.ts
  app/api/finance/project-costs/route.ts
  app/api/invoices/[id]/payments/[paymentId]/route.ts
  app/api/invoices/[id]/payments/route.ts
  app/api/invoices/[id]/route.ts
  app/api/invoices/[id]/state/route.ts
  app/api/invoices/route.ts
  app/api/material-requests/[id]/route.ts
  app/api/material-requests/route.ts
  app/api/materials/[id]/route.ts
  app/api/materials/route.ts
  app/api/overview/route.ts
  app/api/projects/[id]/summary/route.ts
  app/api/public-pages/[id]/publish/route.ts
  app/api/public-pages/[id]/route.ts
  app/api/public-pages/images/[id]/route.ts
  app/api/public-pages/images/route.ts
  app/api/public-pages/route.ts
  app/api/purchase-orders/[id]/receive/route.ts
  app/api/purchase-orders/[id]/route.ts
  app/api/purchase-orders/[id]/status/route.ts
  app/api/purchase-orders/route.ts
  app/api/reports/business/route.ts
  app/api/search/route.ts
  app/api/settings/route.ts
  app/api/site-reports/[id]/review/route.ts
  app/api/site-reports/[id]/route.ts
  app/api/site-reports/route.ts
  app/api/site/images/[id]/route.ts
  app/api/stock/balances/route.ts
  app/api/stock/movements/[id]/reverse/route.ts
  app/api/stock/movements/route.ts
  app/api/tenders/[id]/convert/route.ts
  app/api/tenders/[id]/route.ts
  app/api/tenders/route.ts
  app/api/worker-transactions/[id]/route.ts
  app/api/worker-transactions/route.ts
  app/api/workers/[id]/route.ts
  app/api/workers/route.ts
  app/design-system.css
  app/p/[slug]/page.tsx
  app/print/[kind]/[id]/page.tsx
  components/business-reports.tsx
  components/documents-panel.tsx
  components/entity-manager.tsx
  components/estimates-panel.tsx
  components/finance-panel.tsx
  components/overview-panel.tsx
  components/print-button.tsx
  components/procurement-panel.tsx
  components/project-workspace.tsx
  components/public-pages-panel.tsx
  components/settings-panel.tsx
  components/site-reports-panel.tsx
  components/tenders-panel.tsx
  components/ui.tsx
  components/workforce-panel.tsx
  lib/amount-words.ts
  lib/api-helpers.ts
  lib/crud.ts
  lib/entities.ts
  lib/entity-spec.ts
  lib/estimates.ts
  lib/file-types.ts
  lib/finance.ts
  lib/inventory.ts
  lib/model-builder.ts
  lib/project-costs-server.ts
  lib/public-page-server.ts
  lib/public-pages.ts
  lib/routes/documents.ts
  lib/routes/estimates.ts
  lib/routes/invoices.ts
  lib/routes/purchase-orders.ts
  lib/routes/simple.ts
  lib/server-settings.ts
  lib/settings.ts
  lib/stock-server.ts
  lib/workforce.ts
  models/Attendance.ts
  models/BusinessSetting.ts
  models/Counter.ts
  models/DocumentFile.ts
  models/Estimate.ts
  models/Expense.ts
  models/Invoice.ts
  models/Material.ts
  models/MaterialRequest.ts
  models/PageImage.ts
  models/ProjectDocument.ts
  models/PublicPage.ts
  models/PurchaseOrder.ts
  models/SiteReport.ts
  models/StockMovement.ts
  models/Tender.ts
  models/Worker.ts
  models/WorkerTxn.ts
  tests/erp.test.ts
  tests/integration/erp-api.test.ts
