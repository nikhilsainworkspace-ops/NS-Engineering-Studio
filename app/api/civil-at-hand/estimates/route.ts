import { estimateRoutes } from "@/modules/civil-at-hand/lib/routes/estimates";

export const runtime = "nodejs";
export const { GET, POST } = estimateRoutes.list;
