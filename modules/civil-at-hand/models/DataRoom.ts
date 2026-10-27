import mongoose, { Schema, type Model } from "mongoose";
import type { DataRoomDoc } from "@/modules/civil-at-hand/lib/types";

// A "data room" is a frozen copy (snapshot) of selected records, shared by a secret link until it expires.
// Because it is a copy, editing or deleting your contacts later never changes what the client was given.
const AccessSchema = new Schema({ at: { type: Date, default: Date.now }, kind: String, ip: String, agent: String }, { _id: false });

const DataRoomSchema = new Schema({
  token: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  recipientName: { type: String, trim: true, maxlength: 160, default: "" },
  recipientContact: { type: String, trim: true, maxlength: 180, default: "" },
  message: { type: String, maxlength: 1000, default: "" },
  dataset: { type: String, enum: ["contacts", "rates"], required: true },
  columns: { type: Schema.Types.Mixed, default: [] },
  rows: { type: Schema.Types.Mixed, default: [] },
  rowCount: { type: Number, default: 0 },
  masked: { type: Boolean, default: false },
  active: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  passcodeHash: { type: String, default: "" },
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  maxViews: { type: Number, default: null },
  viewCount: { type: Number, default: 0 },
  allowDownload: { type: Boolean, default: false },
  watermark: { type: Boolean, default: true },
  price: { type: Number, default: null },
  paymentStatus: { type: String, enum: ["free", "unpaid", "paid"], default: "free" },
  paidAt: { type: Date, default: null },
  requirePayment: { type: Boolean, default: false },
  invoiceNote: { type: String, maxlength: 500, default: "" },
  lastViewedAt: { type: Date, default: null },
  accessLog: { type: [AccessSchema], default: [] },
}, { timestamps: true, minimize: false });

export const DataRoom = (mongoose.models.DataRoom || mongoose.model("DataRoom", DataRoomSchema)) as unknown as Model<DataRoomDoc>;
