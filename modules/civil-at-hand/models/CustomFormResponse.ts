import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

const ResponseFieldSchema = new Schema({
  key: { type: String, required: true, maxlength: 50 },
  label: { type: String, required: true, maxlength: 160 },
  type: { type: String, required: true, maxlength: 32 },
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] },
}, { _id: false });

const CustomFormResponseSchema = new Schema({
  formId: { type: Schema.Types.ObjectId, ref: "CustomForm", required: true, index: true },
  formTitle: { type: String, required: true, maxlength: 160 },
  fields: { type: [ResponseFieldSchema], default: [] },
  answers: { type: Schema.Types.Mixed, required: true, default: {} },
  submittedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, minimize: false });

CustomFormResponseSchema.index({ formId: 1, submittedAt: -1 });

export const CustomFormResponse = getModel<Record<string, unknown>>("CustomFormResponse", CustomFormResponseSchema);
