// Attendance-based wage calculations. Pure functions covered by tests/erp.test.ts.
//
// Formula shown on the wage sheet:
//   paid days     = present days + 0.5 × half days            (absent and leave days are unpaid)
//   basic wages   = paid days × daily wage                     (daily-wage workers)
//                 = monthly salary ÷ 30 × paid days            (monthly-salary workers)
//   overtime      = overtime hours × overtime rate
//   earned        = basic wages + overtime + bonuses
//   net payable   = earned − advances − deductions
//   balance       = net payable − wage payments already made
import { round2 } from "@/modules/civil-at-hand/lib/entity-spec";

export type WorkerLite = { _id: string; name: string; trade?: string; wageType?: string; dailyWage?: number | null; monthlySalary?: number | null; otRate?: number | null; status?: string; projectId?: string; labourSupplierId?: string };
export type AttendanceLite = { workerId: string; projectId?: string; date: string; status: string; otHours?: number | null };
export type WorkerTxnLite = { workerId: string; date: string | Date; type: string; amount: number; projectId?: string };

const n = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const day = (value: string | Date) => (typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10));
const inRange = (value: string | Date, from: string, to: string) => { const key = day(value); return key >= from && key <= to; };

export function paidDayValue(status: string): number {
  if (status === "present") return 1;
  if (status === "half-day") return 0.5;
  return 0;
}

export function dayRate(worker: WorkerLite): number {
  return worker.wageType === "monthly" ? round2(n(worker.monthlySalary) / 30) : n(worker.dailyWage);
}

export type WageRow = {
  workerId: string; name: string; trade: string; presentDays: number; halfDays: number; absentDays: number; paidDays: number; otHours: number;
  dayRate: number; basic: number; overtime: number; bonus: number; earned: number; advances: number; deductions: number; netPayable: number; paid: number; balance: number;
};

export function wageSheet(workers: WorkerLite[], attendance: AttendanceLite[], txns: WorkerTxnLite[], from: string, to: string, projectId = ""): WageRow[] {
  const rows: WageRow[] = [];
  for (const worker of workers) {
    const marks = attendance.filter((entry) => entry.workerId === worker._id && inRange(entry.date, from, to) && (!projectId || entry.projectId === projectId));
    const entries = txns.filter((entry) => entry.workerId === worker._id && inRange(entry.date, from, to) && (!projectId || !entry.projectId || entry.projectId === projectId));
    if (!marks.length && !entries.length) continue;
    const presentDays = marks.filter((entry) => entry.status === "present").length;
    const halfDays = marks.filter((entry) => entry.status === "half-day").length;
    const absentDays = marks.filter((entry) => entry.status === "absent" || entry.status === "leave").length;
    const paidDays = marks.reduce((sum, entry) => sum + paidDayValue(entry.status), 0);
    const otHours = round2(marks.reduce((sum, entry) => sum + n(entry.otHours), 0));
    const rate = dayRate(worker);
    const basic = round2(paidDays * rate);
    const overtime = round2(otHours * n(worker.otRate));
    const sumOf = (type: string) => round2(entries.filter((entry) => entry.type === type).reduce((sum, entry) => sum + n(entry.amount), 0));
    const bonus = sumOf("bonus"); const advances = sumOf("advance"); const deductions = sumOf("deduction"); const paid = sumOf("payment");
    const earned = round2(basic + overtime + bonus);
    const netPayable = round2(earned - advances - deductions);
    rows.push({ workerId: worker._id, name: worker.name, trade: worker.trade || "", presentDays, halfDays, absentDays, paidDays, otHours, dayRate: rate, basic, overtime, bonus, earned, advances, deductions, netPayable, paid, balance: round2(netPayable - paid) });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** Labour cost earned on each project from attendance (basic + overtime; bonuses are not project-specific). */
export function labourCostByProject(workers: WorkerLite[], attendance: AttendanceLite[]): Map<string, number> {
  const byId = new Map(workers.map((worker) => [worker._id, worker]));
  const totals = new Map<string, number>();
  for (const entry of attendance) {
    if (!entry.projectId) continue;
    const worker = byId.get(entry.workerId);
    if (!worker) continue;
    const cost = paidDayValue(entry.status) * dayRate(worker) + n(entry.otHours) * n(worker.otRate);
    totals.set(entry.projectId, round2((totals.get(entry.projectId) || 0) + cost));
  }
  return totals;
}

export const isDayKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
