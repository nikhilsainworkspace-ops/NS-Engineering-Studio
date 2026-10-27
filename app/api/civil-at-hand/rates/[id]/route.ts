import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { normalizeRateInput } from "@/modules/civil-at-hand/lib/rates";
import { Rate } from "@/modules/civil-at-hand/models/Rate";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid rate ID." }, { status: 400 });
  try {
    const normalized = normalizeRateInput((await request.json()) as Record<string, unknown>);
    await dbConnect();
    const rate = await Rate.findByIdAndUpdate(id, normalized, { new: true, runValidators: true }).lean();
    if (!rate) return NextResponse.json({ error: "Rate not found." }, { status: 404 });
    return NextResponse.json({ rate });
  } catch (error) {
    console.error("Rate update error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not update this rate." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid rate ID." }, { status: 400 });
  try {
    await dbConnect();
    const result = await Rate.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Rate not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Rate delete error:", error);
    return NextResponse.json({ error: "Could not delete this rate." }, { status: 503 });
  }
}
