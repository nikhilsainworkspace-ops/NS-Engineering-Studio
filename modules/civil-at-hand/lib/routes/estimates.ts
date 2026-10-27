import mongoose from "mongoose";
import { ConflictError } from "@/modules/civil-at-hand/lib/api-helpers";
import { assertExists, changedRef, collectionRoutes, itemRoutes, type CrudOptions } from "@/modules/civil-at-hand/lib/crud";
import { estimateDef } from "@/modules/civil-at-hand/lib/entities";
import { computeEstimate, estimateEditable, type EstimateInput } from "@/modules/civil-at-hand/lib/estimates";
import { getSettings, nextNumber } from "@/modules/civil-at-hand/lib/server-settings";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Project } from "@/modules/civil-at-hand/models/Project";

type AnyModel = mongoose.Model<Record<string, unknown>>;

export function estimateTotals(data: Record<string, unknown>) {
  const result = computeEstimate(data as unknown as EstimateInput);
  return { directCost: result.directCost, subtotal: result.subtotal, tax: result.tax, total: result.total };
}

export const estimateOptions: CrudOptions = {
  model: Estimate, def: estimateDef, filters: ["projectId", "status", "groupId", "clientContactId"], searchFields: ["title", "number", "clientName", "siteLocation"],
  sort: { updatedAt: -1 }, limit: 2000, listProjection: { items: 0, terms: 0, notes: 0 },
  prepare: async (data, { existing }) => {
    await assertExists(Project as unknown as AnyModel, changedRef(data, existing, "projectId"), "project");
    await assertExists(Contact as unknown as AnyModel, changedRef(data, existing, "clientContactId"), "client contact");
    if (!existing) {
      const settings = await getSettings();
      const id = new mongoose.Types.ObjectId();
      data._id = id;
      data.groupId = String(id);
      data.version = 1;
      data.status = "draft";
      data.number = await nextNumber("quotation", settings);
      if (!data.issueDate) data.issueDate = new Date();
      if (!data.validUntil && settings.quotationValidityDays > 0) data.validUntil = new Date(Date.now() + settings.quotationValidityDays * 86_400_000);
      if (!data.terms) data.terms = settings.quotationTerms;
    }
    data.totals = estimateTotals(data);
    return data;
  },
  guardEdit: (existing) => {
    if (!estimateEditable(String(existing.status))) throw new ConflictError("This version has been sent or decided, so it is kept exactly as it was. Use “Create revision” to make changes.");
  },
  guardDelete: (existing) => {
    if (existing.status !== "draft") throw new ConflictError("Only draft versions can be deleted. Sent and decided quotations are kept for your records; cancel instead.");
  },
  describe: (doc) => `${doc.number || ""} v${doc.version || 1}`,
};

export const estimateRoutes = { list: collectionRoutes(estimateOptions), item: itemRoutes(estimateOptions) };
