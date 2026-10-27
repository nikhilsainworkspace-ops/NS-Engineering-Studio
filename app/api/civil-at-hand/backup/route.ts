import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { createWorkspaceBackup } from "@/modules/civil-at-hand/lib/workspace-backup";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Export core workspace records and note images. Share tokens, passcode hashes and shared-room row snapshots are deliberately left out. */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const backup = await createWorkspaceBackup();
    await audit(request, "backup-downloaded", `${backup.contacts.length} contacts, ${backup.projects.length} projects, ${backup.tasks.length} tasks, ${backup.privateNotes.length} private notes`);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(backup, null, 1), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="civil-at-hand-backup-${stamp}.json"`, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Could not create the backup. Check the database connection." }, { status: 503 });
  }
}
