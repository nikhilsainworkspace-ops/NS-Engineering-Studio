import { Schema } from "mongoose";
import { getModel } from "@/modules/civil-at-hand/lib/model-builder";

/** Owner-built public page. Private by default; only explicitly typed content is ever shown publicly. */
const BlockSchema = new Schema({
  type: { type: String, enum: ["heading", "text", "list", "image", "gallery", "facts", "cta", "contact", "divider"], required: true },
  text: { type: String, maxlength: 6000, default: "" },
  items: { type: [String], default: [] },
  facts: { type: [new Schema({ label: { type: String, maxlength: 80 }, value: { type: String, maxlength: 160 } }, { _id: false })], default: [] },
  imageIds: { type: [String], default: [] },
  caption: { type: String, maxlength: 300, default: "" },
  linkUrl: { type: String, maxlength: 500, default: "" },
  linkLabel: { type: String, maxlength: 80, default: "" },
}, { _id: true });
const PublicPageSchema = new Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
  title: { type: String, required: true, maxlength: 160 },
  template: { type: String, default: "custom", maxlength: 40 },
  summary: { type: String, default: "", maxlength: 400 },
  status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  visibility: { type: String, enum: ["public", "unlisted"], default: "public" },
  accessToken: { type: String, default: "", select: false },
  expiresAt: { type: Date, default: null },
  seoTitle: { type: String, default: "", maxlength: 160 },
  seoDescription: { type: String, default: "", maxlength: 300 },
  allowIndexing: { type: Boolean, default: false },
  showInNav: { type: Boolean, default: false },
  navOrder: { type: Number, default: 0 },
  coverImageId: { type: String, default: "" },
  blocks: { type: [BlockSchema], default: [] },
  publishedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });

export const PublicPage = getModel<Record<string, unknown>>("PublicPage", PublicPageSchema);
