import "server-only";
import { randomUUID } from "node:crypto";
import { getCollection } from "@/lib/db";

type AuditEvent = { _id: string; action: string; subject?: string; actor: "admin" | "system"; createdAt: Date; expiresAt: Date };

export async function writeAudit(action: string, subject?: string, actor: "admin" | "system" = "admin"): Promise<void> {
  try {
    const events = await getCollection<AuditEvent>("auditEvents");
    const now = new Date();
    await events.insertOne({ _id: randomUUID(), action: action.slice(0, 80), subject: subject?.slice(0, 100), actor, createdAt: now, expiresAt: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) });
  } catch {
    // Audit failures must not leak operational details or expose secrets to request logs.
    console.error("Security audit event could not be persisted.");
  }
}
