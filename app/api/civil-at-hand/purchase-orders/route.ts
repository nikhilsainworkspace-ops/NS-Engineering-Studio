import { purchaseOrderRoutes } from "@/modules/civil-at-hand/lib/routes/purchase-orders";

export const runtime = "nodejs";
export const { GET, POST } = purchaseOrderRoutes.list;
