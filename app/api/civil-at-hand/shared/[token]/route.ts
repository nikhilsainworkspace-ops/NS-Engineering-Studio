import { NextResponse } from "next/server";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { TOKEN_PATTERN, UNAVAILABLE, accessRoom, licenseCode } from "@/modules/civil-at-hand/lib/room-access";
import { tooManyRequests } from "@/modules/civil-at-hand/lib/rate-limit";
import { roomStatus } from "@/modules/civil-at-hand/lib/rooms";
import { DataRoom } from "@/modules/civil-at-hand/models/DataRoom";
import { NoteShare } from "@/modules/civil-at-hand/models/NoteShare";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
const brandInfo = { name: brand.name, tagline: brand.tagline, color: brand.color, logoUrl: brand.logoUrl };

/** Public: tells the page whether the link works and whether a passcode is needed. Reveals no data and does not count as an open. */
export async function GET(request: Request, context: Context) {
  const { token } = await context.params;
  if (!TOKEN_PATTERN.test(token)) return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: HEADERS });
  try {
    if (await tooManyRequests(request, "room-meta", 120, 600)) return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429, headers: HEADERS });
    await dbConnect();
    const noteShare = await NoteShare.findOne({ token, active: true, expiresAt: { $gt: new Date() } }).select("title expiresAt").lean() as unknown as { title: string; expiresAt: Date } | null;
    if (noteShare) return NextResponse.json({ kind: "note", title: noteShare.title, requiresPasscode: false, expiresAt: noteShare.expiresAt, locked: false, brand: brandInfo }, { headers: HEADERS });
    const room = (await DataRoom.findOne({ token }).select("-rows -accessLog").lean()) as unknown as (Parameters<typeof roomStatus>[0] & { title: string; recipientName: string; passcodeHash: string; expiresAt: Date }) | null;
    if (!room) return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: HEADERS });
    const status = roomStatus(room);
    if (status === "paused" || status === "expired") return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: HEADERS });
    if (status === "awaiting-payment") return NextResponse.json({ error: "This access has not been activated yet. Please contact the sender.", code: "awaiting-payment", brand: brandInfo }, { status: 403, headers: HEADERS });
    return NextResponse.json({ title: room.title, recipientName: room.recipientName, requiresPasscode: Boolean(room.passcodeHash), expiresAt: room.expiresAt, locked: status === "locked", brand: brandInfo }, { headers: HEADERS });
  } catch (error) {
    console.error("Shared link lookup error:", error);
    return NextResponse.json({ error: "We could not open this link right now. Please try again shortly." }, { status: 503, headers: HEADERS });
  }
}

/** Public: unlock and read the data. Body: { passcode? }. Counts as one "open" (a reload from the same device within 15 minutes is free). */
export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  let passcode = "";
  try { const body = (await request.json()) as { passcode?: string }; passcode = String(body.passcode || "").slice(0, 200); } catch { /* no body: fine for links without a passcode */ }
  try {
    if (!TOKEN_PATTERN.test(token)) return NextResponse.json({ error: UNAVAILABLE }, { status: 404, headers: HEADERS });
    if (await tooManyRequests(request, "shared-content", 90, 600)) return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429, headers: HEADERS });
    await dbConnect();
    const noteShare = await NoteShare.findOne({ token, active: true, expiresAt: { $gt: new Date() } }).lean() as unknown as { title: string; content: string; tags: string[]; assetIds: string[]; expiresAt: Date } | null;
    if (noteShare) return NextResponse.json({ kind: "note", title: noteShare.title, content: noteShare.content, tags: noteShare.tags || [], assetIds: noteShare.assetIds || [], rowCount: 1, recipientName: "", message: "A read-only note shared from NS Engineering Studio.", expiresAt: noteShare.expiresAt, allowDownload: false, watermark: false, masked: false, licenseCode: "", brand: brandInfo }, { headers: HEADERS });
    const result = await accessRoom(request, token, passcode, "open");
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code, remaining: result.remaining }, { status: result.status, headers: HEADERS });
    const room = result.room;
    return NextResponse.json({
      title: room.title, recipientName: room.recipientName, message: room.message, dataset: room.dataset, columns: room.columns, rows: room.rows, rowCount: room.rowCount,
      expiresAt: room.expiresAt, allowDownload: room.allowDownload, watermark: room.watermark, masked: room.masked, licenseCode: licenseCode(token), brand: brandInfo,
    }, { headers: HEADERS });
  } catch (error) {
    console.error("Shared link open error:", error);
    return NextResponse.json({ error: "We could not open this link right now. Please try again shortly." }, { status: 503, headers: HEADERS });
  }
}
