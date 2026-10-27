import { adminHandler, json, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { cleanString } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { safeFilename, validImage } from "@/modules/civil-at-hand/lib/file-types";
import { PageImage } from "@/modules/civil-at-hand/models/PageImage";

export const runtime = "nodejs";
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export const GET = adminHandler("Page image list error", async () => {
  await dbConnect();
  const items = await PageImage.find().sort({ createdAt: -1 }).limit(500).lean();
  return json({ items: plain(items) });
});

/** Images for public pages only. Uploading does not publish anything. */
export const POST = adminHandler("Page image upload error", async (request: Request) => {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new InputError("Choose an image.");
  if (file.size < 1 || file.size > 2 * 1024 * 1024) throw new InputError("Images must be smaller than 2 MB.");
  if (!TYPES.includes(file.type)) throw new InputError("Use a JPG, PNG or WebP image.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImage(bytes, file.type)) throw new InputError("The file does not match its image type.");
  await dbConnect();
  const created = await PageImage.create({ filename: safeFilename(file.name, "image"), alt: cleanString(form.get("alt"), 200), mimeType: file.type, size: bytes.length, data: bytes });
  await audit(request, "public-page-image-added");
  const item = created.toObject() as Record<string, unknown>;
  delete item.data;
  return json({ item: plain(item) }, 201);
});
