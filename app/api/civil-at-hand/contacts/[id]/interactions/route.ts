import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";
import { Contact } from "@/modules/civil-at-hand/models/Contact";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const TYPES = ["call", "whatsapp", "meeting", "site-visit", "email", "note"];
type InteractionLean = { _id: unknown; at: Date; type: string; note: string };

function latest(list: InteractionLean[]): Date | null {
  const times = list.map((item) => new Date(item.at).getTime()).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : null;
}

/** Add one entry to a contact's history (call, WhatsApp, meeting, site visit…). */
export async function POST(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  try {
    const body = (await request.json()) as { type?: string; note?: string; at?: string };
    const type = TYPES.includes(String(body.type)) ? String(body.type) : "note";
    const note = cleanText(body.note, 1000);
    if (!note) return NextResponse.json({ error: "Write a short note about this interaction." }, { status: 400 });
    const parsed = body.at ? Date.parse(String(body.at)) : NaN;
    const at = Number.isNaN(parsed) ? new Date() : new Date(parsed);
    await dbConnect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { $push: { interactions: { $each: [{ at, type, note }], $slice: -200 } }, $max: { lastContactedAt: at } };
    const contact = (await Contact.findByIdAndUpdate(id, update, { new: true }).select("interactions lastContactedAt").lean()) as unknown as { interactions?: InteractionLean[]; lastContactedAt?: Date | null } | null;
    if (!contact) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    return NextResponse.json({ interactions: contact.interactions || [], lastContactedAt: contact.lastContactedAt || null }, { status: 201 });
  } catch (error) {
    console.error("Interaction add error:", error);
    return NextResponse.json({ error: "Could not save this entry." }, { status: 503 });
  }
}

/** DELETE ?interactionId=… removes one entry. */
export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const interactionId = new URL(request.url).searchParams.get("interactionId") || "";
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(interactionId)) return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  try {
    await dbConnect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pull: Record<string, any> = { $pull: { interactions: { _id: interactionId } } };
    const contact = (await Contact.findByIdAndUpdate(id, pull, { new: true }).select("interactions").lean()) as unknown as { interactions?: InteractionLean[] } | null;
    if (!contact) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    const list = contact.interactions || [];
    const lastContactedAt = latest(list);
    await Contact.updateOne({ _id: id }, { $set: { lastContactedAt } });
    return NextResponse.json({ interactions: list, lastContactedAt });
  } catch (error) {
    console.error("Interaction delete error:", error);
    return NextResponse.json({ error: "Could not remove this entry." }, { status: 503 });
  }
}
