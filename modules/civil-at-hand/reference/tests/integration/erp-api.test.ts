// Runs the real version 4 API route handlers against a small in-memory stand-in for MongoDB.
// Run with: node --experimental-test-module-mocks --import tsx --test tests/integration/*.test.ts
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { mock, test } from "node:test";
import { stockBalances, type Movement } from "@/lib/inventory";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;

/* ------------------------------------------------------------------ in-memory database */
let seq = 1;
const newId = () => (seq++).toString(16).padStart(24, "0");
class ObjectId { value: string; constructor(id?: unknown) { this.value = id ? String(id) : newId(); } toString() { return this.value; } toJSON() { return this.value; } }
const stores = new Map<string, Doc[]>();
const store = (name: string) => { if (!stores.has(name)) stores.set(name, []); return stores.get(name)!; };
const clone = <T>(value: T): T => (value === undefined ? value : structuredClone(value));
const getPath = (doc: Doc, path: string): any => path.split(".").reduce((value: any, key) => (Array.isArray(value) && !/^\d+$/.test(key) ? value.map((item) => item?.[key]) : value?.[key]), doc);
const same = (a: any, b: any) => (b === null ? a === null || a === undefined : a instanceof Date || b instanceof Date ? new Date(a).getTime() === new Date(b).getTime() : String(a) === String(b));

function matchValue(actual: any, cond: any): boolean {
  if (cond && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond) && !(cond instanceof ObjectId) && Object.keys(cond).some((key) => key.startsWith("$"))) {
    return Object.entries(cond).every(([op, value]) => {
      const list = Array.isArray(actual) ? actual : [actual];
      switch (op) {
        case "$ne": return Array.isArray(actual) ? !actual.some((item) => same(item, value)) : !same(actual ?? null, value);
        case "$in": return list.some((item) => (value as any[]).some((v) => same(item, v)));
        case "$nin": return !list.some((item) => (value as any[]).some((v) => same(item, v)));
        case "$gt": return actual > value; case "$gte": return actual >= value; case "$lt": return actual < value; case "$lte": return actual <= value;
        case "$regex": return new RegExp(String(value), "i").test(String(actual ?? ""));
        case "$options": return true;
        case "$not": return !(value as RegExp).test(String(actual ?? ""));
        default: throw new Error(`Unsupported operator ${op}`);
      }
    });
  }
  if (Array.isArray(actual)) return actual.some((item) => same(item, cond));
  if (cond === null) return actual === null || actual === undefined || actual === "";
  return same(actual, cond);
}
function matches(doc: Doc, filter: Doc = {}): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$or") return (cond as Doc[]).some((sub) => matches(doc, sub));
    return matchValue(getPath(doc, key), cond);
  });
}
function setPath(doc: Doc, path: string, value: unknown) {
  const keys = path.split("."); let target: any = doc;
  for (const key of keys.slice(0, -1)) target = target[key];
  target[keys[keys.length - 1]] = value;
}
function applyUpdate(doc: Doc, update: Doc) {
  const hasOps = Object.keys(update).some((key) => key.startsWith("$"));
  if (!hasOps) { Object.assign(doc, clone(update)); return; }
  for (const [key, value] of Object.entries(update.$set || {})) setPath(doc, key, clone(value));
  for (const [key, value] of Object.entries(update.$inc || {})) setPath(doc, key, (getPath(doc, key) || 0) + (value as number));
  for (const [key, value] of Object.entries(update.$push || {})) { const item = clone(value) as Doc; if (item && typeof item === "object" && !item._id) item._id = newId(); doc[key] = [...(doc[key] || []), item]; }
  for (const [key, value] of Object.entries(update.$pull || {})) doc[key] = (doc[key] || []).filter((item: Doc) => !matches(item, value as Doc));
  for (const [key, value] of Object.entries(update.$max || {})) doc[key] = Math.max(doc[key] || 0, value as number);
}
function chain(get: () => any) {
  let sortSpec: Doc | null = null; let limitN = 0;
  const api: any = {
    sort(spec: Doc) { sortSpec = spec; return api; }, limit(n: number) { limitN = n; return api; }, select() { return api; }, skip() { return api; },
    lean: async () => {
      let value = get();
      if (Array.isArray(value)) {
        if (sortSpec) { const entries = Object.entries(sortSpec); value = [...value].sort((a, b) => { for (const [key, dir] of entries) { const x = getPath(a, key); const y = getPath(b, key); if (x === y) continue; return (x > y ? 1 : -1) * (dir as number); } return 0; }); }
        if (limitN) value = value.slice(0, limitN);
      }
      return clone(value ?? null);
    },
    then(resolve: (value: any) => void, reject: (error: unknown) => void) { return api.lean().then(resolve, reject); },
  };
  return api;
}
function stamp(doc: Doc) { doc.updatedAt = new Date(Date.now() + seq); seq += 1; }
function makeModel(name: string) {
  const rows = () => store(name);
  const Model: any = function (this: Doc, doc: Doc) { Object.assign(this, doc); this.validate = async () => undefined; };
  Object.assign(Model, {
    find: (filter: Doc = {}) => chain(() => rows().filter((doc) => matches(doc, filter))),
    findOne: (filter: Doc = {}) => chain(() => rows().find((doc) => matches(doc, filter)) || null),
    findById: (id: unknown) => chain(() => rows().find((doc) => same(doc._id, id)) || null),
    exists: async (filter: Doc) => (rows().some((doc) => matches(doc, filter)) ? { _id: "x" } : null),
    countDocuments: async (filter: Doc = {}) => rows().filter((doc) => matches(doc, filter)).length,
    create: async (input: Doc) => {
      if (name === "StockMovement" && input.clientRef && rows().some((doc) => doc.clientRef === input.clientRef)) throw Object.assign(new Error("dup"), { code: 11000 });
      const doc: Doc = { ...clone(input), _id: input._id ? String(input._id) : newId(), createdAt: new Date() }; stamp(doc);
      for (const value of Object.values(doc)) if (Array.isArray(value)) value.forEach((item) => { if (item && typeof item === "object" && !item._id) item._id = newId(); });
      rows().push(doc);
      return { ...clone(doc), _id: doc._id, toObject: () => clone(doc) };
    },
    insertMany: async (list: Doc[]) => { const errors: Doc[] = []; for (const item of list) { try { await Model.create(item); } catch (error) { errors.push({ code: (error as Doc).code }); } } if (errors.length) throw Object.assign(new Error("bulk"), { code: 11000, writeErrors: errors }); },
    findOneAndUpdate: (filter: Doc, update: Doc, options: Doc = {}) => chain(() => {
      let doc = rows().find((item) => matches(item, filter));
      if (!doc && options.upsert) { doc = { _id: filter._id ?? newId(), ...Object.fromEntries(Object.entries(filter).filter(([key]) => !key.startsWith("$"))) }; rows().push(doc); }
      if (!doc) return null;
      applyUpdate(doc, update); stamp(doc);
      return doc;
    }),
    findByIdAndUpdate: (id: unknown, update: Doc) => Model.findOneAndUpdate({ _id: id }, update),
    updateOne: async (filter: Doc, update: Doc, options: Doc = {}) => { const result = await Model.findOneAndUpdate(filter, update, options).lean(); return { modifiedCount: result ? 1 : 0 }; },
    deleteOne: async (filter: Doc) => { const index = rows().findIndex((doc) => matches(doc, filter)); if (index >= 0) rows().splice(index, 1); return { deletedCount: index >= 0 ? 1 : 0 }; },
    deleteMany: async (filter: Doc) => { const before = rows().length; stores.set(name, rows().filter((doc) => !matches(doc, filter))); return { deletedCount: before - store(name).length }; },
    bulkWrite: async () => ({ upsertedCount: 0, modifiedCount: 0, deletedCount: 0 }),
    aggregate: async () => [],
  });
  return Model;
}

/* ------------------------------------------------------------------ module mocks */
let signedIn = true;
const audits: string[] = [];
const modelDir = join(process.cwd(), "models");
for (const file of readdirSync(modelDir).filter((item) => item.endsWith(".ts"))) {
  const name = file.replace(/\.ts$/, "");
  mock.module(`@/models/${name}`, { namedExports: { [name]: makeModel(name) } });
}
mock.module("mongoose", { defaultExport: { isValidObjectId: (value: unknown) => /^[a-f\d]{24}$/i.test(String(value)), Types: { ObjectId }, models: {}, model: () => ({}) }, namedExports: { Schema: class {} } });
mock.module("exceljs", { defaultExport: { Workbook: class {} } });
mock.module("next/server", { namedExports: { NextResponse: class extends Response { static json(body: unknown, init?: ResponseInit) { return new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } }); } } } });
mock.module("@/lib/auth", { namedExports: { isAdmin: async () => signedIn } });
mock.module("@/lib/db", { namedExports: { dbConnect: async () => undefined } });
mock.module("@/lib/audit", { namedExports: { audit: async (_request: unknown, action: string) => { audits.push(action); } } });
mock.module("@/lib/stock-server", { namedExports: {
  stockBalanceRows: async () => { const balances = stockBalances(store("StockMovement") as unknown as Movement[]); return Array.from(balances.entries()).flatMap(([materialId, perLocation]) => Array.from(perLocation.entries()).map(([location, qty]) => ({ materialId, location, qty }))); },
  availableAt: async (materialId: string, location: string) => (location === "store" || location.startsWith("project:") ? stockBalances(store("StockMovement") as unknown as Movement[]).get(materialId)?.get(location) || 0 : Number.POSITIVE_INFINITY),
  averageRates: async () => new Map(),
} });

/* ------------------------------------------------------------------ helpers */
const ctx = (id = "") => ({ params: Promise.resolve({ id }) });
const call = async (handler: (request: Request, context: any) => Promise<Response>, method: string, body?: unknown, context: unknown = ctx(), url = "https://app.test/api/x") => {
  const response = await handler(new Request(url, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined }), context);
  return { status: response.status, data: await response.json().catch(() => ({})) as Doc };
};
const PROJECT = "a".repeat(24);
store("Project").push({ _id: PROJECT, title: "Sector 21 residence", status: "lead", estimatedValue: null, budget: null, updatedAt: new Date() });

/* ------------------------------------------------------------------ tests */
test("every new admin route refuses requests without a signed-in session", async () => {
  signedIn = false;
  const apiDir = join(process.cwd(), "app", "api");
  const skip = ["auth", "public", "shared", "site", "backup", "contacts", "export", "import", "links", "notes", "rooms", "rates", "security", "tasks", "health", "assistant"];
  const files: string[] = [];
  const walk = (dir: string) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else if (entry.name === "route.ts") files.push(path); } };
  walk(apiDir);
  const checked: string[] = [];
  for (const file of files) {
    const relative = file.slice(apiDir.length + 1);
    if (skip.includes(relative.split("/")[0]) && !relative.startsWith("projects/")) continue;
    const routeModule = await import(file) as Record<string, unknown>;
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      const handler = routeModule[method] as ((request: Request, context: any) => Promise<Response>) | undefined;
      if (typeof handler !== "function") continue;
      if (relative.startsWith("projects/") && !relative.includes("summary")) continue; // legacy project routes use the same isAdmin() call
      const response = await handler(new Request("https://app.test/api", { method, headers: { "content-type": "application/json" }, body: method === "GET" || method === "DELETE" ? undefined : "{}" }), { params: Promise.resolve({ id: "b".repeat(24), paymentId: "c".repeat(24), fileId: "d".repeat(24) }) });
      assert.equal(response.status, 401, `${method} /api/${relative} should require sign-in`);
      checked.push(`${method} ${relative}`);
    }
  }
  assert.ok(checked.length >= 50, `checked ${checked.length} handlers`);
  signedIn = true;
});

test("materials: validation, optimistic locking and delete protection", async () => {
  const list = await import("@/app/api/materials/route");
  const item = await import("@/app/api/materials/[id]/route");
  assert.equal((await call(list.POST, "POST", { name: "", unit: "Bag" })).status, 400);
  const created = await call(list.POST, "POST", { name: "OPC 53 cement", unit: "Bag", minStock: 100 });
  assert.equal(created.status, 201);
  const id = created.data.item._id;
  assert.equal((await call(list.GET, "GET")).data.items.length, 1);
  const updated = await call(item.PUT, "PUT", { name: "OPC 53 grade cement", unit: "Bag" }, ctx(id));
  assert.equal(updated.status, 200);
  assert.equal(updated.data.item.name, "OPC 53 grade cement");
  store("StockMovement").push({ _id: newId(), materialId: id, type: "receipt", from: "supplier", to: "store", qty: 10 });
  const blocked = await call(item.DELETE, "DELETE", undefined, ctx(id));
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.error, /Archive it instead/);
  assert.equal((await call(item.PATCH, "PATCH", { archived: true }, ctx(id))).data.item.archived, true);
  assert.equal((await call(item.GET, "GET", undefined, ctx("e".repeat(24)))).status, 404);
  assert.equal((await call(item.GET, "GET", undefined, ctx("not-valid"))).status, 400);
});

test("stock movements never take stock below zero and reversals are one-time", async () => {
  const materialId = store("Material")[0]._id;
  const movements = await import("@/app/api/stock/movements/route");
  const reverse = await import("@/app/api/stock/movements/[id]/reverse/route");
  const tooMuch = await call(movements.POST, "POST", { type: "issue", materialId, to: `project:${PROJECT}`, qty: 11, clientRef: "ref-issue-0001" });
  assert.equal(tooMuch.status, 400);
  assert.match(tooMuch.data.error, /Only 10/);
  const ok = await call(movements.POST, "POST", { type: "issue", materialId, to: `project:${PROJECT}`, qty: 4, clientRef: "ref-issue-0002" });
  assert.equal(ok.status, 201);
  const again = await call(movements.POST, "POST", { type: "issue", materialId, to: `project:${PROJECT}`, qty: 4, clientRef: "ref-issue-0002" });
  assert.equal(again.data.duplicate, true, "a repeated submit is recognised, not recorded twice");
  assert.equal(store("StockMovement").length, 2);
  const reversed = await call(reverse.POST, "POST", undefined, ctx(ok.data.item._id));
  assert.equal(reversed.status, 201);
  assert.equal((await call(reverse.POST, "POST", undefined, ctx(ok.data.item._id))).status, 409);
  const balances = stockBalances(store("StockMovement") as unknown as Movement[]).get(materialId);
  assert.equal(balances?.get("store"), 10);
  assert.equal(balances?.get(`project:${PROJECT}`) || 0, 0);
});

test("quotations: numbered, locked once sent, revised, converted only when approved", async () => {
  const list = await import("@/app/api/estimates/route");
  const item = await import("@/app/api/estimates/[id]/route");
  const status = await import("@/app/api/estimates/[id]/status/route");
  const revise = await import("@/app/api/estimates/[id]/revise/route");
  const convert = await import("@/app/api/estimates/[id]/convert/route");
  const created = await call(list.POST, "POST", { title: "Civil works", projectId: PROJECT, items: [{ description: "Excavation", qty: 100, labourRate: 150, equipmentRate: 50 }], marginPct: 10, taxPct: 18 });
  assert.equal(created.status, 201);
  const estimate = created.data.item;
  assert.match(estimate.number, /^QT-\d{4}-0001$/);
  assert.equal(estimate.status, "draft");
  assert.equal(estimate.totals.directCost, 20000);
  assert.equal(estimate.totals.total, 25960);
  assert.equal((await call(status.POST, "POST", { status: "approved" }, ctx(estimate._id))).status, 409, "a draft cannot jump to approved");
  assert.equal((await call(convert.POST, "POST", {}, ctx(estimate._id))).status, 409);
  assert.equal((await call(status.POST, "POST", { status: "sent" }, ctx(estimate._id))).status, 200);
  const locked = await call(item.PUT, "PUT", { title: "Changed after sending", items: [] }, ctx(estimate._id));
  assert.equal(locked.status, 409);
  assert.match(locked.data.error, /revision/);
  assert.equal((await call(item.DELETE, "DELETE", undefined, ctx(estimate._id))).status, 409);
  const revision = await call(revise.POST, "POST", undefined, ctx(estimate._id));
  assert.equal(revision.status, 201);
  assert.equal(revision.data.item.version, 2);
  assert.equal(revision.data.item.status, "draft");
  assert.equal(revision.data.item.number, estimate.number);
  assert.equal(store("Estimate").find((row) => row._id === estimate._id)?.title, "Civil works", "the sent version is unchanged");
  assert.equal((await call(status.POST, "POST", { status: "approved" }, ctx(estimate._id))).status, 200);
  const converted = await call(convert.POST, "POST", {}, ctx(estimate._id));
  assert.equal(converted.status, 200);
  const project = store("Project").find((row) => row._id === PROJECT)!;
  assert.equal(project.status, "awarded");
  assert.equal(project.estimatedValue, 22000);
  assert.equal(project.budget, 20000);
});

test("invoices: payments are capped, de-duplicated and block voiding", async () => {
  const list = await import("@/app/api/invoices/route");
  const payments = await import("@/app/api/invoices/[id]/payments/route");
  const state = await import("@/app/api/invoices/[id]/state/route");
  const created = await call(list.POST, "POST", { kind: "receivable", partyName: "Mehra Builders", projectId: PROJECT, date: "2026-10-01", dueDate: "2026-10-15", items: [{ description: "RA bill 1", qty: 1, rate: 100000, taxPct: 18 }] });
  assert.equal(created.status, 201);
  const invoice = created.data.item;
  assert.match(invoice.number, /^INV-\d{4}-0001$/);
  assert.equal(invoice.total, 118000);
  const first = await call(payments.POST, "POST", { amount: 50000, date: "2026-10-05", clientRef: "pay-0000001" }, ctx(invoice._id));
  assert.equal(first.status, 201);
  assert.equal(first.data.item.paid, 50000);
  const repeat = await call(payments.POST, "POST", { amount: 50000, date: "2026-10-05", clientRef: "pay-0000001" }, ctx(invoice._id));
  assert.equal(repeat.data.duplicate, true);
  const over = await call(payments.POST, "POST", { amount: 70000, date: "2026-10-06", clientRef: "pay-0000002" }, ctx(invoice._id));
  assert.equal(over.status, 400);
  assert.match(over.data.error, /more than the balance/);
  assert.equal((await call(state.POST, "POST", { state: "void", reason: "mistake" }, ctx(invoice._id))).status, 409);
  const bill = await call(list.POST, "POST", { kind: "payable", partyName: "Singh Cement", date: "2026-10-01", items: [{ description: "Cement", qty: 10, rate: 400 }] });
  assert.match(bill.data.item.number, /^BILL-\d{4}-0001$/);
});

test("purchase orders: goods receipt updates stock once and never over-receives", async () => {
  const materialId = store("Material")[0]._id;
  const list = await import("@/app/api/purchase-orders/route");
  const status = await import("@/app/api/purchase-orders/[id]/status/route");
  const receive = await import("@/app/api/purchase-orders/[id]/receive/route");
  const created = await call(list.POST, "POST", { supplierName: "Singh Cement", deliverTo: "project", projectId: PROJECT, items: [{ materialId, description: "OPC 53", unit: "Bag", qty: 100, rate: 380 }, { description: "Transport", qty: 1, rate: 1500 }], freight: 500 });
  assert.equal(created.status, 201);
  const order = created.data.item;
  assert.equal(order.total, 40000); // 100 × 380 + 1 × 1,500 + freight 500
  assert.equal((await call(receive.POST, "POST", { clientRef: "grn-000001", lines: [{ index: 0, qty: 10 }] }, ctx(order._id))).status, 409, "draft orders cannot be received");
  assert.equal((await call(status.POST, "POST", { status: "issued" }, ctx(order._id))).status, 200);
  const before = store("StockMovement").length;
  const first = await call(receive.POST, "POST", { clientRef: "grn-000001", grnNumber: "GRN-7", lines: [{ index: 0, qty: 60 }, { index: 1, qty: 1 }] }, ctx(order._id));
  assert.equal(first.status, 200);
  assert.equal(first.data.item.status, "partially-received");
  assert.equal(store("StockMovement").length, before + 1, "only the material line creates a stock entry");
  const replay = await call(receive.POST, "POST", { clientRef: "grn-000001", lines: [{ index: 0, qty: 60 }] }, ctx(order._id));
  assert.equal(replay.data.duplicate, true);
  assert.equal(store("StockMovement").length, before + 1);
  const over = await call(receive.POST, "POST", { clientRef: "grn-000002", lines: [{ index: 0, qty: 41 }] }, ctx(order._id));
  assert.equal(over.status, 400);
  const rest = await call(receive.POST, "POST", { clientRef: "grn-000003", lines: [{ index: 0, qty: 40 }] }, ctx(order._id));
  assert.equal(rest.data.item.status, "received");
  assert.equal(stockBalances(store("StockMovement") as unknown as Movement[]).get(materialId)?.get(`project:${PROJECT}`), 100);
  assert.equal((await call(status.POST, "POST", { status: "cancelled" }, ctx(order._id))).status, 409);
});

test("site reports lock on approval", async () => {
  const list = await import("@/app/api/site-reports/route");
  const item = await import("@/app/api/site-reports/[id]/route");
  const review = await import("@/app/api/site-reports/[id]/review/route");
  const created = await call(list.POST, "POST", { projectId: PROJECT, date: "2026-10-16", workDone: "Column casting C1–C6" });
  assert.equal(created.status, 201);
  const id = created.data.item._id;
  assert.equal((await call(review.POST, "POST", { action: "approve" }, ctx(id))).status, 200);
  assert.equal((await call(item.PUT, "PUT", { projectId: PROJECT, date: "2026-10-16", workDone: "Edited" }, ctx(id))).status, 409);
  assert.equal((await call(item.DELETE, "DELETE", undefined, ctx(id))).status, 409);
  assert.equal((await call(review.POST, "POST", { action: "return", note: "Add quantities" }, ctx(id))).status, 200);
  assert.equal((await call(item.PUT, "PUT", { projectId: PROJECT, date: "2026-10-16", workDone: "Edited" }, ctx(id))).status, 200);
  assert.equal((await call(list.POST, "POST", { projectId: "f".repeat(24), date: "2026-10-16", workDone: "x" })).status, 400, "unknown projects are rejected");
});

test("public pages stay private until published and unlisted pages need their key", async () => {
  const { loadLivePage } = await import("@/lib/public-page-server");
  const list = await import("@/app/api/public-pages/route");
  const publish = await import("@/app/api/public-pages/[id]/publish/route");
  const created = await call(list.POST, "POST", { title: "Our work", visibility: "unlisted", blocks: [{ type: "text", text: "Hello" }] });
  assert.equal(created.status, 201);
  assert.equal(created.data.item.status, "draft");
  assert.equal(await loadLivePage("our-work"), null, "drafts are not public");
  assert.equal((await call(publish.POST, "POST", { action: "publish" }, ctx(created.data.item._id))).status, 200);
  const token = store("PublicPage")[0].accessToken as string;
  assert.ok(token.length > 20);
  assert.equal(await loadLivePage("our-work"), null, "unlisted pages need the key");
  assert.equal(await loadLivePage("our-work", "wrong-key"), null);
  const live = await loadLivePage("our-work", token);
  assert.equal(live?.title, "Our work");
  assert.equal("accessToken" in (live as Doc), false, "the key is never echoed into page data");
  await call(publish.POST, "POST", { action: "unpublish" }, ctx(created.data.item._id));
  assert.equal(await loadLivePage("our-work", token), null);
});

test("sensitive actions are written to the activity log", () => {
  for (const action of ["materials-created", "stock-movement", "stock-movement-reversed", "estimate-sent", "estimate-revised", "estimate-converted", "invoice-payment-recorded", "goods-received", "site-report-approve", "public-page-publish", "public-page-unpublish"]) {
    assert.ok(audits.includes(action), `expected audit entry ${action}`);
  }
});
