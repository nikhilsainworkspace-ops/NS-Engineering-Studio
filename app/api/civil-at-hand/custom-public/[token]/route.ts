import { NextResponse } from "next/server";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { tooManyRequests } from "@/modules/civil-at-hand/lib/rate-limit";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { normalizeCustomFormAnswers, type CustomFormField } from "@/modules/civil-at-hand/lib/custom-forms";
import { CustomForm } from "@/modules/civil-at-hand/models/CustomForm";
import { CustomFormResponse } from "@/modules/civil-at-hand/models/CustomFormResponse";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
const unavailable = () => NextResponse.json({ error: "This form link is invalid, closed, or expired. Ask the form owner for an active link." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
function validToken(token: string) { return /^[a-f0-9]{48}$/.test(token); }
function activeForm(form: { active?: boolean; expiresAt?: Date | null } | null): boolean {
  return Boolean(form && form.active && (!form.expiresAt || new Date(form.expiresAt).getTime() > Date.now()));
}

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;
  if (!validToken(token)) return unavailable();
  try {
    await dbConnect();
    const form = await CustomForm.findOne({ token }).select("title description fields active expiresAt").lean() as { title: string; description?: string; fields: unknown[]; active: boolean; expiresAt?: Date | null } | null;
    if (!activeForm(form)) return unavailable();
    return NextResponse.json({
      form: { title: form!.title, description: form!.description || "", fields: form!.fields },
      brand: { name: brand.name, color: brand.color, logoUrl: brand.logoUrl },
    }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    console.error("Custom public form lookup failed:", error);
    return NextResponse.json({ error: "This form could not be loaded. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  if (!validToken(token)) return unavailable();
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 256_000) return NextResponse.json({ error: "This submission is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    let body: Record<string, unknown>;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > 256_000) return NextResponse.json({ error: "This submission is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NextResponse.json({ error: "Send valid answers for this form." }, { status: 400, headers: { "Cache-Control": "no-store" } });
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Send valid JSON answers for this form." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
    if (await tooManyRequests(request, "custom-public-form", 15, 3600)) return NextResponse.json({ error: "Too many submissions from this device. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
    await dbConnect();
    const form = await CustomForm.findOne({ token }).select("title fields active expiresAt").lean() as { _id: unknown; title: string; fields: CustomFormField[]; active: boolean; expiresAt?: Date | null } | null;
    if (!activeForm(form)) return unavailable();
    const answers = normalizeCustomFormAnswers(form!.fields, body.answers);
    await CustomFormResponse.create({ formId: form!._id, formTitle: form!.title, fields: form!.fields, answers, submittedAt: new Date() });
    await CustomForm.updateOne({ _id: form!._id, active: true }, { $inc: { submissions: 1 } });
    return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
    console.error("Custom public form submit failed:", error);
    return NextResponse.json({ error: "Your answers could not be submitted. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
