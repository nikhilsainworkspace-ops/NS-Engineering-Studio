import mongoose, { Schema, type Model } from "mongoose";
import type { ShareLinkDoc } from "@/modules/civil-at-hand/lib/types";

const ShareLinkSchema = new Schema({
  token: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, required: true, index: true },
  active: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, default: null },
  submissions: { type: Number, default: 0 },
}, { timestamps: true });

export const ShareLink = (mongoose.models.ShareLink || mongoose.model("ShareLink", ShareLinkSchema)) as unknown as Model<ShareLinkDoc>;
