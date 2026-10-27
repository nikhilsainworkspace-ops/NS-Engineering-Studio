// Business settings: one owner-managed record (`_id: "business"`). Client-safe (no database imports).
import { cleanString, parseNumber } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { projectTypes as legacyProjectTypes } from "@/modules/civil-at-hand/lib/projects";

export type BusinessSettings = {
  businessName: string; legalName: string; address: string; city: string; state: string; pincode: string;
  phone: string; email: string; website: string; gstin: string; pan: string; logoUrl: string;
  currency: string; timezone: string; taxLabel: string; defaultTaxPct: number;
  units: string[]; projectTypes: string[]; materialCategories: string[]; expenseCategories: string[]; trades: string[];
  prefixes: { quotation: string; invoice: string; bill: string; purchaseOrder: string; materialRequest: string };
  quotationTerms: string; invoiceNotes: string; bankDetails: string; quotationValidityDays: number;
  lowStockAlerts: boolean; documentExpiryWarningDays: number;
};

export const currencyOptions = [
  { value: "INR", label: "Indian rupee (₹)" }, { value: "USD", label: "US dollar ($)" }, { value: "AED", label: "UAE dirham" },
  { value: "EUR", label: "Euro (€)" }, { value: "GBP", label: "British pound (£)" }, { value: "SAR", label: "Saudi riyal" },
  { value: "NPR", label: "Nepalese rupee" }, { value: "BDT", label: "Bangladeshi taka" }, { value: "LKR", label: "Sri Lankan rupee" },
];
export const timezoneOptions = ["Asia/Kolkata", "Asia/Dubai", "Asia/Kathmandu", "Asia/Dhaka", "Asia/Colombo", "Asia/Riyadh", "Asia/Singapore", "Europe/London", "UTC"];

export const defaultSettings: BusinessSettings = {
  businessName: "", legalName: "", address: "", city: "", state: "", pincode: "", phone: "", email: "", website: "", gstin: "", pan: "", logoUrl: "",
  currency: "INR", timezone: "Asia/Kolkata", taxLabel: "GST", defaultTaxPct: 18,
  units: ["Nos", "Cum", "Sqm", "Rmt", "Kg", "MT", "Bag", "Ltr", "Day", "Hour", "Month", "LS", "Trip", "Cft", "Sqft", "Rft"],
  projectTypes: legacyProjectTypes,
  materialCategories: ["Cement & binders", "Steel & reinforcement", "Aggregates & sand", "Bricks & blocks", "Concrete (RMC)", "Shuttering & formwork", "Plumbing & sanitary", "Electrical", "Waterproofing & chemicals", "Paint & finishes", "Tiles & stone", "Doors, windows & hardware", "Road & pavement materials", "Safety & PPE", "Tools & consumables", "Fuel & lubricants", "Other"],
  expenseCategories: ["Petty cash / site expenses", "Fuel & transport", "Equipment hire", "Labour (contract, not in attendance)", "Material (cash purchase)", "Food & accommodation", "Approvals, fees & liaisoning", "Testing & inspection", "Office & administration", "Miscellaneous"],
  trades: ["Mason", "Helper", "Carpenter / shuttering", "Bar bender / steel fixer", "Electrician", "Plumber", "Welder / fabricator", "Painter", "Tile & stone fitter", "Machine operator", "Driver", "Supervisor / foreman", "Surveyor", "Security", "Other"],
  prefixes: { quotation: "QT", invoice: "INV", bill: "BILL", purchaseOrder: "PO", materialRequest: "MR" },
  quotationTerms: "1. Rates are valid for the period stated above.\n2. Taxes are charged as shown; any change in statutory taxes will be applied as per law.\n3. Measurements will be taken jointly at site; payment will be made on actual measured quantities.\n4. Any work not listed above will be treated as extra and quoted separately.",
  invoiceNotes: "Thank you for your business. Please quote the invoice number with your payment.",
  bankDetails: "", quotationValidityDays: 30, lowStockAlerts: true, documentExpiryWarningDays: 30,
};

function list(value: unknown, fallback: string[], maxItems = 60, maxLength = 80): string[] {
  if (value === undefined) return fallback;
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];
  const cleaned = Array.from(new Set(raw.map((item) => cleanString(item, maxLength)).filter(Boolean))).slice(0, maxItems);
  return cleaned.length ? cleaned : fallback;
}
function prefix(value: unknown, fallback: string): string {
  const text = cleanString(value, 12).toUpperCase().replace(/[^A-Z0-9/-]/g, "");
  return text || fallback;
}

/** Merges stored values with defaults so new settings keys never break older records. */
export function withDefaults(stored: Partial<BusinessSettings> | null | undefined): BusinessSettings {
  const value = stored || {};
  return {
    ...defaultSettings, ...value,
    prefixes: { ...defaultSettings.prefixes, ...(value.prefixes || {}) },
    units: value.units?.length ? value.units : defaultSettings.units,
    projectTypes: value.projectTypes?.length ? value.projectTypes : defaultSettings.projectTypes,
    materialCategories: value.materialCategories?.length ? value.materialCategories : defaultSettings.materialCategories,
    expenseCategories: value.expenseCategories?.length ? value.expenseCategories : defaultSettings.expenseCategories,
    trades: value.trades?.length ? value.trades : defaultSettings.trades,
  } as BusinessSettings;
}

export function normalizeSettingsInput(payload: Record<string, unknown>, current: BusinessSettings): BusinessSettings {
  const text = (key: keyof BusinessSettings, max: number) => (key in payload ? cleanString(payload[key], max) : String(current[key] ?? ""));
  const currency = "currency" in payload ? cleanString(payload.currency, 3).toUpperCase() : current.currency;
  if (!currencyOptions.some((option) => option.value === currency)) throw new InputError("Choose a supported currency.");
  const timezone = "timezone" in payload ? cleanString(payload.timezone, 60) : current.timezone;
  if (!timezoneOptions.includes(timezone)) throw new InputError("Choose a supported time zone.");
  const email = text("email", 180);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("Enter a valid business email address.");
  const website = text("website", 200);
  if (website && !/^https?:\/\/[^\s]+$/i.test(website)) throw new InputError("The website must start with https:// or http://");
  const logoUrl = text("logoUrl", 400);
  if (logoUrl && !/^(https:\/\/[^\s]+|\/[A-Za-z0-9._\-/]+)$/.test(logoUrl)) throw new InputError("The logo must be an https:// address or a file path in /public such as /logo.png");
  const gstin = text("gstin", 15).toUpperCase();
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) throw new InputError("A GSTIN has 15 letters and numbers. Leave it blank if not applicable.");
  const rawPrefixes = (payload.prefixes && typeof payload.prefixes === "object" ? payload.prefixes : {}) as Record<string, unknown>;
  return {
    businessName: text("businessName", 160), legalName: text("legalName", 200), address: text("address", 500), city: text("city", 120),
    state: text("state", 120), pincode: text("pincode", 12), phone: text("phone", 60), email, website, gstin, pan: text("pan", 10).toUpperCase(), logoUrl,
    currency, timezone, taxLabel: text("taxLabel", 20) || "GST",
    defaultTaxPct: "defaultTaxPct" in payload ? parseNumber(payload.defaultTaxPct, "Default tax %", 0, 100) ?? 0 : current.defaultTaxPct,
    units: list(payload.units, current.units, 80, 20),
    projectTypes: list(payload.projectTypes, current.projectTypes, 60, 120),
    materialCategories: list(payload.materialCategories, current.materialCategories),
    expenseCategories: list(payload.expenseCategories, current.expenseCategories),
    trades: list(payload.trades, current.trades),
    prefixes: {
      quotation: prefix(rawPrefixes.quotation ?? current.prefixes.quotation, "QT"), invoice: prefix(rawPrefixes.invoice ?? current.prefixes.invoice, "INV"),
      bill: prefix(rawPrefixes.bill ?? current.prefixes.bill, "BILL"), purchaseOrder: prefix(rawPrefixes.purchaseOrder ?? current.prefixes.purchaseOrder, "PO"),
      materialRequest: prefix(rawPrefixes.materialRequest ?? current.prefixes.materialRequest, "MR"),
    },
    quotationTerms: text("quotationTerms", 6000), invoiceNotes: text("invoiceNotes", 3000), bankDetails: text("bankDetails", 1000),
    quotationValidityDays: "quotationValidityDays" in payload ? parseNumber(payload.quotationValidityDays, "Quotation validity", 0, 365) ?? 30 : current.quotationValidityDays,
    lowStockAlerts: "lowStockAlerts" in payload ? payload.lowStockAlerts === true : current.lowStockAlerts,
    documentExpiryWarningDays: "documentExpiryWarningDays" in payload ? parseNumber(payload.documentExpiryWarningDays, "Expiry warning days", 1, 365) ?? 30 : current.documentExpiryWarningDays,
  };
}

/** Money formatting that follows the configured currency. INR keeps lakh/crore grouping. */
export function formatMoney(value: number | null | undefined, currency = "INR", options: { compact?: boolean; decimals?: boolean } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (currency === "INR" && options.compact) {
    const abs = Math.abs(value);
    const trim = (number: number) => String(Number(number.toFixed(2)));
    if (abs >= 1e7) return `₹${trim(value / 1e7)} Cr`;
    if (abs >= 1e5) return `₹${trim(value / 1e5)} L`;
  }
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-GB", { style: "currency", currency, minimumFractionDigits: options.decimals ? 2 : 0, maximumFractionDigits: options.decimals ? 2 : (options.compact ? 0 : 2) }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

export function displayBusinessName(settings: BusinessSettings, fallback: string): string {
  return settings.businessName || fallback;
}
