import "server-only";
import { STARTER_FAQS, STARTER_SERVICES, type FaqItem, type ServiceItem } from "@/lib/brand";
import { getCollection } from "@/lib/db";

export type ContentKind = "services" | "faqs";
type ContentDoc = Record<string, unknown> & { _id: string; type: ContentKind; slug: string; deleted?: boolean; isStarter?: boolean; createdAt?: Date; updatedAt?: Date };

const defaults = (kind: ContentKind): Array<ServiceItem | FaqItem> => kind === "services" ? STARTER_SERVICES : STARTER_FAQS;

export async function getContent<T extends ServiceItem | FaqItem>(kind: ContentKind, publishedOnly = true): Promise<T[]> {
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
    if (!publishedOnly || merged.published) output.push(merged);
    bySlug.delete(starter.slug);
  }
  for (const item of bySlug.values()) {
    if (item.deleted) continue;
    const result = { ...item, isStarter: false } as unknown as T;
    if (!publishedOnly || result.published) output.push(result);
  }
  return output.sort((a, b) => a.sortOrder - b.sortOrder);
}
