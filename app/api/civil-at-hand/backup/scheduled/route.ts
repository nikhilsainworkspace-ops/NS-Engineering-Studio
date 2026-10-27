import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { createWorkspaceBackup, workspaceBackupCounts } from "@/modules/civil-at-hand/lib/workspace-backup";
import { BackupSnapshot } from "@/modules/civil-at-hand/models/BackupSnapshot";
import { BackupSnapshotChunk } from "@/modules/civil-at-hand/models/BackupSnapshotChunk";

export const runtime = "nodejs";
export const maxDuration = 60;
const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const CHUNK_CHARS = 750_000;

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 32) return false;
  const provided = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function retentionDays() {
  const configured = Number(process.env.BACKUP_RETENTION_DAYS || 7);
  return Number.isFinite(configured) ? Math.max(1, Math.min(30, Math.floor(configured))) : 7;
}

export async function GET(request: Request) {
  // Vercel Cron invokes GET endpoints. Route its authenticated request through the same snapshot writer as manual POST.
  if (cronAuthorized(request)) {
    return POST(new Request(request.url, { method: "POST", headers: { Authorization: request.headers.get("authorization") || "", "Content-Type": "application/json" }, body: "{}" }));
  }
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  try {
    await dbConnect();
    const snapshots = await BackupSnapshot.find({ status: "complete" }).sort({ createdAt: -1 }).limit(30).lean() as unknown as { _id: unknown; createdAt: Date; completedAt?: Date | null; byteLength: number; chunkCount: number; counts: Record<string, number>; trigger: string; sha256: string }[];
    return NextResponse.json({ backups: snapshots.map((item) => ({ _id: String(item._id), createdAt: item.createdAt, completedAt: item.completedAt, byteLength: item.byteLength, chunkCount: item.chunkCount, counts: item.counts || {}, trigger: item.trigger })) }, { headers: HEADERS });
  } catch (error) {
    console.error("Scheduled backup list error:", error);
    return NextResponse.json({ error: "Could not load scheduled backups." }, { status: 503, headers: HEADERS });
  }
}

export async function POST(request: Request) {
  const byCron = cronAuthorized(request);
  if (!byCron && !(await isAdmin())) return NextResponse.json({ error: "Sign in as admin or provide the configured CRON_SECRET." }, { status: 401, headers: HEADERS });
  let snapshotId = "";
  try {
    await dbConnect();
    const backup = await createWorkspaceBackup();
    const json = JSON.stringify(backup);
    // Chunks prevent MongoDB's 16 MB document limit from capping full snapshots with multiple images.
    const chunks: string[] = [];
    for (let offset = 0; offset < json.length; offset += CHUNK_CHARS) chunks.push(json.slice(offset, offset + CHUNK_CHARS));
    const metadata = await BackupSnapshot.create({ status: "building", byteLength: Buffer.byteLength(json, "utf8"), sha256: createHash("sha256").update(json).digest("hex"), chunkCount: chunks.length, counts: workspaceBackupCounts(backup), trigger: byCron ? "scheduled" : "manual" });
    snapshotId = String(metadata._id);
    for (let start = 0; start < chunks.length; start += 100) {
      await BackupSnapshotChunk.insertMany(chunks.slice(start, start + 100).map((payload, index) => ({ snapshotId: metadata._id, sequence: start + index, payload })), { ordered: true });
    }
    await BackupSnapshot.updateOne({ _id: metadata._id, status: "building" }, { $set: { status: "complete", completedAt: new Date() } });
    const cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000);
    const expired = await BackupSnapshot.find({ createdAt: { $lt: cutoff } }).select("_id").lean() as unknown as { _id: unknown }[];
    if (expired.length) {
      const ids = expired.map((item) => item._id);
      await BackupSnapshotChunk.deleteMany({ snapshotId: { $in: ids } });
      await BackupSnapshot.deleteMany({ _id: { $in: ids } });
    }
    // Retain a safety cap in case the cron was run repeatedly within the retention window.
    const newest = await BackupSnapshot.find({ status: "complete" }).sort({ createdAt: -1 }).skip(30).select("_id").lean() as unknown as { _id: unknown }[];
    if (newest.length) {
      const ids = newest.map((item) => item._id);
      await BackupSnapshotChunk.deleteMany({ snapshotId: { $in: ids } });
      await BackupSnapshot.deleteMany({ _id: { $in: ids } });
    }
    if (!byCron) await audit(request, "backup-snapshot-created", `${snapshotId}; ${json.length} chars`);
    return NextResponse.json({ ok: true, backup: { _id: snapshotId, byteLength: Buffer.byteLength(json, "utf8"), chunkCount: chunks.length, counts: workspaceBackupCounts(backup), trigger: byCron ? "scheduled" : "manual" } }, { status: 201, headers: HEADERS });
  } catch (error) {
    if (snapshotId) {
      await Promise.allSettled([BackupSnapshotChunk.deleteMany({ snapshotId }), BackupSnapshot.deleteOne({ _id: snapshotId })]);
    }
    console.error("Scheduled backup create error:", error);
    return NextResponse.json({ error: "Could not create the backup snapshot. Check the database connection and storage capacity." }, { status: 503, headers: HEADERS });
  }
}
