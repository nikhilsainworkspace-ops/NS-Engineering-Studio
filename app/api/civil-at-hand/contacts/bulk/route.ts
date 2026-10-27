import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { contactStatuses } from "@/modules/civil-at-hand/lib/categories";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { Contact } from "@/modules/civil-at-hand/models/Contact";

export const runtime = "nodejs";

/** One action on many contacts at once. Actions: status, add-tag, remove-tag, follow-up, flag, consent, delete. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const body = (await request.json()) as { ids?: unknown; action?: string; value?: unknown };
    const ids = Array.isArray(body.ids) ? Array.from(new Set(body.ids.map((id) => String(id)))) : [];
    if (!ids.length) return NextResponse.json({ error: "Select at least one contact." }, { status: 400 });
    if (ids.length > 500) return NextResponse.json({ error: "Select up to 500 contacts at a time." }, { status: 400 });
    if (!ids.every((id) => mongoose.isValidObjectId(id))) return NextResponse.json({ error: "One of the selected records is invalid." }, { status: 400 });
    const filter = { _id: { $in: ids } };
    const value = typeof body.value === "string" ? body.value : "";
    await dbConnect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let update: Record<string, any>;
    switch (body.action) {
      case "status":
        if (!contactStatuses.some((s) => s.value === value)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
        update = { $set: { status: value } }; break;
      case "add-tag": {
        const tag = cleanText(value, 40);
        if (!tag) return NextResponse.json({ error: "Type a tag first." }, { status: 400 });
        update = { $addToSet: { tags: tag } }; break;
      }
      case "remove-tag": {
        const tag = cleanText(value, 40);
        if (!tag) return NextResponse.json({ error: "Type a tag first." }, { status: 400 });
        update = { $pull: { tags: tag } }; break;
      }
      case "follow-up":
        if (!value) update = { $set: { followUpAt: null } };
        else if (!Number.isNaN(Date.parse(value))) update = { $set: { followUpAt: new Date(value) } };
        else return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
        break;
      case "flag":
        if (!["", "preferred", "avoid"].includes(value)) return NextResponse.json({ error: "Choose a valid flag." }, { status: 400 });
        update = { $set: { flag: value } }; break;
      case "consent":
        if (!["", "yes", "no"].includes(value)) return NextResponse.json({ error: "Choose a valid consent option." }, { status: 400 });
        update = { $set: { shareConsent: value } }; break;
      case "delete": {
        const result = (await Contact.deleteMany(filter)) as unknown as { deletedCount?: number };
        await audit(request, "contacts-bulk-deleted", `${result.deletedCount ?? 0} contacts`);
        return NextResponse.json({ ok: true, affected: result.deletedCount ?? 0 });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    const result = (await Contact.updateMany(filter, update)) as unknown as { modifiedCount?: number; matchedCount?: number };
    await audit(request, "contacts-bulk-updated", `${body.action} on ${result.matchedCount ?? ids.length}`);
    return NextResponse.json({ ok: true, affected: result.matchedCount ?? result.modifiedCount ?? 0 });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json({ error: "Could not apply this action. Check the database connection." }, { status: 503 });
  }
}
