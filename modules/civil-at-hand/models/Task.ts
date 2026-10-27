import mongoose, { Schema, type Model } from "mongoose";
import type { TaskDoc } from "@/modules/civil-at-hand/lib/types";

const TaskSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2400, default: "" },
  status: { type: String, enum: ["todo", "in-progress", "done", "cancelled"], default: "todo", index: true },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal", index: true },
  dueAt: { type: Date, default: null, index: true },
  relatedKind: { type: String, enum: ["none", "contact", "project"], default: "none" },
  relatedId: { type: String, default: "" },
  assignedContactId: { type: String, default: "", index: true },
}, { timestamps: true, minimize: false });
TaskSchema.index({ status: 1, dueAt: 1, priority: 1 });

export const Task = (mongoose.models.Task || mongoose.model("Task", TaskSchema)) as unknown as Model<TaskDoc>;
