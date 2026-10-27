import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { PrivateNote } from "@/modules/civil-at-hand/models/PrivateNote";
import { NoteAsset } from "@/modules/civil-at-hand/models/NoteAsset";

export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
type Context = { params: Promise<{ id: string }> };

function validImage(bytes: Buffer, mime: string): boolean {
  if (mime === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/gif") return bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"));
  if (mime === "image/webp") return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function GET(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    await dbConnect();
    const note = await PrivateNote.findOne({ _id: id, deletedAt: null }).select("_id").lean();
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    const assets = await NoteAsset.find({ noteId: id }, { filename: 1, mimeType: 1, size: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean() as unknown as { _id: unknown; filename: string; mimeType: string; size: number; createdAt: Date }[];
    return NextResponse.json({ assets: assets.map((asset) => ({ _id: String(asset._id), filename: asset.filename, mimeType: asset.mimeType, size: asset.size, createdAt: asset.createdAt, url: `/api/notes/assets/${asset._id}` })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Note asset list error:", error);
    return NextResponse.json({ error: "Could not load note images." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid note ID." }, { status: 400 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file first." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Images must be smaller than 2 MB." }, { status: 400 });
    if (!TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP or GIF image." }, { status: 400 });
    const filename = (file.name || "note-image").replace(/[\\/\r\n\0]/g, "-").slice(0, 180) || "note-image";
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validImage(bytes, file.type)) return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 });
    await dbConnect();
    const note = await PrivateNote.findOne({ _id: id, deletedAt: null }).select("_id").lean();
    if (!note) return NextResponse.json({ error: "Save the note before adding images." }, { status: 404 });
    const asset = await NoteAsset.create({ noteId: id, filename, mimeType: file.type, size: bytes.length, data: bytes });
    await audit(request, "private-note-image-added");
    return NextResponse.json({ asset: { _id: String(asset._id), filename, mimeType: file.type, size: bytes.length, url: `/api/notes/assets/${asset._id}` } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Note image upload error:", error);
    return NextResponse.json({ error: "Could not save this image to MongoDB." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
