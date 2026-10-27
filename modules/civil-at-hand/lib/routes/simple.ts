// Route configuration for the simpler modules. Each app/api route file re-exports from here.
import { ConflictError } from "@/modules/civil-at-hand/lib/api-helpers";
import { assertExists, changedRef, collectionRoutes, itemRoutes, type CrudOptions } from "@/modules/civil-at-hand/lib/crud";
import { expenseDef, materialDef, materialRequestDef, siteReportDef, tenderDef, workerDef, workerTxnDef } from "@/modules/civil-at-hand/lib/entities";
import { nextNumber } from "@/modules/civil-at-hand/lib/server-settings";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { Expense } from "@/modules/civil-at-hand/models/Expense";
import { Material } from "@/modules/civil-at-hand/models/Material";
import { MaterialRequest } from "@/modules/civil-at-hand/models/MaterialRequest";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { SiteReport } from "@/modules/civil-at-hand/models/SiteReport";
import { StockMovement } from "@/modules/civil-at-hand/models/StockMovement";
import { Tender } from "@/modules/civil-at-hand/models/Tender";
import { Worker } from "@/modules/civil-at-hand/models/Worker";
import { WorkerTxn } from "@/modules/civil-at-hand/models/WorkerTxn";
import type mongoose from "mongoose";

type AnyModel = mongoose.Model<Record<string, unknown>>;
const asModel = (model: unknown) => model as AnyModel;

export const materialOptions: CrudOptions = {
  model: Material, def: materialDef, filters: ["category"], searchFields: ["name", "spec", "category"], sort: { name: 1 }, limit: 3000,
  prepare: async (data, { existing }) => { await assertExists(asModel(Contact), changedRef(data, existing, "preferredSupplierId"), "supplier"); return data; },
  guardDelete: async (existing) => {
    if (await StockMovement.exists({ materialId: String(existing._id) })) throw new ConflictError("This material has stock history, so it cannot be deleted. Archive it instead to hide it from new entries.");
  },
};

export const workerOptions: CrudOptions = {
  model: Worker, def: workerDef, filters: ["status", "projectId", "trade"], searchFields: ["name", "trade", "phone"], sort: { name: 1 }, limit: 3000,
  prepare: async (data, { existing }) => {
    if (typeof data.idLast4 === "string") data.idLast4 = data.idLast4.replace(/\s/g, "").slice(-4);
    await assertExists(asModel(Contact), changedRef(data, existing, "labourSupplierId"), "labour contractor");
    await assertExists(asModel(Project), changedRef(data, existing, "projectId"), "project");
    return data;
  },
  guardDelete: async (existing) => {
    if (await Attendance.exists({ workerId: String(existing._id) }) || await WorkerTxn.exists({ workerId: String(existing._id) })) throw new ConflictError("This worker has attendance or payment history, so the record cannot be deleted. Set the status to Inactive instead.");
  },
  describe: (doc) => String(doc.name || ""),
};

export const workerTxnOptions: CrudOptions = {
  model: WorkerTxn, def: workerTxnDef, filters: ["workerId", "projectId", "type"], sort: { date: -1 }, limit: 3000,
  prepare: async (data, { existing }) => { await assertExists(asModel(Worker), changedRef(data, existing, "workerId"), "worker"); await assertExists(asModel(Project), changedRef(data, existing, "projectId"), "project"); return data; },
  describe: (doc) => `${doc.type} ${doc.amount}`,
};

export const expenseOptions: CrudOptions = {
  model: Expense, def: expenseDef, filters: ["projectId", "category"], searchFields: ["description", "paidTo", "reference", "category"], sort: { date: -1 }, limit: 3000,
  prepare: async (data, { existing }) => { await assertExists(asModel(Project), changedRef(data, existing, "projectId"), "project"); return data; },
  describe: (doc) => `${doc.category}: ${doc.amount}`,
};

export const tenderOptions: CrudOptions = {
  model: Tender, def: tenderDef, filters: ["status", "decision"], searchFields: ["title", "authority", "refNumber", "location"], sort: { submissionDeadline: 1 }, limit: 2000,
};

export const siteReportOptions: CrudOptions = {
  model: SiteReport, def: siteReportDef, filters: ["projectId", "status"], sort: { date: -1, createdAt: -1 }, limit: 2000,
  prepare: async (data, { existing }) => { await assertExists(asModel(Project), changedRef(data, existing, "projectId"), "project"); return data; },
  guardEdit: (existing) => { if (existing.status === "approved") throw new ConflictError("Approved site reports are locked. Return it for changes first."); },
  guardDelete: (existing) => { if (existing.status === "approved") throw new ConflictError("Approved site reports are kept as a permanent record and cannot be deleted."); },
  describe: (doc) => `${doc.projectId} ${doc.date instanceof Date ? doc.date.toISOString().slice(0, 10) : doc.date}`,
};

const closedRequest = ["fulfilled", "rejected", "cancelled"];
export const materialRequestOptions: CrudOptions = {
  model: MaterialRequest, def: materialRequestDef, filters: ["projectId", "status"], searchFields: ["number", "requestedBy"], sort: { createdAt: -1 }, limit: 2000,
  prepare: async (data, { existing }) => {
    await assertExists(asModel(Project), changedRef(data, existing, "projectId"), "project");
    if (!existing) { data.number = await nextNumber("materialRequest"); data.status = "requested"; }
    if (existing && data.status !== existing.status && ["approved", "rejected"].includes(String(data.status))) data.decidedAt = new Date();
    return data;
  },
  guardEdit: (existing) => { if (closedRequest.includes(String(existing.status))) throw new ConflictError("This request is closed. Create a new request for further material."); },
  guardDelete: (existing) => { if (existing.status !== "requested") throw new ConflictError("Only requests that have not been approved can be deleted. Cancel it instead."); },
};

export const routes = {
  materials: { list: collectionRoutes(materialOptions), item: itemRoutes(materialOptions) },
  workers: { list: collectionRoutes(workerOptions), item: itemRoutes(workerOptions) },
  workerTxns: { list: collectionRoutes(workerTxnOptions), item: itemRoutes(workerTxnOptions) },
  expenses: { list: collectionRoutes(expenseOptions), item: itemRoutes(expenseOptions) },
  tenders: { list: collectionRoutes(tenderOptions), item: itemRoutes(tenderOptions) },
  siteReports: { list: collectionRoutes(siteReportOptions), item: itemRoutes(siteReportOptions) },
  materialRequests: { list: collectionRoutes(materialRequestOptions), item: itemRoutes(materialRequestOptions) },
};
