import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { normalizePrivateNoteInput } from "@/modules/civil-at-hand/lib/private-notes";
import { PrivateNote } from "@/modules/civil-at-hand/models/PrivateNote";
import { NoteAsset } from "@/modules/civil-at-hand/models/NoteAsset";
import { NoteShare } from "@/modules/civil-at-hand/models/NoteShare";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const HEADERS = { "Cache-Control": "no-store" };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    let payload: Record<string, unknown>;
    try { payload = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Send a valid JSON note." }, { status: 400 }); }
    const normalized = normalizePrivateNoteInput(payload);
    await dbConnect();
    const note = await PrivateNote.findById(id);
    if (!note || note.deletedAt) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    const changed = note.title !== normalized.title || note.content !== normalized.content || JSON.stringify(note.tags || []) !== JSON.stringify(normalized.tags);
    if (changed) {
      const history = Array.isArray(note.history) ? note.history : [];
      history.push({ title: note.title, content: note.content, tags: note.tags || [], at: new Date() });
      note.history = history.slice(-20) as typeof note.history;
    }
    Object.assign(note, normalized);
    await note.save();
    await audit(request, "private-note-updated");
    return NextResponse.json({ note: note.toObject() }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Private note update error:", error);
    return NextResponse.json({ error: "Could not update this note." }, { status: 503, headers: HEADERS });
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    let body: { action?: unknown; value?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 }); }
    const allowed = ["pinned", "archived", "favorite", "restore"];
    if (typeof body.action !== "string" || !allowed.includes(body.action) || (body.action !== "restore" && typeof body.value !== "boolean")) {
      return NextResponse.json({ error: "Choose a valid note action." }, { status: 400 });
    }
    await dbConnect();
    const update = body.action === "restore" ? { $set: { deletedAt: null } } : { $set: { [body.action]: body.value } };
    const note = await PrivateNote.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    const action = body.action === "restore" ? "private-note-restored-from-trash" : `private-note-${body.action}-${body.value ? "enabled" : "disabled"}`;
    await audit(request, action);
    return NextResponse.json({ note }, { headers: HEADERS });
  } catch (error) {
    console.error("Private note action error:", error);
    return NextResponse.json({ error: "Could not update this note." }, { status: 503, headers: HEADERS });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    await dbConnect();
    const url = new URL(request.url);
    if (url.searchParams.get("permanent") === "true") {
      const note = await PrivateNote.findByIdAndDelete(id);
      if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
      await Promise.all([NoteAsset.deleteMany({ noteId: id }), NoteShare.updateMany({ noteId: id, active: true }, { $set: { active: false, revokedAt: new Date() } })]);
      await audit(request, "private-note-permanently-deleted");
      return NextResponse.json({ ok: true, permanent: true }, { headers: HEADERS });
    }
    const note = await PrivateNote.findByIdAndUpdate(id, { $set: { deletedAt: new Date() } }, { new: true, runValidators: true }).lean();
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    await NoteShare.updateMany({ noteId: id, active: true }, { $set: { active: false, revokedAt: new Date() } });
    await audit(request, "private-note-moved-to-trash");
    return NextResponse.json({ ok: true, trashed: true }, { headers: HEADERS });
  } catch (error) {
    console.error("Private note delete error:", error);
    return NextResponse.json({ error: "Could not move this note to the recycle bin." }, { status: 503, headers: HEADERS });
  }
}
