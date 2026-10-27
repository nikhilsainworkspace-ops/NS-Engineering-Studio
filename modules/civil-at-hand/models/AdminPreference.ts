import mongoose, { Schema, type Model } from "mongoose";

/** Single-workspace preferences are stored in MongoDB, never in browser storage. */
export type AdminPreferenceDoc = { _id: string; autoLockMinutes: number; createdAt?: Date; updatedAt?: Date };

const AdminPreferenceSchema = new Schema<AdminPreferenceDoc>({
  _id: { type: String, default: "admin" },
  autoLockMinutes: { type: Number, enum: [0, 5, 15, 30, 60], default: 15, required: true },
}, { timestamps: true, versionKey: false, collection: "adminpreferences" });

export const AdminPreference = (mongoose.models.AdminPreference || mongoose.model<AdminPreferenceDoc>("AdminPreference", AdminPreferenceSchema)) as Model<AdminPreferenceDoc>;
