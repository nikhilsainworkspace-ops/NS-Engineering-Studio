import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

/** One mark per worker per calendar day (YYYY-MM-DD). */
const AttendanceSchema = new Schema({
  workerId: { type: String, required: true },
  projectId: { type: String, default: "" },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ["present", "half-day", "absent", "leave"], required: true },
  otHours: { type: Number, min: 0, max: 16, default: 0 },
  note: { type: String, maxlength: 200, default: "" },
}, { timestamps: true, minimize: false });
AttendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ projectId: 1, date: 1 });
AttendanceSchema.index({ date: 1 });

export const Attendance = getModel<Record<string, unknown>>("Attendance", AttendanceSchema);
