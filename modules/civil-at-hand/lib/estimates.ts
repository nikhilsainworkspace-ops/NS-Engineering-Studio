// Estimate / BOQ / quotation arithmetic. Pure functions: covered by tests/erp.test.ts.
//
// How a quotation total is built (shown to the owner in the editor):
//   unit cost      = material rate × (1 + wastage %) + labour rate + equipment rate + other rate
//   markup factor  = (1 + overheads % + contingency %) × (1 + margin %)
//   quoted rate    = unit cost × markup factor            (rounded to 2 decimals; this is what the client sees)
//   line amount    = quantity × quoted rate                (rounded to 2 decimals)
//   subtotal       = Σ line amounts
//   taxable value  = subtotal − discount
//   tax            = taxable value × tax %
//   grand total    = taxable value + tax
import { round2 } from "@/modules/civil-at-hand/lib/entity-spec";

export type EstimateItemInput = {
  code?: string; section?: string; description: string; unit?: string; qty?: number | null;
  materialRate?: number | null; wastagePct?: number | null; labourRate?: number | null; equipmentRate?: number | null; otherRate?: number | null;
  rateSource?: string; rateDate?: string | Date | null; rateOverridden?: boolean; notes?: string;
};
export type EstimateInput = {
  items: EstimateItemInput[]; overheadPct?: number | null; contingencyPct?: number | null; marginPct?: number | null;
  discountAmount?: number | null; taxPct?: number | null;
};

const n = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export function markupFactor(estimate: Pick<EstimateInput, "overheadPct" | "contingencyPct" | "marginPct">): number {
  return (1 + (n(estimate.overheadPct) + n(estimate.contingencyPct)) / 100) * (1 + n(estimate.marginPct) / 100);
}

export function itemUnitCost(item: EstimateItemInput): number {
  return round2(n(item.materialRate) * (1 + n(item.wastagePct) / 100) + n(item.labourRate) + n(item.equipmentRate) + n(item.otherRate));
}

export type ComputedItem = EstimateItemInput & { unitCost: number; costAmount: number; quotedRate: number; amount: number };
export type EstimateTotals = {
  items: ComputedItem[]; directCost: number; materialCost: number; labourCost: number; equipmentCost: number; otherCost: number;
  factor: number; subtotal: number; markupAmount: number; discount: number; taxable: number; tax: number; total: number;
  /** Planned profit if every cost estimate holds: taxable value − direct cost. */
  plannedProfit: number;
};

export function computeEstimate(estimate: EstimateInput): EstimateTotals {
  const factor = markupFactor(estimate);
  let directCost = 0; let subtotal = 0; let materialCost = 0; let labourCost = 0; let equipmentCost = 0; let otherCost = 0;
  const items = (estimate.items || []).map((item) => {
    const qty = n(item.qty);
    const unitCost = itemUnitCost(item);
    const costAmount = round2(qty * unitCost);
    const quotedRate = round2(unitCost * factor);
    const amount = round2(qty * quotedRate);
    directCost += costAmount; subtotal += amount;
    materialCost += qty * n(item.materialRate) * (1 + n(item.wastagePct) / 100);
    labourCost += qty * n(item.labourRate);
    equipmentCost += qty * n(item.equipmentRate);
    otherCost += qty * n(item.otherRate);
    return { ...item, unitCost, costAmount, quotedRate, amount };
  });
  directCost = round2(directCost); subtotal = round2(subtotal);
  const discount = round2(Math.min(Math.max(0, n(estimate.discountAmount)), subtotal));
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * n(estimate.taxPct) / 100);
  return {
    items, directCost, materialCost: round2(materialCost), labourCost: round2(labourCost), equipmentCost: round2(equipmentCost), otherCost: round2(otherCost),
    factor, subtotal, markupAmount: round2(subtotal - directCost), discount, taxable, tax, total: round2(taxable + tax), plannedProfit: round2(taxable - directCost),
  };
}

/** Only drafts can be edited. Sent or decided versions are preserved; changes go into a new revision. */
export function estimateEditable(status: string): boolean { return status === "draft"; }

const transitions: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["approved", "rejected", "cancelled"],
  approved: [],
  rejected: [],
  cancelled: [],
};
export function canChangeEstimateStatus(from: string, to: string): boolean { return (transitions[from] || []).includes(to); }

export function revisionLabel(number: string, version: number): string {
  return version > 1 ? `${number} R${version - 1}` : number;
}

/* ------------------------------------------------------------------ BOQ spreadsheet import */
export type BoqColumn = "code" | "section" | "description" | "unit" | "qty" | "materialRate" | "labourRate" | "equipmentRate" | "otherRate" | "rate" | "wastagePct" | "notes";
const headerAliases: Record<BoqColumn, string[]> = {
  code: ["itemno", "item", "sno", "slno", "srno", "no", "code", "itemcode", "ref"],
  section: ["section", "head", "group", "category", "trade", "chapter"],
  description: ["description", "particulars", "itemdescription", "work", "workdescription", "descriptionofwork", "specification", "details"],
  unit: ["unit", "uom", "units"],
  qty: ["qty", "quantity", "quantities", "qnty", "nos"],
  materialRate: ["materialrate", "material", "matrate", "materialcost"],
  labourRate: ["labourrate", "labour", "laborrate", "labor", "labourcost"],
  equipmentRate: ["equipmentrate", "equipment", "machinery", "plantrate", "plant"],
  otherRate: ["otherrate", "transport", "other", "carriage"],
  rate: ["rate", "unitrate", "rateperunit", "price", "unitprice"],
  wastagePct: ["wastage", "wastagepercent", "wastagepct"],
  notes: ["notes", "remarks", "remark", "comment", "comments"],
};
const normalizeHeader = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");

export function detectBoqColumns(header: string[]): Partial<Record<BoqColumn, number>> {
  const mapping: Partial<Record<BoqColumn, number>> = {};
  header.forEach((cell, index) => {
    const key = normalizeHeader(cell || "");
    if (!key) return;
    for (const column of Object.keys(headerAliases) as BoqColumn[]) {
      if (mapping[column] === undefined && headerAliases[column].includes(key)) { mapping[column] = index; return; }
    }
  });
  return mapping;
}

function numberCell(value: string | undefined): number | null {
  const text = String(value ?? "").replace(/[,₹\s]/g, "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

/** Converts spreadsheet rows (first non-empty row = header) into estimate items with row-level errors. */
export function parseBoqRows(rows: string[][], maxRows = 1000): { items: EstimateItemInput[]; errors: { row: number; message: string }[]; mapping: Partial<Record<BoqColumn, number>>; skipped: number } {
  const errors: { row: number; message: string }[] = [];
  const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell || "").trim()));
  if (headerIndex < 0) return { items: [], errors: [{ row: 1, message: "The file is empty." }], mapping: {}, skipped: 0 };
  const mapping = detectBoqColumns(rows[headerIndex].map((cell) => String(cell || "")));
  if (mapping.description === undefined) return { items: [], errors: [{ row: headerIndex + 1, message: "Add a header row with at least a “Description” column (and ideally Unit, Qty and Rate)." }], mapping, skipped: 0 };
  const items: EstimateItemInput[] = [];
  let skipped = 0;
  let currentSection = "";
  const cell = (row: string[], column: BoqColumn) => (mapping[column] === undefined ? "" : String(row[mapping[column] as number] ?? "").trim());
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || row.every((value) => !String(value || "").trim())) continue;
    if (items.length >= maxRows) { errors.push({ row: index + 1, message: `Only the first ${maxRows} rows are imported.` }); break; }
    const description = cell(row, "description").slice(0, 1500);
    const qty = numberCell(cell(row, "qty"));
    const values = { materialRate: numberCell(cell(row, "materialRate")), labourRate: numberCell(cell(row, "labourRate")), equipmentRate: numberCell(cell(row, "equipmentRate")), otherRate: numberCell(cell(row, "otherRate")), rate: numberCell(cell(row, "rate")), wastagePct: numberCell(cell(row, "wastagePct")) };
    if (!description) { skipped += 1; continue; }
    // A description with no quantity or rates is treated as a section heading.
    const hasNumbers = qty !== null || Object.values(values).some((value) => value !== null);
    if (!hasNumbers) { currentSection = description.slice(0, 120); skipped += 1; continue; }
    const bad = [["Quantity", qty], ...Object.entries(values)].filter(([, value]) => Number.isNaN(value as number) || (typeof value === "number" && value < 0));
    if (bad.length) { errors.push({ row: index + 1, message: `Check the number in ${bad.map(([label]) => label).join(", ")}.` }); continue; }
    const hasBreakdown = [values.materialRate, values.labourRate, values.equipmentRate, values.otherRate].some((value) => value !== null);
    items.push({
      code: cell(row, "code").slice(0, 30),
      section: (cell(row, "section") || currentSection).slice(0, 120),
      description,
      unit: cell(row, "unit").slice(0, 20),
      qty: qty ?? 0,
      // A single "Rate" column is imported as the material/main rate so the unit cost matches the sheet.
      materialRate: hasBreakdown ? values.materialRate ?? 0 : values.rate ?? 0,
      labourRate: values.labourRate ?? 0,
      equipmentRate: values.equipmentRate ?? 0,
      otherRate: values.otherRate ?? 0,
      wastagePct: values.wastagePct ?? 0,
      rateSource: "Imported BOQ",
      notes: cell(row, "notes").slice(0, 300),
    });
  }
  return { items, errors, mapping, skipped };
}
