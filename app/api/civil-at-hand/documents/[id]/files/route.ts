import { createHash } from "node:crypto";
import { adminHandler, json, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { cleanString } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { detectFileType, safeFilename } from "@/modules/civil-at-hand/lib/file-types";
import { documentRoutes } from "@/modules/civil-at-hand/lib/routes/documents";
import { DocumentFile } from "@/modules/civil-at-hand/models/DocumentFile";
import { ProjectDocument } from "@/modules/civil-at-hand/models/ProjectDocument";

export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_BYTES = 4 * 1024 * 1024;
type Context = { params: Promise<{ id: string }> };

export const GET = adminHandler("Document versions error", async (_request: Request, context: Context) => {
  const { id } = await context.params;
  await documentRoutes.item.load(id);
  const files = await DocumentFile.find({ documentId: id }).sort({ version: -1 }).lean();
  return json({ files: plain<Record<string, unknown>[]>(files).map((file) => ({ ...file, url: `/api/documents/files/${file._id}` })) });
});

/** Uploads a new version. Earlier versions are kept and stay downloadable. */
export const POST = adminHandler("Document upload error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const document = await documentRoutes.item.load(id);
  if (document.archived) throw new InputError("Restore this document from the archive before adding a version.");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new InputError("Choose a file to upload.");
  if (file.size < 1 || file.size > MAX_BYTES) throw new InputError("Files must be smaller than 4 MB. Compress large PDFs or split drawings into separate sheets.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = safeFilename(file.name, "document");
  const type = detectFileType(filename, bytes);
  if (!type) throw new InputError("This file type is not accepted, or its content does not match its name. Use PDF, JPG, PNG, WebP, DOCX, XLSX, PPTX, DWG, DXF, CSV or TXT.");
  const revisionLabel = cleanString(form.get("revisionLabel"), 20);
  const bumped = await ProjectDocument.findOneAndUpdate({ _id: id }, { $inc: { currentVersion: 1 } }, { new: true }).lean() as unknown as { currentVersion: number } | null;
  if (!bumped) throw new InputError("Document not found.");
  const version = bumped.currentVersion;
  const created = await DocumentFile.create({
    documentId: id, version, revisionLabel, filename, mimeType: type.mime, size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"), note: cleanString(form.get("note"), 300), data: bytes,
  });
  await ProjectDocument.updateOne({ _id: id }, { $set: { latestFileId: String(created._id), latestFileName: filename, ...(revisionLabel ? { revision: revisionLabel } : {}) } });
  await audit(request, "document-version-uploaded", `${String(document.title).slice(0, 60)} v${version}`);
  const saved = created.toObject() as Record<string, unknown>;
  delete saved.data;
  return json({ file: { ...plain(saved), url: `/api/documents/files/${created._id}` } }, 201);
});
