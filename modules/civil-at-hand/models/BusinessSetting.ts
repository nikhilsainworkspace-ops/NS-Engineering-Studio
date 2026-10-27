import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

/** Single owner-managed settings record (`_id: "business"`). Values are validated by lib/settings.ts. */
const BusinessSettingSchema = new Schema({ _id: { type: String, required: true }, value: { type: Schema.Types.Mixed, default: {} } }, { timestamps: true, minimize: false });
export const BusinessSetting = getModel<{ _id: string; value: Record<string, unknown> }>("BusinessSetting", BusinessSettingSchema);
