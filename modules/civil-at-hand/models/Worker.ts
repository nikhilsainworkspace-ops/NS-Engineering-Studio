import { Schema } from "mongoose";
import { workerDef } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

/** A site worker. This is a workforce record, not a login account: workers never sign in. */
const WorkerSchema = new Schema(schemaFields(workerDef.fields), { timestamps: true, minimize: false });
WorkerSchema.index({ status: 1, name: 1 });
WorkerSchema.index({ projectId: 1 });

export const Worker = getModel<Record<string, unknown>>("Worker", WorkerSchema);
