import { Schema } from "mongoose";
import { invoiceDef, paymentFields } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

/** Client invoices (kind "receivable") and supplier/subcontractor bills (kind "payable"). */
const PaymentSchema = new Schema({ ...schemaFields(paymentFields), clientRef: { type: String, maxlength: 80, default: "" }, recordedAt: { type: Date, default: Date.now } }, { _id: true });
const InvoiceSchema = new Schema({
  ...schemaFields(invoiceDef.fields),
  number: { type: String, required: true, maxlength: 40, index: true },
  state: { type: String, enum: ["draft", "issued", "void"], default: "issued", index: true },
  payments: { type: [PaymentSchema], default: [] },
  // Cached totals (recomputed from lines and payments on every write) used for lists and dashboards.
  total: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  voidReason: { type: String, maxlength: 300, default: "" },
}, { timestamps: true, minimize: false });
InvoiceSchema.index({ kind: 1, state: 1, dueDate: 1 });
InvoiceSchema.index({ projectId: 1 });
InvoiceSchema.index({ purchaseOrderId: 1 });

export const Invoice = getModel<Record<string, unknown>>("Invoice", InvoiceSchema);
