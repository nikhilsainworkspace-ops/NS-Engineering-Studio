import mongoose from "mongoose";
import { adminHandler, ConflictError, json, NotFoundError, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { paidAmount, type PaymentEntry } from "@/modules/civil-at-hand/lib/finance";
import { invoiceRoutes } from "@/modules/civil-at-hand/lib/routes/invoices";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; paymentId: string }> };

/** Removes a payment that was recorded by mistake. The removal is written to the activity log. */
export const DELETE = adminHandler("Payment removal error", async (request: Request, context: Context) => {
  const { id, paymentId } = await context.params;
  if (!mongoose.isValidObjectId(paymentId)) throw new InputError("Invalid payment.");
  const existing = await invoiceRoutes.item.load(id);
  if (existing.state === "void") throw new ConflictError("This document is void.");
  const payments = (existing.payments || []) as (PaymentEntry & { _id: unknown })[];
  const target = payments.find((item) => String(item._id) === paymentId);
  if (!target) throw new NotFoundError("Payment not found.");
  const nextPaid = paidAmount(payments.filter((item) => String(item._id) !== paymentId));
  const updated = await Invoice.findOneAndUpdate({ _id: id, paid: existing.paid }, { $pull: { payments: { _id: new mongoose.Types.ObjectId(paymentId) } }, $set: { paid: nextPaid } }, { new: true }).lean();
  if (!updated) throw new ConflictError("Payments changed a moment ago. Refresh and try again.");
  await audit(request, "payment-removed", `${existing.number}: ${target.amount}`);
  return json({ item: plain(updated) });
});
