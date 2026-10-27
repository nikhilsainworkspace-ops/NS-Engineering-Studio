"use client";

import { useEffect, useMemo, useState } from "react";
import { labelOf, siteReportDef, siteReportStatuses } from "@/modules/civil-at-hand/lib/entities";
import { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, DetailList, EmptyState, ErrorNote, Loading, Modal, projectName, SpecForm, Tabs, todayInput, useConfirm, useWorkspace, type Tone } from "@/modules/civil-at-hand/components/ui";

const statusTone: Record<string, Tone> = { draft: "neutral", submitted: "info", approved: "success", returned: "warning" };
const layout = [
  { title: "Report", keys: ["projectId", "date", "weather", "preparedBy", "labourCount"] },
  { title: "Work done", keys: ["workDone", "quantities"] },
  { title: "Resources", keys: ["labourNotes", "materialsUsed", "equipment"] },
  { title: "Issues and next steps", keys: ["issues", "safetyNotes", "nextDayPlan"] },
];

export default function SiteReportsPanel({ projectId = "", initialFilter = "", openNew = false, onOpenHandled }: { projectId?: string; initialFilter?: string; openNew?: boolean; onOpenHandled?: () => void }) {
  const { projects, notify } = useWorkspace();
  const confirm = useConfirm();
  const [filter, setFilter] = useState(initialFilter || "all");
  const { data, loading, error, reload } = useEntityList(`/api/civil-at-hand/site-reports${projectId ? `?projectId=${projectId}` : ""}`);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  useEffect(() => { if (openNew) { setEditing("new"); onOpenHandled?.(); } }, [openNew, onOpenHandled]);
  const rows = useMemo(() => (filter === "all" ? data : data.filter((row) => row.status === filter)), [data, filter]);

  async function save(values: Record<string, unknown>) {
    const isNew = editing === "new";
    const result = await api<{ item: Row }>(isNew ? "/api/civil-at-hand/site-reports" : `/api/civil-at-hand/site-reports/${(editing as Row)._id}`, { method: isNew ? "POST" : "PUT", json: values });
    setEditing(null); notify(isNew ? "Site report saved as a draft." : "Site report updated."); reload(); setViewing(result.item);
  }
  async function review(row: Row, action: "submit" | "approve" | "return") {
    let note = "";
    if (action !== "submit") {
      const answer = await confirm({ title: action === "approve" ? "Approve this site report?" : "Return for changes?", message: action === "approve" ? "Approved reports are locked as a permanent record." : "The report can be edited again and resubmitted.", confirmLabel: action === "approve" ? "Approve" : "Return", tone: action === "approve" ? "primary" : "danger", input: { label: "Note (optional)", placeholder: action === "return" ? "What needs changing?" : "" } });
      if (!answer.ok) return; note = answer.text;
    }
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/site-reports/${row._id}/review`, { method: "POST", json: { action, note } }); notify(action === "approve" ? "Report approved." : action === "return" ? "Report returned for changes." : "Report submitted for review."); reload(); setViewing(result.item); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update the report.", "error"); }
  }
  async function remove(row: Row) {
    const answer = await confirm({ title: "Delete this site report?", message: "This cannot be undone.", confirmLabel: "Delete" });
    if (!answer.ok) return;
    try { await api(`/api/civil-at-hand/site-reports/${row._id}`, { method: "DELETE" }); notify("Site report deleted."); setViewing(null); reload(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not delete.", "error"); }
  }

  const counts = { submitted: data.filter((row) => row.status === "submitted").length, draft: data.filter((row) => row.status === "draft").length, returned: data.filter((row) => row.status === "returned").length };
  return <div className="ui-stack">
    <div className="ui-toolbar-row">
      <Tabs label="Report status" value={filter} onChange={setFilter} items={[{ value: "all", label: "All", count: data.length }, { value: "submitted", label: "To review", count: counts.submitted }, { value: "draft", label: "Drafts", count: counts.draft }, { value: "returned", label: "Returned", count: counts.returned }, { value: "approved", label: "Approved" }]} />
      <Button variant="primary" icon="plus" onClick={() => setEditing("new")}>New site report</Button>
    </div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={rows} onRowClick={setViewing} csvName="site-reports" initialSort={{ key: "date", dir: -1 }}
      columns={[
        { key: "date", label: "Date", render: (row) => <strong>{dateLabel(row.date as string)}</strong>, value: (row) => String(row.date || "") },
        ...(projectId ? [] : [{ key: "projectId", label: "Project", value: (row: Row) => projectName(projects, String(row.projectId)) }]),
        { key: "workDone", label: "Work done", render: (row) => <span className="ui-clamp">{String(row.workDone || "")}</span>, hideOnMobile: true },
        { key: "labourCount", label: "Workers", align: "right", value: (row) => Number(row.labourCount ?? 0) },
        { key: "status", label: "Status", render: (row) => <Badge tone={statusTone[String(row.status)] || "neutral"}>{labelOf(siteReportStatuses, String(row.status))}</Badge>, value: (row) => String(row.status) },
      ]}
      empty={<EmptyState icon="clipboard" title="No site reports yet" action={<Button variant="primary" icon="plus" onClick={() => setEditing("new")}>Write today’s report</Button>}>Record work done, labour, materials, delays and the plan for tomorrow. Reports can be submitted and approved.</EmptyState>} />}

    {editing ? <Modal size="xl" title={editing === "new" ? "Daily site report" : "Edit site report"} onClose={() => setEditing(null)}>
      <SpecForm fields={siteReportDef.fields} layout={layout} initial={editing === "new" ? { projectId, date: todayInput(), quantities: [] } : editing} onSubmit={save} onCancel={() => setEditing(null)} submitLabel={editing === "new" ? "Save draft" : "Save changes"} />
    </Modal> : null}

    {viewing ? <Modal size="lg" title={`Site report · ${dateLabel(viewing.date as string)}`} description={projectName(projects, String(viewing.projectId))} onClose={() => setViewing(null)}
      footer={<>
        <a className="ui-btn ui-btn-ghost" href={`/workspace/print/site-report/${viewing._id}`} target="_blank" rel="noreferrer">Print</a>
        {viewing.status !== "approved" ? <Button variant="quiet" icon="trash" onClick={() => void remove(viewing)}>Delete</Button> : null}
        {viewing.status !== "approved" ? <Button icon="edit" onClick={() => { setEditing(viewing); setViewing(null); }}>Edit</Button> : null}
        {viewing.status === "draft" || viewing.status === "returned" ? <Button onClick={() => void review(viewing, "submit")}>Submit for review</Button> : null}
        {viewing.status === "submitted" || viewing.status === "approved" ? <Button variant="danger" onClick={() => void review(viewing, "return")}>Return for changes</Button> : null}
        {viewing.status === "submitted" || viewing.status === "draft" ? <Button variant="primary" icon="check" onClick={() => void review(viewing, "approve")}>Approve</Button> : null}
      </>}>
      <div className="ui-stack">
        <div><Badge tone={statusTone[String(viewing.status)] || "neutral"}>{labelOf(siteReportStatuses, String(viewing.status))}</Badge>{viewing.reviewNote ? <p className="ui-callout">{String(viewing.reviewNote)}</p> : null}</div>
        <DetailList items={[["Weather", String(viewing.weather || "")], ["Workers on site", viewing.labourCount === null || viewing.labourCount === undefined ? "" : String(viewing.labourCount)], ["Prepared by", String(viewing.preparedBy || "")]]} />
        {[["Work completed", viewing.workDone], ["Labour and subcontractors", viewing.labourNotes], ["Materials received or used", viewing.materialsUsed], ["Equipment", viewing.equipment], ["Delays and issues", viewing.issues], ["Safety and quality", viewing.safetyNotes], ["Plan for the next day", viewing.nextDayPlan]].filter(([, value]) => value).map(([label, value]) => <section key={String(label)} className="ui-text-block"><h3>{String(label)}</h3><p>{String(value)}</p></section>)}
        {Array.isArray(viewing.quantities) && viewing.quantities.length ? <table className="ui-table ui-table-compact"><thead><tr><th>Measured item</th><th>Unit</th><th className="num">Qty</th></tr></thead><tbody>{(viewing.quantities as Row[]).map((row, index) => <tr key={index}><td>{String(row.description)}</td><td>{String(row.unit || "")}</td><td className="num">{Number(row.qty).toLocaleString("en-IN")}</td></tr>)}</tbody></table> : null}
      </div>
    </Modal> : null}
  </div>;
}
