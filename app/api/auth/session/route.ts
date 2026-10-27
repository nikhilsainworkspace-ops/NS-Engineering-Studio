import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { adminIsConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getAdminSession({ touch: false });
  return NextResponse.json({ authenticated: Boolean(session), configured: adminIsConfigured(), appName: "NS Engineering Studio", email: session?.email ?? "" }, { headers: { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Cookie" } });
}
