"use client";

import { useMemo, useState, type FormEvent } from "react";
import { jsonRequest } from "@/modules/civil-at-hand/lib/client-api";
import { dateInput, formatINR, shortDate } from "@/modules/civil-at-hand/lib/format";
import { commonUnits, compareRates, isStaleRate, rateGroupLabel, rateGroups } from "@/modules/civil-at-hand/lib/rates";
import type { ContactRecord, RateRecord } from "@/modules/civil-at-hand/lib/types";

type Notify = (message: string, type?: "success" | "error" | "info") => void;

function money(value: number): string { return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }

function RateModal({ initial, contacts, onClose, onSaved, notify }: { initial: RateRecord | null; contacts: ContactRecord[]; onClose: () => void; onSaved: () => Promise<void>; notify: Notify }) {
  const [item, setItem] = useState(initial?.item || ""); const [group, setGroup] = useState(initial?.group || "material"); const [spec, setSpec] = useState(initial?.spec || "");
  const [unit, setUnit] = useState(initial?.unit || ""); const [rate, setRate] = useState(initial ? String(initial.rate) : "");
  const [supplierName, setSupplierName] = useState(initial?.supplierName || ""); const [supplierContactId, setSupplierContactId] = useState(initial?.supplierContactId || "");
  const [city, setCity] = useState(initial?.city || ""); const [state, setState] = useState(initial?.state || "");
  const [validTill, setValidTill] = useState(dateInput(initial?.validTill)); const [notes, setNotes] = useState(initial?.notes || "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const options = useMemo(() => contacts.filter((c) => ["vendor-supplier", "subcontractor", "contractor", "manpower-supplier"].includes(c.category)).map((c) => ({ id: c._id, label: c.organization || c.name })), [contacts]);

  function changeSupplier(value: string) {
    setSupplierName(value);
    const match = options.find((o) => o.label.toLowerCase() === value.trim().toLowerCase());
    setSupplierContactId(match ? match.id : "");
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      await jsonRequest(initial ? `/api/civil-at-hand/rates/${initial._id}` : "/api/civil-at-hand/rates", { method: initial ? "PUT" : "POST", body: JSON.stringify({ item, group, spec, unit, rate, supplierName, supplierContactId, city, state, validTill, notes }) });
      notify(initial ? "Rate updated." : "Rate saved."); await onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this rate."); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card record-modal" role="dialog" aria-modal="true" aria-labelledby="rate-modal-title">
    <div className="modal-head"><div><p className="eyebrow">RATE BOOK</p><h2 id="rate-modal-title">{initial ? "Edit rate" : "Add a rate"}</h2><p>Record what something costs and who quoted it. / भाव और सप्लायर का नाम दर्ज करें।</p></div><button className="icon-button" onClick={onClose} aria-label="Close" type="button">×</button></div>
    <form className="record-form" onSubmit={submit}><div className="form-grid admin-form-grid">
      <label className="field-wrap field-full"><span>Item / वस्तु <b className="required-star">*</b></span><input value={item} onChange={(e) => setItem(e.target.value)} maxLength={160} required placeholder="e.g. Cement OPC 53, Mason, JCB 3DX" /></label>
      <label className="field-wrap"><span>Type</span><select value={group} onChange={(e) => setGroup(e.target.value)}>{rateGroups.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
      <label className="field-wrap"><span>Brand / grade / size</span><input value={spec} onChange={(e) => setSpec(e.target.value)} maxLength={160} placeholder="e.g. UltraTech, Fe500D 12mm" /></label>
      <label className="field-wrap"><span>Rate (₹) <b className="required-star">*</b></span><input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required placeholder="e.g. 385" /></label>
      <label className="field-wrap"><span>Per (unit)</span><input list="rate-units" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={40} placeholder="bag, MT, day…" /><datalist id="rate-units">{commonUnits.map((u) => <option key={u} value={u} />)}</datalist></label>
      <label className="field-wrap"><span>Supplier / who quoted</span><input list="rate-suppliers" value={supplierName} onChange={(e) => changeSupplier(e.target.value)} maxLength={160} placeholder="Type or pick from your contacts" /><datalist id="rate-suppliers">{options.map((o) => <option key={o.id} value={o.label} />)}</datalist></label>
      <label className="field-wrap"><span>Rate valid till</span><input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} /></label>
      <label className="field-wrap"><span>City</span><input value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} /></label>
      <label className="field-wrap"><span>State</span><input value={state} onChange={(e) => setState(e.target.value)} maxLength={120} /></label>
      <label className="field-wrap field-full"><span>Private notes (never shared)</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Payment terms, delivery charges, GST extra…" /></label>
    </div>{error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Save rate"}</button></div></form>
  </section></div>;
}

export default function RatesPanel({ rates, contacts, onChanged, notify }: { rates: RateRecord[]; contacts: ContactRecord[]; onChanged: () => Promise<void>; notify: Notify }) {
  const [search, setSearch] = useState(""); const [group, setGroup] = useState(""); const [view, setView] = useState<"list" | "compare">("list");
  const [modal, setModal] = useState<RateRecord | null | "new">(null);
  const shown = useMemo(() => rates.filter((r) => {
    if (group && r.group !== group) return false;
    const q = search.trim().toLowerCase();
    return !q || [r.item, r.spec, r.supplierName, r.city, r.state, r.unit].some((v) => String(v || "").toLowerCase().includes(q));
  }), [rates, search, group]);
  const comparison = useMemo(() => compareRates(shown), [shown]);
  const stale = rates.filter((r) => isStaleRate(r.updatedAt)).length;
  const suppliers = new Set(rates.map((r) => r.supplierName.trim().toLowerCase()).filter(Boolean)).size;

  async function remove(rate: RateRecord) {
    if (!window.confirm(`Delete the rate for “${rate.item}”?`)) return;
    try { await jsonRequest(`/api/civil-at-hand/rates/${rate._id}`, { method: "DELETE" }); notify("Rate deleted."); await onChanged(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not delete.", "error"); }
  }

  return <div className="pr-view">
    <div className="pr-tiles">
      <article><span>Rates saved</span><strong>{rates.length}</strong><small>Materials, labour, equipment</small></article>
      <article><span>Items compared</span><strong>{compareRates(rates).filter((c) => c.quotes > 1).length}</strong><small>Items with 2+ quotes</small></article>
      <article><span>Suppliers quoted</span><strong>{suppliers}</strong><small>Different names</small></article>
      <article><span>Needs refresh</span><strong>{stale}</strong><small>Not updated in 90 days</small></article>
    </div>
    <section className="panel pr-panel">
      <div className="pr-toolbar">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item, supplier, city…" aria-label="Search rates" />
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Filter by type"><option value="">All types</option>{rateGroups.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select>
        <div className="rt-toggle"><button className={view === "list" ? "rt-on" : ""} onClick={() => setView("list")}>List</button><button className={view === "compare" ? "rt-on" : ""} onClick={() => setView("compare")}>Compare suppliers</button></div>
        <div className="pr-exports"><a className="secondary-button" href="/api/civil-at-hand/export?scope=rates&format=xlsx">Excel</a><a className="secondary-button" href="/api/civil-at-hand/export?scope=rates&format=csv">CSV</a><button className="primary-button" onClick={() => setModal("new")}>+ Add rate</button></div>
      </div>
      {view === "list" ? (shown.length ? <div className="table-scroll"><table className="contacts-table pr-table"><thead><tr><th>ITEM</th><th>TYPE</th><th>RATE</th><th>SUPPLIER</th><th>LOCATION</th><th>VALID / UPDATED</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{shown.map((r) => <tr key={r._id}>
          <td><div className="pr-name"><strong>{r.item}</strong><small>{r.spec || "—"}</small></div></td><td>{rateGroupLabel(r.group)}</td>
          <td><strong>{money(r.rate)}</strong>{r.unit ? <small className="rt-unit"> / {r.unit}</small> : null}</td><td>{r.supplierName || "—"}</td>
          <td>{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
          <td>{r.validTill ? `Till ${shortDate(r.validTill)}` : shortDate(r.updatedAt)}{isStaleRate(r.updatedAt) ? <span className="dup-badge">Old</span> : null}</td>
          <td><div className="row-actions"><button className="icon-button row-edit" onClick={() => setModal(r)} title="Edit" aria-label={`Edit ${r.item}`}>✎</button><button className="icon-button row-delete" onClick={() => void remove(r)} title="Delete" aria-label={`Delete ${r.item}`}>🗑</button></div></td></tr>)}</tbody></table></div>
        : <div className="empty-state"><h3>{rates.length ? "No rates match" : "Your rate book is empty"}</h3><p>{rates.length ? "Try another search or type." : "Save what cement, steel, labour and machines cost, and who quoted it. You can compare suppliers and even share the list with a client."}</p></div>)
        : (comparison.length ? <div className="table-scroll"><table className="contacts-table pr-table"><thead><tr><th>ITEM</th><th>UNIT</th><th>QUOTES</th><th>LOWEST</th><th>HIGHEST</th><th>AVERAGE</th><th>BEST SUPPLIER</th></tr></thead>
          <tbody>{comparison.map((c) => <tr key={c.key}><td><strong>{c.item}</strong></td><td>{c.unit || "—"}</td><td>{c.quotes}</td><td><strong className="rt-low">{money(c.low)}</strong></td><td>{money(c.high)}</td><td>{money(c.average)}</td><td>{c.bestSupplier || "—"}{c.quotes > 1 && c.high > 0 ? <small className="rt-unit"> · saves {formatINR(Math.round(c.high - c.low))} vs highest</small> : null}</td></tr>)}</tbody></table></div>
          : <div className="empty-state"><h3>Nothing to compare yet</h3><p>Add the same item from two or more suppliers to see who is cheapest.</p></div>)}
    </section>
    {modal ? <RateModal key={modal === "new" ? "new-rate" : modal._id} initial={modal === "new" ? null : modal} contacts={contacts} onClose={() => setModal(null)} onSaved={onChanged} notify={notify} /> : null}
  </div>;
}
