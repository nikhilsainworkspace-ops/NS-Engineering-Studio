import { NextRequest } from "next/server";
import { destroyAdminSession, getAdminSession } from "@/lib/auth";
import { isSameOrigin, jsonError, privateJson } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Sign-out could not be completed.", 403);
  const session = await getAdminSession();
  await destroyAdminSession();
  if (session) await writeAudit("admin.logout", undefined, "admin");
  return privateJson({ ok: true });
}
