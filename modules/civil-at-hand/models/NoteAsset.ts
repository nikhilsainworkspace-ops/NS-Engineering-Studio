import mongoose, { Schema, type Model } from "mongoose";

/** Images are held in MongoDB (not browser storage or a public filesystem). */
const NoteAssetSchema = new Schema({
  noteId: { type: Schema.Types.ObjectId, required: true, index: true },
  filename: { type: String, required: true, trim: true, maxlength: 180 },
  mimeType: { type: String, required: true, enum: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  size: { type: Number, required: true, min: 1, max: 2_097_152 },
  data: { type: Buffer, required: true, select: false },
}, { timestamps: true, minimize: false });
NoteAssetSchema.index({ noteId: 1, createdAt: -1 });
export const NoteAsset = (mongoose.models.NoteAsset || mongoose.model("NoteAsset", NoteAssetSchema)) as unknown as Model<Record<string, unknown>>;
