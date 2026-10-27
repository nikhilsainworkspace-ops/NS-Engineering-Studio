import { Schema } from "mongoose";
import { documentDef } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

/** Document register entry. File versions live in DocumentFile; nothing here is public. */
const ProjectDocumentSchema = new Schema({
  ...schemaFields(documentDef.fields),
  currentVersion: { type: Number, default: 0 },
  latestFileId: { type: String, default: "" },
  latestFileName: { type: String, default: "", maxlength: 180 },
  approvedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });
ProjectDocumentSchema.index({ projectId: 1, category: 1 });
ProjectDocumentSchema.index({ expiryDate: 1 });

export const ProjectDocument = getModel<Record<string, unknown>>("ProjectDocument", ProjectDocumentSchema);
