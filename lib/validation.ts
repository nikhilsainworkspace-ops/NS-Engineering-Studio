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
  subject: safeText(120),
  projectType: z.enum(["Civil engineering learning & tools", "Architecture & BIM resources", "BOQ & quantity surveying", "Construction project costs", "Careers & professional growth", "Website or product support", "General enquiry", "Not sure yet"]).default("Not sure yet"),
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

export const leadUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved"]),
  notes: optionalText(3000)
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

export const settingsSchema = z.object({
  brandName: safeText(80),
  tagline: safeText(140),
  description: safeText(320),
  heroEyebrow: safeText(120),
  heroHeadline: safeText(180),
  heroDescription: safeText(420),
  aboutHeadline: safeText(160),
  aboutBody: safeText(1600),
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
export type SettingsInput = z.infer<typeof settingsSchema>;
