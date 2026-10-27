"use client";

import { useMemo, useState, type FormEvent } from "react";
import { categoryLabel } from "@/modules/civil-at-hand/lib/categories";
import { dateInput, formatINR, shortDate } from "@/modules/civil-at-hand/lib/format";
import { dateKey } from "@/modules/civil-at-hand/lib/followups";
import { deliveryStatuses, finishedStatuses, openLeadStatuses, projectStatuses, projectStatusLabel, projectTypes } from "@/modules/civil-at-hand/lib/projects";
import { useWorkspace } from "@/modules/civil-at-hand/components/ui";
import type { ContactRecord, ProjectRecord } from "@/modules/civil-at-hand/lib/types";

/* ---------- small picker used inside the project form ---------- */
function ContactPicker({ contacts, excludeIds, onPick, placeholder }: { contacts: ContactRecord[]; excludeIds: string[]; onPick: (contact: ContactRecord) => void; placeholder: string }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return contacts.filter((c) => !excludeIds.includes(c._id) && [c.name, c.organization, c.phone, c.city].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 6);
  }, [contacts, excludeIds, query]);
  return <div className="pr-picker">
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
    {matches.length ? <div className="pr-picker-list">{matches.map((c) => <button type="button" key={c._id} onClick={() => { onPick(c); setQuery(""); }}><strong>{c.name}</strong><small>{c.organization || categoryLabel(c.category)}{c.city ? ` · ${c.city}` : ""}</small></button>)}</div> : null}
  </div>;
}

/* ---------- add / edit dialog ---------- */
export function ProjectModal({ initial, contacts, onClose, onSave, saving }: { initial: ProjectRecord | null; contacts: ContactRecord[]; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void>; saving: boolean }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [status, setStatus] = useState(initial?.status || "lead");
  const [clientName, setClientName] = useState(initial?.clientName || "");
  const [clientContactId, setClientContactId] = useState(initial?.clientContactId || "");
  const [linked, setLinked] = useState<string[]>(initial?.linkedContactIds || []);
  const [projectType, setProjectType] = useState(initial?.projectType || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "");
  const [billed, setBilled] = useState(initial?.billedAmount !== null && initial?.billedAmount !== undefined ? String(initial.billedAmount) : "");
  const [received, setReceived] = useState(initial?.receivedAmount !== null && initial?.receivedAmount !== undefined ? String(initial.receivedAmount) : "");
  const [value, setValue] = useState(initial?.estimatedValue !== null && initial?.estimatedValue !== undefined ? String(initial.estimatedValue) : "");
  const [startDate, setStartDate] = useState(dateInput(initial?.startDate));
  const [endDate, setEndDate] = useState(dateInput(initial?.endDate));
  const [followUpAt, setFollowUpAt] = useState(dateInput(initial?.followUpAt));
  const [source, setSource] = useState(initial?.source || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [siteAddress, setSiteAddress] = useState(initial?.siteAddress || "");
  const [contractRef, setContractRef] = useState(initial?.contractRef || "");
  const [managerName, setManagerName] = useState(initial?.managerName || "");
  const [scope, setScope] = useState(initial?.scope || "");
  const [budget, setBudget] = useState(initial?.budget !== null && initial?.budget !== undefined ? String(initial.budget) : "");
  const [progressPercent, setProgressPercent] = useState(initial?.progressPercent !== null && initial?.progressPercent !== undefined ? String(initial.progressPercent) : "");
  const [actualStartDate, setActualStartDate] = useState(dateInput(initial?.actualStartDate));
  const [actualEndDate, setActualEndDate] = useState(dateInput(initial?.actualEndDate));
  const { settings } = useWorkspace();
  const typeOptions = Array.from(new Set([...(settings.projectTypes?.length ? settings.projectTypes : projectTypes), ...(projectType ? [projectType] : [])]));
  const [formError, setFormError] = useState("");
  const byId = useMemo(() => new Map(contacts.map((c) => [c._id, c])), [contacts]);
  const clientContact = clientContactId ? byId.get(clientContactId) : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    try {
      await onSave({ title, status, clientName, clientContactId, linkedContactIds: linked, projectType, city, state, estimatedValue: value, billedAmount: billed, receivedAmount: received, startDate, endDate, followUpAt, source, notes, siteAddress, contractRef, managerName, scope, budget, progressPercent, actualStartDate, actualEndDate });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this project.");
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card record-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
      <div className="modal-head"><div><p className="eyebrow">PROJECT / LEAD</p><h2 id="project-modal-title">{initial ? "Edit project or lead" : "Add a project or lead"}</h2><p>Track enquiries from first contact to completion. / पूछताछ से लेकर काम पूरा होने तक।</p></div><button className="icon-button" onClick={onClose} aria-label="Close" type="button">×</button></div>
      <form className="record-form" onSubmit={submit}>
        <div className="form-grid admin-form-grid">
          <label className="field-wrap field-full"><span>Project or lead name / प्रोजेक्ट का नाम <b className="required-star">*</b></span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required placeholder="e.g. G+3 residential building, Panchkula" /></label>
          <label className="field-wrap"><span>Stage / स्थिति</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{projectStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="field-wrap"><span>Work type / काम का प्रकार</span><select value={projectType} onChange={(event) => setProjectType(event.target.value)}><option value="">Select…</option>{typeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field-wrap"><span>Client name / क्लाइंट का नाम</span><input value={clientName} onChange={(event) => setClientName(event.target.value)} maxLength={160} placeholder="Client or company" /></label>
          <div className="field-wrap"><span>Pick client from contacts (optional)</span>
            {clientContact ? <div className="pr-chips"><span className="pr-chip">{clientContact.name}<button type="button" onClick={() => setClientContactId("")} aria-label="Remove client link">×</button></span></div> : <ContactPicker contacts={contacts} excludeIds={[]} placeholder="Type a name or phone…" onPick={(c) => { setClientContactId(c._id); if (!clientName.trim()) setClientName(c.name); }} />}
          </div>
          <label className="field-wrap"><span>City / शहर</span><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={120} /></label>
          <label className="field-wrap"><span>State / राज्य</span><input value={state} onChange={(event) => setState(event.target.value)} maxLength={120} /></label>
          <label className="field-wrap"><span>Estimated value (₹) / अनुमानित राशि</span><input inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. 2500000" /></label>
          <label className="field-wrap"><span>Billed so far (₹)</span><input inputMode="numeric" value={billed} onChange={(event) => setBilled(event.target.value)} placeholder="Total invoiced" /></label>
          <label className="field-wrap"><span>Received so far (₹)</span><input inputMode="numeric" value={received} onChange={(event) => setReceived(event.target.value)} placeholder="Payments collected" /></label>
          <label className="field-wrap"><span>Lead source / जानकारी कहाँ से मिली</span><input value={source} onChange={(event) => setSource(event.target.value)} maxLength={120} placeholder="Referral, WhatsApp, site visit…" /></label>
          <label className="field-wrap"><span>Planned start / शुरू होने की तारीख</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="field-wrap"><span>Planned completion / पूरा होने की तारीख</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label className="field-wrap field-full"><span>Follow-up date / फॉलो-अप की तारीख</span><input type="date" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} /></label>
          <div className="field-wrap field-full project-form-divider"><span>Site, contract and progress</span></div>
          <label className="field-wrap field-full"><span>Site address / साइट का पता</span><input value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} maxLength={500} placeholder="Plot, street, landmark" /></label>
          <label className="field-wrap"><span>Contract / work order reference</span><input value={contractRef} onChange={(event) => setContractRef(event.target.value)} maxLength={120} placeholder="e.g. WO/2026/14" /></label>
          <label className="field-wrap"><span>Project manager / in charge</span><input value={managerName} onChange={(event) => setManagerName(event.target.value)} maxLength={120} /></label>
          <label className="field-wrap"><span>Cost budget (₹)</span><input inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Planned cost to complete" /></label>
          <label className="field-wrap"><span>Recorded progress (%)</span><input type="number" min={0} max={100} value={progressPercent} onChange={(event) => setProgressPercent(event.target.value)} placeholder="0–100" /></label>
          <label className="field-wrap"><span>Actual start</span><input type="date" value={actualStartDate} onChange={(event) => setActualStartDate(event.target.value)} /></label>
          <label className="field-wrap"><span>Actual completion</span><input type="date" value={actualEndDate} onChange={(event) => setActualEndDate(event.target.value)} /></label>
          <label className="field-wrap field-full"><span>Scope of work</span><textarea rows={3} value={scope} onChange={(event) => setScope(event.target.value)} maxLength={4000} /></label>
          <div className="field-wrap field-full"><span>Contacts working on this project (suppliers, subcontractors, workers…)</span>
            <ContactPicker contacts={contacts} excludeIds={linked} placeholder="Search your contacts to add…" onPick={(c) => setLinked((current) => [...current, c._id])} />
            {linked.length ? <div className="pr-chips">{linked.map((id) => { const c = byId.get(id); return <span className="pr-chip" key={id}>{c ? c.name : "Removed contact"}<button type="button" onClick={() => setLinked((current) => current.filter((x) => x !== id))} aria-label="Remove contact">×</button></span>; })}</div> : null}
          </div>
          <label className="field-wrap field-full"><span>Notes / टिप्पणी</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={6000} /></label>
        </div>
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Save project"}</button></div>
      </form>
    </section>
  </div>;
}

/* ---------- list view ---------- */
type Props = {
  projects: ProjectRecord[];
  contacts: ContactRecord[];
  onEdit: (project: ProjectRecord) => void;
  onDelete: (project: ProjectRecord) => void;
  onStatus: (project: ProjectRecord, status: string) => Promise<void>;
  onOpen?: (project: ProjectRecord) => void;
};

export default function ProjectsPanel({ projects, contacts, onEdit, onDelete, onStatus, onOpen }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const names = useMemo(() => new Map(contacts.map((c) => [c._id, c.name])), [contacts]);
  const today = dateKey(new Date());
  const shown = useMemo(() => projects.filter((p) => {
    if (status === "open-leads" ? !openLeadStatuses.includes(p.status) : status === "delivery" ? !deliveryStatuses.includes(p.status) : status && p.status !== status) return false;
    const q = search.trim().toLowerCase();
    return !q || [p.title, p.clientName, p.city, p.state, p.projectType, p.source, p.notes].some((v) => String(v || "").toLowerCase().includes(q));
  }), [projects, search, status]);
  const open = projects.filter((p) => openLeadStatuses.includes(p.status));
  const pipeline = open.reduce((sum, p) => sum + (p.estimatedValue || 0), 0);
  const ongoing = projects.filter((p) => deliveryStatuses.includes(p.status));

  return <div className="pr-view">
    <div className="pr-tiles">
      <article><span>Open leads</span><strong>{open.length}</strong><small>Enquiry · Estimation · Quoted · Negotiation</small></article>
      <article><span>Pipeline value</span><strong>{formatINR(pipeline)}</strong><small>Estimated, open leads</small></article>
      <article><span>Projects in delivery</span><strong>{ongoing.length}</strong><small>{formatINR(ongoing.reduce((sum, p) => sum + (p.estimatedValue || 0), 0))} value</small></article>
      <article><span>To collect</span><strong>{formatINR(projects.reduce((sum, p) => sum + Math.max(0, (p.billedAmount || 0) - (p.receivedAmount || 0)), 0))}</strong><small>Billed minus received</small></article>
      <article><span>Completed</span><strong>{projects.filter((p) => p.status === "completed").length}</strong><small>All time</small></article>
    </div>
    <section className="panel pr-panel">
      <div className="pr-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, client, city…" aria-label="Search projects" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by stage"><option value="">All stages</option><option value="open-leads">Open leads only</option><option value="delivery">In delivery (awarded to defects)</option>{projectStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <div className="pr-exports"><a className="secondary-button" href="/api/civil-at-hand/export?scope=projects&format=xlsx">Excel</a><a className="secondary-button" href="/api/civil-at-hand/export?scope=projects&format=csv">CSV</a></div>
      </div>
      {shown.length ? <div className="table-scroll"><table className="contacts-table pr-table"><thead><tr><th>PROJECT / LEAD</th><th>STAGE</th><th>CLIENT</th><th>LOCATION</th><th>VALUE</th><th>FOLLOW-UP</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{shown.map((p) => { const overdue = p.followUpAt && p.followUpAt.slice(0, 10) < today && !finishedStatuses.includes(p.status); return <tr key={p._id}>
          <td><div className="pr-name">{onOpen ? <button type="button" className="pr-open" onClick={() => onOpen(p)}><strong>{p.title}</strong></button> : <strong>{p.title}</strong>}<small>{p.projectType || "—"}{p.linkedContactIds.length ? ` · ${p.linkedContactIds.length} contact${p.linkedContactIds.length > 1 ? "s" : ""}` : ""}</small></div></td>
          <td><select className={`pr-stage pr-stage-${p.status}`} value={p.status} aria-label={`Stage for ${p.title}`} onChange={(event) => void onStatus(p, event.target.value)}>{projectStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td>
          <td>{p.clientName || (p.clientContactId ? names.get(p.clientContactId) : "") || "—"}</td>
          <td>{[p.city, p.state].filter(Boolean).join(", ") || "—"}</td>
          <td>{formatINR(p.estimatedValue)}{(p.billedAmount || 0) > (p.receivedAmount || 0) ? <small className="rt-unit"> · {formatINR((p.billedAmount || 0) - (p.receivedAmount || 0))} due</small> : null}</td>
          <td><span className={overdue ? "pr-overdue" : ""}>{p.followUpAt ? shortDate(p.followUpAt) : "—"}{overdue ? " · overdue" : ""}</span></td>
          <td><div className="row-actions">{onOpen ? <button className="secondary-button pr-open-btn" onClick={() => onOpen(p)} aria-label={`Open workspace for ${p.title}`}>Open</button> : null}<button className="icon-button row-edit" onClick={() => onEdit(p)} title="View / edit" aria-label={`Edit ${p.title}`}>✎</button><button className="icon-button row-delete" onClick={() => onDelete(p)} title="Delete" aria-label={`Delete ${p.title}`}>🗑</button></div></td>
        </tr>; })}</tbody></table></div>
        : <div className="empty-state"><h3>{projects.length ? "No projects match" : "No projects or leads yet"}</h3><p>{projects.length ? "Try another search or stage." : `Use “Add project / lead” to start tracking work from first enquiry to completion. Current stage: ${projectStatusLabel("lead")}.`}</p></div>}
    </section>
  </div>;
}
