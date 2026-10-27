import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { NoteShare } from "@/modules/civil-at-hand/models/NoteShare";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; shareId: string }> };
export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id, shareId } = await context.params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(shareId)) return NextResponse.json({ error: "Invalid share ID." }, { status: 400 });
  try {
    await dbConnect();
    const share = await NoteShare.findOneAndUpdate({ _id: shareId, noteId: id, active: true }, { $set: { active: false, revokedAt: new Date() } }, { new: true }).lean();
    if (!share) return NextResponse.json({ error: "Active share link not found." }, { status: 404 });
    await audit(request, "private-note-share-revoked");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Note share revoke error:", error);
    return NextResponse.json({ error: "Could not revoke this share link." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
