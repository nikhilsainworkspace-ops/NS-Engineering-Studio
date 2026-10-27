"use client";

// Owner command centre: decisions first, with every figure linking to the records behind it.
import { useMemo, useState } from "react";
import { projectStatusLabel } from "@/modules/civil-at-hand/lib/projects";
import type { TaskRecord } from "@/modules/civil-at-hand/lib/types";
import { Badge, Button, dateLabel, EmptyState, ErrorNote, Icon, Loading, PageSection, Progress, StatCard, useResource, useWorkspace, type IconName, type Tone } from "@/modules/civil-at-hand/components/ui";

type Overview = {
  today: string; range: string; from: string;
  projects: { total: number; active: number; byStatus: Record<string, number>; overBudget: number; budgets: { _id: string; title: string; status: string; progressPercent: number | null; endDate: string | null; budget: number; actualCost: number; budgetUsedPct: number | null; overBudget: boolean; toCollect: number }[] };
  quotations: { awaitingDecision: number; drafts: number; sentValue: number; list: { _id: string; number: string; version: number; title: string; clientName: string; totals?: { total: number }; sentAt?: string; validUntil?: string }[] };
  receivables: { outstanding: number; overdue: number; overdueCount: number; openCount: number; legacyOutstanding: number; list: { _id: string; number: string; partyName: string; dueDate: string; balance: number }[] };
  payables: { outstanding: number; dueSoon: number; dueSoonCount: number; overdueCount: number; list: { _id: string; number: string; partyName: string; dueDate: string | null; balance: number }[] };
  cash: { received: number; paidOut: number; paidBills: number; expenses: number; wages: number };
  procurement: { pendingApproval: number; toOrder: number; openOrders: number; lowStock: { _id: string; name: string; unit: string; minStock: number; onHand: number }[]; lowStockCount: number; lowStockAlerts: boolean };
  documents: { attention: { _id: string; title: string; category: string; expiryDate: string | null; approvalStatus: string }[]; expiredCount: number; pendingApproval: number; expiringWorkers: { _id: string; name: string; expiry: string }[] };
  tenders: { dueSoon: { _id: string; title: string; authority: string; submissionDeadline: string; status: string }[] };
  site: { reportsAwaitingReview: number; activeWorkers: number; presentToday: number };
  activity: { _id: string; action: string; detail: string; at: string }[];
};

const rangeOptions = [{ value: "month", label: "This month" }, { value: "30d", label: "Last 30 days" }, { value: "fy", label: "This financial year" }];

const actionWords: Record<string, string> = {
  estimates: "Quotation", invoices: "Invoice / bill", expenses: "Expense", materials: "Material", workers: "Worker", tenders: "Tender", documents: "Document",
  "site-reports": "Site report", "material-requests": "Material request", "purchase-orders": "Purchase order", "worker-transactions": "Worker payment",
};
export function describeAction(action: string): string {
  for (const [prefix, word] of Object.entries(actionWords)) {
    if (action.startsWith(`${prefix}-`)) return `${word} ${action.slice(prefix.length + 1).replace(/-/g, " ")}`;
  }
  const text = action.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

type Attention = { key: string; icon: IconName; tone: Tone; count: number; label: string; detail?: string; go: () => void };

export default function OverviewPanel({ tasks, followUpsDue, onNewTask, onNewProject }: { tasks: TaskRecord[]; followUpsDue: number; onNewTask: () => void; onNewProject: () => void }) {
  const { money, navigate, settings } = useWorkspace();
  const [range, setRange] = useState("month");
  const { data, loading, error, reload } = useResource<Overview | null>(`/api/civil-at-hand/overview?range=${range}`, (raw) => raw as unknown as Overview, null);
  const today = data?.today || new Date().toISOString().slice(0, 10);

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done" && task.status !== "cancelled"), [tasks]);
  const overdueTasks = useMemo(() => openTasks.filter((task) => task.dueAt && task.dueAt.slice(0, 10) < today), [openTasks, today]);
  const upcomingTasks = useMemo(() => [...openTasks].sort((a, b) => (a.dueAt || "9999").localeCompare(b.dueAt || "9999")).slice(0, 5), [openTasks]);

  const attention: Attention[] = data ? ([
    { key: "tasks", icon: "calendar", tone: "danger", count: overdueTasks.length, label: "overdue tasks", go: () => navigate("tasks") },
    { key: "followups", icon: "clock", tone: "warning", count: followUpsDue, label: "follow-ups due or overdue", go: () => navigate("followups") },
    { key: "receivables", icon: "wallet", tone: "danger", count: data.receivables.overdueCount, label: "client invoices overdue", detail: money(data.receivables.overdue, true), go: () => navigate("finance", { kind: "filter", id: "", filter: "overdue-receivables" }) },
    { key: "payables", icon: "receipt", tone: "warning", count: data.payables.dueSoonCount, label: "supplier bills due within 14 days", detail: money(data.payables.dueSoon, true), go: () => navigate("finance", { kind: "filter", id: "", filter: "payables" }) },
    { key: "quotes", icon: "calculator", tone: "info", count: data.quotations.awaitingDecision, label: "quotations awaiting client decision", detail: money(data.quotations.sentValue, true), go: () => navigate("estimates", { kind: "filter", id: "", filter: "sent" }) },
    { key: "requests", icon: "box", tone: "warning", count: data.procurement.pendingApproval, label: "material requests to approve", go: () => navigate("procurement", { kind: "filter", id: "", filter: "requests" }) },
    { key: "toorder", icon: "truck", tone: "info", count: data.procurement.toOrder, label: "approved requests to order", go: () => navigate("procurement", { kind: "filter", id: "", filter: "requests" }) },
    { key: "reports", icon: "clipboard", tone: "info", count: data.site.reportsAwaitingReview, label: "site reports waiting for review", go: () => navigate("site", { kind: "filter", id: "", filter: "submitted" }) },
    { key: "stock", icon: "alert", tone: "warning", count: data.procurement.lowStockAlerts ? data.procurement.lowStockCount : 0, label: "materials below reorder level", go: () => navigate("procurement", { kind: "filter", id: "", filter: "stock" }) },
    { key: "docs", icon: "file", tone: "warning", count: data.documents.attention.length, label: "documents expiring or awaiting approval", detail: data.documents.expiredCount ? `${data.documents.expiredCount} expired` : undefined, go: () => navigate("documents", { kind: "filter", id: "", filter: "attention" }) },
    { key: "tenders", icon: "gavel", tone: "info", count: data.tenders.dueSoon.length, label: "tender deadlines in the next 14 days", go: () => navigate("tenders") },
    { key: "budget", icon: "chart", tone: "danger", count: data.projects.overBudget, label: "active projects over budget", go: () => navigate("projects") },
  ] as Attention[]).filter((item) => item.count > 0) : [];

  return <div className="ov">
    <div className="ov-head">
      <div><p className="ui-kicker">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: settings.timezone })}</p><h1>{greeting()}</h1></div>
      <div className="ov-head-actions">
        <Button icon="plus" onClick={onNewProject}>Project</Button>
        <Button icon="calculator" onClick={() => navigate("estimates", { kind: "new", id: "" })}>Quotation</Button>
        <Button icon="clipboard" onClick={() => navigate("site", { kind: "new", id: "" })}>Site report</Button>
        <Button icon="receipt" onClick={() => navigate("finance", { kind: "new-expense", id: "" })}>Expense</Button>
      </div>
    </div>

    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data ? <Loading label="Gathering today’s figures…" /> : null}

    {data ? <>
      <PageSection title="Needs your attention" className="ov-attention" description={attention.length ? undefined : "Nothing is overdue or waiting on you right now."}>
        {attention.length ? <ul className="ov-attention-list">{attention.map((item) => <li key={item.key}>
          <button type="button" onClick={item.go}><span className={`ov-attention-icon ui-tone-${item.tone}`}><Icon name={item.icon} size={16} /></span><span className="ov-attention-count">{item.count}</span><span className="ov-attention-label">{item.label}</span>{item.detail ? <span className="ov-attention-detail">{item.detail}</span> : null}<Icon name="chevron" size={16} /></button>
        </li>)}</ul> : <div className="ov-clear"><Icon name="check" size={18} /><span>You’re up to date.</span></div>}
      </PageSection>

      <div className="ov-stats">
        <StatCard icon="briefcase" tone="info" label="Active projects" value={data.projects.active} detail={`${data.projects.total} projects and leads in total`} onClick={() => navigate("projects")} />
        <StatCard icon="wallet" tone={data.receivables.overdue ? "danger" : "success"} label="To collect from clients" value={money(data.receivables.outstanding + data.receivables.legacyOutstanding, true)} detail={data.receivables.overdue ? `${money(data.receivables.overdue, true)} overdue` : "Nothing overdue"} onClick={() => navigate("finance")} />
        <StatCard icon="receipt" tone="warning" label="To pay suppliers" value={money(data.payables.outstanding, true)} detail={`${money(data.payables.dueSoon, true)} due within 14 days`} onClick={() => navigate("finance", { kind: "filter", id: "", filter: "payables" })} />
        <StatCard icon="helmet" tone="accent" label="On site today" value={`${data.site.presentToday} / ${data.site.activeWorkers}`} detail="Workers marked present / active workers" onClick={() => navigate("workforce")} />
      </div>

      <div className="ov-grid">
        <PageSection title="Active projects" description="Budget used is recorded cost (bills + expenses + labour) against the project budget." actions={<Button size="sm" variant="ghost" onClick={() => navigate("projects")}>All projects</Button>}>
          {data.projects.budgets.length ? <div className="ui-table-scroll"><table className="ui-table ov-budget-table"><thead><tr><th>Project</th><th>Progress</th><th className="num">Budget used</th><th className="num hide-sm">To collect</th></tr></thead><tbody>
            {data.projects.budgets.map((project) => <tr key={project._id} className="is-clickable" onClick={() => navigate("project", { kind: "project", id: project._id })}>
              <td><button type="button" className="ui-row-link" onClick={() => navigate("project", { kind: "project", id: project._id })}><strong>{project.title}</strong></button><small className="ui-muted">{projectStatusLabel(project.status)}{project.endDate ? ` · due ${dateLabel(project.endDate)}` : ""}</small></td>
              <td><div className="ov-progress"><Progress value={project.progressPercent} label={`Progress of ${project.title}`} /><span>{project.progressPercent === null ? "—" : `${project.progressPercent}%`}</span></div></td>
              <td className="num">{project.budget ? <><span className={project.overBudget ? "ui-text-danger" : ""}>{project.budgetUsedPct}%</span><small className="ui-muted">{money(project.actualCost, true)} of {money(project.budget, true)}</small></> : <small className="ui-muted">No budget set</small>}</td>
              <td className="num hide-sm">{money(project.toCollect, true)}</td>
            </tr>)}
          </tbody></table></div> : <EmptyState icon="briefcase" title="No active projects" action={<Button size="sm" variant="primary" icon="plus" onClick={onNewProject}>Add a project</Button>}>Projects in Awarded, Planning, Active, On hold or Defects stages appear here.</EmptyState>}
        </PageSection>

        <div className="ui-stack">
          <PageSection title="Money in and out" actions={<select aria-label="Period" value={range} onChange={(event) => setRange(event.target.value)} className="ui-select-sm">{rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}>
            <dl className="ov-cash">
              <div><dt>Received from clients</dt><dd className="ui-text-success">{money(data.cash.received)}</dd></div>
              <div><dt>Paid out</dt><dd>{money(data.cash.paidOut)}</dd></div>
              <div className="ov-cash-split"><dt>Supplier bills</dt><dd>{money(data.cash.paidBills)}</dd></div>
              <div className="ov-cash-split"><dt>Expenses</dt><dd>{money(data.cash.expenses)}</dd></div>
              <div className="ov-cash-split"><dt>Wages and advances</dt><dd>{money(data.cash.wages)}</dd></div>
            </dl>
            <p className="ui-footnote">Recorded payments dated {dateLabel(`${data.from}T00:00:00Z`)} – today. Not a bank statement.</p>
          </PageSection>

          <PageSection title="Next tasks" actions={<Button size="sm" variant="ghost" onClick={() => navigate("tasks")}>Task planner</Button>}>
            {upcomingTasks.length ? <ul className="ov-list">{upcomingTasks.map((task) => <li key={task._id}><button type="button" onClick={() => navigate("tasks", { kind: "task", id: task._id })}><span className="ov-list-main">{task.title}</span><span className={`ov-list-meta ${task.dueAt && task.dueAt.slice(0, 10) < today ? "ui-text-danger" : ""}`}>{task.dueAt ? dateLabel(task.dueAt) : "No date"}</span></button></li>)}</ul> : <EmptyState icon="calendar" title="No open tasks" action={<Button size="sm" icon="plus" onClick={onNewTask}>Add a task</Button>} />}
          </PageSection>
        </div>
      </div>

      <div className="ov-grid ov-grid-even">
        <PageSection title="Coming up" description="Quotations awaiting decision, tender deadlines and documents to renew.">
          {data.quotations.list.length || data.tenders.dueSoon.length || data.documents.attention.length || data.documents.expiringWorkers.length || data.procurement.lowStock.length ? <ul className="ov-list">
            {data.tenders.dueSoon.map((tender) => <li key={`t-${tender._id}`}><button type="button" onClick={() => navigate("tenders", { kind: "tender", id: tender._id })}><Badge tone={tender.submissionDeadline.slice(0, 10) < today ? "danger" : "info"}>Tender</Badge><span className="ov-list-main">{tender.title}</span><span className="ov-list-meta">{dateLabel(tender.submissionDeadline, true)}</span></button></li>)}
            {data.quotations.list.map((quote) => <li key={`q-${quote._id}`}><button type="button" onClick={() => navigate("estimates", { kind: "estimate", id: quote._id })}><Badge tone="accent">Quotation</Badge><span className="ov-list-main">{quote.title}{quote.clientName ? ` · ${quote.clientName}` : ""}</span><span className="ov-list-meta">{money(quote.totals?.total || 0, true)}</span></button></li>)}
            {data.documents.attention.map((doc) => <li key={`d-${doc._id}`}><button type="button" onClick={() => navigate("documents", { kind: "document", id: doc._id })}><Badge tone={doc.expiryDate && doc.expiryDate.slice(0, 10) < today ? "danger" : "warning"}>{doc.approvalStatus === "pending" ? "Approval" : "Renewal"}</Badge><span className="ov-list-main">{doc.title}</span><span className="ov-list-meta">{doc.expiryDate ? dateLabel(doc.expiryDate) : "Awaiting approval"}</span></button></li>)}
            {data.documents.expiringWorkers.map((worker) => <li key={`w-${worker._id}`}><button type="button" onClick={() => navigate("workforce", { kind: "worker", id: worker._id })}><Badge tone="warning">Safety permit</Badge><span className="ov-list-main">{worker.name}</span><span className="ov-list-meta">{dateLabel(worker.expiry)}</span></button></li>)}
            {data.procurement.lowStock.map((material) => <li key={`m-${material._id}`}><button type="button" onClick={() => navigate("procurement", { kind: "filter", id: "", filter: "stock" })}><Badge tone="warning">Low stock</Badge><span className="ov-list-main">{material.name}</span><span className="ov-list-meta">{material.onHand} / {material.minStock} {material.unit}</span></button></li>)}
          </ul> : <EmptyState icon="calendar" title="Nothing coming up">Deadlines from tenders, quotations and documents will appear here.</EmptyState>}
        </PageSection>

        <PageSection title="Recent activity" actions={<Button size="sm" variant="ghost" onClick={() => navigate("security")}>Full activity log</Button>}>
          {data.activity.length ? <ul className="ov-activity">{data.activity.map((entry) => <li key={entry._id}><span className="ov-activity-dot" aria-hidden="true" /><span className="ov-activity-text"><strong>{describeAction(entry.action)}</strong>{entry.detail ? <small>{entry.detail}</small> : null}</span><time dateTime={entry.at}>{dateLabel(entry.at, true)}</time></li>)}</ul> : <EmptyState icon="clock" title="No activity yet">Changes you make will be listed here.</EmptyState>}
        </PageSection>
      </div>
    </> : null}
  </div>;
}
