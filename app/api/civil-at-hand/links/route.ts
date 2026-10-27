import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { getBaseUrl } from "@/modules/civil-at-hand/lib/brand";
import { getCategory } from "@/modules/civil-at-hand/lib/categories";
import { ShareLink } from "@/modules/civil-at-hand/models/ShareLink";

export const runtime = "nodejs";
function shareUrl(token: string, requestUrl: string) { return `${getBaseUrl(requestUrl)}/workspace/join/${token}`; }

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    const links = await ShareLink.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ links: (links as unknown as { token: string }[]).map((item) => ({ ...item, shareUrl: shareUrl(item.token, request.url) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Share links list error:", error);
    return NextResponse.json({ error: "Could not load share links." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const body = await request.json() as { title?: string; category?: string; expiryDays?: number | string | null };
    const category = String(body.category || "");
    if (!getCategory(category)) return NextResponse.json({ error: "Choose a valid form category." }, { status: 400 });
    const title = String(body.title || "").trim().slice(0, 160);
    if (!title) return NextResponse.json({ error: "Add a name for this share link." }, { status: 400 });
    let expiresAt: Date | null = null;
    const expiryDays = Number(body.expiryDays || 0);
    if ([1, 7, 30, 90, 365].includes(expiryDays)) expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    await dbConnect();
    const token = randomBytes(24).toString("hex");
    const link = await ShareLink.create({ token, title, category, active: true, expiresAt, submissions: 0 });
    return NextResponse.json({ link: { ...link.toObject(), shareUrl: shareUrl(token, request.url) } }, { status: 201 });
  } catch (error) {
    console.error("Share link create error:", error);
    return NextResponse.json({ error: "Could not create the form link. Check your database connection." }, { status: 503 });
  }
}
