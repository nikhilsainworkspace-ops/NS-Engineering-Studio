import { adminHandler, ConflictError, json, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { cleanString, normalizeRecord } from "@/modules/civil-at-hand/lib/entity-spec";
import { paymentFields } from "@/modules/civil-at-hand/lib/entities";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { checkNewPayment, paidAmount, type PaymentEntry } from "@/modules/civil-at-hand/lib/finance";
import { invoiceRoutes } from "@/modules/civil-at-hand/lib/routes/invoices";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Records money received (client invoice) or paid (supplier bill). Never more than the balance due. */
export const POST = adminHandler("Payment record error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  const clientRef = cleanString(body.clientRef, 80);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(clientRef)) throw new InputError("Refresh the page and try again (missing request reference).");
  const payment = normalizeRecord(paymentFields, body);
  const existing = await invoiceRoutes.item.load(id);
  const payments = (existing.payments || []) as (PaymentEntry & { clientRef?: string })[];
  if (payments.some((item) => item.clientRef === clientRef)) return json({ item: plain(existing), duplicate: true });
  if (existing.state !== "issued") throw new ConflictError(existing.state === "void" ? "This document is void." : "Issue this draft before recording payments.");
  const problem = checkNewPayment(Number(existing.total || 0), payments, Number(payment.amount));
  if (problem) throw new InputError(problem);
  const nextPaid = paidAmount([...payments, payment as unknown as PaymentEntry]);
  const updated = await Invoice.findOneAndUpdate(
    { _id: id, state: "issued", paid: existing.paid, "payments.clientRef": { $ne: clientRef } },
    { $push: { payments: { ...payment, clientRef, recordedAt: new Date() } }, $set: { paid: nextPaid } },
    { new: true },
  ).lean();
  if (!updated) throw new ConflictError("Another payment was recorded a moment ago. Refresh and check the balance before trying again.");
  await audit(request, existing.kind === "payable" ? "bill-payment-recorded" : "invoice-payment-recorded", `${existing.number}: ${payment.amount}`);
  return json({ item: plain(updated) }, 201);
});
