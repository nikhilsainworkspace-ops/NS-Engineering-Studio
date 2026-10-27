import { createHash, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { validateWorkspaceBackup, applyWorkspaceBackup, workspaceBackupWarnings } from "@/modules/civil-at-hand/lib/backup-restore";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { BackupSnapshot } from "@/modules/civil-at-hand/models/BackupSnapshot";
import { BackupSnapshotChunk } from "@/modules/civil-at-hand/models/BackupSnapshotChunk";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

async function getSnapshot(id: string) {
  await dbConnect();
  const snapshot = await BackupSnapshot.findOne({ _id: id, status: "complete" }).lean() as unknown as { _id: unknown; sha256: string; chunkCount: number; byteLength: number } | null;
  if (!snapshot) throw new InputError("Scheduled backup not found or incomplete.");
  const chunks = await BackupSnapshotChunk.find({ snapshotId: snapshot._id }).sort({ sequence: 1 }).lean() as unknown as { sequence: number; payload: string }[];
  if (chunks.length !== snapshot.chunkCount || chunks.some((chunk, index) => chunk.sequence !== index)) throw new InputError("This backup snapshot is incomplete. It has not changed your database.");
  const text = chunks.map((chunk) => chunk.payload).join("");
  if (Buffer.byteLength(text, "utf8") !== snapshot.byteLength) throw new InputError("The backup snapshot size does not match its manifest.");
  const actual = createHash("sha256").update(text).digest("hex");
  const a = Buffer.from(actual); const b = Buffer.from(snapshot.sha256);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new InputError("The backup snapshot checksum failed. It has not changed your database.");
  try { return JSON.parse(text) as unknown; } catch { throw new InputError("The stored backup is not valid JSON. It has not changed your database."); }
}

export async function POST(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid backup ID." }, { status: 400, headers: HEADERS });
  try {
    let body: { action?: unknown };
    try { body = await request.json(); } catch { body = {}; }
    if (body.action !== "preview" && body.action !== "restore") return NextResponse.json({ error: "Choose preview or restore." }, { status: 400, headers: HEADERS });
    const backup = await getSnapshot(id);
    const checked = await validateWorkspaceBackup(backup);
    const warnings = workspaceBackupWarnings(checked);
    if (body.action === "preview") return NextResponse.json({ ok: true, counts: checked.counts, invalid: checked.invalid.slice(0, 100), warnings }, { headers: HEADERS });
    if (checked.invalid.length) return NextResponse.json({ error: "Restore stopped because validation found issues. The database has not been changed.", invalid: checked.invalid.slice(0, 100), counts: checked.counts, warnings }, { status: 400, headers: HEADERS });
    const restored = await applyWorkspaceBackup(checked);
    await audit(request, "scheduled-backup-restored", `${id}; ${Object.entries(restored).map(([key, value]) => `${key}:${value}`).join(", ")}`.slice(0, 500));
    return NextResponse.json({ ok: true, restored, warnings }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400, headers: HEADERS });
    console.error("Scheduled backup restore error:", error);
    return NextResponse.json({ error: "Could not restore this backup. Existing records are not automatically deleted; check server logs." }, { status: 503, headers: HEADERS });
  }
}
