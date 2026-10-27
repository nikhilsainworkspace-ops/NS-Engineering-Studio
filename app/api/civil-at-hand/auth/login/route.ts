import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminIsConfigured, getAdminEnv } from "@/lib/env";
import { verifyAdminPassword, createAdminSession } from "@/lib/auth";
import { consumeRateLimit, hashIdentifier } from "@/lib/rate-limit";
import { isSameOrigin, jsonError, privateJson } from "@/lib/http";
import { writeAudit } from "@/lib/audit";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { isValidTotpSecret, verifyTotp } from "@/modules/civil-at-hand/lib/totp";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { LoginAttempt } from "@/modules/civil-at-hand/models/LoginAttempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string | undefined) {
  const left = Buffer.from(a); const right = Buffer.from(b ?? "");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Compatibility login for the migrated workspace. It creates the same NS session used by /admin. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Sign-in could not be completed.", 403);
  if (!adminIsConfigured()) return jsonError("Primary NS Engineering Studio administrator credentials are not configured. No default account exists.", 503);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 5000) return jsonError("Sign-in could not be completed.", 400);
  let body: { username?: string; email?: string; password?: string; code?: string };
  try { body = await request.json(); } catch { return jsonError("Please send a valid login form.", 400); }
  const username = String(body.username ?? body.email ?? "").trim().slice(0, 254);
  const password = String(body.password ?? "").slice(0, 1024);
  const code = String(body.code ?? "").replace(/\D/g, "").slice(0, 6);
  if (!username || !password) return jsonError("Email or password is incorrect.", 401);

  try {
    const env = getAdminEnv();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const throttle = await consumeRateLimit(`admin-login:${hashIdentifier(ip, env.AUTH_SECRET)}`, 8, 15 * 60 * 1000);
    if (!throttle.allowed) {
      await writeAudit("admin.login.throttled", undefined, "system");
      return jsonError("Too many attempts. Please wait 15 minutes before trying again.", 429);
    }

    const totpEnv = process.env.ADMIN_TOTP_SECRET?.trim();
    if (totpEnv && !isValidTotpSecret(totpEnv)) return jsonError("The configured authenticator key is invalid. Correct it or remove it from the deployment environment.", 503);

    // First accept the canonical Argon2id administrator. During migration only, a configured
    // legacy CAH credential pair may also establish this same NS session; remove legacy vars
    // after confirming the primary account works.
    const primaryPasswordOk = await verifyAdminPassword(username, password);
    const legacyUserOk = safeEqual(username, process.env.ADMIN_USERNAME);
    const legacyPasswordOk = safeEqual(password, process.env.ADMIN_PASSWORD);
    const legacyPasswordLogin = legacyUserOk && legacyPasswordOk;

    let codeStep: number | null = null;
    let codeOk = !totpEnv;
    if (totpEnv) {
      codeStep = verifyTotp(totpEnv, code);
      codeOk = codeStep !== null;
    }
    if (!(primaryPasswordOk || legacyPasswordLogin) || !codeOk) {
      await writeAudit("admin.login.rejected", undefined, "system");
      await audit(request, "login-failed", "Credentials rejected");
      return jsonError(totpEnv ? "Email, password or authenticator code is incorrect." : "Email or password is incorrect.", 401);
    }

    if (totpEnv && codeStep !== null) {
      await dbConnect();
      const claimAt = new Date();
      try {
        await LoginAttempt.updateOne({ key: "totp:last" }, { $setOnInsert: { count: -1, windowStart: claimAt, blockedUntil: null } }, { upsert: true });
      } catch (error) {
        if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) throw error;
      }
      const claimed = await LoginAttempt.findOneAndUpdate({ key: "totp:last", count: { $lt: codeStep } }, { $set: { count: codeStep, windowStart: claimAt, blockedUntil: null } }, { new: true });
      if (!claimed) return jsonError("That authenticator code has already been used. Wait for a new code and retry.", 401);
    }

    await createAdminSession(env.ADMIN_EMAIL.toLowerCase());
    await writeAudit("admin.login.succeeded", undefined, "admin");
    await audit(request, "login", totpEnv ? "with two-step verification" : "shared NS session");
    return privateJson({ ok: true });
  } catch {
    return jsonError("Sign-in could not be completed. Check database and authentication configuration.", 503);
  }
}
