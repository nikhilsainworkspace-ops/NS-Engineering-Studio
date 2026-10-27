import type mongoose from "mongoose";
import { ConflictError } from "@/modules/civil-at-hand/lib/api-helpers";
import { assertExists, changedRef, collectionRoutes, itemRoutes, type CrudOptions } from "@/modules/civil-at-hand/lib/crud";
import { documentDef } from "@/modules/civil-at-hand/lib/entities";
import { DocumentFile } from "@/modules/civil-at-hand/models/DocumentFile";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { ProjectDocument } from "@/modules/civil-at-hand/models/ProjectDocument";

type AnyModel = mongoose.Model<Record<string, unknown>>;

export const documentOptions: CrudOptions = {
  model: ProjectDocument, def: documentDef, filters: ["projectId", "category", "approvalStatus"], searchFields: ["title", "docNumber", "issuedBy", "tags", "latestFileName"], sort: { updatedAt: -1 }, limit: 3000,
  prepare: async (data, { existing }) => {
    await assertExists(Project as unknown as AnyModel, changedRef(data, existing, "projectId"), "project");
    if (data.approvalStatus === "approved" && existing?.approvalStatus !== "approved") data.approvedAt = new Date();
    if (data.approvalStatus !== "approved") data.approvedAt = null;
    return data;
  },
  guardDelete: async (existing) => {
    if (!existing.archived) throw new ConflictError("Archive the document first. Deleting removes every uploaded version permanently.");
    await DocumentFile.deleteMany({ documentId: String(existing._id) });
  },
};

export const documentRoutes = { list: collectionRoutes(documentOptions), item: itemRoutes(documentOptions) };
