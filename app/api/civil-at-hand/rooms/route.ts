import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { rateGroupLabel } from "@/modules/civil-at-hand/lib/rates";
import { toRoomRecord } from "@/modules/civil-at-hand/lib/room-record";
import { MAX_ROOM_ROWS, assertSnapshotSize, buildContactSnapshot, buildRateSnapshot, consentAllows, generatePasscode, hashPasscode, normalizeMaxViews, normalizePayment, resolveExpiry, validatePasscode } from "@/modules/civil-at-hand/lib/rooms";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { DataRoom } from "@/modules/civil-at-hand/models/DataRoom";
import { Rate } from "@/modules/civil-at-hand/models/Rate";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const rooms = (await DataRoom.find().select("-rows -accessLog").sort({ createdAt: -1 }).limit(300).lean()) as unknown as Parameters<typeof toRoomRecord>[0][];
    return NextResponse.json({ rooms: rooms.map((room) => toRoomRecord(room, request.url)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Room list error:", error);
    return NextResponse.json({ error: "Could not load shared databases." }, { status: 503 });
  }
}

function idList(value: unknown): string[] {
  const ids = Array.isArray(value) ? Array.from(new Set(value.map((id) => String(id)))) : [];
  if (ids.length > MAX_ROOM_ROWS * 2) throw new InputError("Too many records selected.");
  if (!ids.every((id) => mongoose.isValidObjectId(id))) throw new InputError("One of the selected records is invalid. Refresh and try again.");
  return ids;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = cleanText(body.title, 160);
    if (!title) throw new InputError("Give this shared database a name.");
    const dataset = body.dataset === "rates" ? "rates" : "contacts";
    const fields = Array.isArray(body.fields) ? body.fields.map((f) => String(f)) : [];
    const expiresAt = resolveExpiry({ expiryHours: body.expiryHours, expiresAt: body.expiresAt });
    const payment = normalizePayment(body);
    const maxViews = normalizeMaxViews(body.maxViews);
    const passcodeMode = ["none", "custom"].includes(String(body.passcodeMode)) ? String(body.passcodeMode) : "auto";
    const passcode = passcodeMode === "none" ? "" : passcodeMode === "custom" ? validatePasscode(String(body.passcode || "")) : generatePasscode();
    const ids = idList(dataset === "rates" ? body.rateIds : body.contactIds);
    if (!ids.length) throw new InputError("Select at least one record to share.");

    await dbConnect();
    let snapshot: { columns: { key: string; label: string }[]; rows: Record<string, string>[] };
    let excludedForConsent = 0;
    const masked = dataset === "contacts" && body.mask === true;
    if (dataset === "contacts") {
      const found = (await Contact.find({ _id: { $in: ids } }).lean()) as unknown as {
        category: string; name: string; firstName?: string; lastName?: string; jobTitle?: string; teamRole?: string;
        phone?: string; phoneLabel?: string; phoneNumbers?: { label?: string; number?: string }[];
        email?: string; emailLabel?: string; emailAddresses?: { label?: string; value?: string }[];
        organization?: string; city?: string; state?: string; birthday?: string; tags?: string[];
        shareConsent?: string; details?: Record<string, unknown>;
      }[];
      const requireConsent = body.requireConsent !== false;
      const allowed = found.filter((c) => consentAllows(c.shareConsent, requireConsent));
      excludedForConsent = found.length - allowed.length;
      allowed.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      snapshot = buildContactSnapshot(allowed, fields, body.includeDetails === true, masked);
    } else {
      const found = (await Rate.find({ _id: { $in: ids } }).sort({ item: 1 }).lean()) as unknown as Parameters<typeof buildRateSnapshot>[0];
      snapshot = buildRateSnapshot(found, fields, rateGroupLabel);
    }
    assertSnapshotSize(snapshot.rows);

    const token = randomBytes(24).toString("hex");
    const created = await DataRoom.create({
      token, title, recipientName: cleanText(body.recipientName, 160), recipientContact: cleanText(body.recipientContact, 180), message: cleanText(body.message, 1000),
      dataset, columns: snapshot.columns, rows: snapshot.rows, rowCount: snapshot.rows.length, masked, active: true, expiresAt,
      passcodeHash: passcode ? await hashPasscode(passcode) : "", maxViews, allowDownload: body.allowDownload === true, watermark: body.watermark !== false,
      price: payment.price, paymentStatus: payment.paymentStatus, paidAt: payment.paymentStatus === "paid" ? new Date() : null, requirePayment: payment.requirePayment, invoiceNote: payment.invoiceNote,
    });
    await audit(request, "room-created", `${snapshot.rows.length} ${dataset} for ${cleanText(body.recipientName, 60) || "(no name)"}`);
    const room = toRoomRecord(created.toObject() as Parameters<typeof toRoomRecord>[0], request.url);
    // The passcode is returned only now. Only a hash is stored, so it cannot be shown again (you can reset it).
    return NextResponse.json({ room, passcode, excludedForConsent }, { status: 201 });
  } catch (error) {
    console.error("Room create error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not create the shared database. Check your database connection and try again." }, { status: 503 });
  }
}
