import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getSiteSettings, saveSiteSettings } from "@/lib/settings";
import { privateJson, jsonError } from "@/lib/http";
import { settingsSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  try { return privateJson({ settings: await getSiteSettings() }); }
  catch { return jsonError("Site settings are temporarily unavailable.", 503); }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) return jsonError("Request origin was not accepted.", 403);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Please check the site settings fields.", fields: parsed.error.flatten().fieldErrors }, { status: 422, headers: { "Cache-Control": "no-store" } });
  try {
    await saveSiteSettings(parsed.data);
    await writeAudit("settings.updated", "public");
    return privateJson({ ok: true });
  } catch { return jsonError("Settings could not be saved. Confirm the database and retry.", 503); }
}
