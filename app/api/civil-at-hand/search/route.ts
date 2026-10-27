import { adminHandler, json } from "@/modules/civil-at-hand/lib/api-helpers";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { escapeRegex } from "@/modules/civil-at-hand/lib/entity-spec";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";
import { Material } from "@/modules/civil-at-hand/models/Material";
import { MaterialRequest } from "@/modules/civil-at-hand/models/MaterialRequest";
import { ProjectDocument } from "@/modules/civil-at-hand/models/ProjectDocument";
import { PublicPage } from "@/modules/civil-at-hand/models/PublicPage";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { Tender } from "@/modules/civil-at-hand/models/Tender";
import { Worker } from "@/modules/civil-at-hand/models/Worker";

export const runtime = "nodejs";

type Hit = { kind: string; id: string; title: string; subtitle: string };
type Row = Record<string, unknown> & { _id: unknown };

/**
 * Admin-only search across the version 4 modules (contacts, projects, tasks, notes, rates and links are
 * searched in the browser from records already loaded). At most five results per type.
 */
export const GET = adminHandler("Search error", async (request: Request) => {
  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 60);
  if (q.length < 2) return json({ results: [] });
  await dbConnect();
  const rx = { $regex: escapeRegex(q), $options: "i" };
  const any = (...fields: string[]) => ({ $or: fields.map((field) => ({ [field]: rx })) });
  const take = 5;
  const [estimates, invoices, orders, requests, materials, workers, tenders, documents, pages] = await Promise.all([
    Estimate.find(any("title", "number", "clientName", "siteLocation"), { title: 1, number: 1, version: 1, status: 1, clientName: 1 }).limit(take).lean(),
    Invoice.find(any("number", "partyName", "partyReference"), { number: 1, kind: 1, partyName: 1, state: 1 }).limit(take).lean(),
    PurchaseOrder.find(any("number", "supplierName"), { number: 1, supplierName: 1, status: 1 }).limit(take).lean(),
    MaterialRequest.find(any("number", "requestedBy", "items.description"), { number: 1, status: 1 }).limit(take).lean(),
    Material.find(any("name", "spec", "category"), { name: 1, category: 1, unit: 1 }).limit(take).lean(),
    Worker.find(any("name", "trade", "phone"), { name: 1, trade: 1, status: 1 }).limit(take).lean(),
    Tender.find(any("title", "authority", "refNumber", "location"), { title: 1, authority: 1, status: 1 }).limit(take).lean(),
    ProjectDocument.find(any("title", "docNumber", "latestFileName", "tags"), { title: 1, category: 1, revision: 1 }).limit(take).lean(),
    PublicPage.find(any("title", "slug"), { title: 1, slug: 1, status: 1 }).limit(take).lean(),
  ]) as Row[][];
  const s = (value: unknown) => String(value || "");
  const results: Hit[] = [
    ...estimates.map((row) => ({ kind: "estimate", id: s(row._id), title: s(row.title), subtitle: `${s(row.number)}${Number(row.version) > 1 ? ` R${Number(row.version) - 1}` : ""} · ${s(row.clientName) || "Quotation"} · ${s(row.status)}` })),
    ...invoices.map((row) => ({ kind: "invoice", id: s(row._id), title: s(row.number), subtitle: `${row.kind === "payable" ? "Supplier bill" : "Client invoice"} · ${s(row.partyName)}` })),
    ...orders.map((row) => ({ kind: "purchase-order", id: s(row._id), title: s(row.number), subtitle: `Purchase order · ${s(row.supplierName)} · ${s(row.status)}` })),
    ...requests.map((row) => ({ kind: "material-request", id: s(row._id), title: s(row.number), subtitle: `Material request · ${s(row.status)}` })),
    ...materials.map((row) => ({ kind: "material", id: s(row._id), title: s(row.name), subtitle: `Material · ${s(row.category) || s(row.unit)}` })),
    ...workers.map((row) => ({ kind: "worker", id: s(row._id), title: s(row.name), subtitle: `Worker · ${s(row.trade) || "—"} · ${s(row.status)}` })),
    ...tenders.map((row) => ({ kind: "tender", id: s(row._id), title: s(row.title), subtitle: `Tender · ${s(row.authority) || "—"} · ${s(row.status)}` })),
    ...documents.map((row) => ({ kind: "document", id: s(row._id), title: s(row.title), subtitle: `Document · ${s(row.category)}${row.revision ? ` · ${s(row.revision)}` : ""}` })),
    ...pages.map((row) => ({ kind: "public-page", id: s(row._id), title: s(row.title), subtitle: `Public page · /workspace/p/${s(row.slug)} · ${s(row.status)}` })),
  ];
  return json({ results });
});
