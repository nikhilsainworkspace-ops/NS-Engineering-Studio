import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { NoteAsset } from "@/modules/civil-at-hand/models/NoteAsset";
import { PrivateNote } from "@/modules/civil-at-hand/models/PrivateNote";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    await dbConnect();
    const asset = await NoteAsset.findById(id).select("+data").lean() as unknown as { _id: unknown; noteId: unknown; filename: string; mimeType: string; size: number; data: Buffer } | null;
    if (!asset) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    const note = await PrivateNote.findOne({ _id: asset.noteId, deletedAt: null }).select("_id").lean();
    if (!note) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(new Uint8Array(asset.data), { headers: { "Content-Type": asset.mimeType, "Content-Length": String(asset.size), "Content-Disposition": `inline; filename="${asset.filename.replace(/["\\\r\n]/g, "-")}"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" } });
  } catch (error) {
    console.error("Note asset fetch error:", error);
    return new Response("Could not load image", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
