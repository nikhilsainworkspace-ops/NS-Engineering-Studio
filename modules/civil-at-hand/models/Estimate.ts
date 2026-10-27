import { Schema } from "mongoose";
import { estimateDef } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

/** One document per version. Versions of the same quotation share `groupId`; sent/decided versions are never edited. */
const EstimateSchema = new Schema({
  ...schemaFields(estimateDef.fields),
  number: { type: String, required: true, maxlength: 40, index: true },
  groupId: { type: String, required: true, index: true },
  version: { type: Number, required: true, min: 1, default: 1 },
  status: { type: String, enum: ["draft", "sent", "approved", "rejected", "cancelled"], default: "draft", index: true },
  sentAt: { type: Date, default: null },
  decidedAt: { type: Date, default: null },
  decisionNote: { type: String, maxlength: 1000, default: "" },
  convertedProjectId: { type: String, default: "" },
  // Cached results of lib/estimates.ts computeEstimate(), refreshed on every save for lists and dashboards.
  totals: { directCost: { type: Number, default: 0 }, subtotal: { type: Number, default: 0 }, tax: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
}, { timestamps: true, minimize: false });
EstimateSchema.index({ groupId: 1, version: 1 }, { unique: true });
EstimateSchema.index({ projectId: 1, updatedAt: -1 });

export const Estimate = getModel<Record<string, unknown>>("Estimate", EstimateSchema);
