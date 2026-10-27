import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

/** Images uploaded for public pages. Served publicly only while a published page uses them. */
const PageImageSchema = new Schema({
  filename: { type: String, required: true, maxlength: 180 },
  alt: { type: String, default: "", maxlength: 200 },
  mimeType: { type: String, required: true, enum: ["image/jpeg", "image/png", "image/webp"] },
  size: { type: Number, required: true, min: 1, max: 2_097_152 },
  data: { type: Buffer, required: true, select: false },
}, { timestamps: true, minimize: false });

export const PageImage = getModel<Record<string, unknown>>("PageImage", PageImageSchema);
