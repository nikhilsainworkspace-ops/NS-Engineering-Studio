import { z } from "zod";

const safeText = (max: number) => z.string().trim().min(1).max(max).refine((v) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v), "Contains unsupported characters.");
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const urlOrEmpty = z.string().trim().max(300).refine((value) => value === "" || isHttpUrl(value), "Enter a valid http or https URL.");

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const contactSchema = z.object({
  name: safeText(100),
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  phone: optionalText(32),
  organization: optionalText(160),
  state: optionalText(100),
  city: optionalText(100),
  projectSlug: optionalText(80),
  subject: safeText(120),
  projectType: z.enum(["Civil engineering consultancy", "Architectural planning & design", "Construction & project planning", "Estimation & BOQ", "Construction & civil manpower supply", "Engineering software", "Project enquiry", "Website support", "General enquiry", "Not sure yet"]).default("Not sure yet"),
  timeline: z.enum(["Exploring options", "Within 1 month", "1–3 months", "3+ months", "Time-sensitive", "Not decided yet"]).default("Not decided yet"),
  message: safeText(3000),
  consent: z.literal(true, { error: "Please confirm that we may use these details to respond." }),
  website: z.string().max(0).optional().default(""),
  submissionKey: z.string().uuid().optional()
}).strict();

export const loginSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(1024)
}).strict();

const followUpDate = z.string().trim().max(10).refine((value) => {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid follow-up date.");

export const leadUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "in_progress", "converted", "closed", "resolved"]),
  notes: optionalText(3000),
  assignedTo: z.string().trim().max(160).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  followUpDate: followUpDate.optional()
}).strict();

export const serviceSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  title: safeText(100),
  summary: safeText(220),
  body: safeText(5000),
  icon: z.enum(["Compass", "PanelsTopLeft", "Route", "Lightbulb", "Layers", "CircleHelp"]).default("Compass"),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(100)
}).strict();

export const faqSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  question: safeText(220),
  answer: safeText(3000),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(100)
}).strict();


const safeAssetUrl = z.string().trim().max(500).refine((value) => value === "" || ((value.startsWith("/") && !value.startsWith("//") && !value.includes("..") && !value.includes("\\")) || isHttpUrl(value)), "Use a site-local path or a valid http/https URL.");
const routeOrUrl = z.string().trim().max(500).refine((value) => value === "" || ((value.startsWith("/") && !value.startsWith("//") && !value.includes("..") && !value.includes("\\")) || isHttpUrl(value)), "Use a local route or a valid http/https URL.");
export const projectSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: safeText(140),
  category: z.enum(["Residential", "Commercial", "Architecture", "Interior", "Civil", "Infrastructure", "Other"]).default("Other"),
  summary: safeText(240),
  description: safeText(6000),
  location: optionalText(160),
  status: z.enum(["draft", "published", "archived", "completed"]).default("draft"),
  startDate: optionalText(30),
  completionDate: optionalText(30),
  coverImageUrl: safeAssetUrl.optional().default(""),
  gallery: z.array(safeAssetUrl).max(20).default([]),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(100),
  seoTitle: optionalText(150),
  seoDescription: optionalText(320)
}).strict();

export const softwareSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: safeText(140),
  category: z.enum(["Engineering", "Architecture", "Construction", "Estimation", "Project Management", "Learning", "Other"]).default("Engineering"),
  summary: safeText(240),
  description: safeText(4000),
  launchUrl: routeOrUrl,
  status: z.enum(["available", "beta", "coming-soon", "maintenance"]).default("coming-soon"),
  pricing: optionalText(120),
  trialInfo: optionalText(180),
  platforms: optionalText(180),
  features: z.array(safeText(180)).max(20).default([]),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(100)
}).strict();

export const settingsSchema = z.object({
  brandName: safeText(80),
  tagline: safeText(140),
  description: safeText(320),
  heroEyebrow: safeText(120),
  heroHeadline: safeText(180),
  heroDescription: safeText(420),
  aboutHeadline: safeText(160),
  aboutBody: safeText(1600),
  serviceCoverage: safeText(1200).optional().default("NS Engineering Studio accepts enquiries from across India. This does not mean the company has an office or guaranteed delivery capacity in every state or city. Before an engagement is confirmed, service availability, professional qualifications, deliverables, schedule and applicable local requirements must be checked for the specific project location."),
  phone: z.string().trim().min(7).max(32).regex(/^[+0-9 ()-]+$/),
  email: z.union([z.literal(""), z.email().max(254)]).transform((v) => v.toLowerCase()),
  logoPath: z.string().trim().min(1).max(150).refine((v) => v.startsWith("/brand/") && !v.includes("..") && !v.includes("\\"), "Logo must reference an asset inside /public/brand."),
  siteTitle: safeText(150),
  siteDescription: safeText(320),
  instagramUrl: urlOrEmpty,
  linkedinUrl: urlOrEmpty,
  showStarterNotice: z.boolean()
}).strict();

export type ContactInput = z.infer<typeof contactSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type FaqInput = z.infer<typeof faqSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type SoftwareInput = z.infer<typeof softwareSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
