import mongoose, { Schema, type Model } from "mongoose";
import type { RateDoc } from "@/modules/civil-at-hand/lib/types";

const RateSchema = new Schema({
  item: { type: String, required: true, trim: true, maxlength: 160, index: true },
  group: { type: String, enum: ["material", "labour", "equipment", "subcontract", "other"], default: "material", index: true },
  spec: { type: String, trim: true, maxlength: 160, default: "" },
  unit: { type: String, trim: true, maxlength: 40, default: "" },
  rate: { type: Number, required: true, min: 0 },
  supplierName: { type: String, trim: true, maxlength: 160, default: "" },
  supplierContactId: { type: String, default: "" },
  city: { type: String, trim: true, maxlength: 120, default: "" },
  state: { type: String, trim: true, maxlength: 120, default: "" },
  validTill: { type: Date, default: null },
  notes: { type: String, maxlength: 2000, default: "" },
}, { timestamps: true });

export const Rate = (mongoose.models.Rate || mongoose.model("Rate", RateSchema)) as unknown as Model<RateDoc>;
