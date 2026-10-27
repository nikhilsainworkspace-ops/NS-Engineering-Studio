import { adminHandler, ConflictError, json, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { cleanString, parseDateValue, parseNumber } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { checkReceipt, receivedStatus, type PoLine } from "@/modules/civil-at-hand/lib/inventory";
import { purchaseOrderRoutes } from "@/modules/civil-at-hand/lib/routes/purchase-orders";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { StockMovement } from "@/modules/civil-at-hand/models/StockMovement";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/**
 * Goods receipt (GRN). Updates received quantities on the order and adds stock-in entries for lines that are
 * linked to a material. A repeated request with the same clientRef is recognised and never double-counts.
 */
export const POST = adminHandler("Goods receipt error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  const clientRef = cleanString(body.clientRef, 80);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(clientRef)) throw new InputError("Refresh the page and try again (missing request reference).");
  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  const lines = rawLines.map((line) => {
    const row = (line || {}) as Record<string, unknown>;
    return { index: Math.floor(Number(row.index)), qty: parseNumber(row.qty, "Received quantity", 0, 1e9) || 0 };
  }).filter((line) => line.qty > 0);
  const existing = await purchaseOrderRoutes.item.load(id);
  const receipts = (Array.isArray(existing.receipts) ? existing.receipts : []) as { clientRef: string }[];
  let order: Record<string, unknown> = existing;
  const already = receipts.some((receipt) => receipt.clientRef === clientRef);
  if (!already) {
    if (!["issued", "partially-received"].includes(String(existing.status))) throw new ConflictError("Issue the order before receiving goods against it.");
    const items = (existing.items || []) as PoLine[];
    const problem = checkReceipt(items, lines);
    if (problem) throw new InputError(problem);
    const nextItems = items.map((item, index) => ({ ...item, receivedQty: Math.round(((item.receivedQty || 0) + (lines.find((line) => line.index === index)?.qty || 0)) * 1000) / 1000 }));
    const receipt = { at: parseDateValue(body.date, "Receipt date") || new Date(), grnNumber: cleanString(body.grnNumber, 60), note: cleanString(body.note, 300), clientRef, lines };
    const set: Record<string, unknown> = { status: receivedStatus(nextItems) };
    nextItems.forEach((item, index) => { set[`items.${index}.receivedQty`] = item.receivedQty; });
    const updated = await PurchaseOrder.findOneAndUpdate(
      { _id: id, updatedAt: existing.updatedAt, "receipts.clientRef": { $ne: clientRef } },
      { $set: set, $push: { receipts: receipt } },
      { new: true },
    ).lean() as Record<string, unknown> | null;
    if (!updated) throw new ConflictError("This order changed a moment ago. Refresh and check the received quantities before trying again.");
    order = updated;
  }
  // Stock-in entries (idempotent through their clientRef). Lines without a material are recorded on the order only.
  const location = existing.deliverTo === "project" && existing.projectId ? `project:${existing.projectId}` : "store";
  const receipt = ((order.receipts || []) as { clientRef: string; at: Date; lines: { index: number; qty: number }[]; grnNumber?: string }[]).find((item) => item.clientRef === clientRef);
  const items = (order.items || []) as (PoLine & { materialId?: string })[];
  const movements = (receipt?.lines || []).filter((line) => items[line.index]?.materialId).map((line) => ({
    materialId: items[line.index].materialId, type: "receipt", from: "supplier", to: location, qty: line.qty, rate: items[line.index].rate ?? null,
    date: receipt?.at || new Date(), refKind: "purchase-order", refId: id, refLabel: `${existing.number}${receipt?.grnNumber ? ` · GRN ${receipt.grnNumber}` : ""}`.slice(0, 80),
    note: "", clientRef: `${clientRef}-${line.index}`,
  }));
  if (movements.length) {
    try { await StockMovement.insertMany(movements, { ordered: false }); }
    catch (error) {
      const duplicateOnly = typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
      const writeErrors = (error as { writeErrors?: { code?: number; err?: { code?: number } }[] }).writeErrors;
      if (!duplicateOnly && !(writeErrors && writeErrors.every((item) => (item.code ?? item.err?.code) === 11000))) throw error;
    }
  }
  if (!already) await audit(request, "goods-received", `${existing.number}: ${lines.length} line(s)`);
  return json({ item: plain(order), duplicate: already });
});
