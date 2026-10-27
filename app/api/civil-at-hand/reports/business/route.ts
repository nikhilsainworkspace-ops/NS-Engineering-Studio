import { adminHandler, json, plain, todayKey } from "@/modules/civil-at-hand/lib/api-helpers";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { agingBucket, balanceDue, type AgingBucket, type InvoiceLike } from "@/modules/civil-at-hand/lib/finance";
import { getSettings } from "@/modules/civil-at-hand/lib/server-settings";
import { averageRates, stockBalanceRows } from "@/modules/civil-at-hand/lib/stock-server";
import { isDayKey } from "@/modules/civil-at-hand/lib/workforce";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Expense } from "@/modules/civil-at-hand/models/Expense";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";
import { Material } from "@/modules/civil-at-hand/models/Material";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { SiteReport } from "@/modules/civil-at-hand/models/SiteReport";
import { Tender } from "@/modules/civil-at-hand/models/Tender";

export const runtime = "nodejs";
export const maxDuration = 30;
type Row = Record<string, unknown> & { _id: unknown };

/** Business reports for a date range. Every figure is a plain sum of stored records; see the notes returned. */
export const GET = adminHandler("Business report error", async (request: Request) => {
  await dbConnect();
  const settings = await getSettings();
  const url = new URL(request.url);
  const today = todayKey(settings.timezone);
  const from = url.searchParams.get("from") || `${today.slice(0, 4)}-01-01`;
  const to = url.searchParams.get("to") || today;
  if (!isDayKey(from) || !isDayKey(to) || from > to) throw new InputError("Choose a valid date range.");
  const start = new Date(`${from}T00:00:00Z`); const end = new Date(`${to}T23:59:59.999Z`);
  const range = { $gte: start, $lte: end };

  const [expenses, orders, invoices, estimates, tenders, attendance, reports, materials] = await Promise.all([
    Expense.find({ date: range }, { category: 1, amount: 1, projectId: 1 }).limit(50000).lean() as Promise<Row[]>,
    PurchaseOrder.find({ orderDate: range, status: { $ne: "cancelled" } }, { supplierName: 1, total: 1, status: 1, projectId: 1 }).limit(20000).lean() as Promise<Row[]>,
    Invoice.find({ state: "issued" }, { kind: 1, state: 1, items: 1, retentionAmount: 1, payments: 1, dueDate: 1, partyName: 1, date: 1 }).limit(20000).lean() as Promise<Row[]>,
    Estimate.find({ issueDate: range }, { status: 1, totals: 1, version: 1, groupId: 1 }).limit(20000).lean() as Promise<Row[]>,
    Tender.find({ $or: [{ submissionDeadline: range }, { updatedAt: range }] }, { status: 1, bidValue: 1, decision: 1 }).limit(10000).lean() as Promise<Row[]>,
    Attendance.aggregate([{ $match: { date: { $gte: from, $lte: to } } }, { $group: { _id: { projectId: "$projectId", status: "$status" }, count: { $sum: 1 }, ot: { $sum: "$otHours" } } }]) as Promise<{ _id: { projectId: string; status: string }; count: number; ot: number }[]>,
    SiteReport.aggregate([{ $match: { date: range } }, { $group: { _id: { projectId: "$projectId", status: "$status" }, count: { $sum: 1 } } }]) as Promise<{ _id: { projectId: string; status: string }; count: number }[]>,
    Material.find({}, { name: 1, unit: 1 }).limit(5000).lean() as Promise<Row[]>,
  ]);

  const group = (rows: Row[], key: (row: Row) => string, value: (row: Row) => number) => {
    const map = new Map<string, { key: string; count: number; amount: number }>();
    for (const row of rows) { const k = key(row) || "Not set"; const item = map.get(k) || { key: k, count: 0, amount: 0 }; item.count += 1; item.amount += value(row); map.set(k, item); }
    return Array.from(map.values()).map((item) => ({ ...item, amount: Math.round(item.amount * 100) / 100 })).sort((a, b) => b.amount - a.amount);
  };

  const aging = (kind: string) => {
    const buckets: Record<AgingBucket, { count: number; amount: number }> = { current: { count: 0, amount: 0 }, "1-30": { count: 0, amount: 0 }, "31-60": { count: 0, amount: 0 }, "61-90": { count: 0, amount: 0 }, "90+": { count: 0, amount: 0 } };
    for (const row of invoices.filter((item) => item.kind === kind)) {
      const balance = balanceDue(row as unknown as InvoiceLike);
      if (balance <= 0.5) continue;
      const bucket = agingBucket(row.dueDate as string | null, today);
      buckets[bucket].count += 1; buckets[bucket].amount = Math.round((buckets[bucket].amount + balance) * 100) / 100;
    }
    return buckets;
  };

  const [balances, rates] = await Promise.all([stockBalanceRows(), averageRates()]);
  const materialName = new Map(materials.map((row) => [String(row._id), { name: String(row.name), unit: String(row.unit || "") }]));
  const stockByMaterial = new Map<string, number>();
  for (const row of balances) stockByMaterial.set(row.materialId, (stockByMaterial.get(row.materialId) || 0) + row.qty);
  const stock = Array.from(stockByMaterial.entries()).map(([materialId, qty]) => {
    const rate = rates.get(materialId) ?? null;
    return { materialId, name: materialName.get(materialId)?.name || "Unknown material", unit: materialName.get(materialId)?.unit || "", qty: Math.round(qty * 1000) / 1000, averageRate: rate, value: rate === null ? null : Math.round(qty * rate * 100) / 100 };
  }).filter((row) => Math.abs(row.qty) > 1e-9).sort((a, b) => (b.value || 0) - (a.value || 0));

  return json(plain({
    from, to, currency: settings.currency,
    expensesByCategory: group(expenses, (row) => String(row.category || ""), (row) => Number(row.amount || 0)),
    purchasesBySupplier: group(orders, (row) => String(row.supplierName || ""), (row) => Number(row.total || 0)),
    receivablesAging: aging("receivable"),
    payablesAging: aging("payable"),
    quotations: group(estimates, (row) => String(row.status || ""), (row) => Number((row.totals as { total?: number } | undefined)?.total || 0)),
    tenders: group(tenders, (row) => String(row.status || ""), (row) => Number(row.bidValue || 0)),
    attendance: attendance.map((row) => ({ projectId: row._id.projectId, status: row._id.status, count: row.count, otHours: row.ot })),
    siteReports: reports.map((row) => ({ projectId: row._id.projectId, status: row._id.status, count: row.count })),
    stock, stockValue: Math.round(stock.reduce((total, row) => total + (row.value || 0), 0)),
    notes: [
      "Expenses, purchase orders and quotations are filtered by their own date within the range.",
      "Ageing uses each open invoice's due date and today's balance; invoices without a due date count as current.",
      "Stock value = quantity on hand × average purchase rate of recorded receipts. Materials with no priced receipts show no value.",
      "Purchase orders are commitments; costs are counted from supplier bills and expenses in Finance.",
    ],
  }));
});
