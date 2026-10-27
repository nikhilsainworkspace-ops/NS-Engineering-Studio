import mongoose from "mongoose";
import { adminHandler, json, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { cleanString, parseDateValue, parseNumber } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { isInternalLocation, movementTypes, resolveMovement } from "@/modules/civil-at-hand/lib/inventory";
import { availableAt } from "@/modules/civil-at-hand/lib/stock-server";
import { Material } from "@/modules/civil-at-hand/models/Material";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { StockMovement } from "@/modules/civil-at-hand/models/StockMovement";

export const runtime = "nodejs";

export const GET = adminHandler("Stock movement list error", async (request: Request) => {
  await dbConnect();
  const url = new URL(request.url);
  const filter: Record<string, unknown> = {};
  const materialId = url.searchParams.get("materialId");
  const location = url.searchParams.get("location");
  if (materialId && mongoose.isValidObjectId(materialId)) filter.materialId = materialId;
  if (location && isInternalLocation(location)) filter.$or = [{ from: location }, { to: location }];
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 500, 1), 5000);
  const items = await StockMovement.find(filter).sort({ date: -1, createdAt: -1 }).limit(limit).lean();
  return json({ items: plain(items) });
});

async function checkLocation(location: string) {
  if (location.startsWith("project:")) {
    const id = location.slice(8);
    if (!(await Project.exists({ _id: id }))) throw new InputError("The selected project no longer exists.");
  }
}

/** Records one stock movement. Movements are permanent; mistakes are corrected with “Reverse”. */
export const POST = adminHandler("Stock movement error", async (request: Request) => {
  const body = await readJson(request);
  const type = String(body.type || "");
  if (!movementTypes.some((item) => item.value === type)) throw new InputError("Choose what kind of stock movement this is.");
  const materialId = cleanString(body.materialId, 24);
  if (!mongoose.isValidObjectId(materialId)) throw new InputError("Choose a material.");
  const qty = parseNumber(body.qty, "Quantity", 0.001, 1e9);
  if (!qty) throw new InputError("Enter the quantity.");
  const resolved = resolveMovement(type, cleanString(body.from, 40), cleanString(body.to, 40));
  if ("error" in resolved) throw new InputError(resolved.error);
  const clientRef = cleanString(body.clientRef, 80);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(clientRef)) throw new InputError("Refresh the page and try again (missing request reference).");
  await dbConnect();
  const duplicate = await StockMovement.findOne({ clientRef }).lean();
  if (duplicate) return json({ item: plain(duplicate), duplicate: true });
  if (!(await Material.exists({ _id: materialId }))) throw new InputError("The selected material no longer exists.");
  await checkLocation(resolved.from); await checkLocation(resolved.to);
  const available = await availableAt(materialId, resolved.from);
  if (qty > available + 1e-9) throw new InputError(`Only ${available.toLocaleString("en-IN")} is available at the source location. Record the receipt first, or reduce the quantity.`);
  const created = await StockMovement.create({
    materialId, type, from: resolved.from, to: resolved.to, qty, rate: parseNumber(body.rate, "Rate", 0, 1e9),
    date: parseDateValue(body.date, "Date") || new Date(), refKind: "manual", refLabel: cleanString(body.refLabel, 80), note: cleanString(body.note, 300), clientRef,
  });
  await audit(request, "stock-movement", `${type} ${qty}`);
  return json({ item: plain(created.toObject()) }, 201);
});
