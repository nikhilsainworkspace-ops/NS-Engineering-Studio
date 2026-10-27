import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { currentAdminSessionId } from "@/lib/auth";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { isSameOrigin } from "@/lib/http";

type SessionDoc = { _id: string; tokenHash: string; email: string; createdAt: Date; expiresAt: Date; lastSeenAt?: Date; ip?: string; agent?: string };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const sessions = await getCollection<SessionDoc>("sessions");
    const current = await currentAdminSessionId();
    const rows = await sessions.find({ expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(25).toArray();
    return NextResponse.json({ sessions: rows.map((row) => ({ _id: String(row._id), ip: row.ip || "Not retained by this session version", agent: row.agent || "NS Engineering Studio session", createdAt: row.createdAt, lastSeenAt: row.lastSeenAt || row.createdAt, current: String(row._id) === current })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load signed-in devices." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const sessions = await getCollection<SessionDoc>("sessions");
    const url = new URL(request.url);
    const current = await currentAdminSessionId();
    if (url.searchParams.get("others") === "1") {
      const result = await sessions.deleteMany({ expiresAt: { $gt: new Date() }, _id: { $ne: current || "" } });
      await audit(request, "sessions-revoked", "all other NS sessions");
      return NextResponse.json({ ok: true, revoked: result.deletedCount }, { headers: { "Cache-Control": "no-store" } });
    }
    const id = url.searchParams.get("id") || "";
    if (!/^[a-f0-9]{64}$/.test(id)) return NextResponse.json({ error: "Invalid device." }, { status: 400 });
    const result = await sessions.deleteOne({ _id: id });
    await audit(request, "session-revoked", "one NS session");
    return NextResponse.json({ ok: true, revoked: result.deletedCount }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not sign out that device." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
