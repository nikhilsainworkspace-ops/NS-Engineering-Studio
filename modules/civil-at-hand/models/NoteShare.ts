import mongoose, { Schema, type Model } from "mongoose";

/** Shares are unguessable, expiring snapshots. Revocation blocks future server access. */
const NoteShareSchema = new Schema({
  token: { type: String, required: true, unique: true, index: true },
  noteId: { type: Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true, maxlength: 160 },
  content: { type: String, maxlength: 20000, default: "" },
  tags: { type: [String], default: [] },
  assetIds: { type: [String], default: [] },
  active: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });
NoteShareSchema.index({ noteId: 1, active: 1, expiresAt: 1 });
export const NoteShare = (mongoose.models.NoteShare || mongoose.model("NoteShare", NoteShareSchema)) as unknown as Model<Record<string, unknown>>;
