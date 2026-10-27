"use client";

import { useEffect, useMemo, useState } from "react";
import { emdStatuses, labelOf, tenderDecisions, tenderDef, tenderStatuses } from "@/modules/civil-at-hand/lib/entities";
import { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, DetailList, EmptyState, ErrorNote, Loading, Modal, PageSection, Progress, SpecForm, Tabs, useConfirm, useWorkspace, type Tone } from "@/modules/civil-at-hand/components/ui";

const statusTone: Record<string, Tone> = { identified: "neutral", preparing: "info", submitted: "accent", won: "success", lost: "danger", cancelled: "neutral" };
const layout = [
  { title: "Opportunity", keys: ["title", "authority", "refNumber", "category", "location", "source"] },
  { title: "Dates", keys: ["publishedDate", "preBidDate", "submissionDeadline", "followUpAt"] },
  { title: "Money", keys: ["estimatedValue", "bidValue", "emdAmount", "emdStatus", "emdReference"] },
  { title: "Decision", keys: ["decision", "decisionReason", "status"] },
  { title: "Checklist", keys: ["checklist"] },
  { title: "Outcome", keys: ["winnerName", "winningBid", "outcomeNote"] },
];
const defaultChecklist = ["Registration / enlistment certificate", "Experience certificates of similar work", "Turnover / financial statements", "GST and PAN", "Solvency certificate", "EMD / bid security", "Technical bid documents", "Priced BOQ / financial bid", "Site visit done", "Pre-bid queries sent"].map((label) => ({ label, done: false }));

export default function TendersPanel({ openId = "", onOpenHandled }: { openId?: string; onOpenHandled?: () => void }) {
  const { money, notify, navigate, reloadCore } = useWorkspace();
  const confirm = useConfirm();
  const { data, loading, error, reload, setData } = useEntityList("/api/civil-at-hand/tenders");
  const [filter, setFilter] = useState("open");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  useEffect(() => { if (openId && data.length) { const found = data.find((row) => row._id === openId); if (found) { setViewing(found); onOpenHandled?.(); } } }, [openId, data, onOpenHandled]);
  const rows = useMemo(() => data.filter((row) => (filter === "open" ? ["identified", "preparing", "submitted"].includes(String(row.status)) : filter === "closed" ? ["won", "lost", "cancelled"].includes(String(row.status)) : true)), [data, filter]);
  const decided = data.filter((row) => row.status === "won" || row.status === "lost");
  const won = data.filter((row) => row.status === "won");
  async function save(values: Record<string, unknown>) {
    const isNew = editing === "new";
    const result = await api<{ item: Row }>(isNew ? "/api/civil-at-hand/tenders" : `/api/civil-at-hand/tenders/${(editing as Row)._id}`, { method: isNew ? "POST" : "PUT", json: values });
    setEditing(null); notify(isNew ? "Tender added." : "Tender updated."); reload(); setViewing(result.item);
  }
  async function toggleItem(row: Row, index: number) {
    const checklist = ((row.checklist as { label: string; done: boolean }[]) || []).map((item, i) => (i === index ? { ...item, done: !item.done } : item));
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/tenders/${row._id}`, { method: "PATCH", json: { checklist } }); setViewing(result.item); setData((current) => current.map((item) => (item._id === row._id ? result.item : item))); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update.", "error"); }
  }
  async function convert(row: Row) {
    const answer = await confirm({ title: "Create a project from this tender?", message: "A project is created in the “Awarded” stage with the authority as client and your bid value as contract value.", confirmLabel: "Create project", tone: "primary" });
    if (!answer.ok) return;
    try { const result = await api<{ project: Row }>(`/api/civil-at-hand/tenders/${row._id}/convert`, { method: "POST" }); notify("Project created."); await reloadCore(); navigate("project", { kind: "project", id: result.project._id }); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not create the project.", "error"); }
  }
  const deadlineBadge = (row: Row) => {
    if (!row.submissionDeadline || !["identified", "preparing"].includes(String(row.status))) return null;
    const days = Math.ceil((Date.parse(String(row.submissionDeadline)) - Date.now()) / 86_400_000);
    return days < 0 ? <Badge tone="danger">Deadline passed</Badge> : days <= 7 ? <Badge tone="warning">{days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} left`}</Badge> : null;
  };
  return <div className="ui-stack">
    <div className="ui-stats-row">
      <div className="ui-mini-stat"><span>Open opportunities</span><strong>{data.filter((row) => ["identified", "preparing", "submitted"].includes(String(row.status))).length}</strong></div>
      <div className="ui-mini-stat"><span>Win rate (decided)</span><strong>{decided.length ? `${Math.round(won.length / decided.length * 100)}%` : "—"}</strong><small>{won.length} won of {decided.length}</small></div>
      <div className="ui-mini-stat"><span>Value won</span><strong>{money(won.reduce((sum, row) => sum + Number(row.bidValue || 0), 0), true)}</strong></div>
      <div className="ui-mini-stat"><span>EMD outstanding</span><strong>{money(data.filter((row) => row.emdStatus === "paid" && !["won"].includes(String(row.status))).reduce((sum, row) => sum + Number(row.emdAmount || 0), 0), true)}</strong><small>Paid, not yet refunded</small></div>
    </div>
    <div className="ui-toolbar-row"><Tabs label="Tender filter" value={filter} onChange={setFilter} items={[{ value: "open", label: "Open" }, { value: "closed", label: "Decided" }, { value: "all", label: "All", count: data.length }]} /><Button variant="primary" icon="plus" onClick={() => setEditing("new")}>Add tender</Button></div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={rows} onRowClick={setViewing} csvName="tenders" initialSort={{ key: "submissionDeadline", dir: 1 }} columns={[
      { key: "title", label: "Tender", render: (row) => <><strong>{String(row.title)}</strong><small className="ui-muted">{[row.authority, row.refNumber].filter(Boolean).join(" · ")}</small></>, value: (row) => String(row.title) },
      { key: "submissionDeadline", label: "Deadline", render: (row) => <>{dateLabel(row.submissionDeadline as string, true)}{deadlineBadge(row)}</>, value: (row) => String(row.submissionDeadline || "9999") },
      { key: "estimatedValue", label: "Value", align: "right", hideOnMobile: true, render: (row) => money(Number(row.bidValue || row.estimatedValue || 0), true), value: (row) => Number(row.bidValue || row.estimatedValue || 0) },
      { key: "checklist", label: "Ready", hideOnMobile: true, render: (row) => { const list = (row.checklist as { done: boolean }[]) || []; return list.length ? <span className="ui-inline-progress"><Progress value={list.filter((item) => item.done).length / list.length * 100} label="Checklist" />{list.filter((item) => item.done).length}/{list.length}</span> : "—"; } },
      { key: "status", label: "Stage", render: (row) => <Badge tone={statusTone[String(row.status)]}>{labelOf(tenderStatuses, String(row.status))}</Badge>, value: (row) => String(row.status) },
    ]} empty={<EmptyState icon="gavel" title="No tenders tracked yet" action={<Button variant="primary" icon="plus" onClick={() => setEditing("new")}>Add a tender</Button>}>Track opportunities from discovery to submission and outcome, with deadlines, EMD and an eligibility checklist.</EmptyState>} />}
    {editing ? <Modal size="xl" title={editing === "new" ? "Add tender / bid opportunity" : "Edit tender"} onClose={() => setEditing(null)}>
      <SpecForm fields={tenderDef.fields} layout={layout} initial={editing === "new" ? { checklist: defaultChecklist, status: "identified", decision: "pending", emdStatus: "not-required" } : editing} onSubmit={save} onCancel={() => setEditing(null)} submitLabel={editing === "new" ? "Save tender" : "Save changes"} />
    </Modal> : null}
    {viewing ? <Modal size="lg" title={String(viewing.title)} description={[viewing.authority, viewing.refNumber].filter(Boolean).join(" · ")} onClose={() => setViewing(null)} footer={<>
      <Button icon="edit" onClick={() => { setEditing(viewing); setViewing(null); }}>Edit</Button>
      {viewing.status === "won" && !viewing.projectId ? <Button variant="primary" icon="briefcase" onClick={() => void convert(viewing)}>Create project</Button> : null}
      {viewing.projectId ? <Button variant="primary" onClick={() => navigate("project", { kind: "project", id: String(viewing.projectId) })}>Open project</Button> : null}
    </>}>
      <div className="ui-stack">
        <DetailList items={[["Stage", <Badge key="s" tone={statusTone[String(viewing.status)]}>{labelOf(tenderStatuses, String(viewing.status))}</Badge>], ["Decision", labelOf(tenderDecisions, String(viewing.decision))], ["Deadline", dateLabel(viewing.submissionDeadline as string, true)], ["Pre-bid meeting", dateLabel(viewing.preBidDate as string)], ["Published value", viewing.estimatedValue ? money(Number(viewing.estimatedValue)) : ""], ["Our bid", viewing.bidValue ? money(Number(viewing.bidValue)) : ""], ["EMD", viewing.emdAmount ? `${money(Number(viewing.emdAmount))} · ${labelOf(emdStatuses, String(viewing.emdStatus))}` : labelOf(emdStatuses, String(viewing.emdStatus))], ["EMD reference", String(viewing.emdReference || "")], ["Location", String(viewing.location || "")], ["Reason for decision", String(viewing.decisionReason || "")], ["Winner", [viewing.winnerName, viewing.winningBid ? money(Number(viewing.winningBid)) : ""].filter(Boolean).join(" · ")], ["Outcome notes", String(viewing.outcomeNote || "")]]} />
        <PageSection title="Checklist" description="Tick items as they are ready.">
          {((viewing.checklist as { label: string; done: boolean }[]) || []).length ? <ul className="tn-checklist">{((viewing.checklist as { label: string; done: boolean }[]) || []).map((item, index) => <li key={index}><label className="ui-check"><input type="checkbox" checked={item.done} onChange={() => void toggleItem(viewing, index)} /><span className={item.done ? "is-done" : ""}>{item.label}</span></label></li>)}</ul> : <p className="ui-muted">No checklist items. Edit the tender to add some.</p>}
        </PageSection>
      </div>
    </Modal> : null}
    <p className="ui-footnote">Deadline reminders appear on the overview for tenders due within 14 days. Nothing is sent outside this app.</p>
  </div>;
}
