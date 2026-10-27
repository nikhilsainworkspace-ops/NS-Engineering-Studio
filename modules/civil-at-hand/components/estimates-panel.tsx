"use client";

// Estimates, BOQs and quotations. Drafts are editable; sent or decided versions are preserved exactly and
// changed only through a new revision. All arithmetic comes from lib/estimates.ts and is shown on screen.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { estimateStatuses, labelOf } from "@/modules/civil-at-hand/lib/entities";
import { computeEstimate, estimateEditable, revisionLabel, type EstimateItemInput } from "@/modules/civil-at-hand/lib/estimates";
import type { RateRecord } from "@/modules/civil-at-hand/lib/types";
import { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, dayInput, EmptyState, ErrorNote, Icon, Loading, Modal, PageSection, projectName, SearchSelect, Tabs, todayInput, useConfirm, useRefOptions, useResource, useWorkspace, type Tone } from "@/modules/civil-at-hand/components/ui";

const statusTone: Record<string, Tone> = { draft: "neutral", sent: "info", approved: "success", rejected: "danger", cancelled: "neutral" };
type Item = EstimateItemInput & { _key: string };
type Draft = Record<string, unknown> & { items: Item[] };
let keySeed = 0;
const withKey = (item: EstimateItemInput): Item => ({ ...item, _key: `k${(keySeed += 1)}` });
const num = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));

/** Comparable form of a draft (row keys are only for React). */
const snapshot = (draft: Draft) => JSON.stringify({ ...draft, items: draft.items.map(({ _key, ...item }) => { void _key; return item; }) });

function blankItem(section = ""): Item { return withKey({ code: "", section, description: "", unit: "", qty: 0, materialRate: 0, wastagePct: 0, labourRate: 0, equipmentRate: 0, otherRate: 0, rateSource: "", rateDate: null, rateOverridden: false, notes: "" }); }

/* ------------------------------------------------------------------ rate book picker */
function RatePicker({ onPick, onClose }: { onPick: (rate: RateRecord) => void; onClose: () => void }) {
  const { money } = useWorkspace();
  const { data, loading, error } = useResource<RateRecord[]>("/api/civil-at-hand/rates", (raw) => (raw.rates as RateRecord[]) || [], []);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return (q ? data.filter((rate) => [rate.item, rate.spec, rate.supplierName, rate.group, rate.city].some((value) => String(value || "").toLowerCase().includes(q))) : data).slice(0, 60); }, [data, query]);
  return <Modal title="Pick a rate from the rate book" description="Material rates fill the Material column, labour the Labour column, equipment the Equipment column, others the Other column." onClose={onClose} size="lg">
    <label className="ui-search"><Icon name="search" size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, supplier, place…" aria-label="Search rates" /></label>
    {error ? <ErrorNote message={error} /> : loading ? <Loading /> : shown.length ? <ul className="est-rate-list">{shown.map((rate) => <li key={rate._id}><button type="button" onClick={() => onPick(rate)}>
      <span><strong>{rate.item}</strong><small>{[rate.spec, rate.supplierName, rate.city].filter(Boolean).join(" · ")}</small></span>
      <span className="num"><strong>{money(rate.rate)}</strong><small>per {rate.unit || "unit"} · {rate.group}</small></span>
    </button></li>)}</ul> : <EmptyState icon="database" title={data.length ? "No rates match" : "Your rate book is empty"}>Add rates in Rate book, then pick them here.</EmptyState>}
  </Modal>;
}

/* ------------------------------------------------------------------ BOQ import */
function BoqImport({ onAdd, onClose }: { onAdd: (items: EstimateItemInput[]) => void; onClose: () => void }) {
  const { money } = useWorkspace();
  const [result, setResult] = useState<{ items: EstimateItemInput[]; errors: { row: number; message: string }[]; skipped: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/civil-at-hand/estimates/import", { method: "POST", body, cache: "no-store", credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not read this file.");
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not read this file."); }
    finally { setBusy(false); }
  }
  const preview = result ? computeEstimate({ items: result.items }) : null;
  return <Modal size="xl" title="Import BOQ from Excel or CSV" description="Nothing is added until you confirm. Use a header row such as: Item no, Description, Unit, Qty, Rate — or Material, Labour, Equipment rate columns." onClose={onClose}
    footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!result?.items.length} onClick={() => { if (result) onAdd(result.items); }}>Add {result?.items.length || 0} items</Button></>}>
    <label className="ui-dropzone"><Icon name="upload" /><span>{busy ? "Reading file…" : "Choose a .xlsx or .csv BOQ (up to 4 MB, 1,000 items)"}</span><input type="file" accept=".xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></label>
    {error ? <ErrorNote message={error} /> : null}
    {result ? <div className="ui-stack">
      <p className="ui-muted">{result.items.length} items found{result.skipped ? ` · ${result.skipped} heading or blank rows used as sections or skipped` : ""}{result.errors.length ? ` · ${result.errors.length} rows need attention` : ""}.</p>
      {result.errors.length ? <ul className="ui-error-list">{result.errors.map((item) => <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>)}</ul> : null}
      {preview?.items.length ? <div className="ui-table-scroll"><table className="ui-table ui-table-compact"><thead><tr><th>No.</th><th>Section</th><th>Description</th><th>Unit</th><th className="num">Qty</th><th className="num">Unit cost</th><th className="num">Cost</th></tr></thead><tbody>
        {preview.items.slice(0, 200).map((item, index) => <tr key={index}><td>{item.code}</td><td>{item.section}</td><td>{item.description}</td><td>{item.unit}</td><td className="num">{Number(item.qty).toLocaleString("en-IN")}</td><td className="num">{money(item.unitCost)}</td><td className="num">{money(item.costAmount)}</td></tr>)}
      </tbody></table></div> : null}
    </div> : null}
  </Modal>;
}

/* ------------------------------------------------------------------ editor */
function EstimateEditor({ initial, presetProjectId = "", onClose, onSaved }: { initial: Row | null; presetProjectId?: string; onClose: () => void; onSaved: (row: Row) => void }) {
  const { settings, money, notify, projects, navigate, reloadCore } = useWorkspace();
  const refs = useRefOptions();
  const confirm = useConfirm();
  const [current, setCurrent] = useState<Row | null>(initial);
  const editable = !current || estimateEditable(String(current.status));
  const toDraft = (row: Row | null): Draft => ({
    title: row?.title || "", projectId: row?.projectId || presetProjectId, clientContactId: row?.clientContactId || "", clientName: row?.clientName || "", clientAddress: row?.clientAddress || "", siteLocation: row?.siteLocation || "",
    issueDate: dayInput(row?.issueDate as string) || todayInput(), validUntil: dayInput(row?.validUntil as string),
    overheadPct: row?.overheadPct ?? 0, contingencyPct: row?.contingencyPct ?? 0, marginPct: row?.marginPct ?? 0, discountAmount: row?.discountAmount ?? 0,
    taxPct: row ? row.taxPct ?? 0 : settings.defaultTaxPct, taxLabel: row?.taxLabel || settings.taxLabel, terms: row ? row.terms || "" : settings.quotationTerms, notes: row?.notes || "",
    items: ((row?.items as EstimateItemInput[]) || []).map(withKey),
  });
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [loadingFull, setLoadingFull] = useState(Boolean(initial && !initial.items));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [versions, setVersions] = useState<Row[]>([]);
  const savedJson = useRef(snapshot(toDraft(initial)));

  const load = useCallback(async (id: string) => {
    const [full, group] = await Promise.all([api<{ item: Row }>(`/api/civil-at-hand/estimates/${id}`), api<{ items: Row[] }>(`/api/civil-at-hand/estimates?groupId=${encodeURIComponent(String(initial?.groupId || ""))}`).catch(() => ({ items: [] as Row[] }))]);
    setCurrent(full.item); const next = toDraft(full.item); setDraft(next); savedJson.current = snapshot(next); setVersions(group.items || []);
  }, [initial?.groupId]); // eslint-disable-line react-hooks/exhaustive-deps -- toDraft only reads settings defaults
  useEffect(() => { if (initial?._id) { setLoadingFull(true); load(initial._id).catch((err: Error) => setError(err.message)).finally(() => setLoadingFull(false)); } }, [initial?._id, load]);

  const totals = useMemo(() => computeEstimate({ ...draft, items: draft.items } as never), [draft]);
  const set = (key: string, value: unknown) => setDraft((value0) => ({ ...value0, [key]: value }));
  const setItem = (index: number, patch: Partial<Item>) => setDraft((value0) => ({ ...value0, items: value0.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  const rateEdit = (index: number, key: keyof EstimateItemInput, value: string) => setItem(index, { [key]: num(value), ...(draft.items[index].rateSource && ["materialRate", "labourRate", "equipmentRate", "otherRate"].includes(key) ? { rateOverridden: true } : {}) } as Partial<Item>);
  const dirty = snapshot(draft) !== savedJson.current;

  function pickRate(rate: RateRecord) {
    if (picker === null) return;
    const column = rate.group === "labour" ? "labourRate" : rate.group === "equipment" ? "equipmentRate" : rate.group === "material" ? "materialRate" : "otherRate";
    const item = draft.items[picker];
    setItem(picker, { [column]: rate.rate, unit: item.unit || rate.unit, description: item.description || [rate.item, rate.spec].filter(Boolean).join(" – "), rateSource: `Rate book: ${rate.item}${rate.supplierName ? ` (${rate.supplierName})` : ""}`, rateDate: rate.updatedAt?.slice(0, 10) || null, rateOverridden: false } as Partial<Item>);
    setPicker(null);
  }

  async function save(): Promise<Row | null> {
    setError(""); setBusy(true);
    try {
      const payload = { ...draft, items: draft.items.map(({ _key, ...item }) => { void _key; return item; }) };
      const result = await api<{ item: Row }>(current ? `/api/civil-at-hand/estimates/${current._id}` : "/api/civil-at-hand/estimates", { method: current ? "PUT" : "POST", json: payload });
      setCurrent(result.item); const next = toDraft(result.item); setDraft(next); savedJson.current = snapshot(next);
      notify(current ? "Estimate saved." : `Estimate ${result.item.number} created.`); onSaved(result.item);
      return result.item;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); return null; }
    finally { setBusy(false); }
  }
  async function changeStatus(status: string) {
    if (!current) return;
    if (dirty && editable) { const saved = await save(); if (!saved) return; }
    const label = labelOf(estimateStatuses, status);
    const answer = await confirm({ title: `Mark as “${label}”?`, message: status === "sent" ? "Once sent, this version is locked. Further changes go into a new revision, so the copy the client received is preserved." : status === "approved" ? "Record that the client accepted this quotation. You can then turn it into a project." : "This records the client’s decision on this version.", confirmLabel: label, tone: status === "rejected" || status === "cancelled" ? "danger" : "primary", input: { label: "Note (optional)" } });
    if (!answer.ok) return;
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/estimates/${current._id}/status`, { method: "POST", json: { status, note: answer.text } }); setCurrent(result.item); notify(`Marked as ${label.toLowerCase()}.`); onSaved(result.item); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not change the status.", "error"); }
  }
  async function revise() {
    if (!current) return;
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/estimates/${current._id}/revise`, { method: "POST" }); notify(`Revision ${revisionLabel(String(result.item.number), Number(result.item.version))} created as a draft.`); onSaved(result.item); await load(result.item._id); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not create a revision.", "error"); }
  }
  async function convert() {
    if (!current) return;
    const answer = await confirm({ title: current.projectId ? "Mark the linked project as awarded?" : "Create a project from this quotation?", message: current.projectId ? "The project moves to “Awarded” if it is still a lead, and its contract value and budget are filled only where they are empty." : "A new project is created with the client, contract value (taxable value) and a cost budget (direct cost).", confirmLabel: "Continue", tone: "primary" });
    if (!answer.ok) return;
    try { const result = await api<{ project: Row }>(`/api/civil-at-hand/estimates/${current._id}/convert`, { method: "POST", json: {} }); notify("Project updated from the quotation."); await reloadCore(); navigate("project", { kind: "project", id: result.project._id }); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not convert.", "error"); }
  }
  async function close() {
    if (dirty && editable) { const answer = await confirm({ title: "Discard unsaved changes?", confirmLabel: "Discard" }); if (!answer.ok) return; }
    onClose();
  }

  const status = String(current?.status || "draft");
  const rateInput = (index: number, key: "materialRate" | "labourRate" | "equipmentRate" | "otherRate" | "wastagePct" | "qty", label: string) => <input type="number" inputMode="decimal" step="any" min={0} aria-label={`${label}, row ${index + 1}`} value={draft.items[index][key] ?? ""} disabled={!editable} onChange={(event) => rateEdit(index, key, event.target.value)} />;

  return <Modal size="xl" title={current ? `${revisionLabel(String(current.number), Number(current.version || 1))} · ${String(current.title || "")}` : "New estimate / quotation"} onClose={() => void close()}
    description={current ? <span className="est-head-meta"><Badge tone={statusTone[status]}>{labelOf(estimateStatuses, status)}</Badge>{!editable ? <span>This version is locked. Create a revision to make changes.</span> : null}</span> : "Start with the client and title, then add BOQ items."}
    footer={<div className="est-foot">
      <div className="est-foot-left">
        {current ? <><a className="ui-btn ui-btn-ghost ui-btn-sm" href={`/workspace/print/estimate/${current._id}`} target="_blank" rel="noreferrer">Print quotation</a><a className="ui-btn ui-btn-ghost ui-btn-sm" href={`/workspace/print/estimate/${current._id}?view=internal`} target="_blank" rel="noreferrer">Internal cost sheet</a></> : null}
        {current ? <Button size="sm" icon="copy" onClick={() => void revise()}>Create revision</Button> : null}
      </div>
      <div className="est-foot-right">
        {current && status === "draft" ? <Button onClick={() => void changeStatus("sent")}>Mark as sent</Button> : null}
        {current && status === "sent" ? <><Button variant="danger" onClick={() => void changeStatus("rejected")}>Not accepted</Button><Button variant="primary" onClick={() => void changeStatus("approved")}>Client approved</Button></> : null}
        {current && status === "approved" ? <Button variant="primary" icon="briefcase" onClick={() => void convert()}>{current.convertedProjectId ? "Open / update project" : "Turn into project"}</Button> : null}
        {editable ? <Button variant="primary" onClick={() => void save()} disabled={busy || (!dirty && Boolean(current))}>{busy ? "Saving…" : current ? (dirty ? "Save draft" : "Saved") : "Create estimate"}</Button> : null}
      </div>
    </div>}>
    {loadingFull ? <Loading /> : <div className="est">
      {error ? <ErrorNote message={error} /> : null}
      <fieldset className="ui-fieldset" disabled={!editable}>
        <div className="ui-grid">
          <label className="ui-field ui-span-2"><span className="ui-label">Title<span className="ui-req">*</span></span><input value={String(draft.title)} onChange={(event) => set("title", event.target.value)} maxLength={200} required placeholder="e.g. RCC framed G+2 residence – civil works" /></label>
          <div className="ui-field"><span className="ui-label">Client from contacts</span><SearchSelect label="Client contact" value={String(draft.clientContactId)} options={refs.contact || []} onChange={(value, option) => { set("clientContactId", value); if (option && !draft.clientName) set("clientName", option.label); }} /></div>
          <label className="ui-field"><span className="ui-label">Client name (printed)</span><input value={String(draft.clientName)} onChange={(event) => set("clientName", event.target.value)} maxLength={200} /></label>
          <div className="ui-field"><span className="ui-label">Project</span><SearchSelect label="Project" value={String(draft.projectId)} options={refs.project || []} onChange={(value) => set("projectId", value)} /></div>
          <label className="ui-field"><span className="ui-label">Site / location</span><input value={String(draft.siteLocation)} onChange={(event) => set("siteLocation", event.target.value)} maxLength={200} /></label>
          <label className="ui-field"><span className="ui-label">Date</span><input type="date" value={String(draft.issueDate || "")} onChange={(event) => set("issueDate", event.target.value)} /></label>
          <label className="ui-field"><span className="ui-label">Valid until</span><input type="date" value={String(draft.validUntil || "")} onChange={(event) => set("validUntil", event.target.value)} /></label>
          <label className="ui-field ui-span-all"><span className="ui-label">Client address (printed)</span><textarea rows={2} value={String(draft.clientAddress)} onChange={(event) => set("clientAddress", event.target.value)} maxLength={600} /></label>
        </div>
      </fieldset>

      <PageSection title="Bill of quantities" description="Unit cost = Material × (1 + wastage %) + Labour + Equipment + Other. Quoted rate = unit cost × markup factor." actions={editable ? <><Button size="sm" icon="upload" onClick={() => setImporting(true)}>Import BOQ</Button><Button size="sm" icon="plus" onClick={() => setDraft((value0) => ({ ...value0, items: [...value0.items, blankItem(value0.items[value0.items.length - 1]?.section || "")] }))}>Add item</Button></> : null}>
        {draft.items.length ? <div className="ui-table-scroll"><table className="est-boq">
          <thead><tr><th className="c-no">No.</th><th className="c-desc">Description</th><th className="c-unit">Unit</th><th className="c-n">Qty</th><th className="c-n">Material</th><th className="c-s">Wast. %</th><th className="c-n">Labour</th><th className="c-n">Equip.</th><th className="c-n">Other</th><th className="c-n">Unit cost</th><th className="c-n">Quoted rate</th><th className="c-n">Amount</th><th className="c-act"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{draft.items.map((item, index) => {
            const computed = totals.items[index];
            const showSection = item.section && item.section !== draft.items[index - 1]?.section;
            return [showSection ? <tr key={`${item._key}-s`} className="est-section"><td colSpan={13}>{item.section}</td></tr> : null,
              <tr key={item._key}>
                <td className="c-no"><input aria-label={`Item number, row ${index + 1}`} value={item.code || ""} disabled={!editable} onChange={(event) => setItem(index, { code: event.target.value })} placeholder={String(index + 1)} /></td>
                <td className="c-desc"><textarea rows={2} aria-label={`Description, row ${index + 1}`} value={item.description} disabled={!editable} onChange={(event) => setItem(index, { description: event.target.value })} placeholder="Work item and specification" />
                  <div className="est-meta-row"><input aria-label={`Section, row ${index + 1}`} value={item.section || ""} disabled={!editable} onChange={(event) => setItem(index, { section: event.target.value })} placeholder="Section (e.g. Substructure)" />{item.rateSource ? <span className="est-source" title={item.rateSource}>{item.rateOverridden ? "Edited · " : ""}{item.rateSource}{item.rateDate ? ` · ${dateLabel(String(item.rateDate))}` : ""}</span> : null}</div></td>
                <td className="c-unit"><input list="est-units" aria-label={`Unit, row ${index + 1}`} value={item.unit || ""} disabled={!editable} onChange={(event) => setItem(index, { unit: event.target.value })} /></td>
                <td className="c-n">{rateInput(index, "qty", "Quantity")}</td>
                <td className="c-n">{rateInput(index, "materialRate", "Material rate")}</td>
                <td className="c-s">{rateInput(index, "wastagePct", "Wastage percent")}</td>
                <td className="c-n">{rateInput(index, "labourRate", "Labour rate")}</td>
                <td className="c-n">{rateInput(index, "equipmentRate", "Equipment rate")}</td>
                <td className="c-n">{rateInput(index, "otherRate", "Other rate")}</td>
                <td className="c-n est-calc">{money(computed?.unitCost ?? 0)}</td>
                <td className="c-n est-calc">{money(computed?.quotedRate ?? 0)}</td>
                <td className="c-n est-calc"><strong>{money(computed?.amount ?? 0)}</strong></td>
                <td className="c-act">{editable ? <div className="ui-row-actions"><Button size="sm" variant="quiet" icon="database" aria-label={`Pick rate for row ${index + 1}`} title="Pick from rate book" onClick={() => setPicker(index)} /><Button size="sm" variant="quiet" icon="copy" aria-label={`Duplicate row ${index + 1}`} title="Duplicate" onClick={() => setDraft((value0) => ({ ...value0, items: [...value0.items.slice(0, index + 1), withKey({ ...item }), ...value0.items.slice(index + 1)] }))} /><Button size="sm" variant="quiet" icon="trash" aria-label={`Remove row ${index + 1}`} onClick={() => setDraft((value0) => ({ ...value0, items: value0.items.filter((_, i) => i !== index) }))} /></div> : null}</td>
              </tr>];
          })}</tbody>
        </table><datalist id="est-units">{settings.units.map((unit) => <option key={unit} value={unit} />)}</datalist></div>
          : <EmptyState icon="ruler" title="No BOQ items yet" action={editable ? <><Button icon="plus" onClick={() => setDraft((value0) => ({ ...value0, items: [blankItem()] }))}>Add first item</Button><Button icon="upload" onClick={() => setImporting(true)}>Import from Excel</Button></> : null}>Add work items with quantities and rates, pick rates from your rate book, or import an existing BOQ sheet.</EmptyState>}
      </PageSection>

      <div className="est-bottom">
        <fieldset className="ui-fieldset est-markups" disabled={!editable}><legend>Markups, discount and tax</legend>
          <div className="ui-grid ui-grid-3">
            <label className="ui-field"><span className="ui-label">Overheads %</span><input type="number" step="any" min={0} max={100} value={String(draft.overheadPct ?? "")} onChange={(event) => set("overheadPct", num(event.target.value))} /></label>
            <label className="ui-field"><span className="ui-label">Contingency %</span><input type="number" step="any" min={0} max={100} value={String(draft.contingencyPct ?? "")} onChange={(event) => set("contingencyPct", num(event.target.value))} /></label>
            <label className="ui-field"><span className="ui-label">Margin %</span><input type="number" step="any" min={0} max={300} value={String(draft.marginPct ?? "")} onChange={(event) => set("marginPct", num(event.target.value))} /></label>
            <label className="ui-field"><span className="ui-label">Discount amount</span><input type="number" step="any" min={0} value={String(draft.discountAmount ?? "")} onChange={(event) => set("discountAmount", num(event.target.value))} /></label>
            <label className="ui-field"><span className="ui-label">Tax label</span><input value={String(draft.taxLabel || "")} onChange={(event) => set("taxLabel", event.target.value)} maxLength={30} /></label>
            <label className="ui-field"><span className="ui-label">Tax %</span><input type="number" step="any" min={0} max={100} value={String(draft.taxPct ?? "")} onChange={(event) => set("taxPct", num(event.target.value))} /></label>
          </div>
          <label className="ui-field"><span className="ui-label">Terms and conditions (printed)</span><textarea rows={5} value={String(draft.terms || "")} onChange={(event) => set("terms", event.target.value)} maxLength={6000} /></label>
          <label className="ui-field"><span className="ui-label">Internal notes (not on the client copy)</span><textarea rows={2} value={String(draft.notes || "")} onChange={(event) => set("notes", event.target.value)} maxLength={3000} /></label>
        </fieldset>
        <aside className="est-totals" aria-label="Totals">
          <dl>
            <div><dt>Material (incl. wastage)</dt><dd>{money(totals.materialCost)}</dd></div>
            <div><dt>Labour</dt><dd>{money(totals.labourCost)}</dd></div>
            <div><dt>Equipment</dt><dd>{money(totals.equipmentCost)}</dd></div>
            <div><dt>Other / transport</dt><dd>{money(totals.otherCost)}</dd></div>
            <div className="est-strong"><dt>Direct cost</dt><dd>{money(totals.directCost)}</dd></div>
            <div><dt>Markup factor</dt><dd title="(1 + overheads % + contingency %) × (1 + margin %)">× {totals.factor.toFixed(4)}</dd></div>
            <div className="est-strong"><dt>Quoted subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            {totals.discount ? <div><dt>Discount</dt><dd>− {money(totals.discount)}</dd></div> : null}
            <div><dt>{String(draft.taxLabel || "Tax")} @ {Number(draft.taxPct || 0)}%</dt><dd>{money(totals.tax)}</dd></div>
            <div className="est-grand"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
            <div className={totals.plannedProfit < 0 ? "ui-text-danger" : "ui-text-success"}><dt>Planned profit before tax</dt><dd>{money(totals.plannedProfit)}</dd></div>
          </dl>
          <p className="ui-footnote">Line amounts use rounded quoted rates, so the subtotal matches the printed quotation exactly.</p>
        </aside>
      </div>

      {versions.length > 1 ? <PageSection title="Versions" description="Each sent or decided version is kept unchanged.">
        <ul className="ov-list">{[...versions].sort((a, b) => Number(b.version) - Number(a.version)).map((version) => <li key={version._id}><button type="button" disabled={version._id === current?._id} onClick={() => void load(version._id)}><Badge tone={statusTone[String(version.status)]}>{labelOf(estimateStatuses, String(version.status))}</Badge><span className="ov-list-main">{revisionLabel(String(version.number), Number(version.version))}{version._id === current?._id ? " (open)" : ""}</span><span className="ov-list-meta">{money(Number((version.totals as { total?: number })?.total || 0))} · {dateLabel(version.updatedAt as string)}</span></button></li>)}</ul>
      </PageSection> : null}
      {current?.projectId ? <p className="ui-muted">Linked project: <button type="button" className="ui-link" onClick={() => navigate("project", { kind: "project", id: String(current.projectId) })}>{projectName(projects, String(current.projectId)) || "Open project"}</button></p> : null}
    </div>}
    {picker !== null ? <RatePicker onPick={pickRate} onClose={() => setPicker(null)} /> : null}
    {importing ? <BoqImport onClose={() => setImporting(false)} onAdd={(items) => { setDraft((value0) => ({ ...value0, items: [...value0.items, ...items.map(withKey)] })); setImporting(false); notify(`${items.length} BOQ items added. Review and save.`, "info"); }} /> : null}
  </Modal>;
}

/* ------------------------------------------------------------------ list */
export default function EstimatesPanel({ projectId = "", initialFilter = "", openId = "", openNew = false, onOpenHandled }: { projectId?: string; initialFilter?: string; openId?: string; openNew?: boolean; onOpenHandled?: () => void }) {
  const { money, projects } = useWorkspace();
  const [filter, setFilter] = useState(initialFilter || "all");
  const { data, loading, error, reload } = useEntityList(`/api/civil-at-hand/estimates${projectId ? `?projectId=${projectId}` : ""}`);
  const [open, setOpen] = useState<Row | "new" | null>(null);
  useEffect(() => {
    if (openNew) { setOpen("new"); onOpenHandled?.(); }
    else if (openId && data.length) { const found = data.find((row) => row._id === openId); if (found) { setOpen(found); onOpenHandled?.(); } }
  }, [openNew, openId, data, onOpenHandled]);
  // Show the latest version of each quotation; older versions are listed inside the editor.
  const latest = useMemo(() => {
    const byGroup = new Map<string, Row>();
    for (const row of data) { const key = String(row.groupId || row._id); const existing = byGroup.get(key); if (!existing || Number(row.version) > Number(existing.version)) byGroup.set(key, row); }
    return Array.from(byGroup.values());
  }, [data]);
  const rows = filter === "all" ? latest : latest.filter((row) => row.status === filter);
  const count = (status: string) => latest.filter((row) => row.status === status).length;
  return <div className="ui-stack">
    <div className="ui-toolbar-row">
      <Tabs label="Quotation status" value={filter} onChange={setFilter} items={[{ value: "all", label: "All", count: latest.length }, { value: "draft", label: "Drafts", count: count("draft") }, { value: "sent", label: "Awaiting decision", count: count("sent") }, { value: "approved", label: "Approved", count: count("approved") }, { value: "rejected", label: "Not accepted" }]} />
      <Button variant="primary" icon="plus" onClick={() => setOpen("new")}>New estimate</Button>
    </div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={rows} onRowClick={setOpen} csvName="quotations"
      columns={[
        { key: "number", label: "Number", render: (row) => <strong>{revisionLabel(String(row.number), Number(row.version || 1))}</strong>, value: (row) => String(row.number) },
        { key: "title", label: "Title", value: (row) => String(row.title || "") },
        { key: "clientName", label: "Client", hideOnMobile: true, value: (row) => String(row.clientName || "") },
        ...(projectId ? [] : [{ key: "projectId", label: "Project", hideOnMobile: true, value: (row: Row) => projectName(projects, String(row.projectId)) }]),
        { key: "status", label: "Status", render: (row) => <Badge tone={statusTone[String(row.status)]}>{labelOf(estimateStatuses, String(row.status))}</Badge>, value: (row) => String(row.status) },
        { key: "total", label: "Total", align: "right", render: (row) => money(Number((row.totals as { total?: number })?.total || 0)), value: (row) => Number((row.totals as { total?: number })?.total || 0) },
        { key: "updatedAt", label: "Updated", hideOnMobile: true, render: (row) => dateLabel(row.updatedAt as string), value: (row) => String(row.updatedAt || "") },
      ]}
      empty={<EmptyState icon="calculator" title="No estimates yet" action={<Button variant="primary" icon="plus" onClick={() => setOpen("new")}>Create an estimate</Button>}>Build a BOQ with material, labour and equipment rates, apply overheads and margin, then print a professional quotation.</EmptyState>} />}
    {open ? <EstimateEditor key={open === "new" ? "new" : open._id} initial={open === "new" ? null : open} presetProjectId={projectId} onClose={() => setOpen(null)} onSaved={() => reload()} /> : null}
  </div>;
}
