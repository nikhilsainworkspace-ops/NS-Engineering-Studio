// Invoice, bill, payment and project-cost arithmetic. Pure functions covered by tests/erp.test.ts.
import { round2 } from "@/modules/civil-at-hand/lib/entity-spec";

export type InvoiceLine = { description: string; unit?: string; qty: number | null; rate: number | null; taxPct?: number | null };
export type PaymentEntry = { _id?: string; date: string | Date; amount: number; mode?: string; reference?: string; note?: string };
export type InvoiceLike = {
  kind: "receivable" | "payable"; state: "draft" | "issued" | "void"; items: InvoiceLine[]; retentionAmount?: number | null;
  payments?: PaymentEntry[]; dueDate?: string | Date | null; date?: string | Date | null; projectId?: string; total?: number;
};

const n = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export function invoiceTotals(items: InvoiceLine[], retentionAmount = 0) {
  let subtotal = 0; let tax = 0;
  const lines = items.map((line) => {
    const amount = round2(n(line.qty) * n(line.rate));
    const lineTax = round2(amount * n(line.taxPct) / 100);
    subtotal += amount; tax += lineTax;
    return { ...line, amount, tax: lineTax };
  });
  subtotal = round2(subtotal); tax = round2(tax);
  const gross = round2(subtotal + tax);
  const retention = round2(Math.min(Math.max(0, n(retentionAmount)), gross));
  // The amount actually expected to change hands now. Retention is held back and tracked separately.
  return { lines, subtotal, tax, gross, retention, total: round2(gross - retention) };
}

export function paidAmount(payments: PaymentEntry[] = []): number {
  return round2(payments.reduce((sum, payment) => sum + n(payment.amount), 0));
}

/** Tolerance for rupee rounding differences when deciding whether a document is fully paid. */
export const PAYMENT_TOLERANCE = 0.5;

export type PaymentStatus = "draft" | "void" | "unpaid" | "partially-paid" | "paid" | "overdue";

function dayKey(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Status is always derived from recorded payments, never typed by hand. */
export function paymentStatus(invoice: Pick<InvoiceLike, "state" | "items" | "retentionAmount" | "payments" | "dueDate">, today: string): PaymentStatus {
  if (invoice.state === "void") return "void";
  if (invoice.state === "draft") return "draft";
  const { total } = invoiceTotals(invoice.items || [], n(invoice.retentionAmount));
  const paid = paidAmount(invoice.payments);
  if (total > 0 && paid >= total - PAYMENT_TOLERANCE) return "paid";
  if (total <= 0) return "paid";
  if (invoice.dueDate && dayKey(invoice.dueDate) < today) return "overdue";
  return paid > 0 ? "partially-paid" : "unpaid";
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  draft: "Draft", void: "Void", unpaid: "Unpaid", "partially-paid": "Part paid", paid: "Paid", overdue: "Overdue",
};

/** Throws a readable message if a new payment would exceed the balance. */
export function checkNewPayment(total: number, existing: PaymentEntry[], amount: number): string | null {
  if (!(amount > 0)) return "Enter a payment amount greater than zero.";
  const balance = round2(total - paidAmount(existing));
  if (balance <= 0) return "This document is already fully paid.";
  if (amount > balance + PAYMENT_TOLERANCE) return `This payment is more than the balance due (${balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Record only what was actually received or paid.`;
  return null;
}

export function balanceDue(invoice: Pick<InvoiceLike, "state" | "items" | "retentionAmount" | "payments">): number {
  if (invoice.state !== "issued") return 0;
  const { total } = invoiceTotals(invoice.items || [], n(invoice.retentionAmount));
  return round2(Math.max(0, total - paidAmount(invoice.payments)));
}

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";
export function agingBucket(dueDate: string | Date | null | undefined, today: string): AgingBucket {
  if (!dueDate) return "current";
  const due = Date.parse(`${dayKey(dueDate)}T00:00:00Z`); const now = Date.parse(`${today}T00:00:00Z`);
  const days = Math.floor((now - due) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

/* ------------------------------------------------------------------ project cost summary */
export type ProjectMoneyInput = {
  budget?: number | null; estimatedValue?: number | null;
  legacyBilled?: number | null; legacyReceived?: number | null;
  receivables: InvoiceLike[]; payables: InvoiceLike[];
  expenses: { amount: number }[]; labourCost: number;
};

/**
 * Brings every money source for one project together without counting anything twice:
 * - Revenue comes from issued client invoices. Only if a project has no client invoices does it fall
 *   back to the older "billed / received" numbers typed on the project record.
 * - Cost = issued supplier/subcontractor bills + recorded expenses + labour earned from attendance.
 *   Purchase orders are commitments, not costs, so they are never added here.
 */
export function projectMoney(input: ProjectMoneyInput) {
  const issuedReceivables = input.receivables.filter((item) => item.state === "issued");
  const issuedPayables = input.payables.filter((item) => item.state === "issued");
  const usesInvoices = input.receivables.some((item) => item.state !== "void");
  const billed = usesInvoices ? round2(issuedReceivables.reduce((sum, item) => sum + invoiceTotals(item.items, n(item.retentionAmount)).total, 0)) : round2(n(input.legacyBilled));
  const received = usesInvoices ? round2(issuedReceivables.reduce((sum, item) => sum + paidAmount(item.payments), 0)) : round2(n(input.legacyReceived));
  const billsCost = round2(issuedPayables.reduce((sum, item) => sum + invoiceTotals(item.items, n(item.retentionAmount)).gross, 0));
  const billsPaid = round2(issuedPayables.reduce((sum, item) => sum + paidAmount(item.payments), 0));
  const expenseCost = round2(input.expenses.reduce((sum, item) => sum + n(item.amount), 0));
  const labourCost = round2(n(input.labourCost));
  const actualCost = round2(billsCost + expenseCost + labourCost);
  const budget = n(input.budget);
  return {
    revenueSource: usesInvoices ? "invoices" as const : "project-record" as const,
    billed, received, toCollect: round2(Math.max(0, billed - received)),
    billsCost, billsPaid, billsDue: round2(Math.max(0, issuedPayables.reduce((sum, item) => sum + balanceDue(item), 0))),
    expenseCost, labourCost, actualCost,
    budget, budgetUsedPct: budget > 0 ? Math.round(actualCost / budget * 1000) / 10 : null,
    overBudget: budget > 0 && actualCost > budget,
    contractValue: n(input.estimatedValue),
    marginOnBilled: round2(billed - actualCost),
  };
}
