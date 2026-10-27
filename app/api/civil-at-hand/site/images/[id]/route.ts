import mongoose from "mongoose";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { loadLivePage } from "@/modules/civil-at-hand/lib/public-page-server";
import { pageImageIds } from "@/modules/civil-at-hand/lib/public-pages";
import { PageImage } from "@/modules/civil-at-hand/models/PageImage";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Public image endpoint: serves an image only if the named live page actually uses it. */
export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const slug = (url.searchParams.get("page") || "").slice(0, 60);
  const key = (url.searchParams.get("k") || "").slice(0, 80);
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!mongoose.isValidObjectId(id)) return notFound();
  try {
    const page = await loadLivePage(slug, key);
    if (!page || !pageImageIds(page).includes(id)) return notFound();
    await dbConnect();
    const image = await PageImage.findById(id).select("+data").lean() as unknown as { mimeType: string; size: number; data: Buffer } | null;
    if (!image) return notFound();
    return new Response(new Uint8Array(image.data), {
      headers: { "Content-Type": image.mimeType, "Content-Length": String(image.size), "Cache-Control": page.visibility === "public" ? "public, max-age=300" : "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    console.error("Public image error:", error instanceof Error ? error.message : error);
    return new Response("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
