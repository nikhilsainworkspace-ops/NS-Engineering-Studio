import mongoose from "mongoose";
import { adminHandler, json } from "@/modules/civil-at-hand/lib/api-helpers";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { CustomForm } from "@/modules/civil-at-hand/models/CustomForm";
import { CustomFormResponse } from "@/modules/civil-at-hand/models/CustomFormResponse";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export const GET = adminHandler<Context>("Custom form responses", async (_request, context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Form not found." }, 404);
  await dbConnect();
  const form = await CustomForm.findById(id).select("title fields submissions").lean();
  if (!form) return json({ error: "Form not found." }, 404);
  const responses = await CustomFormResponse.find({ formId: id }).sort({ submittedAt: -1 }).limit(5000).lean();
  return json({ form, responses });
});
