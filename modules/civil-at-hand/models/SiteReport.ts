import { Schema } from "mongoose";
import { siteReportDef } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

const SiteReportSchema = new Schema({
  ...schemaFields(siteReportDef.fields),
  reviewedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });
SiteReportSchema.index({ projectId: 1, date: -1 });
SiteReportSchema.index({ status: 1, date: -1 });

export const SiteReport = getModel<Record<string, unknown>>("SiteReport", SiteReportSchema);
