import type mongoose from "mongoose";
import { ConflictError } from "@/modules/civil-at-hand/lib/api-helpers";
import { assertExists, changedRef, collectionRoutes, itemRoutes, type CrudOptions } from "@/modules/civil-at-hand/lib/crud";
import { purchaseOrderDef } from "@/modules/civil-at-hand/lib/entities";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { purchaseOrderTotals, type PoLine } from "@/modules/civil-at-hand/lib/inventory";
import { nextNumber } from "@/modules/civil-at-hand/lib/server-settings";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { MaterialRequest } from "@/modules/civil-at-hand/models/MaterialRequest";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";

type AnyModel = mongoose.Model<Record<string, unknown>>;

export const purchaseOrderOptions: CrudOptions = {
  model: PurchaseOrder, def: purchaseOrderDef, filters: ["status", "projectId", "supplierContactId", "materialRequestId"], searchFields: ["number", "supplierName"], sort: { createdAt: -1 }, limit: 2000,
  prepare: async (data, { existing }) => {
    await assertExists(Contact as unknown as AnyModel, changedRef(data, existing, "supplierContactId"), "supplier");
    await assertExists(Project as unknown as AnyModel, changedRef(data, existing, "projectId"), "project");
    await assertExists(MaterialRequest as unknown as AnyModel, changedRef(data, existing, "materialRequestId"), "material request");
    if (data.deliverTo === "project" && !data.projectId) throw new InputError("Choose the project site this order should be delivered to.");
    const items = (data.items as PoLine[]) || [];
    if (existing) {
      // Keep received quantities from the stored lines; they only change through goods receipts.
      const before = (existing.items as PoLine[]) || [];
      data.items = items.map((line, index) => ({ ...line, receivedQty: before[index]?.receivedQty || 0 }));
    } else {
      data.number = await nextNumber("purchaseOrder");
      data.status = "draft";
      data.items = items.map((line) => ({ ...line, receivedQty: 0 }));
      if (!data.orderDate) data.orderDate = new Date();
    }
    data.total = purchaseOrderTotals(data.items as PoLine[], Number(data.freight || 0)).total;
    return data;
  },
  guardEdit: (existing) => {
    const receipts = Array.isArray(existing.receipts) ? existing.receipts.length : 0;
    if (!["draft", "issued"].includes(String(existing.status)) || receipts) throw new ConflictError("Goods have been received against this order (or it is closed), so its lines are locked. Close it and raise a new order if more is needed.");
  },
  guardDelete: (existing) => { if (existing.status !== "draft") throw new ConflictError("Only draft orders can be deleted. Cancel an issued order instead."); },
};

export const purchaseOrderRoutes = { list: collectionRoutes(purchaseOrderOptions), item: itemRoutes(purchaseOrderOptions) };
