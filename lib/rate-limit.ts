import "server-only";
import { createHash } from "node:crypto";
import { getCollection } from "@/lib/db";

type RateLimitDoc = { _id: string; count: number; windowStart: number; expiresAt: Date };

export function hashIdentifier(value: string, secret = process.env.AUTH_SECRET ?? "local-identifier-salt-not-for-production"): string {
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number }> {
  const collection = await getCollection<RateLimitDoc>("rateLimits");
  const now = Date.now();
  const windowStart = now - windowMs;
  let current = await collection.findOne({ _id: key });
  if (!current || current.windowStart <= windowStart) {
    await collection.updateOne(
      { _id: key, ...(current ? { windowStart: current.windowStart } : {}) },
      { $set: { windowStart: now, count: 1, expiresAt: new Date(now + windowMs * 2) } },
      { upsert: true }
    ).catch(async (error: unknown) => {
      // Simultaneous first requests can race on the unique _id; count this request after the winner.
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        await collection.updateOne({ _id: key }, { $inc: { count: 1 } });
        return;
      }
      throw error;
    });
    current = await collection.findOne({ _id: key });
  } else {
    current = await collection.findOneAndUpdate({ _id: key }, { $inc: { count: 1 } }, { returnDocument: "after" });
  }
  const count = current?.count ?? limit + 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
