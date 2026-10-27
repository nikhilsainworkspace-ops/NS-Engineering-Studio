import { routes } from "@/modules/civil-at-hand/lib/routes/simple";

export const runtime = "nodejs";
export const { GET, PUT, PATCH, DELETE } = routes.materials.item;
