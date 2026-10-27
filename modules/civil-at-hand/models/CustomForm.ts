import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";
import type { CustomFormField } from "@/modules/civil-at-hand/lib/custom-forms";

const FieldSchema = new Schema<CustomFormField>({
  key: { type: String, required: true, trim: true, maxlength: 50 },
  label: { type: String, required: true, trim: true, maxlength: 160 },
  type: { type: String, enum: ["text", "textarea", "email", "tel", "number", "date", "select", "radio", "checkbox", "multi-select"], required: true },
  required: { type: Boolean, default: false },
  placeholder: { type: String, trim: true, maxlength: 240, default: "" },
  options: { type: [String], default: [] },
}, { _id: false });

const CustomFormSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  token: { type: String, required: true, unique: true, index: true, match: /^[a-f0-9]{48}$/ },
  active: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, default: null },
  submissions: { type: Number, default: 0, min: 0 },
  fields: { type: [FieldSchema], required: true, validate: [(value: unknown[]) => value.length >= 1 && value.length <= 50, "A form must have 1 to 50 questions."] },
}, { timestamps: true, minimize: false });

export const CustomForm = getModel<Record<string, unknown>>("CustomForm", CustomFormSchema);
