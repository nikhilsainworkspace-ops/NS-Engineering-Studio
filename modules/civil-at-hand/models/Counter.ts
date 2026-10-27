import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

/** Atomic document-number sequences, e.g. "quotation-2026" → 14. */
const CounterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false });
export const Counter = getModel<{ _id: string; seq: number }>("Counter", CounterSchema);
