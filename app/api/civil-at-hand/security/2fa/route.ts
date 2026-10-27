import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { generateTotpSecret, isValidTotpSecret, otpauthUrl, verifyTotp } from "@/modules/civil-at-hand/lib/totp";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({ enabled: Boolean(process.env.ADMIN_TOTP_SECRET?.trim()) }, { headers: { "Cache-Control": "no-store" } });
}

/** Stateless helper for setting up 2FA. Nothing is stored: you copy the key into the ADMIN_TOTP_SECRET environment variable yourself. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  let body: { action?: string; secret?: string; code?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.action === "generate") {
    const secret = generateTotpSecret();
    return NextResponse.json({ secret, url: otpauthUrl(secret, process.env.ADMIN_EMAIL || "admin", brand.name) }, { headers: { "Cache-Control": "no-store" } });
  }
  if (body.action === "verify") {
    const secret = String(body.secret || "").trim();
    if (!isValidTotpSecret(secret)) return NextResponse.json({ error: "That key is not valid." }, { status: 400 });
    return NextResponse.json({ ok: verifyTotp(secret, String(body.code || "")) !== null });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
