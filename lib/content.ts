import "server-only";
import { STARTER_FAQS, STARTER_SERVICES, type FaqItem, type ServiceItem } from "@/lib/brand";
import { getCollection } from "@/lib/db";

export type ContentKind = "services" | "faqs" | "projects" | "software";
export type ProjectItem = {
  slug: string; title: string; category: string; summary: string; description: string;
  location: string; status: "draft" | "published" | "archived" | "completed";
  startDate: string; completionDate: string; coverImageUrl: string; gallery: string[];
  published: boolean; featured: boolean; sortOrder: number; seoTitle: string; seoDescription: string;
  isStarter?: boolean; deleted?: boolean;
};
export type SoftwareItem = {
  slug: string; title: string; category: string; summary: string; description: string;
  launchUrl: string; status: "available" | "beta" | "coming-soon" | "maintenance";
  pricing: string; trialInfo: string; platforms: string; features: string[];
  published: boolean; featured: boolean; sortOrder: number; isStarter?: boolean; deleted?: boolean;
};
type ContentDoc = Record<string, unknown> & { _id: string; type: ContentKind; slug: string; deleted?: boolean; isStarter?: boolean; createdAt?: Date; updatedAt?: Date };
type ContentItem = ServiceItem | FaqItem | ProjectItem | SoftwareItem;

const defaults = (kind: ContentKind): ContentItem[] => {
  if (kind === "services") return STARTER_SERVICES;
  if (kind === "faqs") return STARTER_FAQS;
  return [];
};

export async function getContent<T extends ContentItem>(kind: ContentKind, publishedOnly = true): Promise<T[]> {
  let stored: ContentDoc[] = [];
  try {
    const collection = await getCollection<ContentDoc>("content");
    stored = await collection.find({ type: kind }).toArray();
  } catch {
    // The public site can still render useful starter content if Atlas is not configured yet.
  }
  const bySlug = new Map(stored.map((item) => [item.slug, item]));
  const output: T[] = [];
  for (const starter of defaults(kind)) {
    const override = bySlug.get(starter.slug);
    if (override?.deleted) continue;
    // Unedited starter records from an older deployment follow the current bundled starter copy.
    // Admin edits set isStarter=false, so owner-customised content is never overwritten here.
    const merged = (override?.isStarter
      ? { ...starter, isStarter: true }
      : override
        ? { ...starter, ...override, isStarter: false }
        : { ...starter, isStarter: true }) as unknown as T;
    const projectStatus = "status" in merged ? String(merged.status) : "";
    const publiclyVisible = kind === "projects" ? Boolean(merged.published) && projectStatus !== "draft" && projectStatus !== "archived" : Boolean(merged.published);
    if (!publishedOnly || publiclyVisible) output.push(merged);
    bySlug.delete(starter.slug);
  }
  for (const item of bySlug.values()) {
    if (item.deleted) continue;
    // Retire obsolete, unedited starter items after the product-led content refresh.
    // Admin-edited records are kept because their isStarter flag is set to false.
    if (item.isStarter === true) continue;
    const result = { ...item, isStarter: false } as unknown as T;
    const projectStatus = "status" in result ? String(result.status) : "";
    const publiclyVisible = kind === "projects" ? Boolean(result.published) && projectStatus !== "draft" && projectStatus !== "archived" : Boolean(result.published);
    if (!publishedOnly || publiclyVisible) output.push(result);
  }
  return output.sort((a, b) => {
    if (kind === "projects" || kind === "software") {
      const aFeatured = "featured" in a && Boolean(a.featured);
      const bFeatured = "featured" in b && Boolean(b.featured);
      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
    }
    return a.sortOrder - b.sortOrder;
  });
}
