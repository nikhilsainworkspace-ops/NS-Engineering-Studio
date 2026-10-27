import { adminHandler, ConflictError, json, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { cleanString } from "@/modules/civil-at-hand/lib/entity-spec";
import { estimateStatuses, labelOf } from "@/modules/civil-at-hand/lib/entities";
import { canChangeEstimateStatus } from "@/modules/civil-at-hand/lib/estimates";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { estimateRoutes } from "@/modules/civil-at-hand/lib/routes/estimates";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Moves a quotation through draft → sent → approved / rejected. Decided versions cannot be reopened. */
export const POST = adminHandler("Estimate status error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!estimateStatuses.some((item) => item.value === status)) throw new InputError("Choose a valid status.");
  const existing = await estimateRoutes.item.load(id);
  const from = String(existing.status);
  if (!canChangeEstimateStatus(from, status)) throw new ConflictError(`A quotation that is “${labelOf(estimateStatuses, from)}” cannot be marked “${labelOf(estimateStatuses, status)}”.`);
  if (status === "sent" && !(Array.isArray(existing.items) && existing.items.length)) throw new InputError("Add at least one BOQ item before marking it as sent.");
  const update: Record<string, unknown> = { status, decisionNote: cleanString(body.note, 1000) };
  if (status === "sent") update.sentAt = new Date();
  if (["approved", "rejected", "cancelled"].includes(status)) update.decidedAt = new Date();
  const updated = await Estimate.findOneAndUpdate({ _id: id, status: from }, { $set: update }, { new: true }).lean();
  if (!updated) throw new ConflictError("This quotation changed a moment ago. Refresh and try again.");
  await audit(request, `estimate-${status}`, `${existing.number} v${existing.version}`);
  return json({ item: plain(updated) });
});
