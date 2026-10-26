import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getCollection } from "@/lib/db";
import { getEnv, adminIsConfigured } from "@/lib/env";

const COOKIE_NAME = "ns_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
type SessionDoc = { _id: string; tokenHash: string; email: string; createdAt: Date; expiresAt: Date };

function tokenHash(token: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Authentication is not configured.");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function safeCompare(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function verifyAdminPassword(email: string, password: string): Promise<boolean> {
  if (!adminIsConfigured()) return false;
  const env = getEnv();
  if (!safeCompare(email.trim().toLowerCase(), env.ADMIN_EMAIL.trim().toLowerCase())) return false;
  try {
    const argon2 = await import("argon2");
    return await argon2.verify(env.ADMIN_PASSWORD_HASH, password);
  } catch {
    return false;
  }
}

export async function createAdminSession(email: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const sessions = await getCollection<SessionDoc>("sessions");
  await sessions.insertOne({ _id: tokenHash(token), tokenHash: tokenHash(token), email, createdAt: now, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high"
  });
}

export async function getAdminSession(): Promise<{ email: string; expiresAt: Date } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || token.length > 100) return null;
  try {
    const sessions = await getCollection<SessionDoc>("sessions");
    const session = await sessions.findOne({ _id: tokenHash(token), tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
    if (!session) return null;
    return { email: session.email, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const sessions = await getCollection<SessionDoc>("sessions");
      await sessions.deleteOne({ _id: tokenHash(token) });
    } catch {
      // Cookie deletion still ends the browser session if the database is temporarily unavailable.
    }
  }
  cookieStore.delete(COOKIE_NAME);
}


export const adminCookieName = COOKIE_NAME;
