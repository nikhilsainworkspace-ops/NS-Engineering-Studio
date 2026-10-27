import { NextResponse } from "next/server";
import { destroyAdminSession, getAdminSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { writeAudit } from "@/lib/audit";
import { audit } from "@/modules/civil-at-hand/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Sign-out could not be completed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const session = await getAdminSession();
  await destroyAdminSession();
  if (session) {
    await writeAudit("admin.logout", undefined, "admin");
    await audit(request, "logout", "shared NS session");
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate", Pragma: "no-cache", Expires: "0", "Clear-Site-Data": '"cache", "storage"', "Referrer-Policy": "no-referrer" } });
}
