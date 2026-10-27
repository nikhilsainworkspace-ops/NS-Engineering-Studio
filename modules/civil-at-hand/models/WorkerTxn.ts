import { Schema } from "mongoose";
import { workerTxnDef } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

const WorkerTxnSchema = new Schema(schemaFields(workerTxnDef.fields), { timestamps: true, minimize: false });
WorkerTxnSchema.index({ workerId: 1, date: -1 });

export const WorkerTxn = getModel<Record<string, unknown>>("WorkerTxn", WorkerTxnSchema);
