import mongoose from "mongoose";
import { adminHandler, ConflictError, json, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { computeEstimate, type EstimateInput } from "@/modules/civil-at-hand/lib/estimates";
import { openLeadStatuses } from "@/modules/civil-at-hand/lib/projects";
import { estimateRoutes } from "@/modules/civil-at-hand/lib/routes/estimates";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Project } from "@/modules/civil-at-hand/models/Project";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/**
 * Links an approved quotation to a project: an existing project is moved to "Awarded" (if it was still a lead)
 * and gets the contract value and a cost budget; otherwise a new project is created from the quotation.
 * Existing values are only filled when empty, so nothing the owner typed is overwritten.
 */
export const POST = adminHandler("Estimate conversion error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const body = await readJson(request).catch(() => ({} as Record<string, unknown>));
  const estimate = await estimateRoutes.item.load(id);
  if (estimate.status !== "approved") throw new ConflictError("Mark the quotation as approved before turning it into a project.");
  // Contract value = taxable value (after discount, before tax). Budget = estimated direct cost.
  const totals = computeEstimate(estimate as unknown as EstimateInput);
  const contractValue = Math.round(totals.taxable);
  const targetId = typeof body.projectId === "string" && body.projectId ? body.projectId : String(estimate.projectId || "");
  let project: Record<string, unknown> | null = null;
  if (targetId) {
    if (!mongoose.isValidObjectId(targetId)) throw new InputError("Choose a valid project.");
    const existing = await Project.findById(targetId).lean() as Record<string, unknown> | null;
    if (!existing) throw new InputError("The selected project no longer exists.");
    const update: Record<string, unknown> = {};
    if (openLeadStatuses.includes(String(existing.status))) update.status = "awarded";
    if (!existing.estimatedValue) update.estimatedValue = contractValue;
    if (!existing.budget) update.budget = Math.round(Number(totals.directCost || 0));
    project = await Project.findByIdAndUpdate(targetId, { $set: update }, { new: true }).lean() as Record<string, unknown> | null;
  } else {
    const created = await Project.create({
      title: String(estimate.title || "Awarded work").slice(0, 160), status: "awarded", clientName: String(estimate.clientName || ""),
      clientContactId: String(estimate.clientContactId || ""), linkedContactIds: [], city: "", state: "", projectType: "",
      estimatedValue: contractValue, budget: Math.round(Number(totals.directCost || 0)), siteAddress: String(estimate.siteLocation || ""),
      source: `Quotation ${estimate.number}`, notes: "", startDate: null, endDate: null, followUpAt: null,
    });
    project = created.toObject() as Record<string, unknown>;
  }
  await Estimate.updateOne({ _id: id }, { $set: { convertedProjectId: String(project?._id || ""), projectId: String(project?._id || "") } });
  await audit(request, "estimate-converted", `${estimate.number} → project`);
  return json({ project: plain(project) });
});
