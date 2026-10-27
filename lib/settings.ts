import "server-only";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/brand";
import { getCollection } from "@/lib/db";
import { getEnv } from "@/lib/env";

type SettingsDoc = SiteSettings & { _id: string; updatedAt?: Date };

function environmentDefaults(): SiteSettings {
  const env = getEnv();
  const brandName = env.NEXT_PUBLIC_SITE_NAME || DEFAULT_SETTINGS.brandName;
  const phone = env.NEXT_PUBLIC_CONTACT_PHONE || DEFAULT_SETTINGS.phone;
  const email = env.NEXT_PUBLIC_CONTACT_EMAIL || DEFAULT_SETTINGS.email;
  return { ...DEFAULT_SETTINGS, brandName, phone, email, siteTitle: `${brandName} — ${DEFAULT_SETTINGS.tagline}` };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const fallback = environmentDefaults();
  try {
    const collection = await getCollection<SettingsDoc>("siteSettings");
    const stored = await collection.findOne({ _id: "public" });
    if (!stored) return { ...fallback };
    const { _id: _ignored, updatedAt: _alsoIgnored, ...values } = stored;
    const merged = { ...fallback, ...values };
  if (typeof merged.instagramUrl === "string" && /instagram\.com\/(?:…|\.\.\.)?\/?$/i.test(merged.instagramUrl.trim())) merged.instagramUrl = "";
  if (typeof merged.linkedinUrl === "string" && /linkedin\.com\/(?:…|\.\.\.)?\/?$/i.test(merged.linkedinUrl.trim())) merged.linkedinUrl = "";
    // Migrate only the untouched defaults from the previous starter brand. Explicit owner copy stays intact.
    if (values.brandName === "NS Studio") merged.brandName = fallback.brandName;
    if (["Thoughtful work. Clear next steps.", "Digital experiences. Engineered with intent."].includes(String(values.tagline))) merged.tagline = fallback.tagline;
    if (["A flexible starting point for a professional services brand — with a clear process, useful guidance and a focus on the work that matters.", "Product thinking, considered design and dependable engineering for digital experiences built around real needs."].includes(String(values.description))) merged.description = fallback.description;
    if (["A more considered way forward", "Strategy · Design · Engineering"].includes(String(values.heroEyebrow))) merged.heroEyebrow = fallback.heroEyebrow;
    if (["Good ideas deserve\na clearer path.", "Digital experiences,\nengineered to move."].includes(String(values.heroHeadline))) merged.heroHeadline = fallback.heroHeadline;
    if (["Practical thinking, purposeful design and steady support to help turn your next idea into meaningful progress.", "From first principles to final details, bring product thinking, considered design and dependable engineering together to make your next digital move clearer."].includes(String(values.heroDescription))) merged.heroDescription = fallback.heroDescription;
    if (["Clear thinking. Thoughtful execution.", "Complex work, made clearer. Digital products, built with intent."].includes(String(values.aboutHeadline))) merged.aboutHeadline = fallback.aboutHeadline;
    if (["NS Studio is a working brand concept for a professional services business. Use this space to explain what you do, who you help and the principles that guide your work. Keep the story specific, honest and useful to the people you serve.", "NS Engineering Studio connects product thinking, design and engineering to help teams plan, build and improve digital experiences. The work begins with understanding the real problem, the people affected and the practical constraints around it. Scope, priorities and next steps are made clear before delivery begins."].includes(String(values.aboutBody))) merged.aboutBody = fallback.aboutBody;
    if (["NS Studio — Thoughtful work. Clear next steps.", "NS Engineering Studio — Digital experiences. Engineered with intent."].includes(String(values.siteTitle))) merged.siteTitle = fallback.siteTitle;
    if (["A flexible starting point for a professional services brand — with a clear process, useful guidance and a focus on the work that matters.", "Product thinking, considered design and dependable engineering for digital experiences built around real needs."].includes(String(values.siteDescription))) merged.siteDescription = fallback.siteDescription;
    return merged;
  } catch {
    return fallback;
  }
}

export async function saveSiteSettings(values: SiteSettings): Promise<void> {
  const collection = await getCollection<SettingsDoc>("siteSettings");
  await collection.updateOne({ _id: "public" }, { $set: { ...values, updatedAt: new Date() } }, { upsert: true });
}
