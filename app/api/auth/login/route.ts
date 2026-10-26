import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { adminIsConfigured, getAdminEnv } from "@/lib/env";
import { consumeRateLimit, hashIdentifier } from "@/lib/rate-limit";
import { createAdminSession, verifyAdminPassword } from "@/lib/auth";
import { isSameOrigin, jsonError, privateJson } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Sign-in could not be completed.", 403);
  if (!adminIsConfigured()) return jsonError("Admin sign-in is not configured. No default account is available.", 503);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 5000) return jsonError("Sign-in could not be completed.", 400);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("Sign-in could not be completed.", 400); }
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return jsonError("Email or password is incorrect.", 401);

  try {
    const env = getAdminEnv();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const rate = await consumeRateLimit(`admin-login:${hashIdentifier(ip, env.AUTH_SECRET)}`, 8, 15 * 60 * 1000);
    if (!rate.allowed) {
      await writeAudit("admin.login.throttled", undefined, "system");
      return jsonError("Sign-in is temporarily unavailable. Please try again later.", 429);
    }
    const valid = await verifyAdminPassword(parsed.data.email, parsed.data.password);
    if (!valid) {
      await writeAudit("admin.login.rejected", undefined, "system");
      return jsonError("Email or password is incorrect.", 401);
    }
    await createAdminSession(env.ADMIN_EMAIL.toLowerCase());
    await writeAudit("admin.login.succeeded", undefined, "admin");
    return privateJson({ ok: true });
  } catch {
    return jsonError("Sign-in could not be completed right now. Check the server configuration and try again.", 503);
  }
}
