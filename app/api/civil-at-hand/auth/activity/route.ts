import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate", Pragma: "no-cache", Expires: "0" };

/** Touch the canonical NS session after real same-origin user interaction; status probes do not refresh activity. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403, headers: HEADERS });
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
