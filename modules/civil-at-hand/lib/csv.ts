export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function cellString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** CSV-safe cell. Text starting with = + - @ is prefixed with an apostrophe so spreadsheets never run it as a formula. */
export function escapeCsv(value: unknown): string {
  let text = cellString(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Reverses the protective apostrophe added by escapeCsv when a file is imported again. */
export function unprotectCell(value: string): string {
  return /^'\s*[=+\-@]/.test(value) ? value.slice(1) : value;
}
