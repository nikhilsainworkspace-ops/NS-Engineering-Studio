import mongoose, { Schema, type Model } from "mongoose";

const BackupSnapshotChunkSchema = new Schema({
  snapshotId: { type: Schema.Types.ObjectId, required: true, index: true },
  sequence: { type: Number, required: true, min: 0 },
  payload: { type: String, required: true },
}, { timestamps: false, minimize: false });
BackupSnapshotChunkSchema.index({ snapshotId: 1, sequence: 1 }, { unique: true });
export const BackupSnapshotChunk = (mongoose.models.BackupSnapshotChunk || mongoose.model("BackupSnapshotChunk", BackupSnapshotChunkSchema)) as unknown as Model<Record<string, unknown>>;
