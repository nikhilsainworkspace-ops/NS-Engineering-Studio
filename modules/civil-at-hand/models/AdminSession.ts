import mongoose, { Schema, type Model } from "mongoose";
import type { SessionDoc } from "@/modules/civil-at-hand/lib/types";

// One row per signed-in browser. Only a hash of the session id is stored, so a database leak cannot be used to sign in.
const AdminSessionSchema = new Schema({
  sidHash: { type: String, required: true, unique: true },
  ip: { type: String, default: "" },
  agent: { type: String, default: "" },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminSession = (mongoose.models.AdminSession || mongoose.model("AdminSession", AdminSessionSchema)) as unknown as Model<SessionDoc>;
