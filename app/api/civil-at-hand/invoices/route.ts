import { invoiceRoutes } from "@/modules/civil-at-hand/lib/routes/invoices";

export const runtime = "nodejs";
export const { GET, POST } = invoiceRoutes.list;
