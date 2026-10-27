import mongoose, { Schema, type Model } from "mongoose";
import type { ContactDoc } from "@/modules/civil-at-hand/lib/types";

// The schema is unchanged from earlier versions, so existing records keep working.
const InteractionSchema = new Schema({
  at: { type: Date, default: Date.now },
  type: { type: String, enum: ["call", "whatsapp", "meeting", "site-visit", "email", "note"], default: "note" },
  note: { type: String, maxlength: 1000, default: "", trim: true },
});

const LabeledPhoneSchema = new Schema({
  label: { type: String, enum: ["Mobile", "Work", "Home", "Main", "Other"], default: "Mobile" },
  number: { type: String, trim: true, maxlength: 40, required: true },
}, { _id: false });
const LabeledEmailSchema = new Schema({
  label: { type: String, enum: ["Work", "Home", "Other"], default: "Work" },
  value: { type: String, trim: true, lowercase: true, maxlength: 180, required: true },
}, { _id: false });

const ContactSchema = new Schema({
  category: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  firstName: { type: String, trim: true, maxlength: 80, default: "" },
  lastName: { type: String, trim: true, maxlength: 80, default: "" },
  jobTitle: { type: String, trim: true, maxlength: 120, default: "" },
  birthday: { type: String, trim: true, maxlength: 10, default: "" },
  phoneLabel: { type: String, enum: ["Mobile", "Work", "Home", "Main", "Other"], default: "Mobile" },
  emailLabel: { type: String, enum: ["Work", "Home", "Other"], default: "Work" },
  phoneNumbers: { type: [LabeledPhoneSchema], default: [] },
  emailAddresses: { type: [LabeledEmailSchema], default: [] },
  isTeamMember: { type: Boolean, default: false, index: true },
  teamRole: { type: String, trim: true, maxlength: 120, default: "" },
  teamDepartment: { type: String, trim: true, maxlength: 120, default: "" },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  email: { type: String, trim: true, lowercase: true, maxlength: 180, default: "" },
  organization: { type: String, trim: true, maxlength: 180, default: "" },
  city: { type: String, trim: true, maxlength: 120, default: "" },
  state: { type: String, trim: true, maxlength: 120, default: "" },
  status: { type: String, enum: ["new", "contacted", "qualified", "active", "on-hold", "closed"], default: "new", index: true },
  source: { type: String, enum: ["manual", "public-link", "import"], default: "manual" },
  linkId: { type: String, default: "" },
  tags: { type: [String], default: [] },
  notes: { type: String, maxlength: 6000, default: "" },
  followUpAt: { type: Date, default: null },
  details: { type: Schema.Types.Mixed, default: {} },
  // Added in version 3 (all optional, so older records keep working):
  rating: { type: Number, min: 0, max: 5, default: 0 },
  flag: { type: String, enum: ["", "preferred", "avoid"], default: "" },
  shareConsent: { type: String, enum: ["", "yes", "no"], default: "" },
  lastContactedAt: { type: Date, default: null },
  interactions: { type: [InteractionSchema], default: [] },
}, { timestamps: true, minimize: false });

ContactSchema.index({ name: "text", organization: "text", email: "text", phone: "text", city: "text", state: "text", firstName: "text", lastName: "text", jobTitle: "text", teamRole: "text" });
ContactSchema.index({ followUpAt: 1 });

export const Contact = (mongoose.models.Contact || mongoose.model("Contact", ContactSchema)) as unknown as Model<ContactDoc>;
