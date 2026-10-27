import { estimateRoutes } from "@/modules/civil-at-hand/lib/routes/estimates";

export const runtime = "nodejs";
export const { GET, PUT, DELETE } = estimateRoutes.item;
