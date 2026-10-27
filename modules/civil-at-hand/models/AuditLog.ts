import mongoose, { Schema, type Model } from "mongoose";
import type { AuditDoc } from "@/modules/civil-at-hand/lib/types";

const AuditLogSchema = new Schema({
  at: { type: Date, default: Date.now, index: true },
  action: { type: String, required: true, maxlength: 60 },
  detail: { type: String, default: "", maxlength: 300 },
  ip: { type: String, default: "" },
  agent: { type: String, default: "" },
});
AuditLogSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const AuditLog = (mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema)) as unknown as Model<AuditDoc>;
