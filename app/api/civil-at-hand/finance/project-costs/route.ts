import { adminHandler, json, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { projectCostRows } from "@/modules/civil-at-hand/lib/project-costs-server";

export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = adminHandler("Project cost error", async () => json({ items: plain(await projectCostRows()) }));
