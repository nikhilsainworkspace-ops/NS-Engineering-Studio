// Validation for owner-built public pages. Pages only ever contain what the owner typed or uploaded for
// that page; nothing here reads contacts, projects, finance or any other private record.
import { cleanString } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { publicBlockTypes, publicPageTemplates } from "@/modules/civil-at-hand/lib/entities";

export const RESERVED_SLUGS = ["api", "admin", "join", "shared", "print", "p", "login", "settings", "new", "edit"];
const OBJECT_ID = /^[a-f\d]{24}$/i;

export type PublicBlock = {
  type: string; text: string; items: string[]; facts: { label: string; value: string }[]; imageIds: string[]; caption: string; linkUrl: string; linkLabel: string;
};
export type PublicPageInput = {
  slug: string; title: string; template: string; summary: string; visibility: "public" | "unlisted"; expiresAt: Date | null;
  seoTitle: string; seoDescription: string; allowIndexing: boolean; showInNav: boolean; navOrder: number; coverImageId: string; blocks: PublicBlock[];
};

export function normalizeSlug(value: unknown): string {
  const slug = cleanString(value, 80).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  if (!slug || slug.length < 2) throw new InputError("Choose a web address (slug) of at least 2 letters or numbers, e.g. “our-projects”.");
  if (RESERVED_SLUGS.includes(slug)) throw new InputError("That web address is reserved. Choose a different one.");
  return slug;
}

/** Only http(s), mailto:, tel:, site-relative public paths (/workspace/p/…, /workspace/join/…) and on-page anchors are allowed. */
export function safeLink(value: unknown): string {
  const url = cleanString(value, 500);
  if (!url) return "";
  if (/^https?:\/\/[^\s<>"']+$/i.test(url)) return url;
  if (/^mailto:[^\s<>"']+$/i.test(url) || /^tel:\+?[0-9 ()-]{3,30}$/i.test(url)) return url;
  if (/^\/(p|join)\/[A-Za-z0-9/_-]+$/.test(url)) return url;
  if (/^#[A-Za-z0-9_-]+$/.test(url)) return url;
  throw new InputError("Links must start with https://, mailto:, tel:, /workspace/p/ or /workspace/join/.");
}

function normalizeBlock(raw: unknown, index: number): PublicBlock {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const type = cleanString(row.type, 20);
  if (!publicBlockTypes.some((item) => item.value === type)) throw new InputError(`Block ${index + 1}: choose a valid block type.`);
  const items = Array.isArray(row.items) ? row.items.map((item) => cleanString(item, 300)).filter(Boolean).slice(0, 40) : [];
  const facts = Array.isArray(row.facts) ? row.facts.map((fact) => {
    const value = (fact && typeof fact === "object" ? fact : {}) as Record<string, unknown>;
    return { label: cleanString(value.label, 80), value: cleanString(value.value, 160) };
  }).filter((fact) => fact.label || fact.value).slice(0, 24) : [];
  const imageIds = Array.isArray(row.imageIds) ? row.imageIds.map((id) => cleanString(id, 24)).filter((id) => OBJECT_ID.test(id)).slice(0, 24) : [];
  const block: PublicBlock = {
    type, text: cleanString(row.text, type === "heading" ? 200 : 6000), items, facts, imageIds,
    caption: cleanString(row.caption, 300), linkUrl: type === "cta" ? safeLink(row.linkUrl) : "", linkLabel: cleanString(row.linkLabel, 80),
  };
  if ((type === "heading" || type === "text") && !block.text) throw new InputError(`Block ${index + 1}: add some text or remove the block.`);
  if (type === "list" && !block.items.length) throw new InputError(`Block ${index + 1}: add at least one list item or remove the block.`);
  if (type === "facts" && !block.facts.length) throw new InputError(`Block ${index + 1}: add at least one fact or remove the block.`);
  if (type === "cta" && (!block.linkUrl || !block.linkLabel)) throw new InputError(`Block ${index + 1}: a button needs both a label and a link.`);
  if ((type === "image" || type === "gallery") && !block.imageIds.length) throw new InputError(`Block ${index + 1}: choose at least one image.`);
  return block;
}

export function normalizePublicPageInput(payload: Record<string, unknown>): PublicPageInput {
  const title = cleanString(payload.title, 160);
  if (!title) throw new InputError("Give the page a title.");
  const template = cleanString(payload.template, 40) || "custom";
  if (!publicPageTemplates.some((item) => item.value === template)) throw new InputError("Choose a valid page template.");
  const visibility = payload.visibility === "unlisted" ? "unlisted" : "public";
  const blocksRaw = Array.isArray(payload.blocks) ? payload.blocks : [];
  if (blocksRaw.length > 60) throw new InputError("A page can have at most 60 content blocks.");
  let expiresAt: Date | null = null;
  if (payload.expiresAt) {
    const ms = Date.parse(String(payload.expiresAt));
    if (Number.isNaN(ms)) throw new InputError("Choose a valid expiry date.");
    expiresAt = new Date(ms);
  }
  const coverImageId = cleanString(payload.coverImageId, 24);
  return {
    slug: normalizeSlug(payload.slug || title), title, template, summary: cleanString(payload.summary, 400), visibility, expiresAt,
    seoTitle: cleanString(payload.seoTitle, 160), seoDescription: cleanString(payload.seoDescription, 300),
    allowIndexing: visibility === "public" && payload.allowIndexing === true, showInNav: visibility === "public" && payload.showInNav === true,
    navOrder: Math.max(0, Math.min(999, Math.floor(Number(payload.navOrder) || 0))), coverImageId: OBJECT_ID.test(coverImageId) ? coverImageId : "",
    blocks: blocksRaw.map((block, index) => normalizeBlock(block, index)),
  };
}

/** Every image a page may serve publicly. Anything else is refused by the public image route. */
export function pageImageIds(page: { coverImageId?: string; blocks?: { imageIds?: string[] }[] }): string[] {
  return Array.from(new Set([page.coverImageId || "", ...(page.blocks || []).flatMap((block) => block.imageIds || [])].filter((id) => OBJECT_ID.test(id))));
}

export function pageIsLive(page: { status?: string; expiresAt?: Date | string | null }, now = Date.now()): boolean {
  if (page.status !== "published") return false;
  if (page.expiresAt && new Date(page.expiresAt).getTime() <= now) return false;
  return true;
}
