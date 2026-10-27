import { Schema } from "mongoose";
import { purchaseOrderDef, purchaseOrderItemFields } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

const LineSchema = new Schema({ ...schemaFields(purchaseOrderItemFields), receivedQty: { type: Number, default: 0, min: 0 } }, { _id: true });
const ReceiptSchema = new Schema({
  at: { type: Date, required: true },
  grnNumber: { type: String, default: "", maxlength: 60 },
  note: { type: String, default: "", maxlength: 300 },
  clientRef: { type: String, required: true, maxlength: 80 },
  lines: { type: [new Schema({ index: { type: Number, required: true, min: 0 }, qty: { type: Number, required: true, min: 0 } }, { _id: false })], default: [] },
}, { _id: true });

const PurchaseOrderSchema = new Schema({
  ...schemaFields(purchaseOrderDef.fields),
  items: { type: [LineSchema], default: [] },
  number: { type: String, required: true, maxlength: 40, index: true },
  status: { type: String, enum: ["draft", "issued", "partially-received", "received", "closed", "cancelled"], default: "draft", index: true },
  issuedAt: { type: Date, default: null },
  receipts: { type: [ReceiptSchema], default: [] },
  total: { type: Number, default: 0 },
}, { timestamps: true, minimize: false });
PurchaseOrderSchema.index({ supplierContactId: 1 });
PurchaseOrderSchema.index({ projectId: 1 });

export const PurchaseOrder = getModel<Record<string, unknown>>("PurchaseOrder", PurchaseOrderSchema);
