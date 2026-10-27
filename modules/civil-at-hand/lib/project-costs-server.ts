import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { projectMoney, type InvoiceLike } from "@/modules/civil-at-hand/lib/finance";
import { dayRate } from "@/modules/civil-at-hand/lib/workforce";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";
import { Expense } from "@/modules/civil-at-hand/models/Expense";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { Worker } from "@/modules/civil-at-hand/models/Worker";

type Row = Record<string, unknown> & { _id: unknown };

/** Money summary for every project, computed in one pass (see lib/finance.ts projectMoney for the rules). */
export async function projectCostRows() {
  await dbConnect();
  const [projects, invoices, expenses, labourRows, workers, orders] = await Promise.all([
    Project.find({}, { title: 1, status: 1, budget: 1, estimatedValue: 1, billedAmount: 1, receivedAmount: 1, clientName: 1 }).limit(3000).lean() as Promise<Row[]>,
    Invoice.find({ state: { $ne: "void" }, projectId: { $nin: ["", null] } }, { kind: 1, state: 1, projectId: 1, items: 1, retentionAmount: 1, payments: 1 }).limit(20000).lean() as Promise<Row[]>,
    Expense.aggregate([{ $match: { projectId: { $nin: ["", null] } } }, { $group: { _id: "$projectId", amount: { $sum: "$amount" } } }]) as Promise<{ _id: string; amount: number }[]>,
    Attendance.aggregate([
      { $match: { projectId: { $ne: "" } } },
      { $group: { _id: { projectId: "$projectId", workerId: "$workerId" }, days: { $sum: { $switch: { branches: [{ case: { $eq: ["$status", "present"] }, then: 1 }, { case: { $eq: ["$status", "half-day"] }, then: 0.5 }], default: 0 } } }, ot: { $sum: "$otHours" } } },
    ]) as Promise<{ _id: { projectId: string; workerId: string }; days: number; ot: number }[]>,
    Worker.find({}, { wageType: 1, dailyWage: 1, monthlySalary: 1, otRate: 1 }).limit(10000).lean() as Promise<Row[]>,
    PurchaseOrder.aggregate([{ $match: { status: { $nin: ["cancelled", "draft"] }, projectId: { $nin: ["", null] } } }, { $group: { _id: "$projectId", total: { $sum: "$total" } } }]) as Promise<{ _id: string; total: number }[]>,
  ]);
  const workerById = new Map(workers.map((worker) => [String(worker._id), worker]));
  const labour = new Map<string, number>();
  for (const row of labourRows) {
    const worker = workerById.get(row._id.workerId);
    if (!worker) continue;
    const cost = row.days * dayRate({ _id: "", name: "", wageType: String(worker.wageType || "daily"), dailyWage: Number(worker.dailyWage || 0), monthlySalary: Number(worker.monthlySalary || 0) }) + row.ot * Number(worker.otRate || 0);
    labour.set(row._id.projectId, (labour.get(row._id.projectId) || 0) + cost);
  }
  const expenseBy = new Map(expenses.map((row) => [row._id, row.amount]));
  const committedBy = new Map(orders.map((row) => [row._id, row.total]));
  return projects.map((project) => {
    const id = String(project._id);
    const own = invoices.filter((row) => row.projectId === id) as unknown as (InvoiceLike & Row)[];
    const money = projectMoney({
      budget: Number(project.budget || 0), estimatedValue: Number(project.estimatedValue || 0), legacyBilled: Number(project.billedAmount || 0), legacyReceived: Number(project.receivedAmount || 0),
      receivables: own.filter((row) => row.kind === "receivable"), payables: own.filter((row) => row.kind === "payable"),
      expenses: [{ amount: expenseBy.get(id) || 0 }], labourCost: labour.get(id) || 0,
    });
    return { _id: id, title: String(project.title), status: String(project.status), clientName: String(project.clientName || ""), committedPurchases: Math.round(committedBy.get(id) || 0), ...money };
  });
}
