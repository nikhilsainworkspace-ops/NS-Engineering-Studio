import { NextResponse } from "next/server";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { getCategory, getFields } from "@/modules/civil-at-hand/lib/categories";
import { normalizeContactInput } from "@/modules/civil-at-hand/lib/contact-input";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { tooManyRequests } from "@/modules/civil-at-hand/lib/rate-limit";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { ShareLink } from "@/modules/civil-at-hand/models/ShareLink";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: "This form link is invalid or no longer available." }, { status: 404 });
  try {
    await dbConnect();
    const link = (await ShareLink.findOne({ token, active: true }).lean()) as unknown as { expiresAt?: Date | null; category: string; title: string; _id: unknown } | null;
    if (!link || (link.expiresAt && link.expiresAt.getTime() < Date.now())) {
      return NextResponse.json({ error: "This form link is closed or has expired. Please ask the person who shared it for a new link." }, { status: 404 });
    }
    const category = getCategory(link.category);
    if (!category) return NextResponse.json({ error: "This form type is not available." }, { status: 404 });
    return NextResponse.json({
      form: { title: link.title, category: link.category, categoryLabel: category.label, description: category.description, fields: getFields(link.category) },
      brand: { name: brand.name, tagline: brand.tagline, color: brand.color, logoUrl: brand.logoUrl },
    }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    console.error("Public form lookup error:", error);
    return NextResponse.json({ error: "We could not open this form right now. Please try again shortly." }, { status: 503 });
  }
}

export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ error: "This form link is invalid." }, { status: 404 });
  try {
    const body = await request.json() as Record<string, unknown>;
    // Simple honeypot to filter automated submissions without adding friction for people.
    if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });
    if (await tooManyRequests(request, "public-form", 20, 3600)) return NextResponse.json({ error: "Too many submissions from this device. Please try again later. / इस डिवाइस से बहुत अधिक सबमिशन हुए, कृपया बाद में कोशिश करें।" }, { status: 429 });
    await dbConnect();
    const link = await ShareLink.findOne({ token, active: true });
    if (!link || (link.expiresAt && link.expiresAt.getTime() < Date.now())) {
      return NextResponse.json({ error: "This form link is closed or has expired." }, { status: 404 });
    }
    const normalized = normalizeContactInput({ category: link.category, details: body.details, source: "public-link", linkId: String(link._id), status: "new", shareConsent: body.shareConsent === true ? "yes" : "" });
    const contact = await Contact.create(normalized);
    await ShareLink.updateOne({ _id: link._id }, { $inc: { submissions: 1 } });
    return NextResponse.json({ ok: true, reference: String(contact._id) }, { status: 201 });
  } catch (error) {
    console.error("Public form submission error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Your details could not be submitted right now. Please try again in a few minutes. / अभी जानकारी नहीं भेजी जा सकी, कृपया कुछ देर बाद फिर कोशिश करें।" }, { status: 503 });
  }
}
