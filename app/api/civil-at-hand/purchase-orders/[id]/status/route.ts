import { adminHandler, ConflictError, json, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { purchaseOrderRoutes } from "@/modules/civil-at-hand/lib/routes/purchase-orders";
import { MaterialRequest } from "@/modules/civil-at-hand/models/MaterialRequest";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

const allowed: Record<string, string[]> = {
  issued: ["draft"],
  closed: ["issued", "partially-received", "received"],
  cancelled: ["draft", "issued"],
};

export const POST = adminHandler("Purchase order status error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowed[status]) throw new InputError("Choose issue, close or cancel.");
  const existing = await purchaseOrderRoutes.item.load(id);
  if (!allowed[status].includes(String(existing.status))) throw new ConflictError(`An order that is “${existing.status}” cannot be ${status}.`);
  if (status === "cancelled" && Array.isArray(existing.receipts) && existing.receipts.length) throw new ConflictError("Goods were received against this order. Close it instead of cancelling.");
  const update: Record<string, unknown> = { status };
  if (status === "issued") update.issuedAt = new Date();
  const updated = await PurchaseOrder.findOneAndUpdate({ _id: id, status: existing.status }, { $set: update }, { new: true }).lean();
  if (!updated) throw new ConflictError("This order changed a moment ago. Refresh and try again.");
  if (status === "issued" && existing.materialRequestId) await MaterialRequest.updateOne({ _id: existing.materialRequestId, status: { $in: ["requested", "approved"] } }, { $set: { status: "ordered" } });
  await audit(request, `purchase-order-${status}`, String(existing.number));
  return json({ item: plain(updated) });
});
