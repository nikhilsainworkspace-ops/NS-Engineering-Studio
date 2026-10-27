export function shortDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Indian-style short money format: ₹1.25 Cr, ₹12.5 L, ₹45,000. */
export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (abs >= 1e7) return `₹${trim(value / 1e7)} Cr`;
  if (abs >= 1e5) return `₹${trim(value / 1e5)} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function dateInput(value?: string | null): string {
  return value ? value.substring(0, 10) : "";
}
