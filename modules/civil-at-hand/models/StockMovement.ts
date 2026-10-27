import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

/** Immutable stock ledger entry. Corrections are made with a reversing entry, never by editing. */
const StockMovementSchema = new Schema({
  materialId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ["receipt", "issue", "transfer", "consumption", "wastage", "return-to-store", "return-to-supplier", "adjustment-in", "adjustment-out"] },
  from: { type: String, required: true, maxlength: 40 },
  to: { type: String, required: true, maxlength: 40 },
  qty: { type: Number, required: true, min: 0.000001 },
  rate: { type: Number, default: null, min: 0 },
  date: { type: Date, required: true, index: true },
  refKind: { type: String, default: "", maxlength: 30 },
  refId: { type: String, default: "", maxlength: 24 },
  refLabel: { type: String, default: "", maxlength: 80 },
  note: { type: String, default: "", maxlength: 300 },
  // Client-generated key that makes a double-clicked submit (or a retried receipt) a no-op.
  clientRef: { type: String, maxlength: 80 },
  reversalOfId: { type: String, default: "" },
  reversedById: { type: String, default: "" },
}, { timestamps: true, minimize: false });
StockMovementSchema.index({ clientRef: 1 }, { unique: true, sparse: true });
StockMovementSchema.index({ materialId: 1, date: -1 });
StockMovementSchema.index({ from: 1 });
StockMovementSchema.index({ to: 1 });

export const StockMovement = getModel<Record<string, unknown>>("StockMovement", StockMovementSchema);
