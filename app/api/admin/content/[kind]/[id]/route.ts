import { NextRequest } from "next/server";
import { getCollection, getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { privateJson, jsonError } from "@/lib/http";
import { type ContentKind } from "@/lib/content";
import { STARTER_FAQS, STARTER_SERVICES } from "@/lib/brand";
import { serviceSchema, faqSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

type ContentDoc = Record<string, unknown> & { _id: string; type: ContentKind; slug: string; deleted?: boolean; published?: boolean; createdAt?: Date; updatedAt?: Date };
type Params = { params: Promise<{ kind: string; id: string }> };
const validKind = (value: string): value is ContentKind => value === "services" || value === "faqs";
const validId = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: Params) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) return jsonError("Request origin was not accepted.", 403);
  const { kind, id } = await context.params;
  if (!validKind(kind) || !validId(id)) return jsonError("Invalid content reference.", 400);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  const parsed = kind === "services" ? serviceSchema.safeParse(raw) : faqSchema.safeParse(raw);
  if (!parsed.success || parsed.data.slug !== id) return jsonError("Please check the content fields and keep the slug unchanged.", 422);
  try {
    await getDb();
    const collection = await getCollection<ContentDoc>("content");
    const now = new Date();
    await collection.updateOne({ _id: id, type: kind }, { $set: { ...parsed.data, type: kind, slug: id, isStarter: false, deleted: false, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
    await writeAudit(`content.${kind}.updated`, id);
    return privateJson({ ok: true });
  } catch { return jsonError("Content could not be updated. Please retry.", 503); }
}

export async function DELETE(request: NextRequest, context: Params) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) return jsonError("Request origin was not accepted.", 403);
  const { kind, id } = await context.params;
  if (!validKind(kind) || !validId(id)) return jsonError("Invalid content reference.", 400);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("Deletion confirmation is required.", 400); }
  if (!raw || typeof raw !== "object" || !("confirm" in raw) || raw.confirm !== true) return jsonError("Deletion confirmation is required.", 400);
  try {
    await getDb();
    const collection = await getCollection<ContentDoc>("content");
    const isStarter = (kind === "services" ? STARTER_SERVICES : STARTER_FAQS).some((item) => item.slug === id);
    if (isStarter) {
      const now = new Date();
      await collection.updateOne({ _id: id, type: kind }, { $set: { type: kind, slug: id, deleted: true, published: false, updatedAt: now }, $setOnInsert: { createdAt: now, sortOrder: 100, isStarter: false } }, { upsert: true });
    } else {
      await collection.deleteOne({ _id: id, type: kind });
    }
    await writeAudit(`content.${kind}.deleted`, id);
    return privateJson({ ok: true });
  } catch { return jsonError("Content could not be deleted. Please retry.", 503); }
}
