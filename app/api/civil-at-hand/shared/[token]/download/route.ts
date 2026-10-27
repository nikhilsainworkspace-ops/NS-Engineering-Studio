import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { escapeCsv } from "@/modules/civil-at-hand/lib/csv";
import { accessRoom, licenseCode } from "@/modules/civil-at-hand/lib/room-access";

export const runtime = "nodejs";
export const maxDuration = 30;
type Context = { params: Promise<{ token: string }> };

/** Public (passcode-checked): download the shared data as CSV or Excel. Only works when you enabled downloads for this link. */
export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  let body: { passcode?: string; format?: string } = {};
  try { body = (await request.json()) as typeof body; } catch { /* fine */ }
  try {
    const result = await accessRoom(request, token, String(body.passcode || "").slice(0, 200), "download");
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status, headers: { "Cache-Control": "no-store" } });
    const room = result.room;
    const columns = [...room.columns];
    const traceable = room.watermark;
    const licensed = `Licensed to ${room.recipientName || "recipient"} (ref ${licenseCode(token)})`;
    const rows = room.rows.map((row) => (traceable ? { ...row, __licensed: licensed } : row));
    if (traceable) columns.push({ key: "__licensed", label: "License" });
    const base = `${room.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "shared-data"}`;
    if (body.format === "csv") {
      const csv = [columns.map((c) => escapeCsv(c.label)).join(","), ...rows.map((row) => columns.map((c) => escapeCsv((row as Record<string, string>)[c.key])).join(","))].join("\r\n");
      return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.csv"`, "Cache-Control": "no-store" } });
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NS Engineering Studio";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Data", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: Math.min(40, Math.max(14, c.label.length + 4)) }));
    for (const row of rows) sheet.addRow(row);
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176B59" } };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
    const bytes: ArrayBuffer = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${base}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Shared download error:", error);
    return NextResponse.json({ error: "We could not prepare the download. Please try again." }, { status: 503 });
  }
}
