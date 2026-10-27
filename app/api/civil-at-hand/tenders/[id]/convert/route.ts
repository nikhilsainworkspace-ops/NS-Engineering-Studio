import { adminHandler, ConflictError, json, plain } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { routes } from "@/modules/civil-at-hand/lib/routes/simple";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { Tender } from "@/modules/civil-at-hand/models/Tender";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

/** Creates an “Awarded” project from a won tender (once). */
export const POST = adminHandler("Tender conversion error", async (request: Request, context: Context) => {
  const { id } = await context.params;
  const tender = await routes.tenders.item.load(id);
  if (tender.status !== "won") throw new ConflictError("Mark the tender as won before creating a project from it.");
  if (tender.projectId) throw new ConflictError("A project has already been created from this tender.");
  const created = await Project.create({
    title: String(tender.title).slice(0, 160), status: "awarded", clientName: String(tender.authority || ""), clientContactId: "", linkedContactIds: [],
    city: String(tender.location || "").slice(0, 120), state: "", projectType: String(tender.category || "").slice(0, 120),
    estimatedValue: Number(tender.bidValue || tender.estimatedValue || 0) || null, contractRef: String(tender.refNumber || "").slice(0, 120),
    source: "Tender", notes: "", startDate: null, endDate: null, followUpAt: null,
  });
  await Tender.updateOne({ _id: id }, { $set: { projectId: String(created._id) } });
  await audit(request, "tender-converted", String(tender.title).slice(0, 80));
  return json({ project: plain(created.toObject()) }, 201);
});
