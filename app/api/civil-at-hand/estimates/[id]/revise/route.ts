import mongoose from "mongoose";
import { adminHandler, json, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { estimateRoutes } from "@/modules/civil-at-hand/lib/routes/estimates";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Copies any version into a new draft revision. The source version is left untouched. */
export const POST = adminHandler("Estimate revision error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const source = await estimateRoutes.item.load(id);
  const latest = await Estimate.findOne({ groupId: source.groupId }).sort({ version: -1 }).select("version").lean() as unknown as { version?: number } | null;
  const copy: Record<string, unknown> = { ...source };
  for (const key of ["_id", "createdAt", "updatedAt", "__v", "sentAt", "decidedAt", "decisionNote", "convertedProjectId"]) delete copy[key];
  copy._id = new mongoose.Types.ObjectId();
  copy.version = Number(latest?.version || source.version || 1) + 1;
  copy.status = "draft";
  copy.issueDate = new Date();
  copy.items = (Array.isArray(source.items) ? source.items : []).map((item) => { const row = { ...(item as Record<string, unknown>) }; delete row._id; return row; });
  const created = await Estimate.create(copy);
  await audit(request, "estimate-revised", `${source.number} v${copy.version}`);
  return json({ item: plain(created.toObject()) }, 201);
});
