import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { mergeContactRecords, type MergeContact } from "@/modules/civil-at-hand/lib/merge";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { Rate } from "@/modules/civil-at-hand/models/Rate";

export const runtime = "nodejs";

/** Merge duplicate contacts into one. Order is chosen so a failure part-way never loses data: update the kept record first, repoint links, delete the extras last. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const body = (await request.json()) as { primaryId?: string; otherIds?: unknown };
    const primaryId = String(body.primaryId || "");
    const otherIds = Array.isArray(body.otherIds) ? Array.from(new Set(body.otherIds.map((id) => String(id)))).filter((id) => id !== primaryId) : [];
    if (!mongoose.isValidObjectId(primaryId) || !otherIds.length || otherIds.length > 10 || !otherIds.every((id) => mongoose.isValidObjectId(id))) {
      return NextResponse.json({ error: "Choose one contact to keep and up to 10 duplicates to merge into it." }, { status: 400 });
    }
    await dbConnect();
    const rows = (await Contact.find({ _id: { $in: [primaryId, ...otherIds] } }).lean()) as unknown as (MergeContact & { _id: unknown })[];
    const docs = rows.map((row) => ({ ...row, _id: String(row._id) })) as MergeContact[];
    const primary = docs.find((doc) => doc._id === primaryId);
    const others = docs.filter((doc) => doc._id !== primaryId);
    if (!primary || others.length !== otherIds.length) return NextResponse.json({ error: "One of these contacts no longer exists. Refresh and try again." }, { status: 404 });

    const merged = mergeContactRecords(primary, others);
    const lastContactedAt = merged.interactions.length ? new Date(Math.max(...merged.interactions.map((i) => new Date(i.at).getTime()))) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const primaryUpdate: Record<string, any> = { $set: { ...merged, lastContactedAt } };
    await Contact.updateOne({ _id: primaryId }, primaryUpdate);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addPrimary: Record<string, any> = { $addToSet: { linkedContactIds: primaryId } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pullOthers: Record<string, any> = { $pull: { linkedContactIds: { $in: otherIds } } };
    await Project.updateMany({ clientContactId: { $in: otherIds } }, { $set: { clientContactId: primaryId } });
    await Project.updateMany({ linkedContactIds: { $in: otherIds } }, addPrimary);
    await Project.updateMany({ linkedContactIds: { $in: otherIds } }, pullOthers);
    await Rate.updateMany({ supplierContactId: { $in: otherIds } }, { $set: { supplierContactId: primaryId } });
    await Contact.deleteMany({ _id: { $in: otherIds } });
    await audit(request, "contacts-merged", `${otherIds.length} merged into one`);
    return NextResponse.json({ ok: true, merged: otherIds.length });
  } catch (error) {
    console.error("Merge error:", error);
    return NextResponse.json({ error: "Could not merge these contacts. Nothing was deleted; please try again." }, { status: 503 });
  }
}
