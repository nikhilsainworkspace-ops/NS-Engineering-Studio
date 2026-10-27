// Upload type checks by content ("magic bytes"), not just by the name the browser reports.
export type AllowedFile = { mime: string; ext: string[]; label: string; inline: boolean };

export const documentFileTypes: AllowedFile[] = [
  { mime: "application/pdf", ext: ["pdf"], label: "PDF", inline: true },
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], label: "JPEG image", inline: true },
  { mime: "image/png", ext: ["png"], label: "PNG image", inline: true },
  { mime: "image/webp", ext: ["webp"], label: "WebP image", inline: true },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ["docx"], label: "Word document", inline: false },
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ["xlsx"], label: "Excel workbook", inline: false },
  { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ["pptx"], label: "PowerPoint", inline: false },
  { mime: "image/vnd.dwg", ext: ["dwg"], label: "AutoCAD drawing (DWG)", inline: false },
  { mime: "image/vnd.dxf", ext: ["dxf"], label: "AutoCAD drawing (DXF)", inline: false },
  { mime: "text/csv", ext: ["csv"], label: "CSV", inline: false },
  { mime: "text/plain", ext: ["txt"], label: "Text file", inline: false },
];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}
function ascii(bytes: Uint8Array, start: number, length: number): string {
  return Array.from(bytes.subarray(start, start + length)).map((code) => String.fromCharCode(code)).join("");
}
function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 4096);
  for (const byte of sample) if (byte === 0) return false;
  return true;
}

/** Returns the allowed type that matches both the file extension and its content, or null. */
export function detectFileType(filename: string, bytes: Uint8Array): AllowedFile | null {
  const ext = (filename.toLowerCase().split(".").pop() || "").trim();
  const type = documentFileTypes.find((item) => item.ext.includes(ext));
  if (!type) return null;
  switch (type.mime) {
    case "application/pdf": return ascii(bytes, 0, 5) === "%PDF-" ? type : null;
    case "image/jpeg": return startsWith(bytes, [0xff, 0xd8, 0xff]) ? type : null;
    case "image/png": return startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) ? type : null;
    case "image/webp": return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP" ? type : null;
    case "image/vnd.dwg": return ascii(bytes, 0, 2) === "AC" ? type : null;
    default:
      if (["docx", "xlsx", "pptx"].includes(ext)) return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ? type : null;
      return looksLikeText(bytes) ? type : null;
  }
}

export function safeFilename(name: string, fallback = "file"): string {
  const cleaned = (name || "").replace(/[\\/\r\n\0"<>|:*?]/g, "-").replace(/\s+/g, " ").trim().slice(0, 180);
  return cleaned || fallback;
}

export function validImage(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/png") return startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10]);
  if (mime === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  return false;
}
