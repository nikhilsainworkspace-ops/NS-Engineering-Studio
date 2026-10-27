// Rate book: what materials, labour, equipment and sub-contract work cost, and from whom.
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";

export const rateGroups = [
  { value: "material", label: "Material / सामग्री" },
  { value: "labour", label: "Labour / मजदूरी" },
  { value: "equipment", label: "Equipment / मशीन" },
  { value: "subcontract", label: "Sub-contract / ठेका" },
  { value: "other", label: "Other / अन्य" },
];
export const rateGroupValues = rateGroups.map((g) => g.value);
export function rateGroupLabel(value: string): string { return rateGroups.find((g) => g.value === value)?.label.split(" / ")[0] || value; }

export const commonUnits = ["bag", "MT", "kg", "cum", "sqm", "sqft", "rft", "nos", "day", "hour", "month", "trip", "lump sum"];

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function normalizeRateInput(payload: Record<string, unknown>) {
  const item = cleanText(payload.item, 160);
  if (!item) throw new InputError("Item name is required (for example: Cement OPC 53).");
  const n = Number(String(payload.rate ?? "").replace(/[,₹\s]/g, ""));
  if (payload.rate === undefined || payload.rate === null || payload.rate === "" || !Number.isFinite(n) || n < 0 || n > 1e10) throw new InputError("Enter the rate as a number in rupees.");
  const group = rateGroupValues.includes(String(payload.group)) ? String(payload.group) : "material";
  const validRaw = cleanText(payload.validTill, 40);
  const validMs = validRaw ? Date.parse(validRaw) : NaN;
  const supplierId = cleanText(payload.supplierContactId, 24);
  return {
    item, group, spec: cleanText(payload.spec, 160), unit: cleanText(payload.unit, 40), rate: Math.round(n * 100) / 100,
    supplierName: cleanText(payload.supplierName, 160), supplierContactId: OBJECT_ID.test(supplierId) ? supplierId : "",
    city: cleanText(payload.city, 120), state: cleanText(payload.state, 120),
    validTill: Number.isNaN(validMs) ? null : new Date(validMs), notes: cleanText(payload.notes, 2000),
  };
}

type R = { _id: string; item: string; spec?: string; unit?: string; rate: number; supplierName?: string; updatedAt?: string };
export type RateComparison = { key: string; item: string; unit: string; quotes: number; low: number; high: number; average: number; bestSupplier: string };

/** Same item + spec + unit from different suppliers, with the cheapest quote first. */
export function compareRates(rates: R[]): RateComparison[] {
  const groups = new Map<string, R[]>();
  for (const rate of rates) {
    const key = [rate.item, rate.spec || "", rate.unit || ""].map((v) => v.trim().toLowerCase()).join("|");
    groups.set(key, [...(groups.get(key) || []), rate]);
  }
  return Array.from(groups, ([key, list]) => {
    const sorted = [...list].sort((a, b) => a.rate - b.rate);
    const total = list.reduce((sum, r) => sum + r.rate, 0);
    return { key, item: [sorted[0].item, sorted[0].spec].filter(Boolean).join(" · "), unit: sorted[0].unit || "", quotes: list.length, low: sorted[0].rate, high: sorted[sorted.length - 1].rate, average: Math.round((total / list.length) * 100) / 100, bestSupplier: sorted[0].supplierName || "" };
  }).sort((a, b) => b.quotes - a.quotes || a.item.localeCompare(b.item));
}

export function isStaleRate(updatedAt: string | undefined, now: Date = new Date(), days = 90): boolean {
  if (!updatedAt) return false;
  const ms = Date.parse(updatedAt);
  return !Number.isNaN(ms) && now.getTime() - ms > days * 86400000;
}
