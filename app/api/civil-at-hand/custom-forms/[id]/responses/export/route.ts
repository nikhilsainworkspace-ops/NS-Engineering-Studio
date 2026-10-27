import mongoose from "mongoose";
import { adminHandler, json } from "@/modules/civil-at-hand/lib/api-helpers";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { CustomForm } from "@/modules/civil-at-hand/models/CustomForm";
import { CustomFormResponse } from "@/modules/civil-at-hand/models/CustomFormResponse";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

function csvCell(value: unknown): string {
  let text = Array.isArray(value) ? value.join("; ") : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export const GET = adminHandler<Context>("Custom form response export", async (_request, context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Form not found." }, 404);
  await dbConnect();
  const form = await CustomForm.findById(id).select("title fields").lean() as { title?: string; fields?: { key: string; label: string }[] } | null;
  if (!form) return json({ error: "Form not found." }, 404);
  const responses = await CustomFormResponse.find({ formId: id }).sort({ submittedAt: -1 }).limit(5000).lean() as unknown as { submittedAt: Date; fields?: { key: string; label: string }[]; answers: Record<string, unknown> }[];
  const fieldByKey = new Map((form.fields || []).map((field) => [field.key, field.label]));
  for (const response of responses) for (const field of response.fields || []) if (!fieldByKey.has(field.key)) fieldByKey.set(field.key, field.label);
  const columns = Array.from(fieldByKey.entries());
  const lines = [["Submitted at", ...columns.map(([, label]) => label)].map(csvCell).join(",")];
  for (const response of responses) {
    const answers = response.answers || {};
    lines.push([new Date(response.submittedAt).toISOString(), ...columns.map(([key]) => answers[key])].map(csvCell).join(","));
  }
  const safeName = String(form.title || "custom-form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "custom-form";
  return new Response("\uFEFF" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + safeName + '-responses.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
