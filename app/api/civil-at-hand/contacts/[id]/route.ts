import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { normalizeContactInput } from "@/modules/civil-at-hand/lib/contact-input";
import { findDuplicateContacts } from "@/modules/civil-at-hand/lib/duplicate-check";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { contactStatuses } from "@/modules/civil-at-hand/lib/categories";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { Contact } from "@/modules/civil-at-hand/models/Contact";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  try {
    await dbConnect();
    const contact = await Contact.findById(id).lean();
    if (!contact) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    return NextResponse.json({ contact }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Contact read error:", error);
    return NextResponse.json({ error: "Could not load this record." }, { status: 503 });
  }
}

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    await dbConnect();
    const existing = (await Contact.findById(id).lean()) as unknown as { source?: string; linkId?: string } | null;
    if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    const normalized = normalizeContactInput(payload);
    if (payload.allowDuplicate !== true) {
      const duplicates = await findDuplicateContacts(normalized.phone, normalized.email, id, normalized.phoneNumbers, normalized.emailAddresses);
      if (duplicates.length) return NextResponse.json({ error: "Another contact already uses this phone number or email.", duplicates }, { status: 409 });
    }
    // Editing a record must not erase how it entered the system.
    normalized.source = existing.source || normalized.source;
    normalized.linkId = existing.linkId || normalized.linkId;
    const contact = await Contact.findByIdAndUpdate(id, normalized, { new: true, runValidators: true }).lean();
    if (!contact) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Contact update error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not update this record. Check the database connection and try again." }, { status: 503 });
  }
}

/** Quick actions used by reminders: change the follow-up date and/or status without re-validating the whole record. */
export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  try {
    const body = (await request.json()) as { followUpAt?: string | null; status?: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};
    if ("followUpAt" in body) {
      if (body.followUpAt === null || body.followUpAt === "") update.followUpAt = null;
      else if (typeof body.followUpAt === "string" && !Number.isNaN(Date.parse(body.followUpAt))) update.followUpAt = new Date(body.followUpAt);
      else return NextResponse.json({ error: "Choose a valid follow-up date." }, { status: 400 });
    }
    if (typeof body.status === "string") {
      if (!contactStatuses.some((item) => item.value === body.status)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
      update.status = body.status;
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    await dbConnect();
    const contact = await Contact.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!contact) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Contact quick update error:", error);
    return NextResponse.json({ error: "Could not update this record." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  try {
    await dbConnect();
    const result = (await Contact.findByIdAndDelete(id)) as unknown as { name?: string } | null;
    if (!result) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    await audit(request, "contact-deleted", String(result.name || "").slice(0, 80));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact delete error:", error);
    return NextResponse.json({ error: "Could not delete this record." }, { status: 503 });
  }
}
