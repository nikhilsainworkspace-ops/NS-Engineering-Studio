import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { toRoomRecord } from "@/modules/civil-at-hand/lib/room-record";
import { MAX_EXPIRY_HOURS, generatePasscode, hashPasscode, normalizeMaxViews, resolveExpiry, validatePasscode } from "@/modules/civil-at-hand/lib/rooms";
import { DataRoom } from "@/modules/civil-at-hand/models/DataRoom";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
type Lean = Parameters<typeof toRoomRecord>[0];

export async function GET(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  try {
    await dbConnect();
    const room = (await DataRoom.findById(id).lean()) as unknown as Lean | null;
    if (!room) return NextResponse.json({ error: "Shared database not found." }, { status: 404 });
    return NextResponse.json({ room: toRoomRecord(room, request.url, true) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Room read error:", error);
    return NextResponse.json({ error: "Could not load this shared database." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    await dbConnect();
    const current = (await DataRoom.findById(id).select("expiresAt paymentStatus").lean()) as unknown as { expiresAt: Date; paymentStatus: string } | null;
    if (!current) return NextResponse.json({ error: "Shared database not found." }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const set: Record<string, any> = {};
    let newPasscode = "";
    if (typeof body.active === "boolean") set.active = body.active;
    if (typeof body.allowDownload === "boolean") set.allowDownload = body.allowDownload;
    if (typeof body.watermark === "boolean") set.watermark = body.watermark;
    if (typeof body.title === "string" && body.title.trim()) set.title = cleanText(body.title, 160);
    if (typeof body.recipientName === "string") set.recipientName = cleanText(body.recipientName, 160);
    if (typeof body.recipientContact === "string") set.recipientContact = cleanText(body.recipientContact, 180);
    if (typeof body.message === "string") set.message = cleanText(body.message, 1000);
    if (typeof body.invoiceNote === "string") set.invoiceNote = cleanText(body.invoiceNote, 500);
    if ("maxViews" in body) set.maxViews = normalizeMaxViews(body.maxViews);
    if (body.resetViews === true) set.viewCount = 0;
    if (body.unlock === true) { set.failedAttempts = 0; set.lockedUntil = null; }
    if ("price" in body) {
      if (body.price === null || body.price === "") set.price = null;
      else { const n = Number(String(body.price).replace(/[,₹\s]/g, "")); if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new InputError("Price must be a positive amount in rupees."); set.price = Math.round(n); }
    }
    if (typeof body.paymentStatus === "string") {
      if (!["free", "unpaid", "paid"].includes(body.paymentStatus)) throw new InputError("Choose a valid payment status.");
      set.paymentStatus = body.paymentStatus;
      set.paidAt = body.paymentStatus === "paid" ? new Date() : null;
      if (body.paymentStatus === "free") set.requirePayment = false;
    }
    if (typeof body.requirePayment === "boolean") set.requirePayment = body.requirePayment;
    if (typeof body.extendHours === "number" && Number.isFinite(body.extendHours) && body.extendHours > 0) {
      const from = Math.max(Date.now(), new Date(current.expiresAt).getTime());
      const next = new Date(from + Math.min(body.extendHours, MAX_EXPIRY_HOURS) * 3600_000);
      set.expiresAt = resolveExpiry({ expiresAt: next.toISOString() });
    } else if (typeof body.expiresAt === "string") set.expiresAt = resolveExpiry({ expiresAt: body.expiresAt });
    if (body.passcodeAction === "reset") { newPasscode = generatePasscode(); }
    else if (body.passcodeAction === "set") { newPasscode = validatePasscode(String(body.passcode || "")); }
    if (newPasscode) { set.passcodeHash = await hashPasscode(newPasscode); set.failedAttempts = 0; set.lockedUntil = null; }
    else if (body.passcodeAction === "clear") { set.passcodeHash = ""; set.failedAttempts = 0; set.lockedUntil = null; }
    if (!Object.keys(set).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    const room = (await DataRoom.findByIdAndUpdate(id, { $set: set }, { new: true }).select("-rows -accessLog").lean()) as unknown as Lean | null;
    if (!room) return NextResponse.json({ error: "Shared database not found." }, { status: 404 });
    await audit(request, "room-updated", Object.keys(set).filter((k) => k !== "passcodeHash").join(", ") + (newPasscode ? ", passcode changed" : ""));
    return NextResponse.json({ room: toRoomRecord(room, request.url), passcode: newPasscode || undefined });
  } catch (error) {
    console.error("Room update error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not update this shared database." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  try {
    await dbConnect();
    const result = (await DataRoom.findByIdAndDelete(id)) as unknown as { title?: string } | null;
    if (!result) return NextResponse.json({ error: "Shared database not found." }, { status: 404 });
    await audit(request, "room-deleted", String(result.title || "").slice(0, 80));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Room delete error:", error);
    return NextResponse.json({ error: "Could not delete this shared database." }, { status: 503 });
  }
}
