/** Small, dependency-free helpers for the CSV format exported by Google Contacts. */
export type GoogleLabeledValue = { label: string; value: string };

export function googleLabeledValues(headers: string[], values: string[], kind: "phone" | "email"): GoogleLabeledValue[] {
  const byIndex = new Map<number, GoogleLabeledValue>();
  const prefix = kind === "phone" ? "phone" : "email";
  headers.forEach((header, columnIndex) => {
    // Google Contacts CSV exports use "Phone 1 - Label" / "Phone 1 - Value"
    // (and "E-mail 1 - Label" / "E-mail 1 - Value"). Accept "Type" too for
    // other contact exporters. normalizeHeader removes spaces and punctuation.
    const normalized = header.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const match = normalized.match(new RegExp(`^(?:e)?${prefix}(\\d+)(label|type|value)$`));
    if (!match) return;
    const slot = Number(match[1]);
    if (!Number.isFinite(slot) || slot < 1 || slot > 30) return;
    const row = byIndex.get(slot) || { label: kind === "phone" ? "Mobile" : "Work", value: "" };
    const cell = (values[columnIndex] || "").trim();
    if ((match[2] === "label" || match[2] === "type") && cell) row.label = cell.replace(/^\*\s*/, "");
    if (match[2] === "value" && cell) row.value = cell;
    byIndex.set(slot, row);
  });
  return [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, item]) => item).filter((item) => item.value);
}

export function safeGooglePhoneLabel(value: string): "Mobile" | "Work" | "Home" | "Main" | "Other" {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("home")) return "Home";
  if (normalized.includes("work")) return "Work";
  if (normalized.includes("main") || normalized.includes("primary")) return "Main";
  if (normalized.includes("mobile") || normalized.includes("cell")) return "Mobile";
  return value ? "Other" : "Mobile";
}

export function safeGoogleEmailLabel(value: string): "Work" | "Home" | "Other" {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("home")) return "Home";
  if (normalized.includes("work")) return "Work";
  return value ? "Other" : "Work";
}
