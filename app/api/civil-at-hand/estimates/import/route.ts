import ExcelJS from "exceljs";
import { adminHandler, json } from "@/modules/civil-at-hand/lib/api-helpers";
import { parseCsv, unprotectCell } from "@/modules/civil-at-hand/lib/csv";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { parseBoqRows } from "@/modules/civil-at-hand/lib/estimates";

export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.text === "string") return object.text;
    if (Array.isArray(object.richText)) return object.richText.map((part) => cellText((part as Record<string, unknown>).text)).join("");
    if ("result" in object) return cellText(object.result);
    return "";
  }
  return String(value).trim();
}

/** Reads a BOQ spreadsheet and returns a preview. Nothing is saved: the owner reviews the rows first. */
export const POST = adminHandler("BOQ import error", async (request: Request) => {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new InputError("Choose a .csv or .xlsx BOQ file.");
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw new InputError("The BOQ file must be smaller than 4 MB.");
  const extension = (file.name || "").toLowerCase().split(".").pop();
  const bytes = Buffer.from(await file.arrayBuffer());
  let rows: string[][] = [];
  if (extension === "csv") rows = parseCsv(new TextDecoder("utf-8").decode(bytes)).map((row) => row.map((cell) => unprotectCell(cell)));
  else if (extension === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]); }
    catch { throw new InputError("This Excel file could not be read. Save it again as .xlsx and retry."); }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new InputError("The workbook has no worksheet.");
    sheet.eachRow({ includeEmpty: false }, (row: { getCell: (column: number) => { value: unknown } }) => {
      const cells: string[] = [];
      for (let column = 1; column <= Math.min(sheet.columnCount, 40); column += 1) cells.push(cellText(row.getCell(column).value));
      rows.push(cells);
    });
  } else throw new InputError("Upload a .csv or .xlsx file. Older .xls files must be saved as .xlsx first.");
  if (rows.length > 5000) throw new InputError("The file has too many rows. Split it into parts of up to 1,000 BOQ items.");
  const result = parseBoqRows(rows);
  return json({ items: result.items, errors: result.errors.slice(0, 50), skipped: result.skipped, mapping: result.mapping });
});
