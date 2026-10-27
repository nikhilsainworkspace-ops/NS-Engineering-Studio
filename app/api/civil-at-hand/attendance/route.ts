import { adminHandler, json, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { isDayKey } from "@/modules/civil-at-hand/lib/workforce";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";

export const runtime = "nodejs";

/** Attendance marks for a date range (at most 100 days at a time). */
export const GET = adminHandler("Attendance list error", async (request: Request) => {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || ""; const to = url.searchParams.get("to") || "";
  if (!isDayKey(from) || !isDayKey(to) || from > to) throw new InputError("Choose a valid date range.");
  if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 > 100) throw new InputError("Choose a range of 100 days or less.");
  const filter: Record<string, unknown> = { date: { $gte: from, $lte: to } };
  const projectId = url.searchParams.get("projectId"); const workerId = url.searchParams.get("workerId");
  if (projectId && /^[a-f\d]{24}$/i.test(projectId)) filter.projectId = projectId;
  if (workerId && /^[a-f\d]{24}$/i.test(workerId)) filter.workerId = workerId;
  await dbConnect();
  const items = await Attendance.find(filter).sort({ date: 1 }).limit(20000).lean();
  return json({ items: plain(items) });
});
