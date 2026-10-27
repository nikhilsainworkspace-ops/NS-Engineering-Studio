import mongoose from "mongoose";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { documentFileTypes } from "@/modules/civil-at-hand/lib/file-types";
import { DocumentFile } from "@/modules/civil-at-hand/models/DocumentFile";

export const runtime = "nodejs";
type Context = { params: Promise<{ fileId: string }> };
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

/** Admin-only download. Files are never reachable from public pages or shared links. */
export async function GET(request: Request, context: Context) {
  if (!(await isAdmin())) return new Response("Sign in to continue.", { status: 401, headers });
  const { fileId } = await context.params;
  if (!mongoose.isValidObjectId(fileId)) return new Response("Not found", { status: 404, headers });
  try {
    await dbConnect();
    const file = await DocumentFile.findById(fileId).select("+data").lean() as unknown as { filename: string; mimeType: string; size: number; data: Buffer } | null;
    if (!file) return new Response("Not found", { status: 404, headers });
    const type = documentFileTypes.find((item) => item.mime === file.mimeType);
    const inline = new URL(request.url).searchParams.get("inline") === "1" && Boolean(type?.inline);
    // Header values must be ASCII: keep a plain fallback name and pass the real name in filename*.
    // eslint-disable-next-line no-control-regex
    const name = file.filename.replace(/["\\\r\n]/g, "-").replace(/[^\x20-\x7e]/g, "_");
    return new Response(new Uint8Array(file.data), {
      headers: {
        ...headers, "Content-Type": file.mimeType, "Content-Length": String(file.size),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'", "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    console.error("Document download error:", error instanceof Error ? error.message : error);
    return new Response("Could not load this file.", { status: 503, headers });
  }
}
