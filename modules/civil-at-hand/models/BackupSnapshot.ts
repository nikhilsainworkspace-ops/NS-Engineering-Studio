import mongoose, { Schema, type Model } from "mongoose";

const BackupSnapshotSchema = new Schema({
  status: { type: String, enum: ["building", "complete"], required: true, default: "building", index: true },
  byteLength: { type: Number, required: true, min: 0 },
  sha256: { type: String, required: true, maxlength: 64 },
  chunkCount: { type: Number, required: true, min: 0 },
  counts: { type: Schema.Types.Mixed, default: {} },
  trigger: { type: String, enum: ["scheduled", "manual"], required: true },
  completedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });
BackupSnapshotSchema.index({ status: 1, createdAt: -1 });
export const BackupSnapshot = (mongoose.models.BackupSnapshot || mongoose.model("BackupSnapshot", BackupSnapshotSchema)) as unknown as Model<Record<string, unknown>>;
