import { documentRoutes } from "@/modules/civil-at-hand/lib/routes/documents";

export const runtime = "nodejs";
export const { GET, PUT, PATCH, DELETE } = documentRoutes.item;
