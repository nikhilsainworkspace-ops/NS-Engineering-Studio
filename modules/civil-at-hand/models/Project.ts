import mongoose, { Schema, type Model } from "mongoose";
import type { ProjectDoc } from "@/modules/civil-at-hand/lib/types";

const ProjectSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  clientName: { type: String, trim: true, maxlength: 160, default: "" },
  clientContactId: { type: String, default: "" },
  linkedContactIds: { type: [String], default: [] },
  city: { type: String, trim: true, maxlength: 120, default: "" },
  state: { type: String, trim: true, maxlength: 120, default: "" },
  projectType: { type: String, trim: true, maxlength: 120, default: "" },
  status: { type: String, enum: ["lead", "estimation", "quoted", "negotiation", "awarded", "planning", "ongoing", "on-hold", "completed", "defects", "closed", "lost"], default: "lead", index: true },
  estimatedValue: { type: Number, min: 0, default: null },
  billedAmount: { type: Number, min: 0, default: null },
  receivedAmount: { type: Number, min: 0, default: null },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  followUpAt: { type: Date, default: null },
  source: { type: String, trim: true, maxlength: 120, default: "" },
  notes: { type: String, maxlength: 6000, default: "" },
  // Version 4 project workspace fields. Optional, so older records keep working unchanged.
  siteAddress: { type: String, trim: true, maxlength: 500, default: "" },
  contractRef: { type: String, trim: true, maxlength: 120, default: "" },
  managerName: { type: String, trim: true, maxlength: 120, default: "" },
  scope: { type: String, maxlength: 4000, default: "" },
  budget: { type: Number, min: 0, default: null },
  progressPercent: { type: Number, min: 0, max: 100, default: null },
  actualStartDate: { type: Date, default: null },
  actualEndDate: { type: Date, default: null },
  milestones: { type: [new Schema({ title: { type: String, required: true, maxlength: 160 }, dueDate: { type: Date, default: null }, done: { type: Boolean, default: false }, doneAt: { type: Date, default: null }, weight: { type: Number, min: 0, max: 100, default: 0 } }, { _id: true })], default: [] },
}, { timestamps: true, minimize: false });
ProjectSchema.index({ followUpAt: 1 });

export const Project = (mongoose.models.Project || mongoose.model("Project", ProjectSchema)) as unknown as Model<ProjectDoc>;
