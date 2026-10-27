import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { ShareLink } from "@/modules/civil-at-hand/models/ShareLink";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid link ID." }, { status: 400 });
  try {
    const body = await request.json() as { active?: boolean; title?: string; expiryDays?: number | string | null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};
    if (typeof body.active === "boolean") update.active = body.active;
    if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim().slice(0, 160);
    if (body.expiryDays !== undefined) {
      const days = Number(body.expiryDays || 0);
      update.expiresAt = [1, 7, 30, 90, 365].includes(days) ? new Date(Date.now() + days * 86400000) : null;
    }
    await dbConnect();
    const link = await ShareLink.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!link) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    return NextResponse.json({ link });
  } catch (error) {
    console.error("Share link update error:", error);
    return NextResponse.json({ error: "Could not update this link." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid link ID." }, { status: 400 });
  try {
    await dbConnect();
    const result = await ShareLink.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Share link delete error:", error);
    return NextResponse.json({ error: "Could not delete this link." }, { status: 503 });
  }
}
