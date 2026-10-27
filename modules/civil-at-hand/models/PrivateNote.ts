import mongoose, { Schema, type Model } from "mongoose";
import type { PrivateNoteDoc } from "@/modules/civil-at-hand/lib/types";

/** Private notes belong to the single signed-in workspace admin and are never included in public share views. */
const PrivateNoteSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, trim: false, maxlength: 20000, default: "" },
  tags: { type: [String], default: [] },
  pinned: { type: Boolean, default: false, index: true },
  archived: { type: Boolean, default: false, index: true },
  favorite: { type: Boolean, default: false, index: true },
  folder: { type: String, trim: true, maxlength: 80, default: "Inbox", index: true },
  category: { type: String, trim: true, maxlength: 60, default: "General", index: true },
  projectId: { type: String, default: "", index: true },
  dueAt: { type: Date, default: null, index: true },
  deletedAt: { type: Date, default: null, index: true },
  history: { type: [{ title: { type: String, maxlength: 160 }, content: { type: String, maxlength: 20000 }, tags: { type: [String], default: [] }, at: { type: Date, default: Date.now } }], default: [] },
}, { timestamps: true, minimize: false });

PrivateNoteSchema.index({ deletedAt: 1, archived: 1, pinned: -1, favorite: -1, updatedAt: -1 });

export const PrivateNote = (mongoose.models.PrivateNote || mongoose.model("PrivateNote", PrivateNoteSchema)) as unknown as Model<PrivateNoteDoc>;
