import { adminHandler, ConflictError, json, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { cleanString } from "@/modules/civil-at-hand/lib/entity-spec";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { invoiceRoutes } from "@/modules/civil-at-hand/lib/routes/invoices";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Draft → issued, or issued → void (only when no payments are recorded). */
export const POST = adminHandler("Invoice state error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const body = await readJson(request);
  const state = String(body.state || "");
  const existing = await invoiceRoutes.item.load(id);
  if (state === "issued") {
    if (existing.state !== "draft") throw new ConflictError("Only drafts can be issued.");
  } else if (state === "void") {
    if (existing.state !== "issued" && existing.state !== "draft") throw new ConflictError("This document is already void.");
    if (Array.isArray(existing.payments) && existing.payments.length) throw new ConflictError("Payments are recorded against this document. Remove them first if they were entered by mistake.");
  } else throw new InputError("Choose issue or void.");
  const updated = await Invoice.findOneAndUpdate({ _id: id, state: existing.state }, { $set: { state, voidReason: state === "void" ? cleanString(body.reason, 300) : "" } }, { new: true }).lean();
  if (!updated) throw new ConflictError("This document changed a moment ago. Refresh and try again.");
  await audit(request, `invoice-${state}`, String(existing.number));
  return json({ item: plain(updated) });
});
