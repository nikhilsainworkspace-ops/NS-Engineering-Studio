import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { normalizeRateInput } from "@/modules/civil-at-hand/lib/rates";
import { Rate } from "@/modules/civil-at-hand/models/Rate";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const rates = await Rate.find().sort({ updatedAt: -1 }).limit(5000).lean();
    return NextResponse.json({ rates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rate list error:", error);
    return NextResponse.json({ error: "Could not load the rate book." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const normalized = normalizeRateInput((await request.json()) as Record<string, unknown>);
    await dbConnect();
    const rate = await Rate.create(normalized);
    return NextResponse.json({ rate: rate.toObject() }, { status: 201 });
  } catch (error) {
    console.error("Rate create error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not save this rate." }, { status: 503 });
  }
}
