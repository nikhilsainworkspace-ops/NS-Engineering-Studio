import { NextRequest } from "next/server";
import { getCollection } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { privateJson, jsonError } from "@/lib/http";
import { leadUpdateSchema } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type LeadDoc = { _id: string; requestKey?: string; name: string; email: string; phone: string; subject: string; message: string; status: "new" | "in_progress" | "resolved"; notes: string; createdAt: Date; updatedAt: Date };
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const status = request.nextUrl.searchParams.get("status") ?? "all";
  if (!["all", "new", "in_progress", "resolved"].includes(status)) return jsonError("Invalid filter.", 400);
  try {
    const leads = await getCollection<LeadDoc>("leads");
    const filter: Record<string, unknown> = {};
    if (status !== "all") filter.status = status;
    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ name: regex }, { email: regex }, { subject: regex }, { message: regex }];
    }
    const items = await leads.find(filter).sort({ createdAt: -1 }).limit(100).toArray();
    return privateJson({ leads: items.map((lead) => ({ id: lead._id, name: lead.name, email: lead.email, phone: lead.phone, subject: lead.subject, message: lead.message, status: lead.status, notes: lead.notes, createdAt: lead.createdAt, updatedAt: lead.updatedAt })) });
  } catch {
    return jsonError("The inquiry inbox is temporarily unavailable.", 503);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) return jsonError("Request origin was not accepted.", 403);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  if (!raw || typeof raw !== "object" || !("id" in raw) || typeof raw.id !== "string" || !/^[0-9a-f-]{36}$/i.test(raw.id)) return jsonError("Invalid inquiry reference.", 400);
  const { id, ...values } = raw as Record<string, unknown>;
  const parsed = leadUpdateSchema.safeParse(values);
  if (!parsed.success) return jsonError("Please check the status and notes.", 422);
  try {
    const leads = await getCollection<LeadDoc>("leads");
    const result = await leads.updateOne({ _id: id }, { $set: { status: parsed.data.status, notes: parsed.data.notes, updatedAt: new Date() } });
    if (!result.matchedCount) return jsonError("This inquiry could not be found.", 404);
    await writeAudit("lead.updated", id);
    return privateJson({ ok: true });
  } catch { return jsonError("The inquiry could not be updated. Please retry.", 503); }
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) return jsonError("Request origin was not accepted.", 403);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError("Invalid request.", 400); }
  if (!raw || typeof raw !== "object" || !("id" in raw) || typeof raw.id !== "string" || !/^[0-9a-f-]{36}$/i.test(raw.id) || !("confirm" in raw) || raw.confirm !== true) return jsonError("A valid reference and deletion confirmation are required.", 400);
  try {
    const leads = await getCollection<LeadDoc>("leads");
    const result = await leads.deleteOne({ _id: raw.id });
    if (!result.deletedCount) return jsonError("This inquiry could not be found.", 404);
    await writeAudit("lead.deleted", raw.id);
    return privateJson({ ok: true });
  } catch { return jsonError("The inquiry could not be deleted. Please retry.", 503); }
}
