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
    // Migrate only the untouched defaults from the previous starter brand. Explicit owner copy stays intact.
    if (values.brandName === "NS Studio") merged.brandName = fallback.brandName;
    if (values.tagline === "Thoughtful work. Clear next steps.") merged.tagline = fallback.tagline;
    if (values.description === "A flexible starting point for a professional services brand — with a clear process, useful guidance and a focus on the work that matters.") merged.description = fallback.description;
    if (values.heroEyebrow === "A more considered way forward") merged.heroEyebrow = fallback.heroEyebrow;
    if (values.heroHeadline === "Good ideas deserve\na clearer path.") merged.heroHeadline = fallback.heroHeadline;
    if (values.heroDescription === "Practical thinking, purposeful design and steady support to help turn your next idea into meaningful progress.") merged.heroDescription = fallback.heroDescription;
    if (values.aboutHeadline === "Clear thinking. Thoughtful execution.") merged.aboutHeadline = fallback.aboutHeadline;
    if (values.aboutBody === "NS Studio is a working brand concept for a professional services business. Use this space to explain what you do, who you help and the principles that guide your work. Keep the story specific, honest and useful to the people you serve.") merged.aboutBody = fallback.aboutBody;
    if (values.siteTitle === "NS Studio — Thoughtful work. Clear next steps.") merged.siteTitle = fallback.siteTitle;
    if (values.siteDescription === "A flexible starting point for a professional services brand — with a clear process, useful guidance and a focus on the work that matters.") merged.siteDescription = fallback.siteDescription;
    return merged;
  } catch {
    return fallback;
  }
}

export async function saveSiteSettings(values: SiteSettings): Promise<void> {
  const collection = await getCollection<SettingsDoc>("siteSettings");
  await collection.updateOne({ _id: "public" }, { $set: { ...values, updatedAt: new Date() } }, { upsert: true });
}
