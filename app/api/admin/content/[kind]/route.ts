import { NextRequest } from "next/server";
import { getCollection, getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { privateJson, jsonError } from "@/lib/http";
import { getContent, type ContentKind } from "@/lib/content";
import { serviceSchema, faqSchema, projectSchema, softwareSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

type ContentDoc = Record<string, unknown> & { _id: string; type: ContentKind; slug: string; deleted?: boolean; published?: boolean; createdAt?: Date; updatedAt?: Date };
type Params = { params: Promise<{ kind: string }> };
const validKind = (value: string): value is ContentKind => value === "services" || value === "faqs" || value === "projects" || value === "software";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: Params) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  const { kind } = await context.params;
  if (!validKind(kind)) return jsonError("Unknown content type.", 404);
  try {
    await getDb();
    const items = await getContent(kind, false);
    return privateJson({ items });
  } catch { return jsonError("Content is unavailable because the database could not be reached.", 503); }
}

export async function POST(request: NextRequest, context: Params) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) return jsonError("Request origin was not accepted.", 403);
  const { kind } = await context.params;
  if (!validKind(kind)) return jsonError("Unknown content type.", 404);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  const schema = kind === "services" ? serviceSchema : kind === "faqs" ? faqSchema : kind === "projects" ? projectSchema : softwareSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Please review the content fields.", fields: parsed.error.flatten().fieldErrors }, { status: 422, headers: { "Cache-Control": "no-store" } });
  try {
    await getDb();
    const existing = await getContent(kind, false);
    if (existing.some((item) => item.slug === parsed.data.slug)) return jsonError("That slug already exists. Edit the existing item or choose another slug.", 409);
    const collection = await getCollection<ContentDoc>("content");
    const now = new Date();
    await collection.insertOne({ _id: parsed.data.slug, type: kind, ...parsed.data, deleted: false, isStarter: false, createdAt: now, updatedAt: now });
    await writeAudit(`content.${kind}.created`, parsed.data.slug);
    return privateJson({ ok: true }, 201);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return jsonError("That slug already exists. Choose another.", 409);
    return jsonError("Content could not be saved. Please retry.", 503);
  }
}
