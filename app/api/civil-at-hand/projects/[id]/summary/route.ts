import mongoose from "mongoose";
import { adminHandler, json, NotFoundError, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { projectMoney, type InvoiceLike } from "@/modules/civil-at-hand/lib/finance";
import { purchaseOrderTotals, type PoLine } from "@/modules/civil-at-hand/lib/inventory";
import { labourCostByProject, type AttendanceLite, type WorkerLite } from "@/modules/civil-at-hand/lib/workforce";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Expense } from "@/modules/civil-at-hand/models/Expense";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";
import { Material } from "@/modules/civil-at-hand/models/Material";
import { MaterialRequest } from "@/modules/civil-at-hand/models/MaterialRequest";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { ProjectDocument } from "@/modules/civil-at-hand/models/ProjectDocument";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { SiteReport } from "@/modules/civil-at-hand/models/SiteReport";
import { StockMovement } from "@/modules/civil-at-hand/models/StockMovement";
import { Worker } from "@/modules/civil-at-hand/models/Worker";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
type Row = Record<string, unknown> & { _id: unknown };

/** Everything the project workspace needs for its overview, money and materials tabs, from stored records only. */
export const GET = adminHandler("Project summary error", async (_request: Request, context: Context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) throw new InputError("Invalid project.");
  await dbConnect();
  const project = await Project.findById(id).lean() as Row | null;
  if (!project) throw new NotFoundError("Project not found.");
  const location = `project:${id}`;
  const [invoices, expenses, attendance, estimates, reports, documents, requests, orders, movements] = await Promise.all([
    Invoice.find({ projectId: id, state: { $ne: "void" } }).lean() as Promise<Row[]>,
    Expense.find({ projectId: id }, { amount: 1, category: 1, date: 1 }).lean() as Promise<Row[]>,
    Attendance.find({ projectId: id }, { workerId: 1, projectId: 1, date: 1, status: 1, otHours: 1 }).lean() as Promise<Row[]>,
    Estimate.countDocuments({ projectId: id }),
    SiteReport.find({ projectId: id }, { date: 1, status: 1 }).sort({ date: -1 }).limit(1).lean() as Promise<Row[]>,
    ProjectDocument.countDocuments({ projectId: id, archived: { $ne: true } }),
    MaterialRequest.find({ projectId: id, status: { $nin: ["rejected", "cancelled"] } }, { items: 1, status: 1 }).lean() as Promise<Row[]>,
    PurchaseOrder.find({ projectId: id, status: { $ne: "cancelled" } }, { items: 1, freight: 1, status: 1 }).lean() as Promise<Row[]>,
    StockMovement.find({ $or: [{ from: location }, { to: location }] }, { materialId: 1, type: 1, from: 1, to: 1, qty: 1 }).lean() as Promise<Row[]>,
  ]);
  const workerIds = Array.from(new Set(attendance.map((row) => String(row.workerId))));
  const workers = await Worker.find({ _id: { $in: workerIds } }, { name: 1, wageType: 1, dailyWage: 1, monthlySalary: 1, otRate: 1 }).lean() as Row[];
  const labour = labourCostByProject(workers.map((worker) => ({ ...worker, _id: String(worker._id) })) as unknown as WorkerLite[], attendance.map((row) => ({ ...row, workerId: String(row.workerId) })) as unknown as AttendanceLite[]).get(id) || 0;
  const asInvoice = (row: Row) => row as unknown as InvoiceLike;
  const money = projectMoney({
    budget: Number(project.budget || 0), estimatedValue: Number(project.estimatedValue || 0), legacyBilled: Number(project.billedAmount || 0), legacyReceived: Number(project.receivedAmount || 0),
    receivables: invoices.filter((row) => row.kind === "receivable").map(asInvoice), payables: invoices.filter((row) => row.kind === "payable").map(asInvoice),
    expenses: expenses.map((row) => ({ amount: Number(row.amount || 0) })), labourCost: labour,
  });
  const committed = Math.round(orders.reduce((total, order) => total + purchaseOrderTotals((order.items || []) as PoLine[], Number(order.freight || 0)).total, 0));

  // Materials: requested, ordered, received to this site, consumed and on site — kept as separate figures.
  const perMaterial = new Map<string, { requested: number; ordered: number; receivedHere: number; consumed: number; wasted: number; onSite: number }>();
  const entry = (materialId: string) => { const value = perMaterial.get(materialId) || { requested: 0, ordered: 0, receivedHere: 0, consumed: 0, wasted: 0, onSite: 0 }; perMaterial.set(materialId, value); return value; };
  for (const request of requests) for (const item of (request.items || []) as { materialId?: string; qty: number }[]) if (item.materialId) entry(item.materialId).requested += Number(item.qty || 0);
  for (const order of orders) for (const item of (order.items || []) as { materialId?: string; qty: number }[]) if (item.materialId) entry(item.materialId).ordered += Number(item.qty || 0);
  for (const move of movements) {
    const materialId = String(move.materialId); const qty = Number(move.qty || 0); const value = entry(materialId);
    if (move.to === location) { value.onSite += qty; if (move.type === "receipt" || move.type === "issue" || move.type === "transfer") value.receivedHere += qty; }
    if (move.from === location) { value.onSite -= qty; if (move.type === "consumption") value.consumed += qty; if (move.type === "wastage") value.wasted += qty; }
  }
  const materialDocs = await Material.find({ _id: { $in: Array.from(perMaterial.keys()) } }, { name: 1, unit: 1 }).lean() as Row[];
  const names = new Map(materialDocs.map((row) => [String(row._id), { name: String(row.name), unit: String(row.unit || "") }]));
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const materials = Array.from(perMaterial.entries()).map(([materialId, value]) => ({ materialId, name: names.get(materialId)?.name || "Unknown material", unit: names.get(materialId)?.unit || "", requested: round(value.requested), ordered: round(value.ordered), receivedHere: round(value.receivedHere), consumed: round(value.consumed), wasted: round(value.wasted), onSite: round(value.onSite) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return json(plain({
    project, money, committedPurchases: committed,
    counts: { estimates, documents, siteReportLast: reports[0] || null, invoices: invoices.length, expenses: expenses.length, labourDays: attendance.filter((row) => row.status === "present").length + attendance.filter((row) => row.status === "half-day").length / 2 },
    materials,
  }));
});
