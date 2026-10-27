import { adminHandler, json, plain, todayKey } from "@/modules/civil-at-hand/lib/api-helpers";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { invoiceTotals, paidAmount, projectMoney, type InvoiceLike } from "@/modules/civil-at-hand/lib/finance";
import { deliveryStatuses } from "@/modules/civil-at-hand/lib/projects";
import { getSettings } from "@/modules/civil-at-hand/lib/server-settings";
import { stockBalanceRows } from "@/modules/civil-at-hand/lib/stock-server";
import { dayRate } from "@/modules/civil-at-hand/lib/workforce";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";
import { AuditLog } from "@/modules/civil-at-hand/models/AuditLog";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Expense } from "@/modules/civil-at-hand/models/Expense";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";
import { Material } from "@/modules/civil-at-hand/models/Material";
import { MaterialRequest } from "@/modules/civil-at-hand/models/MaterialRequest";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { ProjectDocument } from "@/modules/civil-at-hand/models/ProjectDocument";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { SiteReport } from "@/modules/civil-at-hand/models/SiteReport";
import { Tender } from "@/modules/civil-at-hand/models/Tender";
import { Worker } from "@/modules/civil-at-hand/models/Worker";
import { WorkerTxn } from "@/modules/civil-at-hand/models/WorkerTxn";

export const runtime = "nodejs";
export const maxDuration = 30;

type Row = Record<string, unknown> & { _id: unknown };
const id = (row: Row) => String(row._id);
const day = (value: unknown) => (value ? new Date(String(value)).toISOString().slice(0, 10) : "");

function periodStart(range: string, today: string): string {
  const [y, m] = today.split("-").map(Number);
  if (range === "30d") return new Date(Date.parse(`${today}T00:00:00Z`) - 29 * 86_400_000).toISOString().slice(0, 10);
  if (range === "fy") return `${m >= 4 ? y : y - 1}-04-01`; // Indian financial year starts 1 April
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/**
 * Owner command-centre figures, all computed from stored records. Each list is short and links back to the
 * module that holds the full records. Nothing here is estimated or invented.
 */
export const GET = adminHandler("Overview error", async (request: Request) => {
  await dbConnect();
  const settings = await getSettings();
  const today = todayKey(settings.timezone);
  const url = new URL(request.url);
  const range = ["month", "30d", "fy"].includes(url.searchParams.get("range") || "") ? String(url.searchParams.get("range")) : "month";
  const from = periodStart(range, today);
  const warnUntil = new Date(Date.parse(`${today}T00:00:00Z`) + settings.documentExpiryWarningDays * 86_400_000);
  const soon = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86_400_000);

  const [projects, invoices, expenses, estimates, requests, materials, documents, tenders, reportsWaiting, workers, attendanceToday, labourRows, workerTxns, openOrders, activity] = await Promise.all([
    Project.find({}, { title: 1, status: 1, budget: 1, estimatedValue: 1, billedAmount: 1, receivedAmount: 1, endDate: 1, progressPercent: 1, clientName: 1 }).limit(3000).lean() as Promise<Row[]>,
    Invoice.find({ state: { $ne: "void" } }, { kind: 1, state: 1, number: 1, partyName: 1, projectId: 1, items: 1, retentionAmount: 1, payments: 1, dueDate: 1, date: 1, total: 1 }).limit(5000).lean() as Promise<Row[]>,
    Expense.find({}, { amount: 1, projectId: 1, date: 1 }).limit(20000).lean() as Promise<Row[]>,
    Estimate.find({ status: { $in: ["draft", "sent"] } }, { number: 1, version: 1, title: 1, clientName: 1, status: 1, totals: 1, sentAt: 1, validUntil: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(200).lean() as Promise<Row[]>,
    MaterialRequest.find({ status: { $in: ["requested", "approved"] } }, { number: 1, projectId: 1, status: 1, neededBy: 1, items: 1 }).sort({ neededBy: 1 }).limit(200).lean() as Promise<Row[]>,
    settings.lowStockAlerts ? Material.find({ archived: { $ne: true }, minStock: { $gt: 0 } }, { name: 1, unit: 1, minStock: 1 }).limit(3000).lean() as Promise<Row[]> : Promise.resolve([] as Row[]),
    ProjectDocument.find({ archived: { $ne: true }, $or: [{ expiryDate: { $ne: null, $lte: warnUntil } }, { approvalStatus: "pending" }] }, { title: 1, category: 1, expiryDate: 1, approvalStatus: 1, projectId: 1 }).sort({ expiryDate: 1 }).limit(100).lean() as Promise<Row[]>,
    Tender.find({ status: { $in: ["identified", "preparing"] }, submissionDeadline: { $ne: null, $lte: soon } }, { title: 1, authority: 1, submissionDeadline: 1, status: 1, decision: 1 }).sort({ submissionDeadline: 1 }).limit(50).lean() as Promise<Row[]>,
    SiteReport.countDocuments({ status: "submitted" }),
    Worker.find({ status: "active" }, { name: 1, wageType: 1, dailyWage: 1, monthlySalary: 1, otRate: 1, safetyTrainingExpiry: 1 }).limit(5000).lean() as Promise<Row[]>,
    Attendance.countDocuments({ date: today, status: { $in: ["present", "half-day"] } }),
    Attendance.aggregate([
      { $match: { projectId: { $ne: "" } } },
      { $group: { _id: { projectId: "$projectId", workerId: "$workerId" }, days: { $sum: { $switch: { branches: [{ case: { $eq: ["$status", "present"] }, then: 1 }, { case: { $eq: ["$status", "half-day"] }, then: 0.5 }], default: 0 } } }, ot: { $sum: "$otHours" } } },
    ]) as Promise<{ _id: { projectId: string; workerId: string }; days: number; ot: number }[]>,
    WorkerTxn.find({ date: { $gte: new Date(`${from}T00:00:00Z`) }, type: { $in: ["payment", "advance"] } }, { amount: 1 }).limit(20000).lean() as Promise<Row[]>,
    PurchaseOrder.countDocuments({ status: { $in: ["issued", "partially-received"] } }),
    AuditLog.find({ action: { $not: /^(login|login-failed|workspace-ai-used)$/ } }, { action: 1, detail: 1, at: 1 }).sort({ at: -1 }).limit(12).lean() as Promise<Row[]>,
  ]);

  /* ---------- labour cost per project (all workers, including inactive, for accurate history) */
  const allWorkers = await Worker.find({}, { wageType: 1, dailyWage: 1, monthlySalary: 1, otRate: 1 }).limit(10000).lean() as Row[];
  const workerById = new Map(allWorkers.map((worker) => [id(worker), worker]));
  const labourByProject = new Map<string, number>();
  for (const row of labourRows) {
    const worker = workerById.get(row._id.workerId);
    if (!worker) continue;
    const cost = row.days * dayRate({ _id: id(worker), name: "", wageType: String(worker.wageType || "daily"), dailyWage: Number(worker.dailyWage || 0), monthlySalary: Number(worker.monthlySalary || 0) }) + row.ot * Number(worker.otRate || 0);
    labourByProject.set(row._id.projectId, (labourByProject.get(row._id.projectId) || 0) + cost);
  }

  /* ---------- receivables and payables */
  const asInvoice = (row: Row) => row as unknown as InvoiceLike & Row;
  const receivables = invoices.filter((row) => row.kind === "receivable").map(asInvoice);
  const payables = invoices.filter((row) => row.kind === "payable").map(asInvoice);
  const balanceOf = (row: InvoiceLike) => Math.max(0, invoiceTotals(row.items || [], Number(row.retentionAmount || 0)).total - paidAmount(row.payments));
  const openReceivables = receivables.filter((row) => row.state === "issued" && balanceOf(row) > 0.5);
  const openPayables = payables.filter((row) => row.state === "issued" && balanceOf(row) > 0.5);
  const sum = (rows: InvoiceLike[]) => Math.round(rows.reduce((total, row) => total + balanceOf(row), 0));
  const overdueReceivables = openReceivables.filter((row) => row.dueDate && day(row.dueDate) < today);
  const payablesDueSoon = openPayables.filter((row) => !row.dueDate || day(row.dueDate) <= day(soon));
  const projectsWithInvoices = new Set(receivables.map((row) => String(row.projectId || "")).filter(Boolean));
  const legacyOutstanding = Math.round(projects.filter((project) => !projectsWithInvoices.has(id(project))).reduce((total, project) => total + Math.max(0, Number(project.billedAmount || 0) - Number(project.receivedAmount || 0)), 0));

  const inPeriod = (value: unknown) => { const key = day(value); return key >= from && key <= today; };
  const received = Math.round(receivables.reduce((total, row) => total + (row.payments || []).filter((payment) => inPeriod(payment.date)).reduce((acc, payment) => acc + Number(payment.amount || 0), 0), 0));
  const paidBills = Math.round(payables.reduce((total, row) => total + (row.payments || []).filter((payment) => inPeriod(payment.date)).reduce((acc, payment) => acc + Number(payment.amount || 0), 0), 0));
  const periodExpenses = Math.round(expenses.filter((row) => inPeriod(row.date)).reduce((total, row) => total + Number(row.amount || 0), 0));
  const periodWages = Math.round(workerTxns.reduce((total, row) => total + Number(row.amount || 0), 0));

  /* ---------- project budgets */
  const active = projects.filter((project) => deliveryStatuses.includes(String(project.status)));
  const budgetRows = active.map((project) => {
    const pid = id(project);
    const money = projectMoney({
      budget: Number(project.budget || 0), estimatedValue: Number(project.estimatedValue || 0), legacyBilled: Number(project.billedAmount || 0), legacyReceived: Number(project.receivedAmount || 0),
      receivables: receivables.filter((row) => row.projectId === pid), payables: payables.filter((row) => row.projectId === pid),
      expenses: expenses.filter((row) => row.projectId === pid).map((row) => ({ amount: Number(row.amount || 0) })), labourCost: labourByProject.get(pid) || 0,
    });
    return { _id: pid, title: project.title, status: project.status, progressPercent: project.progressPercent ?? null, endDate: project.endDate || null, budget: money.budget, actualCost: money.actualCost, budgetUsedPct: money.budgetUsedPct, overBudget: money.overBudget, toCollect: money.toCollect };
  }).sort((a, b) => Number(b.overBudget) - Number(a.overBudget) || (b.budgetUsedPct || 0) - (a.budgetUsedPct || 0));

  /* ---------- stock */
  let lowStock: { _id: string; name: string; unit: string; minStock: number; onHand: number }[] = [];
  if (materials.length) {
    const balances = await stockBalanceRows(materials.map(id));
    lowStock = materials.map((material) => ({ _id: id(material), name: String(material.name), unit: String(material.unit || ""), minStock: Number(material.minStock || 0), onHand: Math.round(balances.filter((row) => row.materialId === id(material)).reduce((total, row) => total + row.qty, 0) * 1000) / 1000 }))
      .filter((row) => row.onHand < row.minStock).sort((a, b) => a.onHand / a.minStock - b.onHand / b.minStock);
  }

  const expiringWorkers = workers.filter((worker) => worker.safetyTrainingExpiry && new Date(String(worker.safetyTrainingExpiry)) <= warnUntil)
    .map((worker) => ({ _id: id(worker), name: worker.name, expiry: worker.safetyTrainingExpiry }));

  return json(plain({
    today, range, from, currency: settings.currency,
    projects: { total: projects.length, active: active.length, byStatus: projects.reduce<Record<string, number>>((acc, project) => { acc[String(project.status)] = (acc[String(project.status)] || 0) + 1; return acc; }, {}), budgets: budgetRows.slice(0, 6), overBudget: budgetRows.filter((row) => row.overBudget).length },
    quotations: { awaitingDecision: estimates.filter((row) => row.status === "sent").length, drafts: estimates.filter((row) => row.status === "draft").length, sentValue: Math.round(estimates.filter((row) => row.status === "sent").reduce((total, row) => total + Number((row.totals as { total?: number } | undefined)?.total || 0), 0)), list: estimates.filter((row) => row.status === "sent").slice(0, 5) },
    receivables: { outstanding: sum(openReceivables), overdue: sum(overdueReceivables), overdueCount: overdueReceivables.length, openCount: openReceivables.length, legacyOutstanding, list: overdueReceivables.sort((a, b) => day(a.dueDate).localeCompare(day(b.dueDate))).slice(0, 5).map((row) => ({ _id: id(row), number: row.number, partyName: row.partyName, dueDate: row.dueDate, balance: Math.round(balanceOf(row)) })) },
    payables: { outstanding: sum(openPayables), dueSoon: sum(payablesDueSoon), dueSoonCount: payablesDueSoon.length, overdueCount: openPayables.filter((row) => row.dueDate && day(row.dueDate) < today).length, list: payablesDueSoon.sort((a, b) => day(a.dueDate).localeCompare(day(b.dueDate))).slice(0, 5).map((row) => ({ _id: id(row), number: row.number, partyName: row.partyName, dueDate: row.dueDate, balance: Math.round(balanceOf(row)) })) },
    cash: { received, paidOut: paidBills + periodExpenses + periodWages, paidBills, expenses: periodExpenses, wages: periodWages },
    procurement: { pendingApproval: requests.filter((row) => row.status === "requested").length, toOrder: requests.filter((row) => row.status === "approved").length, openOrders, requests: requests.slice(0, 5), lowStock: lowStock.slice(0, 8), lowStockCount: lowStock.length, lowStockAlerts: settings.lowStockAlerts },
    documents: { attention: documents.slice(0, 8), expiredCount: documents.filter((row) => row.expiryDate && day(row.expiryDate) < today).length, pendingApproval: documents.filter((row) => row.approvalStatus === "pending").length, expiringWorkers: expiringWorkers.slice(0, 5) },
    tenders: { dueSoon: tenders },
    site: { reportsAwaitingReview: reportsWaiting, activeWorkers: workers.length, presentToday: attendanceToday },
    activity,
  }));
});
