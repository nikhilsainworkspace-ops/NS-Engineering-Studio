import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getCollection } from "@/lib/db";
import { contactSchema } from "@/lib/validation";
import { consumeRateLimit, hashIdentifier } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { isSameOrigin, jsonError } from "@/lib/http";
import { sendLeadNotification } from "@/lib/email";
import { writeAudit } from "@/lib/audit";

type LeadDoc = { _id: string; requestKey?: string; name: string; email: string; phone: string; subject: string; message: string; status: "new" | "in_progress" | "resolved"; notes: string; createdAt: Date; updatedAt: Date };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Please submit this form directly from the website.", 403);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 15_000) return jsonError("Your message is too large. Please shorten it and try again.", 413);
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 15_000) return jsonError("Your message is too large. Please shorten it and try again.", 413);
    raw = JSON.parse(body);
  } catch {
    return jsonError("Please check the form and try again.", 400);
  }
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Please correct the highlighted details and try again.", fields: parsed.error.flatten().fieldErrors }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }
  if (parsed.data.website) return jsonError("Please submit a valid form.", 400);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  try {
    const env = getEnv();
    const ipHash = hashIdentifier(`contact:${forwarded}`, env.AUTH_SECRET || "contact-rate-limit-local-salt");
    const limit = await consumeRateLimit(`contact:${ipHash}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) return jsonError("Too many inquiries were submitted from this connection. Please try again later or call the business.", 429);

    const leads = await getCollection<LeadDoc>("leads");
    const now = new Date();
    const leadId = randomUUID();
    const requestKey = parsed.data.submissionKey ? hashIdentifier(`form:${parsed.data.submissionKey}`, env.AUTH_SECRET || "contact-rate-limit-local-salt") : undefined;
    const lead: LeadDoc = {
      _id: leadId,
      ...(requestKey ? { requestKey } : {}),
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: "new",
      notes: "",
      createdAt: now,
      updatedAt: now
    };
    try {
      await leads.insertOne(lead);
    } catch (error) {
      if (requestKey && error && typeof error === "object" && "code" in error && error.code === 11000) {
        const previous = await leads.findOne({ requestKey }, { projection: { _id: 1 } });
        if (previous) return Response.json({ message: "Your inquiry has already been received by this website.", reference: previous._id }, { status: 200, headers: { "Cache-Control": "no-store" } });
      }
      throw error;
    }
    const notification = await sendLeadNotification({ id: leadId, name: lead.name, email: lead.email, phone: lead.phone, subject: lead.subject, message: lead.message });
    await writeAudit("lead.created", leadId, "system");
    if (notification === "failed") console.error("A saved inquiry could not trigger the optional email notification.");
    return Response.json({ message: "Your inquiry has been received by the website. The site administrator can now review it.", reference: leadId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("The website could not save your inquiry right now. Please retry or call the business using the number shown on this page.", 503);
  }
}
