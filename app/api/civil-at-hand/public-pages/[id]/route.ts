import mongoose from "mongoose";
import { adminHandler, ConflictError, json, NotFoundError, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { normalizePublicPageInput } from "@/modules/civil-at-hand/lib/public-pages";
import { PublicPage } from "@/modules/civil-at-hand/models/PublicPage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new InputError("Invalid page.");
  await dbConnect();
  const page = await PublicPage.findById(id).select("+accessToken").lean() as Record<string, unknown> | null;
  if (!page) throw new NotFoundError("Page not found.");
  return page;
}

export const GET = adminHandler("Public page read error", async (_request: Request, context: Context) => {
  const { id } = await context.params;
  return json({ item: plain(await load(id)) });
});

/** Saving content does not change whether the page is published. */
export const PUT = adminHandler("Public page update error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const existing = await load(id);
  const data = normalizePublicPageInput(await readJson(request));
  const updated = await PublicPage.findOneAndUpdate({ _id: id, updatedAt: existing.updatedAt }, { $set: data }, { new: true }).select("+accessToken").lean();
  if (!updated) throw new ConflictError("This page was changed a moment ago. Refresh and try again.");
  await audit(request, "public-page-updated", `${data.slug}${existing.status === "published" ? " (live)" : ""}`);
  return json({ item: plain(updated) });
});

export const DELETE = adminHandler("Public page delete error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const existing = await load(id);
  if (existing.status === "published") throw new ConflictError("Unpublish the page before deleting it.");
  await PublicPage.deleteOne({ _id: id });
  await audit(request, "public-page-deleted", String(existing.slug));
  return json({ ok: true });
});
