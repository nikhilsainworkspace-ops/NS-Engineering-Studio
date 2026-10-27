import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { adminHandler, json, NotFoundError, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { PublicPage } from "@/modules/civil-at-hand/models/PublicPage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Publish, unpublish, or issue a new private link token for an unlisted page (which disables the old link). */
export const POST = adminHandler("Public page publish error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) throw new InputError("Invalid page.");
  const action = String((await readJson(request)).action || "");
  await dbConnect();
  const page = await PublicPage.findById(id).select("+accessToken").lean() as Record<string, unknown> | null;
  if (!page) throw new NotFoundError("Page not found.");
  const update: Record<string, unknown> = {};
  if (action === "publish") {
    if (!Array.isArray(page.blocks) || !page.blocks.length) throw new InputError("Add some content before publishing.");
    if (page.expiresAt && new Date(String(page.expiresAt)).getTime() <= Date.now()) throw new InputError("The expiry date has passed. Change or clear it before publishing.");
    update.status = "published"; update.publishedAt = new Date();
    if (page.visibility === "unlisted" && !page.accessToken) update.accessToken = randomBytes(18).toString("base64url");
  } else if (action === "unpublish") {
    update.status = "draft";
  } else if (action === "rotate-token") {
    update.accessToken = randomBytes(18).toString("base64url");
  } else throw new InputError("Choose publish, unpublish or new private link.");
  const updated = await PublicPage.findByIdAndUpdate(id, { $set: update }, { new: true }).select("+accessToken").lean();
  await audit(request, `public-page-${action}`, String(page.slug));
  return json({ item: plain(updated) });
});
