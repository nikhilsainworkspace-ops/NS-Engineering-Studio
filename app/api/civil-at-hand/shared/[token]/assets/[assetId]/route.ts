import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { tooManyRequests } from "@/modules/civil-at-hand/lib/rate-limit";
import { NoteAsset } from "@/modules/civil-at-hand/models/NoteAsset";
import { NoteShare } from "@/modules/civil-at-hand/models/NoteShare";
import { TOKEN_PATTERN, UNAVAILABLE } from "@/modules/civil-at-hand/lib/room-access";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string; assetId: string }> };
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, context: Context) {
  const { token, assetId } = await context.params;
  if (!TOKEN_PATTERN.test(token) || !mongoose.isValidObjectId(assetId)) return new Response("Not found", { status: 404, headers: HEADERS });
  try {
    if (await tooManyRequests(request, "note-share-asset", 120, 600)) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: HEADERS });
    await dbConnect();
    const share = await NoteShare.findOne({ token, active: true, expiresAt: { $gt: new Date() }, assetIds: assetId }).select("_id").lean();
    if (!share) return new Response(UNAVAILABLE, { status: 404, headers: HEADERS });
    const asset = await NoteAsset.findById(assetId).select("+data").lean() as unknown as { filename: string; mimeType: string; size: number; data: Buffer } | null;
    if (!asset) return new Response("Not found", { status: 404, headers: HEADERS });
    return new Response(new Uint8Array(asset.data), { headers: { ...HEADERS, "Content-Type": asset.mimeType, "Content-Length": String(asset.size), "Content-Disposition": `inline; filename="${asset.filename.replace(/["\\\r\n]/g, "-")}"`, "Cross-Origin-Resource-Policy": "same-origin" } });
  } catch (error) {
    console.error("Shared note asset error:", error);
    return new Response("Could not load shared image", { status: 503, headers: HEADERS });
  }
}
