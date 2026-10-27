"use client";

// Materials, stock ledger, site material requests and purchase orders with goods receipts.
// Requested, ordered, received and consumed quantities are always kept as separate figures.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { labelOf, materialDef, materialRequestDef, materialRequestStatuses, purchaseOrderDef, purchaseOrderStatuses } from "@/modules/civil-at-hand/lib/entities";
import { movementTypes, purchaseOrderTotals, type PoLine } from "@/modules/civil-at-hand/lib/inventory";
import EntityManager, { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, DetailList, EmptyState, ErrorNote, Loading, Modal, newClientRef, PageSection, projectName, qtyLabel, SearchSelect, SpecForm, Tabs, todayInput, useConfirm, useResource, useWorkspace, type Option, type RowTransform, type Tone } from "@/modules/civil-at-hand/components/ui";

type Section = "stock" | "requests" | "orders" | "materials" | "ledger";
type Balance = { materialId: string; location: string; qty: number };
const poTone: Record<string, Tone> = { draft: "neutral", issued: "info", "partially-received": "warning", received: "success", closed: "neutral", cancelled: "neutral" };
const mrTone: Record<string, Tone> = { requested: "warning", approved: "info", ordered: "accent", fulfilled: "success", rejected: "danger", cancelled: "neutral" };

function useMaterials() {
  const list = useEntityList("/api/civil-at-hand/materials");
  const options: Option[] = useMemo(() => list.data.filter((row) => !row.archived).map((row) => ({ value: row._id, label: String(row.name), hint: [row.spec, row.unit].filter(Boolean).join(" · ") })), [list.data]);
  const byId = useMemo(() => new Map(list.data.map((row) => [row._id, row])), [list.data]);
  return { ...list, options, byId };
}

function locationLabel(location: string, projects: { _id: string; title: string }[]) {
  if (location === "store") return "Main store";
  if (location.startsWith("project:")) return projects.find((project) => project._id === location.slice(8))?.title || "Project site";
  return ({ supplier: "Supplier", consumed: "Consumed", wasted: "Wastage", adjustment: "Adjustment" } as Record<string, string>)[location] || location;
}

/* ------------------------------------------------------------------ stock movement form */
function MovementForm({ materials, presetMaterialId = "", onClose, onSaved }: { materials: ReturnType<typeof useMaterials>; presetMaterialId?: string; onClose: () => void; onSaved: () => void }) {
  const { projects, notify } = useWorkspace();
  const [type, setType] = useState("receipt");
  const [materialId, setMaterialId] = useState(presetMaterialId);
  const [from, setFrom] = useState("store");
  const [to, setTo] = useState("store");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [refLabel, setRefLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clientRef] = useState(newClientRef);
  const definition = movementTypes.find((item) => item.value === type)!;
  const locations: Option[] = [{ value: "store", label: "Main store / yard" }, ...projects.map((project) => ({ value: `project:${project._id}`, label: project.title }))];
  const unit = String(materials.byId.get(materialId)?.unit || "");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/civil-at-hand/stock/movements", { method: "POST", json: { type, materialId, from, to, qty, rate: type === "receipt" ? rate : null, date, note, refLabel, clientRef } }); notify("Stock movement recorded."); onSaved(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not record the movement."); }
    finally { setBusy(false); }
  }
  return <Modal title="Record a stock movement" description="Stock entries are permanent. A mistake is corrected with “Reverse”, which keeps both entries in the history." onClose={onClose}>
    <form className="ui-form" onSubmit={submit}>
      <div className="ui-grid">
        <label className="ui-field ui-span-all"><span className="ui-label">What happened?</span><select value={type} onChange={(event) => setType(event.target.value)}>{movementTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <div className="ui-field ui-span-all"><span className="ui-label">Material<span className="ui-req">*</span></span><SearchSelect label="Material" required value={materialId} onChange={setMaterialId} options={materials.options} placeholder="Search materials…" /></div>
        {definition.from === "internal" && !definition.fixedFrom ? <label className="ui-field"><span className="ui-label">From</span><select value={from} onChange={(event) => setFrom(event.target.value)}>{locations.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        {definition.fixedFrom === "store" ? <div className="ui-field"><span className="ui-label">From</span><span className="ui-static">Main store / yard</span></div> : null}
        {definition.to === "internal" && !definition.fixedTo ? <label className="ui-field"><span className="ui-label">{type === "receipt" ? "Received at" : "To"}</span><select value={to} onChange={(event) => setTo(event.target.value)}>{locations.filter((option) => type !== "issue" || option.value !== "store").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        <label className="ui-field"><span className="ui-label">Quantity{unit ? ` (${unit})` : ""}<span className="ui-req">*</span></span><input type="number" step="any" min={0} required value={qty} onChange={(event) => setQty(event.target.value)} /></label>
        {type === "receipt" ? <label className="ui-field"><span className="ui-label">Rate per {unit || "unit"}</span><input type="number" step="any" min={0} value={rate} onChange={(event) => setRate(event.target.value)} /></label> : null}
        <label className="ui-field"><span className="ui-label">Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-label">Reference (challan, slip…)</span><input value={refLabel} onChange={(event) => setRefLabel(event.target.value)} maxLength={80} /></label>
        <label className="ui-field ui-span-all"><span className="ui-label">Note</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} /></label>
      </div>
      {type === "receipt" ? <p className="ui-footnote">For goods bought on a purchase order, use “Receive goods” on the order instead so the order and stock stay in step.</p> : null}
      {error ? <p className="ui-form-error" role="alert">{error}</p> : null}
      <div className="ui-form-actions"><Button onClick={onClose}>Cancel</Button><button type="submit" className="ui-btn ui-btn-primary" disabled={busy || !materialId}>{busy ? "Saving…" : "Record movement"}</button></div>
    </form>
  </Modal>;
}

/* ------------------------------------------------------------------ stock overview */
function StockView({ materials }: { materials: ReturnType<typeof useMaterials> }) {
  const { projects, money } = useWorkspace();
  const { data, loading, error, reload } = useResource<{ balances: Balance[]; averageRates: Record<string, number> }>("/api/civil-at-hand/stock/balances", (raw) => raw as unknown as { balances: Balance[]; averageRates: Record<string, number> }, { balances: [], averageRates: {} });
  const [recording, setRecording] = useState<string | null>(null);
  const rows = useMemo(() => materials.data.filter((material) => !material.archived).map((material) => {
    const balances = data.balances.filter((row) => row.materialId === material._id);
    const total = Math.round(balances.reduce((sum, row) => sum + row.qty, 0) * 1000) / 1000;
    const rate = data.averageRates[material._id] ?? null;
    return { ...material, _id: material._id, total, store: balances.find((row) => row.location === "store")?.qty || 0, sites: balances.filter((row) => row.location !== "store"), rate, value: rate === null ? null : Math.round(total * rate) } as Row & { total: number; store: number; sites: Balance[]; rate: number | null; value: number | null };
  }), [materials.data, data]);
  const totalValue = rows.reduce((sum, row) => sum + (row.value || 0), 0);
  return <div className="ui-stack">
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.balances.length ? <Loading /> : <DataTable rows={rows} csvName="stock" searchPlaceholder="Search materials…"
      toolbar={<><span className="ui-muted">Stock value {money(totalValue)}</span><Button variant="primary" size="sm" icon="plus" onClick={() => setRecording("")} disabled={!materials.options.length}>Record movement</Button></>}
      columns={[
        { key: "name", label: "Material", render: (row) => <><strong>{String(row.name)}</strong><small className="ui-muted">{[row.category, row.spec].filter(Boolean).join(" · ")}</small></>, value: (row) => String(row.name) },
        { key: "store", label: "Main store", align: "right", render: (row) => qtyLabel(row.store, String(row.unit || "")), value: (row) => row.store },
        { key: "sites", label: "At sites", hideOnMobile: true, render: (row) => row.sites.length ? <span className="ui-chips">{row.sites.map((site) => <span key={site.location}>{locationLabel(site.location, projects)}: {qtyLabel(site.qty)}</span>)}</span> : <span className="ui-muted">—</span>, value: (row) => row.sites.reduce((sum, site) => sum + site.qty, 0) },
        { key: "total", label: "Total on hand", align: "right", render: (row) => <span className={Number(row.minStock || 0) > 0 && row.total < Number(row.minStock) ? "ui-text-danger" : ""}>{qtyLabel(row.total, String(row.unit || ""))}{Number(row.minStock || 0) > 0 && row.total < Number(row.minStock) ? <Badge tone="danger">Below {String(row.minStock)}</Badge> : null}</span>, value: (row) => row.total },
        { key: "value", label: "Value", align: "right", hideOnMobile: true, render: (row) => (row.value === null ? <span className="ui-muted" title="No priced receipts yet">—</span> : money(row.value)), value: (row) => row.value || 0 },
      ]}
      rowActions={(row) => <Button size="sm" variant="ghost" onClick={() => setRecording(row._id)}>Move</Button>}
      empty={<EmptyState icon="box" title="No materials yet">Add materials in the Materials tab, then record receipts, issues to sites and consumption.</EmptyState>} />}
    <p className="ui-footnote">Value = quantity on hand × average purchase rate of recorded receipts. Materials without priced receipts show no value.</p>
    {recording !== null ? <MovementForm materials={materials} presetMaterialId={recording} onClose={() => setRecording(null)} onSaved={reload} /> : null}
  </div>;
}

/* ------------------------------------------------------------------ ledger */
function LedgerView({ materials }: { materials: ReturnType<typeof useMaterials> }) {
  const { projects, notify } = useWorkspace();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useResource<Row[]>("/api/civil-at-hand/stock/movements?limit=2000", (raw) => (raw.items as Row[]) || [], []);
  async function reverse(row: Row) {
    const answer = await confirm({ title: "Reverse this movement?", message: "An opposite entry is recorded today. Both entries stay in the history.", confirmLabel: "Reverse", tone: "danger" });
    if (!answer.ok) return;
    try { await api(`/api/civil-at-hand/stock/movements/${row._id}/reverse`, { method: "POST" }); notify("Movement reversed."); reload(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not reverse.", "error"); }
  }
  return <div className="ui-stack">
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={data} csvName="stock-ledger" initialSort={{ key: "date", dir: -1 }} columns={[
      { key: "date", label: "Date", render: (row) => dateLabel(row.date as string), value: (row) => String(row.date || "") },
      { key: "materialId", label: "Material", value: (row) => String(materials.byId.get(String(row.materialId))?.name || "—") },
      { key: "type", label: "Movement", value: (row) => movementTypes.find((item) => item.value === row.type)?.label || String(row.type), render: (row) => <>{movementTypes.find((item) => item.value === row.type)?.label || String(row.type)}{row.reversalOfId ? <Badge tone="warning">Reversal</Badge> : row.reversedById ? <Badge>Reversed</Badge> : null}</> },
      { key: "route", label: "From → to", hideOnMobile: true, value: (row) => `${locationLabel(String(row.from), projects)} → ${locationLabel(String(row.to), projects)}` },
      { key: "qty", label: "Qty", align: "right", render: (row) => qtyLabel(Number(row.qty), String(materials.byId.get(String(row.materialId))?.unit || "")), value: (row) => Number(row.qty) },
      { key: "refLabel", label: "Reference", hideOnMobile: true, value: (row) => String(row.refLabel || row.note || "") },
    ]} rowActions={(row) => (!row.reversedById && !row.reversalOfId ? <Button size="sm" variant="quiet" onClick={() => void reverse(row)}>Reverse</Button> : null)}
      empty={<EmptyState icon="layers" title="No stock movements yet">Receipts, issues to site, consumption and adjustments appear here in date order.</EmptyState>} />}
  </div>;
}

/* ------------------------------------------------------------------ material requests */
function RequestsView({ materials, onCreateOrder, projectId = "" }: { materials: ReturnType<typeof useMaterials>; onCreateOrder: (request: Row) => void; projectId?: string }) {
  const { projects, notify } = useWorkspace();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useEntityList(`/api/civil-at-hand/material-requests${projectId ? `?projectId=${projectId}` : ""}`);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [filter, setFilter] = useState("open");
  const rows = filter === "open" ? data.filter((row) => ["requested", "approved", "ordered"].includes(String(row.status))) : data;
  const fill: RowTransform = (row, key, value) => {
    if (key !== "materialId" || !value) return row;
    const material = materials.byId.get(String(value));
    return material ? { ...row, description: row.description || material.name, unit: material.unit || row.unit } : row;
  };
  async function save(values: Record<string, unknown>) {
    const isNew = editing === "new";
    await api(isNew ? "/api/civil-at-hand/material-requests" : `/api/civil-at-hand/material-requests/${(editing as Row)._id}`, { method: isNew ? "POST" : "PUT", json: values });
    setEditing(null); notify(isNew ? "Material request raised." : "Request updated."); reload();
  }
  async function setStatus(row: Row, status: string) {
    const answer = await confirm({ title: `${labelOf(materialRequestStatuses, status)}?`, confirmLabel: labelOf(materialRequestStatuses, status), tone: ["rejected", "cancelled"].includes(status) ? "danger" : "primary", input: { label: "Note (optional)" } });
    if (!answer.ok) return;
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/material-requests/${row._id}`, { method: "PATCH", json: { status, decisionNote: answer.text || row.decisionNote || "" } }); notify("Request updated."); reload(); setViewing(result.item); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update.", "error"); }
  }
  return <div className="ui-stack">
    <div className="ui-toolbar-row"><Tabs label="Requests" value={filter} onChange={setFilter} items={[{ value: "open", label: "Open", count: data.filter((row) => ["requested", "approved", "ordered"].includes(String(row.status))).length }, { value: "all", label: "All", count: data.length }]} /><Button variant="primary" icon="plus" onClick={() => setEditing("new")}>New material request</Button></div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={rows} onRowClick={setViewing} csvName="material-requests" columns={[
      { key: "number", label: "Request", render: (row) => <strong>{String(row.number)}</strong>, value: (row) => String(row.number) },
      { key: "projectId", label: "Project", value: (row) => projectName(projects, String(row.projectId)) },
      { key: "items", label: "Items", hideOnMobile: true, value: (row) => ((row.items as Row[]) || []).map((item) => `${item.description} (${item.qty} ${item.unit || ""})`).join(", "), render: (row) => <span className="ui-clamp">{((row.items as Row[]) || []).map((item) => `${item.description} · ${qtyLabel(Number(item.qty), String(item.unit || ""))}`).join("; ")}</span> },
      { key: "neededBy", label: "Needed by", render: (row) => dateLabel(row.neededBy as string), value: (row) => String(row.neededBy || "9999") },
      { key: "status", label: "Status", render: (row) => <Badge tone={mrTone[String(row.status)]}>{labelOf(materialRequestStatuses, String(row.status))}</Badge>, value: (row) => String(row.status) },
    ]} empty={<EmptyState icon="box" title="No material requests" action={<Button variant="primary" icon="plus" onClick={() => setEditing("new")}>Raise a request</Button>}>Site teams request material here; you approve it and turn it into a purchase order.</EmptyState>} />}
    {editing ? <Modal size="lg" title={editing === "new" ? "New material request" : `Edit ${String(editing.number)}`} onClose={() => setEditing(null)}>
      <SpecForm fields={materialRequestDef.fields} initial={editing === "new" ? { projectId, items: [] } : editing} refs={{ material: materials.options }} itemTransforms={{ items: fill }} onSubmit={save} onCancel={() => setEditing(null)} submitLabel={editing === "new" ? "Raise request" : "Save changes"} />
    </Modal> : null}
    {viewing ? <Modal size="lg" title={`Material request ${String(viewing.number)}`} description={projectName(projects, String(viewing.projectId))} onClose={() => setViewing(null)} footer={<>
      {viewing.status === "requested" ? <><Button icon="edit" onClick={() => { setEditing(viewing); setViewing(null); }}>Edit</Button><Button variant="danger" onClick={() => void setStatus(viewing, "rejected")}>Reject</Button><Button variant="primary" onClick={() => void setStatus(viewing, "approved")}>Approve</Button></> : null}
      {["approved", "ordered"].includes(String(viewing.status)) ? <><Button onClick={() => void setStatus(viewing, "cancelled")}>Cancel request</Button><Button onClick={() => void setStatus(viewing, "fulfilled")}>Mark fulfilled</Button><Button variant="primary" icon="truck" onClick={() => { onCreateOrder(viewing); setViewing(null); }}>Create purchase order</Button></> : null}
    </>}>
      <div className="ui-stack">
        <DetailList items={[["Status", <Badge key="s" tone={mrTone[String(viewing.status)]}>{labelOf(materialRequestStatuses, String(viewing.status))}</Badge>], ["Needed by", dateLabel(viewing.neededBy as string)], ["Requested by", String(viewing.requestedBy || "")], ["Decision note", String(viewing.decisionNote || "")]]} />
        <table className="ui-table ui-table-compact"><thead><tr><th>Material</th><th className="num">Quantity</th><th>Note</th></tr></thead><tbody>{((viewing.items as Row[]) || []).map((item, index) => <tr key={index}><td>{String(item.description)}</td><td className="num">{qtyLabel(Number(item.qty), String(item.unit || ""))}</td><td>{String(item.note || "")}</td></tr>)}</tbody></table>
        {viewing.notes ? <p>{String(viewing.notes)}</p> : null}
      </div>
    </Modal> : null}
  </div>;
}

/* ------------------------------------------------------------------ purchase orders */
function ReceiveForm({ order, onClose, onSaved }: { order: Row; onClose: () => void; onSaved: (row: Row) => void }) {
  const { notify } = useWorkspace();
  const items = (order.items || []) as (PoLine & { _id?: string })[];
  const [qty, setQty] = useState<Record<number, string>>({});
  const [grn, setGrn] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clientRef] = useState(newClientRef);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const lines = Object.entries(qty).map(([index, value]) => ({ index: Number(index), qty: Number(value) })).filter((line) => line.qty > 0);
      const result = await api<{ item: Row }>(`/api/civil-at-hand/purchase-orders/${order._id}/receive`, { method: "POST", json: { clientRef, lines, grnNumber: grn, date, note } });
      notify("Goods receipt recorded and stock updated."); onSaved(result.item); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not record the receipt."); }
    finally { setBusy(false); }
  }
  return <Modal size="lg" title={`Receive goods · ${String(order.number)}`} description="Enter only what physically arrived. Lines linked to a material are added to stock at the delivery location." onClose={onClose}>
    <form className="ui-form" onSubmit={submit}>
      <table className="ui-table ui-table-compact"><thead><tr><th>Item</th><th className="num">Ordered</th><th className="num">Received so far</th><th className="num">Receiving now</th></tr></thead><tbody>
        {items.map((item, index) => { const outstanding = Math.round((item.qty - (item.receivedQty || 0)) * 1000) / 1000; return <tr key={index}><td>{item.description}{!item.materialId ? <small className="ui-muted">Not linked to a material — no stock entry</small> : null}</td><td className="num">{qtyLabel(item.qty, item.unit)}</td><td className="num">{qtyLabel(item.receivedQty || 0)}</td><td className="num"><input type="number" step="any" min={0} max={outstanding} disabled={outstanding <= 0} aria-label={`Quantity received for ${item.description}`} value={qty[index] ?? ""} onChange={(event) => setQty((current) => ({ ...current, [index]: event.target.value }))} placeholder={outstanding > 0 ? `up to ${outstanding}` : "Complete"} /></td></tr>; })}
      </tbody></table>
      <div className="ui-grid">
        <label className="ui-field"><span className="ui-label">Receipt date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-label">GRN / challan number</span><input value={grn} onChange={(event) => setGrn(event.target.value)} maxLength={60} /></label>
        <label className="ui-field ui-span-all"><span className="ui-label">Note</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Condition, short supply, vehicle no…" /></label>
      </div>
      {error ? <p className="ui-form-error" role="alert">{error}</p> : null}
      <div className="ui-form-actions"><Button onClick={onClose}>Cancel</Button><button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>{busy ? "Saving…" : "Record receipt"}</button></div>
    </form>
  </Modal>;
}

function OrdersView({ materials, prefill, onPrefillHandled, projectId = "" }: { materials: ReturnType<typeof useMaterials>; prefill: Row | null; onPrefillHandled: () => void; projectId?: string }) {
  const { projects, contacts, money, notify, navigate } = useWorkspace();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useEntityList(`/api/civil-at-hand/purchase-orders${projectId ? `?projectId=${projectId}` : ""}`);
  const requests = useEntityList("/api/civil-at-hand/material-requests");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [receiving, setReceiving] = useState<Row | null>(null);
  useEffect(() => {
    if (!prefill) return;
    setEditing({ projectId: prefill.projectId, materialRequestId: prefill._id, deliverTo: "project", items: ((prefill.items as Row[]) || []).map((item) => ({ materialId: item.materialId, description: item.description, unit: item.unit, qty: item.qty, rate: Number(materials.byId.get(String(item.materialId))?.standardRate || 0) || 0, taxPct: 0 })) });
    onPrefillHandled();
  }, [prefill, materials.byId, onPrefillHandled]);
  const fill: RowTransform = (row, key, value) => {
    if (key !== "materialId" || !value) return row;
    const material = materials.byId.get(String(value));
    return material ? { ...row, description: row.description || material.name, unit: material.unit || row.unit, rate: row.rate || material.standardRate || 0 } : row;
  };
  const requestOptions = useMemo(() => requests.data.map((row) => ({ value: row._id, label: String(row.number), hint: projectName(projects, String(row.projectId)) })), [requests.data, projects]);
  async function save(values: Record<string, unknown>) {
    const id = editing?._id as string | undefined;
    const result = await api<{ item: Row }>(id ? `/api/civil-at-hand/purchase-orders/${id}` : "/api/civil-at-hand/purchase-orders", { method: id ? "PUT" : "POST", json: values });
    setEditing(null); notify(id ? "Order updated." : `Purchase order ${result.item.number} created as a draft.`); reload(); setViewing(result.item);
  }
  async function setStatus(row: Row, status: string) {
    const words: Record<string, string> = { issued: "Issue this order to the supplier?", closed: "Close this order?", cancelled: "Cancel this order?" };
    const answer = await confirm({ title: words[status], message: status === "closed" ? "Use this when no more goods are expected (short-closed). Received quantities stay as recorded." : status === "issued" ? "Lines are locked once goods start arriving." : undefined, confirmLabel: status === "issued" ? "Issue order" : status === "closed" ? "Close order" : "Cancel order", tone: status === "cancelled" ? "danger" : "primary" });
    if (!answer.ok) return;
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/purchase-orders/${row._id}/status`, { method: "POST", json: { status } }); notify("Order updated."); reload(); setViewing(result.item); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update.", "error"); }
  }
  async function createBill(row: Row) {
    const answer = await confirm({ title: "Create a supplier bill from this order?", message: "A draft bill is created with the order lines at ordered quantities. Edit it to match the supplier’s actual bill before issuing.", confirmLabel: "Create draft bill", tone: "primary" });
    if (!answer.ok) return;
    try {
      const items = ((row.items as Row[]) || []).map((item) => ({ description: item.description, unit: item.unit, qty: Number(item.receivedQty) > 0 ? item.receivedQty : item.qty, rate: item.rate, taxPct: item.taxPct }));
      if (Number(row.freight || 0) > 0) items.push({ description: "Freight / delivery", unit: "LS", qty: 1, rate: row.freight, taxPct: 0 });
      await api("/api/civil-at-hand/invoices", { method: "POST", json: { kind: "payable", state: "draft", partyContactId: row.supplierContactId, partyName: row.supplierName, projectId: row.projectId, purchaseOrderId: row._id, date: todayInput(), items } });
      notify("Draft supplier bill created in Finance."); navigate("finance", { kind: "filter", id: "", filter: "payables" });
    } catch (err) { notify(err instanceof Error ? err.message : "Could not create the bill.", "error"); }
  }
  const supplierOptions = useMemo(() => contacts.map((contact) => ({ value: contact._id, label: contact.name, hint: contact.organization })), [contacts]);
  return <div className="ui-stack">
    <div className="ui-toolbar-row"><span /><Button variant="primary" icon="plus" onClick={() => setEditing({ projectId, items: [] })}>New purchase order</Button></div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={data} onRowClick={setViewing} csvName="purchase-orders" columns={[
      { key: "number", label: "Order", render: (row) => <strong>{String(row.number)}</strong>, value: (row) => String(row.number) },
      { key: "supplierName", label: "Supplier", value: (row) => String(row.supplierName || "") },
      { key: "projectId", label: "Project", hideOnMobile: true, value: (row) => projectName(projects, String(row.projectId)) || "Main store" },
      { key: "orderDate", label: "Date", hideOnMobile: true, render: (row) => dateLabel(row.orderDate as string), value: (row) => String(row.orderDate || "") },
      { key: "total", label: "Value", align: "right", render: (row) => money(Number(row.total || 0)), value: (row) => Number(row.total || 0) },
      { key: "status", label: "Status", render: (row) => <Badge tone={poTone[String(row.status)]}>{labelOf(purchaseOrderStatuses, String(row.status))}</Badge>, value: (row) => String(row.status) },
    ]} empty={<EmptyState icon="truck" title="No purchase orders yet" action={<Button variant="primary" icon="plus" onClick={() => setEditing({ items: [] })}>Create a purchase order</Button>}>Raise orders to suppliers, receive goods against them in parts, and turn them into supplier bills.</EmptyState>} />}
    {editing ? <Modal size="xl" title={editing._id ? `Edit ${String(editing.number)}` : "New purchase order"} onClose={() => setEditing(null)}>
      <SpecForm fields={purchaseOrderDef.fields} initial={editing} refs={{ material: materials.options, contact: supplierOptions, materialRequest: requestOptions }} itemTransforms={{ items: fill }}
        onFieldChange={(key, value, values) => { if (key === "supplierContactId" && value && !values.supplierName) { const contact = contacts.find((item) => item._id === value); if (contact) return { ...values, supplierName: contact.organization || contact.name }; } }}
        itemSummary={{ items: (rows) => { const totals = purchaseOrderTotals(rows as unknown as PoLine[], 0); return <span>Lines {money(totals.subtotal)} · tax {money(totals.tax)} · <strong>{money(totals.subtotal + totals.tax)}</strong> before freight</span>; } }}
        onSubmit={save} onCancel={() => setEditing(null)} submitLabel={editing._id ? "Save changes" : "Save draft order"} />
    </Modal> : null}
    {viewing ? <Modal size="xl" title={`Purchase order ${String(viewing.number)}`} description={String(viewing.supplierName || "")} onClose={() => setViewing(null)} footer={<>
      <a className="ui-btn ui-btn-ghost" href={`/workspace/print/purchase-order/${viewing._id}`} target="_blank" rel="noreferrer">Print</a>
      {["draft", "issued"].includes(String(viewing.status)) && !((viewing.receipts as Row[]) || []).length ? <Button icon="edit" onClick={() => { setEditing(viewing); setViewing(null); }}>Edit</Button> : null}
      {["draft", "issued"].includes(String(viewing.status)) && !((viewing.receipts as Row[]) || []).length ? <Button variant="danger" onClick={() => void setStatus(viewing, "cancelled")}>Cancel order</Button> : null}
      {viewing.status === "draft" ? <Button variant="primary" onClick={() => void setStatus(viewing, "issued")}>Issue to supplier</Button> : null}
      {["issued", "partially-received", "received"].includes(String(viewing.status)) ? <Button onClick={() => void setStatus(viewing, "closed")}>Close order</Button> : null}
      {["issued", "partially-received", "received", "closed"].includes(String(viewing.status)) ? <Button icon="receipt" onClick={() => void createBill(viewing)}>Create supplier bill</Button> : null}
      {["issued", "partially-received"].includes(String(viewing.status)) ? <Button variant="primary" icon="truck" onClick={() => setReceiving(viewing)}>Receive goods</Button> : null}
    </>}>
      <div className="ui-stack">
        <DetailList items={[["Status", <Badge key="s" tone={poTone[String(viewing.status)]}>{labelOf(purchaseOrderStatuses, String(viewing.status))}</Badge>], ["Project", projectName(projects, String(viewing.projectId))], ["Deliver to", viewing.deliverTo === "project" ? "Project site" : "Main store / yard"], ["Order date", dateLabel(viewing.orderDate as string)], ["Expected", dateLabel(viewing.expectedDate as string)], ["Order value", money(Number(viewing.total || 0))]]} />
        <div className="ui-table-scroll"><table className="ui-table ui-table-compact"><thead><tr><th>Item</th><th className="num">Ordered</th><th className="num">Received</th><th className="num">Outstanding</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead><tbody>
          {((viewing.items as PoLine[]) || []).map((item, index) => <tr key={index}><td>{item.description}</td><td className="num">{qtyLabel(item.qty, item.unit)}</td><td className="num">{qtyLabel(item.receivedQty || 0)}</td><td className="num">{qtyLabel(Math.max(0, Math.round((item.qty - (item.receivedQty || 0)) * 1000) / 1000))}</td><td className="num">{money(Number(item.rate || 0))}</td><td className="num">{money(item.qty * Number(item.rate || 0))}</td></tr>)}
        </tbody></table></div>
        {((viewing.receipts as Row[]) || []).length ? <PageSection title="Goods receipts"><ul className="ov-list">{((viewing.receipts as Row[]) || []).map((receipt, index) => <li key={index}><span className="ov-list-main">{dateLabel(receipt.at as string)}{receipt.grnNumber ? ` · GRN ${String(receipt.grnNumber)}` : ""}</span><span className="ov-list-meta">{((receipt.lines as { index: number; qty: number }[]) || []).map((line) => `${((viewing.items as PoLine[]) || [])[line.index]?.description || "Line"}: ${line.qty}`).join(", ")}</span></li>)}</ul></PageSection> : null}
      </div>
    </Modal> : null}
    {receiving ? <ReceiveForm order={receiving} onClose={() => setReceiving(null)} onSaved={(row) => { reload(); setViewing(row); }} /> : null}
  </div>;
}

/* ------------------------------------------------------------------ panel */
export default function ProcurementPanel({ initialSection = "", projectId = "" }: { initialSection?: string; projectId?: string }) {
  const [section, setSection] = useState<Section>((["stock", "requests", "orders", "materials", "ledger"].includes(initialSection) ? initialSection : "stock") as Section);
  const materials = useMaterials();
  const [prefill, setPrefill] = useState<Row | null>(null);
  return <div className="ui-stack">
    {!projectId ? <Tabs<Section> label="Procurement sections" value={section} onChange={setSection} items={[{ value: "stock", label: "Stock" }, { value: "requests", label: "Material requests" }, { value: "orders", label: "Purchase orders" }, { value: "materials", label: "Materials", count: materials.data.filter((row) => !row.archived).length }, { value: "ledger", label: "Stock history" }]} /> : null}
    {materials.error ? <ErrorNote message={materials.error} onRetry={materials.reload} /> : null}
    {section === "stock" ? <StockView materials={materials} /> : null}
    {section === "requests" ? <RequestsView materials={materials} projectId={projectId} onCreateOrder={(request) => { setPrefill(request); setSection("orders"); }} /> : null}
    {section === "orders" ? <OrdersView materials={materials} projectId={projectId} prefill={prefill} onPrefillHandled={() => setPrefill(null)} /> : null}
    {section === "ledger" ? <LedgerView materials={materials} /> : null}
    {section === "materials" ? <EntityManager def={materialDef} path="/api/civil-at-hand/materials" csvName="materials" addLabel="Add material" emptyTitle="No materials yet" emptyIcon="box" emptyText="Create your material master: name, grade or specification, unit and reorder level."
      afterSave={() => materials.reload()}
      layout={[{ keys: ["name", "category", "spec", "unit", "minStock", "maxStock", "standardRate", "preferredSupplierId", "notes"] }]}
      columns={[
        { key: "name", label: "Material", render: (row) => <><strong>{String(row.name)}</strong>{row.archived ? <Badge>Archived</Badge> : null}</>, value: (row) => String(row.name) },
        { key: "category", label: "Category", value: (row) => String(row.category || "") },
        { key: "spec", label: "Specification", hideOnMobile: true, value: (row) => String(row.spec || "") },
        { key: "unit", label: "Unit", value: (row) => String(row.unit || "") },
        { key: "minStock", label: "Reorder level", align: "right", value: (row) => Number(row.minStock || 0) },
      ]}
      rowActions={(row, reload) => <Button size="sm" variant="quiet" onClick={async () => { await api(`/api/civil-at-hand/materials/${row._id}`, { method: "PATCH", json: { archived: !row.archived } }); reload(); materials.reload(); }}>{row.archived ? "Restore" : "Archive"}</Button>} /> : null}
  </div>;
}

export { RequestsView, OrdersView, useMaterials };
