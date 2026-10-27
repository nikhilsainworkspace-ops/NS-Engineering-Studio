import mongoose from "mongoose";
import { adminHandler, ConflictError, json, NotFoundError, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { availableAt } from "@/modules/civil-at-hand/lib/stock-server";
import { StockMovement } from "@/modules/civil-at-hand/models/StockMovement";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Cancels a movement by recording the exact opposite movement. Both stay in the history. */
export const POST = adminHandler("Stock reversal error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) throw new InputError("Invalid stock movement.");
  await dbConnect();
  const original = await StockMovement.findById(id).lean() as Record<string, unknown> | null;
  if (!original) throw new NotFoundError("Stock movement not found.");
  if (original.reversalOfId) throw new ConflictError("This entry is itself a reversal and cannot be reversed again.");
  if (original.reversedById) throw new ConflictError("This movement has already been reversed.");
  const qty = Number(original.qty);
  const available = await availableAt(String(original.materialId), String(original.to));
  if (qty > available + 1e-9) throw new ConflictError(`Cannot reverse: only ${available.toLocaleString("en-IN")} is still at the destination. Reverse later movements first.`);
  const reversalId = new mongoose.Types.ObjectId();
  const claimed = await StockMovement.findOneAndUpdate({ _id: id, reversedById: { $in: ["", null] } }, { $set: { reversedById: String(reversalId) } }, { new: true });
  if (!claimed) throw new ConflictError("This movement has already been reversed.");
  try {
    const reversal = await StockMovement.create({
      _id: reversalId, materialId: original.materialId, type: original.type, from: original.to, to: original.from, qty, rate: original.rate,
      date: new Date(), refKind: "reversal", refId: id, refLabel: `Reversal of ${String(original.refLabel || original.type)}`.slice(0, 80), note: "Reversing entry", reversalOfId: id, clientRef: `rev-${id}`,
    });
    await audit(request, "stock-movement-reversed", id);
    return json({ item: plain(reversal.toObject()) }, 201);
  } catch (error) {
    await StockMovement.updateOne({ _id: id, reversedById: String(reversalId) }, { $set: { reversedById: "" } });
    throw error;
  }
});
