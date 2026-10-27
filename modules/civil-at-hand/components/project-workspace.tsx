"use client";

// One place for everything about a project: details, milestones, quotations, site diary, materials,
// labour, money, documents and tasks. Each tab shows the module filtered to this project.
import { useMemo, useState } from "react";
import { categoryLabel } from "@/modules/civil-at-hand/lib/categories";
import { projectStatuses, projectStatusLabel } from "@/modules/civil-at-hand/lib/projects";
import type { ProjectRecord, TaskRecord } from "@/modules/civil-at-hand/lib/types";
import DocumentsPanel from "@/modules/civil-at-hand/components/documents-panel";
import EstimatesPanel from "@/modules/civil-at-hand/components/estimates-panel";
import EntityManager from "@/modules/civil-at-hand/components/entity-manager";
import { InvoicesView } from "@/modules/civil-at-hand/components/finance-panel";
import { OrdersView, RequestsView, useMaterials } from "@/modules/civil-at-hand/components/procurement-panel";
import SiteReportsPanel from "@/modules/civil-at-hand/components/site-reports-panel";
import WorkforcePanel from "@/modules/civil-at-hand/components/workforce-panel";
import { expenseDef } from "@/modules/civil-at-hand/lib/entities";
import { api, Badge, Button, dateLabel, DetailList, EmptyState, ErrorNote, Icon, Loading, PageSection, Progress, qtyLabel, StatCard, Tabs, todayInput, useResource, useWorkspace } from "@/modules/civil-at-hand/components/ui";

type Tab = "overview" | "quotes" | "diary" | "materials" | "labour" | "money" | "documents" | "tasks";
type Money = { billed: number; received: number; toCollect: number; billsCost: number; billsDue: number; expenseCost: number; labourCost: number; actualCost: number; budget: number; budgetUsedPct: number | null; overBudget: boolean; contractValue: number; marginOnBilled: number; revenueSource: string };
type Summary = { project: ProjectRecord; money: Money; committedPurchases: number; counts: { estimates: number; documents: number; siteReportLast: { date: string; status: string } | null; invoices: number; expenses: number; labourDays: number }; materials: { materialId: string; name: string; unit: string; requested: number; ordered: number; receivedHere: number; consumed: number; wasted: number; onSite: number }[] };
type Milestone = { title: string; dueDate?: string | null; done: boolean; doneAt?: string | null; weight?: number };

function Milestones({ project, onSaved }: { project: ProjectRecord; onSaved: () => void }) {
  const { notify } = useWorkspace();
  const [items, setItems] = useState<Milestone[]>(() => (project.milestones || []).map((item) => ({ title: item.title, dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "", done: item.done, doneAt: item.doneAt || null, weight: item.weight || 0 })));
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const today = todayInput();
  async function persist(next: Milestone[]) {
    setBusy(true);
    try { await api(`/api/civil-at-hand/projects/${project._id}`, { method: "PATCH", json: { milestones: next.map((item) => ({ ...item, dueDate: item.dueDate || null })) } }); setItems(next); onSaved(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not save milestones.", "error"); }
    finally { setBusy(false); }
  }
  const done = items.filter((item) => item.done).length;
  return <PageSection title="Milestones" description={items.length ? `${done} of ${items.length} complete` : "Break the work into stages with target dates."}>
    {items.length ? <ul className="pw-milestones">{items.map((item, index) => {
      const late = !item.done && item.dueDate && item.dueDate < today;
      return <li key={index} className={item.done ? "is-done" : ""}>
        <label className="ui-check"><input type="checkbox" checked={item.done} disabled={busy} onChange={() => void persist(items.map((row, i) => (i === index ? { ...row, done: !row.done, doneAt: !row.done ? new Date().toISOString() : null } : row)))} /><span>{item.title}</span></label>
        <span className={`pw-ms-date ${late ? "ui-text-danger" : ""}`}>{item.done ? `Done ${dateLabel(item.doneAt)}` : item.dueDate ? `${late ? "Late · " : ""}${dateLabel(`${item.dueDate}T00:00:00Z`)}` : "No date"}</span>
        <Button size="sm" variant="quiet" icon="trash" aria-label={`Remove milestone ${item.title}`} disabled={busy} onClick={() => void persist(items.filter((_, i) => i !== index))} />
      </li>;
    })}</ul> : null}
    <form className="pw-ms-add" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; void persist([...items, { title: title.trim(), dueDate: due || null, done: false }]).then(() => { setTitle(""); setDue(""); }); }}>
      <input aria-label="New milestone" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="e.g. Foundation complete" />
      <input aria-label="Target date" type="date" value={due} onChange={(event) => setDue(event.target.value)} />
      <Button size="sm" icon="plus" type="submit" disabled={busy || !title.trim()}>Add</Button>
    </form>
  </PageSection>;
}

export default function ProjectWorkspace({ projectId, tasks, onBack, onEdit }: { projectId: string; tasks: TaskRecord[]; onBack: () => void; onEdit: (project: ProjectRecord) => void }) {
  const { projects, contacts, money, notify, reloadCore, navigate } = useWorkspace();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, loading, error, reload } = useResource<Summary | null>(`/api/civil-at-hand/projects/${projectId}/summary`, (raw) => raw as unknown as Summary, null);
  const materials = useMaterials();
  const project = data?.project || projects.find((item) => item._id === projectId) || null;
  const projectTasks = useMemo(() => tasks.filter((task) => task.relatedKind === "project" && task.relatedId === projectId), [tasks, projectId]);
  const client = project?.clientContactId ? contacts.find((contact) => contact._id === project.clientContactId) : undefined;
  const team = (project?.linkedContactIds || []).map((id) => contacts.find((contact) => contact._id === id)).filter(Boolean);

  async function changeStatus(status: string) {
    try { await api(`/api/civil-at-hand/projects/${projectId}`, { method: "PATCH", json: { status } }); notify("Stage updated."); await reloadCore(); reload(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not change the stage.", "error"); }
  }

  if (!project) return loading ? <Loading /> : <EmptyState icon="briefcase" title="Project not found" action={<Button onClick={onBack}>Back to projects</Button>}>It may have been deleted.</EmptyState>;
  const m = data?.money;
  return <div className="pw ui-stack">
    <nav className="ui-breadcrumb" aria-label="Breadcrumb"><button type="button" onClick={onBack}><Icon name="back" size={15} />Projects</button><span aria-hidden="true">/</span><span aria-current="page">{project.title}</span></nav>
    <header className="pw-head">
      <div className="pw-title">
        <h1>{project.title}</h1>
        <p>{[project.clientName || client?.name, project.siteAddress || [project.city, project.state].filter(Boolean).join(", "), project.contractRef ? `Ref ${project.contractRef}` : ""].filter(Boolean).join(" · ") || "Add the client, site and contract details."}</p>
      </div>
      <div className="pw-head-actions">
        <label className="ui-field ui-inline"><span className="sr-only">Stage</span><select value={project.status} onChange={(event) => void changeStatus(event.target.value)} aria-label="Project stage">{projectStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
        <Button icon="edit" onClick={() => onEdit(project)}>Edit details</Button>
      </div>
    </header>
    <div className="pw-progress"><Progress value={project.progressPercent} label="Recorded progress" /><span>{project.progressPercent === null || project.progressPercent === undefined ? "Progress not recorded" : `${project.progressPercent}% recorded progress`}</span><span className="ui-muted">Planned {dateLabel(project.startDate)} – {dateLabel(project.endDate)}{project.actualStartDate ? ` · started ${dateLabel(project.actualStartDate)}` : ""}{project.actualEndDate ? ` · completed ${dateLabel(project.actualEndDate)}` : ""}</span></div>

    <Tabs<Tab> label="Project sections" value={tab} onChange={setTab} items={[
      { value: "overview", label: "Overview" }, { value: "quotes", label: "Estimates", count: data?.counts.estimates }, { value: "diary", label: "Site diary" },
      { value: "materials", label: "Materials" }, { value: "labour", label: "Labour" }, { value: "money", label: "Money" },
      { value: "documents", label: "Documents", count: data?.counts.documents }, { value: "tasks", label: "Tasks", count: projectTasks.filter((task) => task.status !== "done" && task.status !== "cancelled").length },
    ]} />
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}

    {tab === "overview" ? <div className="ui-stack">
      {m ? <div className="ov-stats">
        <StatCard icon="briefcase" tone="info" label="Contract value" value={money(m.contractValue, true)} detail={m.budget ? `Budget ${money(m.budget, true)}` : "No cost budget set"} />
        <StatCard icon="chart" tone={m.overBudget ? "danger" : "accent"} label="Actual cost" value={money(m.actualCost, true)} detail={m.budgetUsedPct !== null ? `${m.budgetUsedPct}% of budget` : `Bills ${money(m.billsCost, true)} · expenses ${money(m.expenseCost, true)} · labour ${money(m.labourCost, true)}`} onClick={() => setTab("money")} />
        <StatCard icon="wallet" tone={m.toCollect ? "warning" : "success"} label="Billed / received" value={`${money(m.billed, true)} / ${money(m.received, true)}`} detail={m.toCollect ? `${money(m.toCollect, true)} to collect` : "Nothing to collect"} onClick={() => setTab("money")} />
        <StatCard icon="truck" tone="neutral" label="On order" value={money(data?.committedPurchases || 0, true)} detail="Purchase orders (commitments, not cost)" onClick={() => setTab("materials")} />
      </div> : <Loading />}
      <div className="ov-grid">
        <div className="ui-stack">
          <Milestones key={project.updatedAt} project={project} onSaved={() => { void reloadCore(); reload(); }} />
          {project.scope ? <PageSection title="Scope of work"><p className="ui-prewrap">{project.scope}</p></PageSection> : null}
        </div>
        <PageSection title="Details">
          <DetailList items={[
            ["Stage", <Badge key="s" tone="info">{projectStatusLabel(project.status)}</Badge>], ["Work type", project.projectType], ["Client", project.clientName || client?.name || ""], ["Manager", project.managerName || ""],
            ["Site", project.siteAddress || [project.city, project.state].filter(Boolean).join(", ")], ["Contract ref", project.contractRef || ""], ["Source", project.source], ["Follow-up", dateLabel(project.followUpAt)],
            ["Last site report", data?.counts.siteReportLast ? dateLabel(data.counts.siteReportLast.date) : "None yet"],
          ]} />
          {team.length ? <><h3 className="ui-h3">People on this project</h3><ul className="pw-team">{team.map((contact) => contact ? <li key={contact._id}><strong>{contact.name}</strong><small>{contact.organization || categoryLabel(contact.category)}</small>{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : null}</li> : null)}</ul></> : null}
          {project.notes ? <><h3 className="ui-h3">Notes</h3><p className="ui-prewrap">{project.notes}</p></> : null}
        </PageSection>
      </div>
    </div> : null}

    {tab === "quotes" ? <EstimatesPanel projectId={projectId} /> : null}
    {tab === "diary" ? <SiteReportsPanel projectId={projectId} /> : null}
    {tab === "materials" ? <div className="ui-stack">
      <PageSection title="Materials for this site" description="Requested, ordered, received here, consumed and still on site are separate figures. Received includes deliveries straight to site and issues from the store.">
        {data?.materials.length ? <div className="ui-table-scroll"><table className="ui-table"><thead><tr><th>Material</th><th className="num">Requested</th><th className="num">Ordered</th><th className="num">Received</th><th className="num">Consumed</th><th className="num hide-sm">Wastage</th><th className="num">On site</th></tr></thead><tbody>
          {data.materials.map((row) => <tr key={row.materialId}><td><strong>{row.name}</strong></td><td className="num">{qtyLabel(row.requested, row.unit)}</td><td className="num">{qtyLabel(row.ordered, row.unit)}</td><td className="num">{qtyLabel(row.receivedHere, row.unit)}</td><td className="num">{qtyLabel(row.consumed, row.unit)}</td><td className="num hide-sm">{qtyLabel(row.wasted, row.unit)}</td><td className="num"><strong>{qtyLabel(row.onSite, row.unit)}</strong></td></tr>)}
        </tbody></table></div> : <EmptyState icon="box" title="No material activity for this site yet">Raise a material request or purchase order for this project, or record stock issued to this site.</EmptyState>}
      </PageSection>
      <PageSection title="Material requests"><RequestsView materials={materials} projectId={projectId} onCreateOrder={() => navigate("procurement", { kind: "filter", id: "", filter: "orders" })} /></PageSection>
      <PageSection title="Purchase orders"><OrdersView materials={materials} projectId={projectId} prefill={null} onPrefillHandled={() => undefined} /></PageSection>
    </div> : null}
    {tab === "labour" ? <WorkforcePanel projectId={projectId} initialSection="attendance" /> : null}
    {tab === "money" ? <div className="ui-stack">
      {m ? <p className="ui-footnote">Cost = supplier bills {money(m.billsCost)} + expenses {money(m.expenseCost)} + labour {money(m.labourCost)} = <strong>{money(m.actualCost)}</strong>. {m.revenueSource === "project-record" ? "Billing comes from the billed/received figures on the project because no client invoices are linked yet." : "Billing comes from issued client invoices."}</p> : null}
      <PageSection title="Client invoices"><InvoicesView kind="receivable" projectId={projectId} initialFilter="all" /></PageSection>
      <PageSection title="Supplier and subcontractor bills"><InvoicesView kind="payable" projectId={projectId} initialFilter="all" /></PageSection>
      <PageSection title="Expenses"><EntityManager def={expenseDef} path="/api/civil-at-hand/expenses" query={`projectId=${projectId}`} defaults={{ projectId, date: todayInput(), mode: "cash" }} addLabel="Record expense" emptyTitle="No expenses for this project" emptyIcon="receipt" emptyText="Site expenses linked to this project count towards its actual cost." afterSave={() => reload()}
        columns={[{ key: "date", label: "Date", render: (row) => dateLabel(row.date as string), value: (row) => String(row.date || "") }, { key: "category", label: "Category", value: (row) => String(row.category || "") }, { key: "description", label: "Description", value: (row) => String(row.description || "") }, { key: "amount", label: "Amount", align: "right", render: (row) => money(Number(row.amount || 0)), value: (row) => Number(row.amount || 0) }]} /></PageSection>
    </div> : null}
    {tab === "documents" ? <DocumentsPanel projectId={projectId} /> : null}
    {tab === "tasks" ? <PageSection title="Tasks linked to this project" actions={<Button size="sm" onClick={() => navigate("tasks")}>Open task planner</Button>}>
      {projectTasks.length ? <ul className="ov-list">{projectTasks.map((task) => <li key={task._id}><button type="button" onClick={() => navigate("tasks", { kind: "task", id: task._id })}><Badge tone={task.status === "done" ? "success" : task.priority === "urgent" ? "danger" : "neutral"}>{task.status === "done" ? "Done" : task.priority}</Badge><span className="ov-list-main">{task.title}</span><span className="ov-list-meta">{task.dueAt ? dateLabel(task.dueAt) : "No date"}</span></button></li>)}</ul> : <EmptyState icon="calendar" title="No tasks linked">In the task planner, link a task to this project to see it here.</EmptyState>}
    </PageSection> : null}
  </div>;
}
