import { timingSafeEqual } from "node:crypto";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { pageIsLive } from "@/modules/civil-at-hand/lib/public-pages";
import { PublicPage } from "@/modules/civil-at-hand/models/PublicPage";

export type LivePage = {
  _id: string; slug: string; title: string; template: string; summary: string; visibility: string; seoTitle: string; seoDescription: string;
  allowIndexing: boolean; coverImageId: string; publishedAt: string | null;
  blocks: { type: string; text: string; items: string[]; facts: { label: string; value: string }[]; imageIds: string[]; caption: string; linkUrl: string; linkLabel: string }[];
};

function tokenMatches(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected); const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Loads a page for anonymous visitors. Returns null unless it is published, not expired, and (for unlisted
 * pages) the private link key matches. Only an explicit allowlist of page fields is returned.
 */
export async function loadLivePage(slug: string, key = ""): Promise<LivePage | null> {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  await dbConnect();
  const page = await PublicPage.findOne({ slug, status: "published" }).select("+accessToken").lean() as Record<string, unknown> | null;
  if (!page || !pageIsLive(page as { status?: string; expiresAt?: Date | null })) return null;
  if (page.visibility === "unlisted" && !tokenMatches(String(page.accessToken || ""), key)) return null;
  const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as Record<string, unknown>[];
  return {
    _id: String(page._id), slug: String(page.slug), title: String(page.title || ""), template: String(page.template || "custom"), summary: String(page.summary || ""),
    visibility: String(page.visibility), seoTitle: String(page.seoTitle || ""), seoDescription: String(page.seoDescription || ""), allowIndexing: page.allowIndexing === true && page.visibility === "public",
    coverImageId: String(page.coverImageId || ""), publishedAt: page.publishedAt ? new Date(String(page.publishedAt)).toISOString() : null,
    blocks: blocks.map((block) => ({
      type: String(block.type || ""), text: String(block.text || ""), items: (block.items as string[] || []).map(String), facts: ((block.facts as { label: string; value: string }[]) || []).map((fact) => ({ label: String(fact.label || ""), value: String(fact.value || "") })),
      imageIds: ((block.imageIds as string[]) || []).map(String), caption: String(block.caption || ""), linkUrl: String(block.linkUrl || ""), linkLabel: String(block.linkLabel || ""),
    })),
  };
}

/** Other published, public pages the owner chose to show in the public navigation. */
export async function publicNavigation(): Promise<{ slug: string; title: string }[]> {
  await dbConnect();
  const pages = await PublicPage.find({ status: "published", visibility: "public", showInNav: true }).select("slug title expiresAt status").sort({ navOrder: 1, title: 1 }).limit(12).lean() as unknown as { slug: string; title: string; status: string; expiresAt?: Date | null }[];
  return pages.filter((page) => pageIsLive(page)).map((page) => ({ slug: page.slug, title: page.title }));
}
