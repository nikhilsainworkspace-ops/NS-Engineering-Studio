import mongoose from "mongoose";
import { adminHandler, json, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { normalizeCustomFormInput } from "@/modules/civil-at-hand/lib/custom-forms";
import { CustomForm } from "@/modules/civil-at-hand/models/CustomForm";
import { CustomFormResponse } from "@/modules/civil-at-hand/models/CustomFormResponse";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export const PATCH = adminHandler<Context>("Custom form update", async (request, context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Form not found." }, 404);
  const body = await readJson(request);
  await dbConnect();
  const current = await CustomForm.findById(id);
  if (!current) return json({ error: "Form not found." }, 404);
  const changes: Record<string, unknown> = {};
  if ("title" in body || "description" in body || "fields" in body) {
    const definition = normalizeCustomFormInput({
      title: body.title ?? current.title,
      description: body.description ?? current.description,
      fields: body.fields ?? current.fields,
    });
    Object.assign(changes, definition);
  }
  if ("active" in body) {
    if (typeof body.active !== "boolean") return json({ error: "Choose whether the form is active." }, 400);
    changes.active = body.active;
  }
  if ("expiryDays" in body) {
    const expiryDays = Number(body.expiryDays);
    if (![0, 1, 7, 30, 90, 365].includes(expiryDays)) return json({ error: "Choose a supported expiry period." }, 400);
    changes.expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 86_400_000) : null;
  }
  if (!Object.keys(changes).length) return json({ error: "There are no supported changes to save." }, 400);
  Object.assign(current, changes);
  await current.save();
  await audit(request, "custom-form-updated", String(current.title));
  return json({ form: current.toObject() });
});

export const DELETE = adminHandler<Context>("Custom form delete", async (request, context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Form not found." }, 404);
  await dbConnect();
  const form = await CustomForm.findById(id).select("title").lean() as { title?: string } | null;
  if (!form) return json({ error: "Form not found." }, 404);
  await CustomFormResponse.deleteMany({ formId: id });
  await CustomForm.deleteOne({ _id: id });
  await audit(request, "custom-form-deleted", String(form.title || ""));
  return json({ ok: true });
});
