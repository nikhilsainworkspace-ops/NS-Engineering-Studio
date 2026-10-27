"use client";

// Document register with versions, expiry dates and approvals. Files are private: downloads require
// the signed-in admin session and are never linked from public pages.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { approvalStatuses, documentCategories, documentDef, labelOf } from "@/modules/civil-at-hand/lib/entities";
import { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, DetailList, EmptyState, ErrorNote, Icon, Loading, Modal, PageSection, projectName, SpecForm, Tabs, todayInput, useConfirm, useResource, useWorkspace, type Tone } from "@/modules/civil-at-hand/components/ui";

const approvalTone: Record<string, Tone> = { "not-required": "neutral", pending: "warning", approved: "success", rejected: "danger" };
const sizeLabel = (bytes: number) => (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function expiryState(row: Row, today: string, warnDays: number): { tone: Tone; label: string } | null {
  if (!row.expiryDate) return null;
  const key = String(row.expiryDate).slice(0, 10);
  if (key < today) return { tone: "danger", label: "Expired" };
  const warn = new Date(Date.parse(`${today}T00:00:00Z`) + warnDays * 86_400_000).toISOString().slice(0, 10);
  return key <= warn ? { tone: "warning", label: "Renew soon" } : null;
}

function Versions({ doc, onChanged }: { doc: Row; onChanged: () => void }) {
  const { notify } = useWorkspace();
  const { data, loading, error, reload } = useResource<Row[]>(`/api/civil-at-hand/documents/${doc._id}/files`, (raw) => (raw.files as Row[]) || [], []);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState("");
  const [note, setNote] = useState("");
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>("input[type=file]");
    const file = input?.files?.[0];
    if (!file) { notify("Choose a file first.", "info"); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append("file", file); body.append("revisionLabel", revision); body.append("note", note);
      const response = await fetch(`/api/civil-at-hand/documents/${doc._id}/files`, { method: "POST", body, cache: "no-store", credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      notify("New version uploaded."); setRevision(""); setNote(""); if (input) input.value = ""; reload(); onChanged();
    } catch (err) { notify(err instanceof Error ? err.message : "Upload failed.", "error"); }
    finally { setBusy(false); }
  }
  return <PageSection title="Versions" description="Every upload is kept. The newest version is listed first.">
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading ? <Loading /> : data.length ? <ul className="doc-versions">{data.map((file, index) => <li key={file._id}>
      <span className="doc-version-no">v{String(file.version)}</span>
      <span className="doc-version-main"><strong>{String(file.filename)}</strong><small>{[file.revisionLabel, sizeLabel(Number(file.size || 0)), dateLabel(file.createdAt as string, true), file.note].filter(Boolean).join(" · ")}</small></span>
      {index === 0 ? <Badge tone="success">Current</Badge> : null}
      {/^(image\/|application\/pdf)/.test(String(file.mimeType)) ? <a className="ui-btn ui-btn-ghost ui-btn-sm" href={`${String(file.url)}?inline=1`} target="_blank" rel="noreferrer">View</a> : null}
      <a className="ui-btn ui-btn-secondary ui-btn-sm" href={String(file.url)}><Icon name="download" size={15} /><span>Download</span></a>
    </li>)}</ul> : <p className="ui-muted">No file uploaded yet.</p>}
    {!doc.archived ? <form className="doc-upload" onSubmit={upload}>
      <label className="ui-field ui-span-all"><span className="ui-label">Upload a new version (PDF, image, DOCX, XLSX, PPTX, DWG, DXF, CSV, TXT — up to 4 MB)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx,.dwg,.dxf,.csv,.txt" /></label>
      <label className="ui-field"><span className="ui-label">Revision label</span><input value={revision} onChange={(event) => setRevision(event.target.value)} maxLength={20} placeholder="e.g. R1" /></label>
      <label className="ui-field"><span className="ui-label">What changed?</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} /></label>
      <div className="ui-form-actions"><button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>{busy ? "Uploading…" : "Upload version"}</button></div>
    </form> : null}
  </PageSection>;
}

export default function DocumentsPanel({ projectId = "", initialFilter = "", openId = "", onOpenHandled }: { projectId?: string; initialFilter?: string; openId?: string; onOpenHandled?: () => void }) {
  const { projects, notify, settings } = useWorkspace();
  const confirm = useConfirm();
  const { data, loading, error, reload, setData } = useEntityList(`/api/civil-at-hand/documents${projectId ? `?projectId=${projectId}` : ""}`);
  const [filter, setFilter] = useState(initialFilter === "attention" ? "attention" : "active");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const today = todayInput();
  useEffect(() => { if (openId && data.length) { const found = data.find((row) => row._id === openId); if (found) { setViewing(found); onOpenHandled?.(); } } }, [openId, data, onOpenHandled]);
  const rows = useMemo(() => data.filter((row) => {
    if (category && row.category !== category) return false;
    if (filter === "archived") return Boolean(row.archived);
    if (row.archived) return false;
    if (filter === "attention") return Boolean(expiryState(row, today, settings.documentExpiryWarningDays)) || row.approvalStatus === "pending";
    return true;
  }), [data, filter, category, today, settings.documentExpiryWarningDays]);
  async function save(values: Record<string, unknown>) {
    const isNew = editing === "new";
    const result = await api<{ item: Row }>(isNew ? "/api/civil-at-hand/documents" : `/api/civil-at-hand/documents/${(editing as Row)._id}`, { method: isNew ? "POST" : "PUT", json: values });
    setEditing(null); notify(isNew ? "Document added. Upload the file next." : "Document updated."); reload(); setViewing(result.item);
  }
  async function patch(row: Row, values: Record<string, unknown>, message: string) {
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/documents/${row._id}`, { method: "PATCH", json: values }); notify(message); setViewing(result.item); setData((current) => current.map((item) => (item._id === row._id ? result.item : item))); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update.", "error"); }
  }
  async function remove(row: Row) {
    const answer = await confirm({ title: "Delete this document and every version?", message: "This permanently removes all uploaded files for this document.", confirmLabel: "Delete permanently" });
    if (!answer.ok) return;
    try { await api(`/api/civil-at-hand/documents/${row._id}`, { method: "DELETE" }); notify("Document deleted."); setViewing(null); reload(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not delete.", "error"); }
  }
  return <div className="ui-stack">
    <div className="ui-toolbar-row ui-wrap">
      <Tabs label="Document filter" value={filter} onChange={setFilter} items={[{ value: "active", label: "All documents" }, { value: "attention", label: "Needs attention", count: data.filter((row) => !row.archived && (expiryState(row, today, settings.documentExpiryWarningDays) || row.approvalStatus === "pending")).length }, { value: "archived", label: "Archived" }]} />
      <select aria-label="Category" className="ui-select-sm" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{documentCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <Button variant="primary" icon="plus" onClick={() => setEditing("new")}>Add document</Button>
    </div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={rows} onRowClick={setViewing} csvName="documents" columns={[
      { key: "title", label: "Document", render: (row) => <><strong>{String(row.title)}</strong><small className="ui-muted">{[row.docNumber, row.revision, row.latestFileName].filter(Boolean).join(" · ") || "No file yet"}</small></>, value: (row) => String(row.title) },
      { key: "category", label: "Category", value: (row) => labelOf(documentCategories, String(row.category)) },
      ...(projectId ? [] : [{ key: "projectId", label: "Project", hideOnMobile: true, value: (row: Row) => projectName(projects, String(row.projectId)) || "General" }]),
      { key: "approvalStatus", label: "Approval", render: (row) => <Badge tone={approvalTone[String(row.approvalStatus)]}>{labelOf(approvalStatuses, String(row.approvalStatus))}</Badge>, value: (row) => String(row.approvalStatus) },
      { key: "expiryDate", label: "Expiry", render: (row) => { const state = expiryState(row, today, settings.documentExpiryWarningDays); return <>{dateLabel(row.expiryDate as string)}{state ? <Badge tone={state.tone}>{state.label}</Badge> : null}</>; }, value: (row) => String(row.expiryDate || "9999") },
      { key: "currentVersion", label: "Versions", align: "right", hideOnMobile: true, value: (row) => Number(row.currentVersion || 0) },
    ]} empty={<EmptyState icon="folder" title="No documents yet" action={<Button variant="primary" icon="plus" onClick={() => setEditing("new")}>Add a document</Button>}>Keep contracts, drawings, certificates, inspection records and photos in one place, with versions and renewal dates.</EmptyState>} />}
    {editing ? <Modal size="lg" title={editing === "new" ? "Add document" : "Edit document details"} onClose={() => setEditing(null)}>
      <SpecForm fields={documentDef.fields} initial={editing === "new" ? { projectId, category: "drawing", approvalStatus: "not-required", issueDate: today } : editing} onSubmit={save} onCancel={() => setEditing(null)} submitLabel={editing === "new" ? "Add and upload file" : "Save changes"} />
    </Modal> : null}
    {viewing ? <Modal size="lg" title={String(viewing.title)} description={labelOf(documentCategories, String(viewing.category))} onClose={() => setViewing(null)} footer={<>
      {viewing.archived ? <><Button variant="danger" icon="trash" onClick={() => void remove(viewing)}>Delete permanently</Button><Button onClick={() => void patch(viewing, { archived: false }, "Document restored.")}>Restore</Button></> : <Button onClick={() => void patch(viewing, { archived: true }, "Document archived.")}>Archive</Button>}
      {!viewing.archived ? <Button icon="edit" onClick={() => { setEditing(viewing); setViewing(null); }}>Edit details</Button> : null}
      {viewing.approvalStatus === "pending" ? <><Button variant="danger" onClick={() => void patch(viewing, { approvalStatus: "rejected" }, "Marked as rejected.")}>Reject</Button><Button variant="primary" icon="check" onClick={() => void patch(viewing, { approvalStatus: "approved" }, "Approved.")}>Approve</Button></> : null}
      {!viewing.archived && viewing.approvalStatus !== "pending" && viewing.approvalStatus !== "approved" ? <Button onClick={() => void patch(viewing, { approvalStatus: "pending" }, "Sent for approval.")}>Request approval</Button> : null}
    </>}>
      <div className="ui-stack">
        <DetailList items={[["Project", projectName(projects, String(viewing.projectId)) || "General"], ["Document no.", String(viewing.docNumber || "")], ["Revision", String(viewing.revision || "")], ["Issued by / owner", String(viewing.issuedBy || "")], ["Issue date", dateLabel(viewing.issueDate as string)], ["Expiry", dateLabel(viewing.expiryDate as string)], ["Approval", <Badge key="a" tone={approvalTone[String(viewing.approvalStatus)]}>{labelOf(approvalStatuses, String(viewing.approvalStatus))}</Badge>], ["Approved on", dateLabel(viewing.approvedAt as string)], ["Tags", ((viewing.tags as string[]) || []).join(", ")], ["Notes", String(viewing.notes || "")]]} />
        <Versions doc={viewing} onChanged={reload} />
      </div>
    </Modal> : null}
  </div>;
}
