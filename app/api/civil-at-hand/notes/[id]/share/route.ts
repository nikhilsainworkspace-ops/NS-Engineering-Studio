import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { PrivateNote } from "@/modules/civil-at-hand/models/PrivateNote";
import { NoteAsset } from "@/modules/civil-at-hand/models/NoteAsset";
import { NoteShare } from "@/modules/civil-at-hand/models/NoteShare";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const HEADERS = { "Cache-Control": "no-store" };

export async function GET(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    await dbConnect();
    const shares = await NoteShare.find({ noteId: id }).sort({ createdAt: -1 }).limit(50).lean() as unknown as { _id: unknown; token: string; active: boolean; expiresAt: Date; createdAt: Date; revokedAt?: Date | null }[];
    return NextResponse.json({ shares: shares.map((item) => ({ _id: String(item._id), token: item.token, active: item.active && new Date(item.expiresAt).getTime() > Date.now(), expiresAt: item.expiresAt, createdAt: item.createdAt, revokedAt: item.revokedAt || null })) }, { headers: HEADERS });
  } catch (error) {
    console.error("Note share list error:", error);
    return NextResponse.json({ error: "Could not load note share links." }, { status: 503, headers: HEADERS });
  }
}

export async function POST(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: HEADERS });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    let body: { expiresInDays?: unknown };
    try { body = await request.json(); } catch { body = {}; }
    const days = Number(body.expiresInDays ?? 7);
    if (![1, 7, 30, 90].includes(days)) return NextResponse.json({ error: "Choose a supported expiry (1, 7, 30 or 90 days)." }, { status: 400 });
    await dbConnect();
    const note = await PrivateNote.findOne({ _id: id, deletedAt: null }).lean() as unknown as { _id: unknown; title: string; content: string; tags: string[] } | null;
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    const assets = await NoteAsset.find({ noteId: id }, { _id: 1 }).lean() as unknown as { _id: unknown }[];
    const token = randomBytes(24).toString("hex");
    const share = await NoteShare.create({ token, noteId: id, title: note.title, content: note.content, tags: note.tags || [], assetIds: assets.map((asset) => String(asset._id)), active: true, expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000) });
    await audit(request, "private-note-share-created");
    const origin = new URL(request.url).origin;
    return NextResponse.json({ share: { _id: String(share._id), token, active: true, expiresAt: share.expiresAt, createdAt: share.createdAt, shareUrl: `${origin}/workspace/shared/${token}` } }, { status: 201, headers: HEADERS });
  } catch (error) {
    console.error("Note share create error:", error);
    return NextResponse.json({ error: "Could not create a private note link." }, { status: 503, headers: HEADERS });
  }
}
