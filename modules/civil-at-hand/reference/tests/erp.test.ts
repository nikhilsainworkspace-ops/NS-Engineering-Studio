// Tests for the version 4 construction-management logic. Pure functions only: no database needed.
import assert from "node:assert/strict";
import test from "node:test";
import { rupeesInWords, indianNumberWords } from "@/lib/amount-words";
import { normalizePartial, normalizeRecord, escapeRegex, type FieldSpec } from "@/lib/entity-spec";
import { estimateDef, invoiceDef, materialRequestDef, workerDef } from "@/lib/entities";
import { InputError } from "@/lib/errors";
import { canChangeEstimateStatus, computeEstimate, estimateEditable, itemUnitCost, markupFactor, parseBoqRows, revisionLabel } from "@/lib/estimates";
import { detectFileType, safeFilename } from "@/lib/file-types";
import { agingBucket, balanceDue, checkNewPayment, invoiceTotals, paymentStatus, projectMoney, type InvoiceLike } from "@/lib/finance";
import { collectFollowUps } from "@/lib/followups";
import { averageReceiptRate, checkAvailable, checkReceipt, purchaseOrderTotals, receivedStatus, resolveMovement, stockBalances, totalOnHand, type Movement } from "@/lib/inventory";
import { normalizeProjectInput, normalizeProjectPatch, finishedStatuses } from "@/lib/projects";
import { normalizePublicPageInput, normalizeSlug, pageImageIds, pageIsLive, safeLink } from "@/lib/public-pages";
import { buildReport } from "@/lib/reports";
import { defaultSettings, formatMoney, normalizeSettingsInput, withDefaults } from "@/lib/settings";
import { dayRate, labourCostByProject, wageSheet, type WorkerLite } from "@/lib/workforce";

const ID = "507f1f77bcf86cd799439011";

/* ------------------------------------------------------------------ shared field validation */
test("field specs validate, clean and drop unknown keys", () => {
  const specs: FieldSpec[] = [
    { key: "name", label: "Name", kind: "text", required: true, max: 10 },
    { key: "amount", label: "Amount", kind: "money", min: 0 },
    { key: "when", label: "Date", kind: "date" },
    { key: "kind", label: "Kind", kind: "select", options: [{ value: "a", label: "A" }], defaultValue: "a" },
    { key: "ref", label: "Project", kind: "ref" },
    { key: "tags", label: "Tags", kind: "tags" },
    { key: "rows", label: "Rows", kind: "items", itemFields: [{ key: "qty", label: "Qty", kind: "number", required: true }] },
  ];
  const out = normalizeRecord(specs, { name: "  Ravi\u0007 Kumar Singh ", amount: "₹1,234.567", when: "2026-10-17", kind: "", ref: ID, tags: "a, b, a", rows: [{ qty: "2" }], evil: "$where" });
  assert.equal(out.name, "Ravi Kumar");
  assert.equal(out.amount, 1234.57);
  assert.equal((out.when as Date).toISOString(), "2026-10-17T00:00:00.000Z");
  assert.equal(out.kind, "a");
  assert.equal(out.ref, ID);
  assert.deepEqual(out.tags, ["a", "b"]);
  assert.deepEqual(out.rows, [{ qty: 2 }]);
  assert.equal("evil" in out, false);
  assert.throws(() => normalizeRecord(specs, { name: "" }), InputError);
  assert.throws(() => normalizeRecord(specs, { name: "x", amount: -5 }), /between/);
  assert.throws(() => normalizeRecord(specs, { name: "x", kind: "zzz" }), /valid kind/);
  assert.throws(() => normalizeRecord(specs, { name: "x", ref: "not-an-id" }), /valid project/);
  assert.throws(() => normalizeRecord(specs, { name: "x", rows: [{ qty: "" }] }), /Rows row 1: Qty is required/);
  assert.throws(() => normalizeRecord(specs, { name: "x", when: "1800-01-01" }), /year/);
  assert.deepEqual(normalizePartial(specs, { amount: 5 }), { amount: 5 });
  assert.equal(escapeRegex("a.b*(c)"), "a\\.b\\*\\(c\\)");
});

test("entity definitions reject bad business input", () => {
  assert.throws(() => normalizeRecord(materialRequestDef.fields, { projectId: ID, items: [] }), /at least one row/);
  assert.throws(() => normalizeRecord(invoiceDef.fields, { kind: "receivable", partyName: "X", date: "2026-10-01", items: [{ description: "Work", qty: 1 }] }), /Rate is required/);
  const worker = normalizeRecord(workerDef.fields, { name: "Suresh", dailyWage: "850", idLast4: "1234" });
  assert.equal(worker.status, "active");
  assert.equal(worker.wageType, "daily");
  const estimate = normalizeRecord(estimateDef.fields, { title: "Q", items: [{ description: "Item" }] });
  assert.equal((estimate.items as Record<string, unknown>[])[0].qty, 0);
  assert.equal(estimate.taxLabel, "GST");
});

/* ------------------------------------------------------------------ estimates */
test("estimate arithmetic follows the documented formula with rounding", () => {
  assert.equal(itemUnitCost({ description: "x", materialRate: 100, wastagePct: 5, labourRate: 20, equipmentRate: 10, otherRate: 5 }), 140);
  assert.equal(markupFactor({ overheadPct: 10, contingencyPct: 5, marginPct: 20 }), 1.15 * 1.2);
  const result = computeEstimate({
    items: [{ description: "A", qty: 10, materialRate: 100, wastagePct: 5, labourRate: 20, equipmentRate: 10, otherRate: 5 }, { description: "B", qty: 3.333, labourRate: 99.99 }],
    overheadPct: 10, contingencyPct: 5, marginPct: 20, discountAmount: 500, taxPct: 18,
  });
  // A: unit 140, cost 1400, quoted 193.2, amount 1932. B: unit 99.99, cost 333.27, quoted 137.99, amount 459.92
  assert.equal(result.items[0].quotedRate, 193.2);
  assert.equal(result.items[1].quotedRate, 137.99);
  assert.equal(result.items[1].amount, 459.92);
  assert.equal(result.directCost, 1733.27);
  assert.equal(result.subtotal, 2391.92);
  assert.equal(result.discount, 500);
  assert.equal(result.taxable, 1891.92);
  assert.equal(result.tax, 340.55);
  assert.equal(result.total, 2232.47);
  assert.equal(result.plannedProfit, 158.65);
  // A discount larger than the subtotal is capped, never producing a negative total.
  assert.equal(computeEstimate({ items: [{ description: "x", qty: 1, materialRate: 10 }], discountAmount: 50 }).total, 0);
  assert.equal(computeEstimate({ items: [] }).total, 0);
});

test("sent and decided quotations are locked and move only forward", () => {
  assert.equal(estimateEditable("draft"), true);
  for (const status of ["sent", "approved", "rejected", "cancelled"]) assert.equal(estimateEditable(status), false);
  assert.equal(canChangeEstimateStatus("draft", "sent"), true);
  assert.equal(canChangeEstimateStatus("sent", "approved"), true);
  assert.equal(canChangeEstimateStatus("approved", "draft"), false);
  assert.equal(canChangeEstimateStatus("draft", "approved"), false);
  assert.equal(revisionLabel("QT-2026-0001", 1), "QT-2026-0001");
  assert.equal(revisionLabel("QT-2026-0001", 3), "QT-2026-0001 R2");
});

test("BOQ spreadsheet rows are mapped, sectioned and checked", () => {
  const rows = [
    ["", "", ""],
    ["Sl No", "Description of work", "Unit", "Qty", "Rate", "Remarks"],
    ["", "Substructure", "", "", "", ""],
    ["1", "Excavation", "Cum", "120", "350", ""],
    ["2", "PCC 1:4:8", "Cum", "1,200.5", "4,100", "M7.5"],
    ["3", "Broken", "Cum", "abc", "10", ""],
    ["4", "", "", "", "", ""],
  ];
  const result = parseBoqRows(rows);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].section, "Substructure");
  assert.equal(result.items[0].materialRate, 350);
  assert.equal(result.items[1].qty, 1200.5);
  assert.equal(result.items[1].notes, "M7.5");
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].row, 6);
  const breakdown = parseBoqRows([["Description", "Qty", "Material rate", "Labour rate"], ["Wall", "10", "100", "40"]]);
  assert.equal(breakdown.items[0].materialRate, 100);
  assert.equal(breakdown.items[0].labourRate, 40);
  assert.match(parseBoqRows([["Item", "Qty"], ["x", "1"]]).errors[0].message, /Description/);
});

/* ------------------------------------------------------------------ finance */
const invoice = (patch: Partial<InvoiceLike> = {}): InvoiceLike => ({ kind: "receivable", state: "issued", items: [{ description: "RA bill", qty: 1, rate: 100000, taxPct: 18 }], retentionAmount: 5000, payments: [], dueDate: "2026-10-10", ...patch });

test("invoice totals, retention and payment status come from recorded payments", () => {
  const totals = invoiceTotals(invoice().items, 5000);
  assert.deepEqual({ subtotal: totals.subtotal, tax: totals.tax, gross: totals.gross, total: totals.total }, { subtotal: 100000, tax: 18000, gross: 118000, total: 113000 });
  assert.equal(paymentStatus(invoice(), "2026-10-05"), "unpaid");
  assert.equal(paymentStatus(invoice(), "2026-10-17"), "overdue");
  assert.equal(paymentStatus(invoice({ payments: [{ date: "2026-10-01", amount: 50000 }] }), "2026-10-05"), "partially-paid");
  assert.equal(paymentStatus(invoice({ payments: [{ date: "2026-10-01", amount: 112999.7 }] }), "2026-10-17"), "paid");
  assert.equal(paymentStatus(invoice({ state: "draft" }), "2026-10-17"), "draft");
  assert.equal(paymentStatus(invoice({ state: "void" }), "2026-10-17"), "void");
  assert.equal(balanceDue(invoice({ payments: [{ date: "2026-10-01", amount: 13000 }] })), 100000);
  assert.equal(balanceDue(invoice({ state: "draft" })), 0);
});

test("payments can never exceed the balance due", () => {
  assert.equal(checkNewPayment(1000, [], 1000), null);
  assert.equal(checkNewPayment(1000, [{ date: "x", amount: 600 }], 400.4), null);
  assert.match(String(checkNewPayment(1000, [{ date: "x", amount: 600 }], 401)), /more than the balance/);
  assert.match(String(checkNewPayment(1000, [{ date: "x", amount: 1000 }], 1)), /already fully paid/);
  assert.match(String(checkNewPayment(1000, [], 0)), /greater than zero/);
});

test("ageing buckets use the due date", () => {
  assert.equal(agingBucket(null, "2026-10-17"), "current");
  assert.equal(agingBucket("2026-10-20", "2026-10-17"), "current");
  assert.equal(agingBucket("2026-10-01", "2026-10-17"), "1-30");
  assert.equal(agingBucket("2026-08-01", "2026-10-17"), "61-90");
  assert.equal(agingBucket("2026-01-01", "2026-10-17"), "90+");
});

test("project money never counts anything twice", () => {
  const withInvoices = projectMoney({
    budget: 1000000, estimatedValue: 1500000, legacyBilled: 999999, legacyReceived: 999999,
    receivables: [invoice({ retentionAmount: 0, payments: [{ date: "x", amount: 50000 }] }), invoice({ state: "void" })],
    payables: [{ kind: "payable", state: "issued", items: [{ description: "Cement", qty: 100, rate: 400, taxPct: 0 }], payments: [{ date: "x", amount: 10000 }] }, { kind: "payable", state: "draft", items: [{ description: "Draft", qty: 1, rate: 99999 }] }],
    expenses: [{ amount: 2500 }, { amount: 1500 }], labourCost: 20000,
  });
  assert.equal(withInvoices.revenueSource, "invoices");
  assert.equal(withInvoices.billed, 118000);
  assert.equal(withInvoices.received, 50000);
  assert.equal(withInvoices.billsCost, 40000);
  assert.equal(withInvoices.actualCost, 64000);
  assert.equal(withInvoices.budgetUsedPct, 6.4);
  assert.equal(withInvoices.overBudget, false);
  const legacy = projectMoney({ budget: 0, estimatedValue: 0, legacyBilled: 60000, legacyReceived: 25000, receivables: [], payables: [], expenses: [], labourCost: 0 });
  assert.equal(legacy.revenueSource, "project-record");
  assert.equal(legacy.toCollect, 35000);
  assert.equal(legacy.budgetUsedPct, null);
});

/* ------------------------------------------------------------------ inventory */
const M = "m1";
const P = `project:${ID}`;
test("stock balances follow the ledger and refuse negative stock", () => {
  const movements: Movement[] = [
    { materialId: M, type: "receipt", from: "supplier", to: "store", qty: 100, rate: 380 },
    { materialId: M, type: "issue", from: "store", to: P, qty: 60 },
    { materialId: M, type: "consumption", from: P, to: "consumed", qty: 45 },
    { materialId: M, type: "receipt", from: "supplier", to: P, qty: 20, rate: 400 },
    { materialId: M, type: "receipt", from: "supplier", to: "store", qty: 50, rate: 999, reversedById: "x" },
    { materialId: M, type: "receipt", from: "store", to: "supplier", qty: 50, reversalOfId: "y" },
  ];
  const balances = stockBalances(movements);
  assert.equal(balances.get(M)?.get("store"), 40);
  assert.equal(balances.get(M)?.get(P), 35);
  assert.equal(totalOnHand(balances.get(M)), 75);
  assert.equal(averageReceiptRate(movements, M), 383.33);
  assert.equal(checkAvailable(balances, M, P, 35), null);
  assert.match(String(checkAvailable(balances, M, P, 36)), /Only 35/);
  assert.equal(checkAvailable(balances, M, "supplier", 1e9), null);
});

test("movement types fix their source and destination", () => {
  assert.deepEqual(resolveMovement("receipt", "", "store"), { from: "supplier", to: "store" });
  assert.deepEqual(resolveMovement("consumption", P, ""), { from: P, to: "consumed" });
  assert.deepEqual(resolveMovement("issue", "anything", P), { from: "store", to: P });
  assert.ok("error" in resolveMovement("transfer", P, P));
  assert.ok("error" in resolveMovement("transfer", "project:bad", P));
  assert.ok("error" in resolveMovement("teleport", "store", P));
});

test("goods receipts cannot over-receive and set order status", () => {
  const items = [{ description: "Cement", qty: 100, rate: 380, taxPct: 28, receivedQty: 40 }, { description: "Sand", qty: 10, rate: 1500, receivedQty: 0 }];
  assert.equal(checkReceipt(items, [{ index: 0, qty: 60 }]), null);
  assert.match(String(checkReceipt(items, [{ index: 0, qty: 61 }])), /only 60/);
  assert.match(String(checkReceipt(items, [{ index: 0, qty: 1 }, { index: 0, qty: 1 }])), /only once/);
  assert.match(String(checkReceipt(items, [{ index: 5, qty: 1 }])), /does not belong/);
  assert.match(String(checkReceipt(items, [])), /at least one/);
  assert.equal(receivedStatus(items), "partially-received");
  assert.equal(receivedStatus([{ description: "x", qty: 1, receivedQty: 1 }]), "received");
  assert.equal(receivedStatus([{ description: "x", qty: 1, receivedQty: 0 }]), "issued");
  assert.deepEqual(purchaseOrderTotals(items, 500), { subtotal: 53000, tax: 10640, freight: 500, total: 64140 });
});

/* ------------------------------------------------------------------ workforce */
test("wage sheet applies attendance, overtime, advances and payments", () => {
  const workers: WorkerLite[] = [
    { _id: "w1", name: "Suresh", wageType: "daily", dailyWage: 800, otRate: 100 },
    { _id: "w2", name: "Anita", wageType: "monthly", monthlySalary: 30000, otRate: 0 },
    { _id: "w3", name: "Idle", wageType: "daily", dailyWage: 500 },
  ];
  const attendance = [
    { workerId: "w1", projectId: "p1", date: "2026-10-01", status: "present", otHours: 2 },
    { workerId: "w1", projectId: "p1", date: "2026-10-02", status: "half-day", otHours: 0 },
    { workerId: "w1", projectId: "p2", date: "2026-10-03", status: "absent", otHours: 0 },
    { workerId: "w2", projectId: "p1", date: "2026-10-01", status: "present" },
    { workerId: "w1", projectId: "p1", date: "2026-09-30", status: "present", otHours: 0 },
  ];
  const txns = [
    { workerId: "w1", date: "2026-10-02", type: "advance", amount: 300 },
    { workerId: "w1", date: "2026-10-04", type: "payment", amount: 500 },
    { workerId: "w1", date: "2026-10-04", type: "bonus", amount: 50 },
  ];
  const rows = wageSheet(workers, attendance, txns, "2026-10-01", "2026-10-31");
  assert.equal(rows.length, 2);
  const suresh = rows.find((row) => row.workerId === "w1")!;
  assert.deepEqual({ paidDays: suresh.paidDays, basic: suresh.basic, overtime: suresh.overtime, earned: suresh.earned, net: suresh.netPayable, paid: suresh.paid, balance: suresh.balance, absent: suresh.absentDays }, { paidDays: 1.5, basic: 1200, overtime: 200, earned: 1450, net: 1150, paid: 500, balance: 650, absent: 1 });
  assert.equal(rows.find((row) => row.workerId === "w2")!.basic, 1000);
  assert.equal(dayRate(workers[1]), 1000);
  const p1Only = wageSheet(workers, attendance, txns, "2026-10-01", "2026-10-31", "p1");
  assert.equal(p1Only.find((row) => row.workerId === "w1")!.absentDays, 0);
  const labour = labourCostByProject(workers, attendance);
  assert.equal(labour.get("p1"), 800 + 200 + 400 + 1000 + 800);
  assert.equal(labour.get("p2") || 0, 0);
});

/* ------------------------------------------------------------------ settings */
test("business settings are validated and defaulted", () => {
  const current = withDefaults(null);
  assert.equal(current.currency, "INR");
  assert.ok(current.units.includes("Cum"));
  const next = normalizeSettingsInput({ businessName: " Saini Constructions ", gstin: "03aabcs1234f1z5", units: "Cum\nSqm\nCum\n", prefixes: { quotation: "qtn" } }, current);
  assert.equal(next.businessName, "Saini Constructions");
  assert.equal(next.gstin, "03AABCS1234F1Z5");
  assert.deepEqual(next.units, ["Cum", "Sqm"]);
  assert.equal(next.prefixes.quotation, "QTN");
  assert.equal(next.prefixes.invoice, "INV");
  assert.throws(() => normalizeSettingsInput({ gstin: "123" }, current), /GSTIN/);
  assert.throws(() => normalizeSettingsInput({ currency: "XYZ" }, current), /currency/);
  assert.throws(() => normalizeSettingsInput({ website: "javascript:alert(1)" }, current), /https/);
  assert.throws(() => normalizeSettingsInput({ logoUrl: "http://insecure.example/logo.png" }, current), /https/);
  assert.equal(normalizeSettingsInput({ units: "" }, current).units.length, current.units.length);
  assert.equal(formatMoney(1250000, "INR", { compact: true }), "₹12.5 L");
  assert.equal(formatMoney(12500000, "INR", { compact: true }), "₹1.25 Cr");
  assert.equal(formatMoney(null), "—");
  assert.equal(defaultSettings.prefixes.bill, "BILL");
});

/* ------------------------------------------------------------------ public pages */
test("public pages accept only safe slugs, links and typed content", () => {
  assert.equal(normalizeSlug("Our Projects!"), "our-projects");
  assert.throws(() => normalizeSlug("api"), /reserved/);
  assert.throws(() => normalizeSlug("-"), /at least 2/);
  assert.equal(safeLink("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.equal(safeLink("/join/abc123"), "/join/abc123");
  assert.equal(safeLink("tel:+91 98765 43210"), "tel:+91 98765 43210");
  for (const bad of ["javascript:alert(1)", "data:text/html,hi", "//evil.example", "/api/contacts", "vbscript:x"]) assert.throws(() => safeLink(bad), /Links must/);
  const page = normalizePublicPageInput({ title: "About us", visibility: "unlisted", allowIndexing: true, showInNav: true, blocks: [{ type: "text", text: "<script>alert(1)</script> We build." }, { type: "cta", linkUrl: "/join/abc", linkLabel: "Enquire" }, { type: "gallery", imageIds: [ID, "bad"] }] });
  assert.equal(page.slug, "about-us");
  assert.equal(page.allowIndexing, false);
  assert.equal(page.showInNav, false);
  assert.equal(page.blocks[0].text, "<script>alert(1)</script> We build.");
  assert.deepEqual(page.blocks[2].imageIds, [ID]);
  assert.throws(() => normalizePublicPageInput({ title: "Page x", blocks: [{ type: "text", text: "" }] }), /add some text/);
  assert.throws(() => normalizePublicPageInput({ title: "Page x", blocks: [{ type: "iframe" }] }), /valid block/);
  assert.throws(() => normalizePublicPageInput({ title: "Page x", blocks: [{ type: "cta", linkUrl: "javascript:x", linkLabel: "Go" }] }), /Links must/);
  assert.deepEqual(pageImageIds({ coverImageId: ID, blocks: [{ imageIds: [ID, "507f1f77bcf86cd799439012"] }] }), [ID, "507f1f77bcf86cd799439012"]);
  assert.equal(pageIsLive({ status: "draft" }), false);
  assert.equal(pageIsLive({ status: "published", expiresAt: "2000-01-01" }), false);
  assert.equal(pageIsLive({ status: "published", expiresAt: null }), true);
});

/* ------------------------------------------------------------------ uploads and printing */
test("uploaded files must match both name and content", () => {
  const pdf = new TextEncoder().encode("%PDF-1.7\n...");
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  assert.equal(detectFileType("drawing.pdf", pdf)?.mime, "application/pdf");
  assert.equal(detectFileType("drawing.pdf", png), null);
  assert.equal(detectFileType("photo.png", png)?.mime, "image/png");
  assert.equal(detectFileType("evil.html", new TextEncoder().encode("<html>")), null);
  assert.equal(detectFileType("sheet.xlsx", new Uint8Array([0x50, 0x4b, 0x03, 0x04]))?.ext[0], "xlsx");
  assert.equal(detectFileType("notes.txt", new Uint8Array([65, 0, 66])), null);
  assert.equal(safeFilename('a/b\\c"d.pdf'), "a-b-c-d.pdf");
});

test("amounts are written in Indian words", () => {
  assert.equal(indianNumberWords(0), "Zero");
  assert.equal(indianNumberWords(120500), "One Lakh Twenty Thousand Five Hundred");
  assert.equal(indianNumberWords(12345678), "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight");
  assert.equal(rupeesInWords(1050.5), "Rupees One Thousand Fifty and Paise Fifty Only");
});

/* ------------------------------------------------------------------ project lifecycle compatibility */
test("project lifecycle additions keep older records and screens safe", () => {
  const legacy = normalizeProjectInput({ title: "Old screen save", status: "ongoing" });
  assert.equal("milestones" in legacy, false, "fields not sent are left untouched in the database");
  assert.equal("budget" in legacy, false);
  const full = normalizeProjectInput({ title: "New", status: "defects", budget: "12,00,000", progressPercent: "45", milestones: [{ title: "Slab", done: true }] });
  assert.equal(full.status, "defects");
  assert.equal(full.budget, 1200000);
  assert.equal(full.progressPercent, 45);
  assert.equal(full.milestones?.[0].done, true);
  assert.ok(full.milestones?.[0].doneAt instanceof Date);
  assert.throws(() => normalizeProjectInput({ title: "x", progressPercent: 140 }), /Progress/);
  assert.deepEqual(Object.keys(normalizeProjectPatch({ milestones: [], title: "ignored", status: "lost" })), ["milestones"]);
  assert.ok(finishedStatuses.includes("closed"));
  const items = collectFollowUps([], [{ _id: "1", title: "Closed", followUpAt: "2026-10-01", status: "closed" }, { _id: "2", title: "Open", followUpAt: "2026-10-01", status: "awarded" }]);
  assert.deepEqual(items.map((item) => item.id), ["2"]);
  const report = buildReport([], [{ status: "awarded", estimatedValue: 10 }, { status: "estimation", estimatedValue: 5 }, { status: "closed", estimatedValue: 1 }], []);
  assert.equal(report.wonProjects, 2);
  assert.equal(report.openLeads, 1);
  assert.equal(report.projectRows.find((row) => row.status === "estimation")?.count, 1);
});
