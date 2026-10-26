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
    return { ...fallback, ...values };
  } catch {
    return fallback;
  }
}

export async function saveSiteSettings(values: SiteSettings): Promise<void> {
  const collection = await getCollection<SettingsDoc>("siteSettings");
  await collection.updateOne({ _id: "public" }, { $set: { ...values, updatedAt: new Date() } }, { upsert: true });
}
