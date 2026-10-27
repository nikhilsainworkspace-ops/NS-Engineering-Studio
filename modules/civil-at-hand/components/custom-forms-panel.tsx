"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { CustomFormField, CustomFormFieldType } from "@/modules/civil-at-hand/lib/custom-forms";
import styles from "./custom-forms-panel.module.css";

type FormRecord = {
  _id: string; title: string; description: string; token: string; active: boolean;
  fields: CustomFormField[]; expiresAt?: string | null; submissions: number; createdAt: string; shareUrl: string;
};
type FormDraft = { title: string; description: string; expiryDays: string; fields: CustomFormField[] };
type ResponseRecord = {
  _id: string; formId: string; formTitle: string; submittedAt: string;
  fields: CustomFormField[]; answers: Record<string, unknown>;
};
type DraftField = Partial<CustomFormField> & Pick<CustomFormField, "label" | "type">;

const fieldTypes: { value: CustomFormFieldType; label: string }[] = [
  { value: "text", label: "Short answer" }, { value: "textarea", label: "Long answer" },
  { value: "email", label: "Email address" }, { value: "tel", label: "Phone number" },
  { value: "number", label: "Number" }, { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" }, { value: "radio", label: "Single choice" },
  { value: "multi-select", label: "Multiple choice" }, { value: "checkbox", label: "Confirmation checkbox" },
];
const blankField = (): CustomFormField => ({ key: "", label: "", type: "text", required: false, placeholder: "", options: [] });
const blankDraft = (): FormDraft => ({ title: "", description: "", expiryDays: "0", fields: [blankField()] });
const expiryOptions = [{ value: "0", label: "No expiry" }, { value: "1", label: "1 day" }, { value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "365", label: "1 year" }];
const formActive = (form: FormRecord) => form.active && (!form.expiresAt || new Date(form.expiresAt).getTime() > Date.now());
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "No expiry";
const responseValue = (value: unknown) => Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "—");

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { ...(init?.headers || {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not complete this action.");
  return data;
}

export default function CustomFormsPanel() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<FormDraft>(blankDraft());
  const [saving, setSaving] = useState(false);
  const [responsesFor, setResponsesFor] = useState<FormRecord | null>(null);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/civil-at-hand/custom-forms");
      setForms(data.forms || []);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load custom forms."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return forms.filter((form) => !query || (form.title + " " + form.description).toLowerCase().includes(query));
  }, [forms, search]);

  function beginCreate() {
    setEditingId("");
    setDraft(blankDraft());
    setEditorOpen(true);
    setError("");
    setNotice("");
  }

  function beginEdit(form: FormRecord) {
    setEditingId(form._id);
    setDraft({
      title: form.title,
      description: form.description || "",
      expiryDays: "",
      fields: form.fields.map((field) => ({ ...field, options: [...(field.options || [])] })),
    });
    setEditorOpen(true);
    setError("");
    setNotice("");
  }

  function updateDraft(changes: Partial<FormDraft>) { setDraft((current) => ({ ...current, ...changes })); }
  function updateField(index: number, changes: Partial<CustomFormField>) {
    setDraft((current) => ({ ...current, fields: current.fields.map((field, i) => i === index ? { ...field, ...changes } : field) }));
  }
  function removeField(index: number) { setDraft((current) => ({ ...current, fields: current.fields.filter((_, i) => i !== index) })); }
  function addField() {
    setDraft((current) => current.fields.length >= 50 ? current : ({ ...current, fields: [...current.fields, blankField()] }));
  }

  async function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    const payload: Record<string, unknown> = {
      title: draft.title, description: draft.description,
      fields: draft.fields.map((field) => ({ ...field, options: ["select", "radio", "multi-select"].includes(field.type) ? field.options : [] })),
    };
    if (draft.expiryDays !== "") payload.expiryDays = Number(draft.expiryDays);
    try {
      const data = await api(editingId ? "/api/civil-at-hand/custom-forms/" + editingId : "/api/civil-at-hand/custom-forms", {
        method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload),
      });
      setEditorOpen(false); setNotice(editingId ? "Form updated. Existing responses remain linked to this form." : "Form created. Copy its private link to start collecting answers.");
      await load();
      if (data.form && !editingId) setForms((current) => [data.form as FormRecord, ...current.filter((form) => form._id !== data.form._id)]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this form."); }
    finally { setSaving(false); }
  }

  async function toggleForm(form: FormRecord) {
    try {
      await api("/api/civil-at-hand/custom-forms/" + form._id, { method: "PATCH", body: JSON.stringify({ active: !form.active }) });
      setForms((current) => current.map((item) => item._id === form._id ? { ...item, active: !item.active } : item));
      setNotice(form.active ? "Form paused. New responses are blocked." : "Form activated.");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change this form."); }
  }

  async function deleteForm(form: FormRecord) {
    if (!window.confirm("Delete “" + form.title + "” and permanently delete all responses collected by this form? This cannot be undone.")) return;
    try {
      await api("/api/civil-at-hand/custom-forms/" + form._id, { method: "DELETE" });
      setForms((current) => current.filter((item) => item._id !== form._id));
      if (responsesFor?._id === form._id) { setResponsesFor(null); setResponses([]); }
      setNotice("Form and its responses deleted.");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete this form."); }
  }

  async function copyLink(form: FormRecord) {
    try {
      await navigator.clipboard.writeText(form.shareUrl);
      setNotice("Share link copied. You can paste it into WhatsApp, email, or a group.");
      setError("");
    } catch {
      window.prompt("Copy this custom form link:", form.shareUrl);
    }
  }

  async function openResponses(form: FormRecord) {
    setResponsesFor(form); setResponses([]); setResponsesLoading(true); setError("");
    try {
      const data = await api("/api/civil-at-hand/custom-forms/" + form._id + "/responses");
      setResponses(data.responses || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load responses."); }
    finally { setResponsesLoading(false); }
  }

  function exportResponses(form: FormRecord) {
    window.location.assign("/api/civil-at-hand/custom-forms/" + form._id + "/responses/export");
  }

  return <section className={styles.panel}>
    <div className={styles.hero}>
      <div className={styles.heroIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3.75h8l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7"/><path d="M14.5 4v4h4M8.5 12h7M8.5 16h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></div>
      <div className={styles.heroText}><span className={styles.eyebrow}>FORM STUDIO</span><h2>Custom forms</h2><p>Build a form for any purpose. Collect group verification, registrations, surveys and other answers without adding them to Contacts.</p></div>
      <button className={styles.primary} onClick={beginCreate} type="button"><span aria-hidden="true">＋</span> Create form</button>
    </div>

    <div className={styles.metrics}>
      <div><span>All forms</span><strong>{forms.length}</strong></div>
      <div><span>Accepting answers</span><strong>{forms.filter(formActive).length}</strong></div>
      <div><span>Responses received</span><strong>{forms.reduce((sum, form) => sum + Number(form.submissions || 0), 0).toLocaleString("en-IN")}</strong></div>
    </div>

    <div className={styles.listHead}><div><h3>Your forms</h3><p>Each form has its own fields, sharing link and response store.</p></div><label className={styles.search}><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search forms" aria-label="Search custom forms" /></label></div>
    {notice ? <div className={styles.notice} role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div> : null}
    {error ? <div className={styles.error} role="alert">{error}</div> : null}

    {loading ? <div className={styles.empty}><span className={styles.spinner} />Loading your forms…</div>
      : filteredForms.length ? <div className={styles.formList}>{filteredForms.map((form) => {
        const live = formActive(form);
        return <article className={styles.formCard} key={form._id}>
          <div className={styles.formIcon} aria-hidden="true">{form.title.trim().charAt(0).toUpperCase() || "F"}</div>
          <div className={styles.formInfo}>
            <div className={styles.formTitleLine}><h4>{form.title}</h4><span className={live ? styles.statusLive : styles.statusPaused}><i />{live ? "Accepting responses" : "Paused / expired"}</span></div>
            <p>{form.description || "No description added."}</p>
            <div className={styles.meta}><span>{form.fields.length} question{form.fields.length === 1 ? "" : "s"}</span><span>{Number(form.submissions || 0).toLocaleString("en-IN")} response{form.submissions === 1 ? "" : "s"}</span><span>Expires: {dateLabel(form.expiresAt)}</span></div>
            <div className={styles.shareRow}><span className={styles.linkGlyph} aria-hidden="true">↗</span><span className={styles.urlText}>{form.shareUrl}</span><button type="button" className={styles.smallCopy} onClick={() => void copyLink(form)}>Copy link</button></div>
            <div className={styles.actions}>
              <button type="button" className={styles.actionPrimary} onClick={() => void openResponses(form)}>View responses <span>{Number(form.submissions || 0)}</span></button>
              <button type="button" className={styles.action} onClick={() => beginEdit(form)}>Edit form</button>
              <button type="button" className={styles.action} onClick={() => void toggleForm(form)}>{form.active ? "Pause" : "Activate"}</button>
              <button type="button" className={styles.actionDanger} onClick={() => void deleteForm(form)}>Delete</button>
            </div>
          </div>
        </article>;
      })}</div>
      : <div className={styles.emptyState}><span aria-hidden="true">▤</span><h3>{search ? "No matching forms" : "Your form studio is ready"}</h3><p>{search ? "Try another search term." : "Create your first form and decide exactly which questions people see. Every response stays separate from your contacts and projects."}</p>{!search ? <button className={styles.primary} type="button" onClick={beginCreate}>Create your first form</button> : null}</div>}

    {editorOpen ? <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditorOpen(false); }}>
      <section className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="custom-editor-title">
        <div className={styles.editorHead}><div><span className={styles.eyebrow}>{editingId ? "FORM SETTINGS" : "NEW FORM"}</span><h2 id="custom-editor-title">{editingId ? "Edit custom form" : "Build a form"}</h2><p>Add the questions you need. Only this form stores its answers.</p></div><button type="button" className={styles.close} disabled={saving} onClick={() => setEditorOpen(false)} aria-label="Close editor">×</button></div>
        <form onSubmit={(event) => void saveForm(event)} className={styles.editorBody}>
          <div className={styles.fieldBlock}><label htmlFor="custom-form-title">Form name <b>*</b></label><input id="custom-form-title" maxLength={160} required value={draft.title} placeholder="e.g. WhatsApp group verification" onChange={(event) => updateDraft({ title: event.target.value })} /></div>
          <div className={styles.fieldBlock}><label htmlFor="custom-form-description">Description and instructions</label><textarea id="custom-form-description" maxLength={2000} rows={3} value={draft.description} placeholder="Explain why people should fill this form…" onChange={(event) => updateDraft({ description: event.target.value })} /></div>
          <div className={styles.fieldBlock}><label htmlFor="custom-form-expiry">Link expiry</label><select id="custom-form-expiry" value={draft.expiryDays} onChange={(event) => updateDraft({ expiryDays: event.target.value })}>{editingId ? <option value="">Keep current expiry setting</option> : null}{expiryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Paused or expired forms stop accepting new answers.</small></div>
          <div className={styles.questionsHead}><div><h3>Questions <span>{draft.fields.length}/50</span></h3><p>Choose a field type and make questions required when needed.</p></div><button className={styles.action} type="button" disabled={draft.fields.length >= 50} onClick={addField}>＋ Add question</button></div>
          <div className={styles.draftFields}>{draft.fields.map((field, index) => {
            const choiceType = ["select", "radio", "multi-select"].includes(field.type);
            return <article className={styles.draftCard} key={index}>
              <div className={styles.draftCardHead}><span>QUESTION {String(index + 1).padStart(2, "0")}</span><button type="button" disabled={draft.fields.length <= 1} onClick={() => removeField(index)} aria-label={"Remove question " + (index + 1)}>Remove</button></div>
              <div className={styles.draftGrid}>
                <div className={styles.fieldBlock}><label htmlFor={"custom-field-label-" + index}>Question label <b>*</b></label><input id={"custom-field-label-" + index} maxLength={160} required value={field.label} placeholder="What do you want to ask?" onChange={(event) => updateField(index, { label: event.target.value })} /></div>
                <div className={styles.fieldBlock}><label htmlFor={"custom-field-type-" + index}>Answer type</label><select id={"custom-field-type-" + index} value={field.type} onChange={(event) => updateField(index, { type: event.target.value as CustomFormFieldType, options: ["select", "radio", "multi-select"].includes(event.target.value) && !(field.options || []).length ? ["Option 1", "Option 2"] : field.options })}>{fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                <div className={styles.fieldBlock + " " + styles.fullWidth}><label htmlFor={"custom-field-placeholder-" + index}>{field.type === "checkbox" ? "Confirmation label" : "Hint / placeholder (optional)"}</label><input id={"custom-field-placeholder-" + index} maxLength={240} value={field.placeholder || ""} placeholder="Optional help text" onChange={(event) => updateField(index, { placeholder: event.target.value })} /></div>
                {choiceType ? <div className={styles.fieldBlock + " " + styles.fullWidth}><label htmlFor={"custom-field-options-" + index}>Options <b>*</b></label><textarea id={"custom-field-options-" + index} rows={3} required value={(field.options || []).join("\n")} placeholder={"Option 1\nOption 2"} onChange={(event) => updateField(index, { options: event.target.value.split(/\r?\n/).slice(0, 50) })} /><small>Put one option on each line.</small></div> : null}
              </div>
              <label className={styles.requiredToggle}><input type="checkbox" checked={field.required} onChange={(event) => updateField(index, { required: event.target.checked })} /><span>Require an answer</span></label>
            </article>;
          })}</div>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <div className={styles.editorFooter}><span>Form answers are kept separate from Contacts.</span><button type="button" className={styles.cancel} disabled={saving} onClick={() => setEditorOpen(false)}>Cancel</button><button type="submit" className={styles.primary} disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create form"}</button></div>
        </form>
      </section>
    </div> : null}

    {responsesFor ? <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResponsesFor(null); }}>
      <section className={styles.responseDialog} role="dialog" aria-modal="true" aria-labelledby="responses-title">
        <div className={styles.editorHead}><div><span className={styles.eyebrow}>PRIVATE SUBMISSIONS</span><h2 id="responses-title">{responsesFor.title}</h2><p>{responses.length} response{responses.length === 1 ? "" : "s"} shown · Answers belong only to this form.</p></div><button className={styles.close} onClick={() => setResponsesFor(null)} type="button" aria-label="Close responses">×</button></div>
        <div className={styles.responseActions}><button className={styles.actionPrimary} type="button" onClick={() => exportResponses(responsesFor)}>↓ Export CSV</button><span>Up to 5,000 most recent responses</span></div>
        <div className={styles.responseList}>
          {responsesLoading ? <div className={styles.empty}><span className={styles.spinner} />Loading responses…</div>
            : responses.length ? responses.map((response, index) => <article className={styles.responseCard} key={response._id}>
              <div className={styles.responseCardHead}><strong>Response {responses.length - index}</strong><time>{new Date(response.submittedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div>
              <dl>{(response.fields || responsesFor.fields).map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{responseValue(response.answers?.[field.key]) || "—"}</dd></div>)}</dl>
            </article>) : <div className={styles.emptyState}><span aria-hidden="true">▤</span><h3>No responses yet</h3><p>Share the form link. Submitted answers will appear here.</p></div>}
        </div>
        <div className={styles.responseFooter}><span>Private to the signed-in administrator</span><button className={styles.cancel} type="button" onClick={() => setResponsesFor(null)}>Close</button></div>
      </section>
    </div> : null}
  </section>;
}
