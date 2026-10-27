import mongoose from "mongoose";
import { adminHandler, json, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { cleanString, parseNumber } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { isDayKey } from "@/modules/civil-at-hand/lib/workforce";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { Worker } from "@/modules/civil-at-hand/models/Worker";

export const runtime = "nodejs";
const STATUSES = ["present", "half-day", "absent", "leave"];

/** Saves a day's muster for one site. An empty status clears that worker's mark for the day. */
export const POST = adminHandler("Attendance save error", async (request: Request) => {
  const body = await readJson(request);
  const date = String(body.date || "");
  if (!isDayKey(date)) throw new InputError("Choose the attendance date.");
  const projectId = cleanString(body.projectId, 24);
  if (projectId && !mongoose.isValidObjectId(projectId)) throw new InputError("Choose a valid project.");
  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (!entries.length) throw new InputError("Mark at least one worker.");
  if (entries.length > 1000) throw new InputError("Save at most 1,000 workers at a time.");
  await dbConnect();
  if (projectId && !(await Project.exists({ _id: projectId }))) throw new InputError("The selected project no longer exists.");
  const parsed = entries.map((entry, index) => {
    const row = (entry || {}) as Record<string, unknown>;
    const workerId = cleanString(row.workerId, 24);
    if (!mongoose.isValidObjectId(workerId)) throw new InputError(`Row ${index + 1}: choose a worker.`);
    const status = cleanString(row.status, 20);
    if (status && !STATUSES.includes(status)) throw new InputError(`Row ${index + 1}: choose present, half day, absent or leave.`);
    return { workerId, status, otHours: parseNumber(row.otHours, "Overtime hours", 0, 16) || 0, note: cleanString(row.note, 200) };
  });
  const ids = Array.from(new Set(parsed.map((row) => row.workerId)));
  const known = await Worker.countDocuments({ _id: { $in: ids } });
  if (known !== ids.length) throw new InputError("Some workers no longer exist. Refresh and try again.");
  const operations = parsed.map((row) => row.status
    ? { updateOne: { filter: { workerId: row.workerId, date }, update: { $set: { projectId, status: row.status, otHours: row.status === "absent" || row.status === "leave" ? 0 : row.otHours, note: row.note } }, upsert: true } }
    : { deleteOne: { filter: { workerId: row.workerId, date } } });
  const result = await Attendance.bulkWrite(operations as never[], { ordered: false });
  await audit(request, "attendance-saved", `${date}: ${parsed.length} worker(s)`);
  return json({ ok: true, saved: (result.upsertedCount || 0) + (result.modifiedCount || 0), cleared: result.deletedCount || 0 });
});
