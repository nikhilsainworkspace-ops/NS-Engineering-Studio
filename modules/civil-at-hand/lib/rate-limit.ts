import { createHash } from "node:crypto";
import { LoginAttempt } from "@/modules/civil-at-hand/models/LoginAttempt";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { clientIpFromHeaders } from "@/modules/civil-at-hand/lib/security";

/** Counts hits for (bucket, caller) in a time window. Returns true when the caller is over the limit. Fails open if the database is unreachable. */
export async function tooManyRequests(request: Request, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    await dbConnect();
    const ip = clientIpFromHeaders((name) => request.headers.get(name));
    const key = `rl:${bucket}:${createHash("sha256").update(`${ip}:${process.env.AUTH_SECRET || "not-configured"}`).digest("hex").slice(0, 32)}`;
    const now = Date.now();
    const row = (await LoginAttempt.findOne({ key }).lean()) as unknown as { count?: number; windowStart?: Date } | null;
    const fresh = !row?.windowStart || now - new Date(row.windowStart).getTime() > windowSeconds * 1000;
    const count = fresh ? 1 : Number(row?.count || 0) + 1;
    await LoginAttempt.findOneAndUpdate({ key }, { $set: { count, windowStart: fresh ? new Date(now) : row?.windowStart, blockedUntil: null } }, { upsert: true });
    return count > limit;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return false;
  }
}
