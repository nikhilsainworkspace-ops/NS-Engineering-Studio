import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { isInternalLocation } from "@/modules/civil-at-hand/lib/inventory";
import { StockMovement } from "@/modules/civil-at-hand/models/StockMovement";

export type BalanceRow = { materialId: string; location: string; qty: number };

/** On-hand balances per material and internal location, computed in MongoDB from the immutable ledger. */
export async function stockBalanceRows(materialIds?: string[]): Promise<BalanceRow[]> {
  await dbConnect();
  const match = materialIds?.length ? [{ $match: { materialId: { $in: materialIds } } }] : [];
  const rows = await StockMovement.aggregate([
    ...match,
    { $project: { materialId: 1, entries: [{ location: "$to", qty: "$qty" }, { location: "$from", qty: { $multiply: ["$qty", -1] } }] } },
    { $unwind: "$entries" },
    { $group: { _id: { materialId: "$materialId", location: "$entries.location" }, qty: { $sum: "$entries.qty" } } },
  ]) as { _id: { materialId: string; location: string }; qty: number }[];
  return rows
    .filter((row) => isInternalLocation(row._id.location) && Math.abs(row.qty) > 1e-9)
    .map((row) => ({ materialId: row._id.materialId, location: row._id.location, qty: Math.round(row.qty * 1000) / 1000 }));
}

export async function availableAt(materialId: string, location: string): Promise<number> {
  if (!isInternalLocation(location)) return Number.POSITIVE_INFINITY;
  const rows = await stockBalanceRows([materialId]);
  return rows.find((row) => row.location === location)?.qty || 0;
}

/** Weighted average receipt rate per material (receipts that were not reversed). */
export async function averageRates(): Promise<Map<string, number>> {
  await dbConnect();
  const rows = await StockMovement.aggregate([
    { $match: { type: "receipt", reversedById: { $in: ["", null] }, rate: { $ne: null } } },
    { $group: { _id: "$materialId", qty: { $sum: "$qty" }, value: { $sum: { $multiply: ["$qty", "$rate"] } } } },
  ]) as { _id: string; qty: number; value: number }[];
  return new Map(rows.filter((row) => row.qty > 0).map((row) => [row._id, Math.round(row.value / row.qty * 100) / 100]));
}
