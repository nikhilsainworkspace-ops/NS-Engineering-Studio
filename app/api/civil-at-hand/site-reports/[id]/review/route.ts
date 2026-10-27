import mongoose from "mongoose";
import { adminHandler, ConflictError, json, NotFoundError, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { cleanString } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { SiteReport } from "@/modules/civil-at-hand/models/SiteReport";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

const allowed: Record<string, string[]> = { submit: ["draft", "returned"], approve: ["submitted", "draft"], return: ["submitted", "approved"] };
const nextStatus: Record<string, string> = { submit: "submitted", approve: "approved", return: "returned" };
const refusal: Record<string, string> = { submit: "Only draft or returned reports can be submitted.", approve: "Only draft or submitted reports can be approved.", return: "Only submitted or approved reports can be returned for changes." };

/** Submit, approve or return a daily site report. Approval locks the report. */
export const POST = adminHandler("Site report review error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) throw new InputError("Invalid site report ID.");
  const body = await readJson(request);
  const action = String(body.action || "");
  if (!allowed[action]) throw new InputError("Choose submit, approve or return.");
  await dbConnect();
  const existing = await SiteReport.findById(id).lean() as Record<string, unknown> | null;
  if (!existing) throw new NotFoundError("Site report not found.");
  if (!allowed[action].includes(String(existing.status))) throw new ConflictError(refusal[action]);
  const update: Record<string, unknown> = { status: nextStatus[action], reviewNote: cleanString(body.note, 1000) || existing.reviewNote || "" };
  if (action !== "submit") update.reviewedAt = new Date();
  const updated = await SiteReport.findOneAndUpdate({ _id: id, status: existing.status }, { $set: update }, { new: true }).lean();
  if (!updated) throw new ConflictError("This report changed a moment ago. Refresh and try again.");
  await audit(request, `site-report-${action}`, id);
  return json({ item: plain(updated) });
});
