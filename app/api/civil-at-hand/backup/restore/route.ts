import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { validateWorkspaceBackup, applyWorkspaceBackup, workspaceBackupWarnings } from "@/modules/civil-at-hand/lib/backup-restore";

export const runtime = "nodejs";
export const maxDuration = 60;
const HEADERS = { "Cache-Control": "no-store" };
const MAX_BACKUP_BYTES = 4_000_000;

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BACKUP_BYTES) return NextResponse.json({ error: "Backup file is too large for browser-based restore (maximum 4 MB). Use Security → Scheduled backups for larger server-side snapshots." }, { status: 413, headers: HEADERS });
    let body: { action?: unknown; backup?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid JSON backup." }, { status: 400, headers: HEADERS }); }
    if (body.action !== "preview" && body.action !== "restore") return NextResponse.json({ error: "Choose preview or restore." }, { status: 400, headers: HEADERS });
    const checked = await validateWorkspaceBackup(body.backup);
    const warnings = workspaceBackupWarnings(checked);
    if (body.action === "preview") return NextResponse.json({ ok: true, counts: checked.counts, invalid: checked.invalid.slice(0, 100), warnings }, { headers: HEADERS });
    if (checked.invalid.length) return NextResponse.json({ error: "Restore stopped because some records failed validation. Fix the backup or restore a clean export first.", invalid: checked.invalid.slice(0, 100), counts: checked.counts, warnings }, { status: 400, headers: HEADERS });
    const restored = await applyWorkspaceBackup(checked);
    await audit(request, "backup-restored", Object.entries(restored).map(([key, value]) => `${key}:${value}`).join(", ").slice(0, 500));
    return NextResponse.json({ ok: true, restored, warnings }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400, headers: HEADERS });
    console.error("Backup restore error:", error);
    return NextResponse.json({ error: "Could not restore this backup. Existing records are not automatically deleted; check server logs and database validation." }, { status: 503, headers: HEADERS });
  }
}
