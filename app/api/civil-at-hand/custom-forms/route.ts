import { randomBytes } from "node:crypto";
import { adminHandler, json, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { getBaseUrl } from "@/modules/civil-at-hand/lib/brand";
import { normalizeCustomFormInput } from "@/modules/civil-at-hand/lib/custom-forms";
import { CustomForm } from "@/modules/civil-at-hand/models/CustomForm";

export const runtime = "nodejs";

function publicUrl(token: string, requestUrl: string) {
  return getBaseUrl(requestUrl) + "/workspace/forms/" + token;
}

export const GET = adminHandler("Custom form list", async (request) => {
  await dbConnect();
  const forms = await CustomForm.find().sort({ createdAt: -1 }).limit(500).lean();
  return json({ forms: (forms as unknown as { token: string }[]).map((form) => ({ ...form, shareUrl: publicUrl(form.token, request.url) })) });
});

export const POST = adminHandler("Custom form create", async (request) => {
  const body = await readJson(request);
  const definition = normalizeCustomFormInput(body);
  const expiryDays = Number(body.expiryDays || 0);
  if (![0, 1, 7, 30, 90, 365].includes(expiryDays)) return json({ error: "Choose a supported expiry period." }, 400);
  const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 86_400_000) : null;
  await dbConnect();
  const form = await CustomForm.create({ ...definition, token: randomBytes(24).toString("hex"), active: true, expiresAt, submissions: 0 });
  await audit(request, "custom-form-created", definition.title);
  return json({ form: { ...form.toObject(), shareUrl: publicUrl(String(form.token), request.url) } }, 201);
});
