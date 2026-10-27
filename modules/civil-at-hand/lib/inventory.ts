// Stock ledger arithmetic. Every movement has an origin and a destination, so stock is always
// "what came in minus what went out" for a location, and nothing is ever edited in place.
//
// Locations: "store" (main store / yard) or "project:<projectId>".
// External ends (not stock-holding): "supplier", "consumed", "wasted", "adjustment".
import { round2 } from "@/modules/civil-at-hand/lib/entity-spec";

export const EXTERNAL_LOCATIONS = ["supplier", "consumed", "wasted", "adjustment"] as const;
export type MovementType = "receipt" | "issue" | "transfer" | "consumption" | "wastage" | "return-to-store" | "return-to-supplier" | "adjustment-in" | "adjustment-out";

export const movementTypes: { value: MovementType; label: string; from: "external" | "internal"; to: "external" | "internal"; fixedFrom?: string; fixedTo?: string }[] = [
  { value: "receipt", label: "Received from supplier", from: "external", to: "internal", fixedFrom: "supplier" },
  { value: "issue", label: "Issued from store to site", from: "internal", to: "internal", fixedFrom: "store" },
  { value: "transfer", label: "Transferred between sites", from: "internal", to: "internal" },
  { value: "consumption", label: "Used / consumed at site", from: "internal", to: "external", fixedTo: "consumed" },
  { value: "wastage", label: "Wastage / damaged", from: "internal", to: "external", fixedTo: "wasted" },
  { value: "return-to-store", label: "Returned from site to store", from: "internal", to: "internal", fixedTo: "store" },
  { value: "return-to-supplier", label: "Returned to supplier", from: "internal", to: "external", fixedTo: "supplier" },
  { value: "adjustment-in", label: "Stock count adjustment (+)", from: "external", to: "internal", fixedFrom: "adjustment" },
  { value: "adjustment-out", label: "Stock count adjustment (−)", from: "internal", to: "external", fixedTo: "adjustment" },
];

export function isInternalLocation(location: string): boolean {
  return location === "store" || /^project:[a-f\d]{24}$/i.test(location);
}

export type Movement = { materialId: string; type: MovementType | string; from: string; to: string; qty: number; rate?: number | null; date?: string | Date; reversedById?: string | null; reversalOfId?: string | null };

/** On-hand quantity per material per internal location. */
export function stockBalances(movements: Movement[]): Map<string, Map<string, number>> {
  const balances = new Map<string, Map<string, number>>();
  const add = (materialId: string, location: string, qty: number) => {
    if (!isInternalLocation(location)) return;
    const perLocation = balances.get(materialId) || new Map<string, number>();
    perLocation.set(location, round3((perLocation.get(location) || 0) + qty));
    balances.set(materialId, perLocation);
  };
  for (const movement of movements) {
    add(movement.materialId, movement.to, movement.qty);
    add(movement.materialId, movement.from, -movement.qty);
  }
  return balances;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

export function totalOnHand(perLocation: Map<string, number> | undefined): number {
  if (!perLocation) return 0;
  return round3(Array.from(perLocation.values()).reduce((sum, qty) => sum + qty, 0));
}

/** Weighted average rate of all receipts for a material (used for a simple stock valuation). */
export function averageReceiptRate(movements: Movement[], materialId: string): number | null {
  let qty = 0; let value = 0;
  for (const movement of movements) {
    if (movement.materialId !== materialId || movement.type !== "receipt" || movement.reversedById) continue;
    if (typeof movement.rate !== "number" || !(movement.rate >= 0)) continue;
    qty += movement.qty; value += movement.qty * movement.rate;
  }
  return qty > 0 ? round2(value / qty) : null;
}

/** Resolves and checks the from/to locations for a new movement. Returns an error message or the resolved pair. */
export function resolveMovement(type: string, from: string, to: string): { from: string; to: string } | { error: string } {
  const definition = movementTypes.find((item) => item.value === type);
  if (!definition) return { error: "Choose a valid stock movement type." };
  const resolvedFrom = definition.fixedFrom || from;
  const resolvedTo = definition.fixedTo || to;
  if (definition.from === "internal" && !isInternalLocation(resolvedFrom)) return { error: "Choose where the material is coming from." };
  if (definition.to === "internal" && !isInternalLocation(resolvedTo)) return { error: "Choose where the material is going." };
  if (resolvedFrom === resolvedTo) return { error: "The source and destination must be different." };
  return { from: resolvedFrom, to: resolvedTo };
}

/** Prevents stock going below zero at the source location. */
export function checkAvailable(balances: Map<string, Map<string, number>>, materialId: string, from: string, qty: number): string | null {
  if (!isInternalLocation(from)) return null;
  const available = balances.get(materialId)?.get(from) || 0;
  if (qty > available + 1e-9) return `Only ${available.toLocaleString("en-IN")} available at the source location. Record the receipt first, or reduce the quantity.`;
  return null;
}

/* ------------------------------------------------------------------ purchase orders */
export type PoLine = { description: string; materialId?: string; unit?: string; qty: number; rate?: number | null; taxPct?: number | null; receivedQty?: number | null };

export function purchaseOrderTotals(items: PoLine[], freight = 0) {
  let subtotal = 0; let tax = 0;
  for (const line of items) {
    const amount = round2((line.qty || 0) * (line.rate || 0));
    subtotal += amount; tax += round2(amount * (line.taxPct || 0) / 100);
  }
  subtotal = round2(subtotal); tax = round2(tax);
  const freightAmount = round2(Math.max(0, freight || 0));
  return { subtotal, tax, freight: freightAmount, total: round2(subtotal + tax + freightAmount) };
}

/** Validates a goods receipt against what is still outstanding on each line. */
export function checkReceipt(items: PoLine[], receipt: { index: number; qty: number }[]): string | null {
  if (!receipt.length) return "Enter at least one received quantity.";
  const seen = new Set<number>();
  for (const line of receipt) {
    if (seen.has(line.index)) return "Each order line can appear only once in a receipt.";
    seen.add(line.index);
    const item = items[line.index];
    if (!item) return "A received line does not belong to this order.";
    if (!(line.qty > 0)) return "Received quantities must be greater than zero.";
    const outstanding = round3(item.qty - (item.receivedQty || 0));
    if (line.qty > outstanding + 1e-9) return `“${item.description}”: only ${outstanding} ${item.unit || ""} still to receive.`.replace(/\s+\./, ".");
  }
  return null;
}

export function receivedStatus(items: PoLine[]): "issued" | "partially-received" | "received" {
  const received = items.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
  if (received <= 0) return "issued";
  return items.every((item) => (item.receivedQty || 0) >= item.qty - 1e-9) ? "received" : "partially-received";
}
