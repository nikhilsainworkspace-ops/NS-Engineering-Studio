import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

/** One uploaded version of a document. Bytes are stored in MongoDB and only served to the signed-in admin. */
const DocumentFileSchema = new Schema({
  documentId: { type: String, required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  revisionLabel: { type: String, default: "", maxlength: 20 },
  filename: { type: String, required: true, maxlength: 180 },
  mimeType: { type: String, required: true, maxlength: 120 },
  size: { type: Number, required: true, min: 1, max: 4_194_304 },
  sha256: { type: String, default: "", maxlength: 64 },
  note: { type: String, default: "", maxlength: 300 },
  data: { type: Buffer, required: true, select: false },
}, { timestamps: true, minimize: false });
DocumentFileSchema.index({ documentId: 1, version: 1 }, { unique: true });

export const DocumentFile = getModel<Record<string, unknown>>("DocumentFile", DocumentFileSchema);
