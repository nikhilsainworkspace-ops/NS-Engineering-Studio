import { Schema } from "mongoose";
import { materialDef } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

const MaterialSchema = new Schema(schemaFields(materialDef.fields), { timestamps: true, minimize: false });
MaterialSchema.index({ name: 1 });
MaterialSchema.index({ category: 1 });

export const Material = getModel<Record<string, unknown>>("Material", MaterialSchema);
