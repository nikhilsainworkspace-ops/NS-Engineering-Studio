"use client";

// Workers, daily muster, wage sheets and payments. Workers are records, not login accounts.
import { useEffect, useMemo, useState } from "react";
import { attendanceStatuses, labelOf, workerDef, workerTxnDef, workerTxnTypes } from "@/modules/civil-at-hand/lib/entities";
import { deliveryStatuses } from "@/modules/civil-at-hand/lib/projects";
import { wageSheet, type AttendanceLite, type WorkerLite, type WorkerTxnLite } from "@/modules/civil-at-hand/lib/workforce";
import EntityManager, { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, EmptyState, ErrorNote, Loading, Modal, PageSection, projectName, SpecForm, Tabs, todayInput, useResource, useWorkspace, type Option } from "@/modules/civil-at-hand/components/ui";

type Section = "workers" | "attendance" | "wages" | "payments";
type Mark = { status: string; otHours: string; note: string };

function monthStart(day: string) { return `${day.slice(0, 7)}-01`; }

function Muster({ workers, defaultProjectId = "" }: { workers: Row[]; defaultProjectId?: string }) {
  const { projects, notify } = useWorkspace();
  const [date, setDate] = useState(todayInput());
  // Default to the first project in delivery so labour cost lands on a site unless the owner chooses otherwise.
  const [projectId, setProjectId] = useState(() => defaultProjectId || projects.find((project) => deliveryStatuses.includes(project.status))?._id || "");
  const [showAll, setShowAll] = useState(!defaultProjectId);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [busy, setBusy] = useState(false);
  const { data: existing, loading, error, reload } = useResource<Row[]>(`/api/civil-at-hand/attendance?from=${date}&to=${date}`, (raw) => (raw.items as Row[]) || [], []);
  useEffect(() => {
    const next: Record<string, Mark> = {};
    for (const row of existing) next[String(row.workerId)] = { status: String(row.status), otHours: row.otHours ? String(row.otHours) : "", note: String(row.note || "") };
    setMarks(next);
  }, [existing]);
  const active = workers.filter((worker) => worker.status !== "inactive");
  const shown = active.filter((worker) => showAll || !projectId || worker.projectId === projectId || marks[worker._id]);
  const elsewhere = new Map(existing.filter((row) => projectId && row.projectId && row.projectId !== projectId).map((row) => [String(row.workerId), String(row.projectId)]));
  const set = (workerId: string, patch: Partial<Mark>) => setMarks((current) => ({ ...current, [workerId]: { ...(current[workerId] || { status: "", otHours: "", note: "" }), ...patch } }));
  const present = Object.values(marks).filter((mark) => mark.status === "present").length + Object.values(marks).filter((mark) => mark.status === "half-day").length / 2;

  async function save() {
    setBusy(true);
    try {
      const entries = shown.filter((worker) => !elsewhere.has(worker._id)).map((worker) => ({ workerId: worker._id, status: marks[worker._id]?.status || "", otHours: marks[worker._id]?.otHours || 0, note: marks[worker._id]?.note || "" }))
        .filter((entry) => entry.status || existing.some((row) => row.workerId === entry.workerId));
      if (!entries.length) { notify("Mark at least one worker first.", "info"); return; }
      const result = await api<{ saved: number; cleared: number }>("/api/civil-at-hand/attendance/bulk", { method: "POST", json: { date, projectId, entries } });
      notify(`Attendance saved for ${dateLabel(`${date}T00:00:00Z`)} (${result.saved} marked${result.cleared ? `, ${result.cleared} cleared` : ""}).`); reload();
    } catch (err) { notify(err instanceof Error ? err.message : "Could not save attendance.", "error"); }
    finally { setBusy(false); }
  }
  return <PageSection title="Daily muster" description="Mark each worker once per day. Overtime is in hours. Saving again updates the same day — it never creates duplicates.">
    <div className="ui-toolbar-row ui-wrap">
      <label className="ui-field ui-inline"><span className="ui-label">Date</span><input type="date" value={date} max={todayInput()} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="ui-field ui-inline"><span className="ui-label">Site</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Not linked to a project</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.title}</option>)}</select></label>
      {projectId ? <label className="ui-check"><input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} /><span>Show all active workers</span></label> : null}
      <span className="ui-muted">{present} present</span>
      <Button size="sm" onClick={() => shown.forEach((worker) => { if (!marks[worker._id]?.status && !elsewhere.has(worker._id)) set(worker._id, { status: "present" }); })}>Mark unmarked as present</Button>
    </div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading ? <Loading /> : shown.length ? <div className="ui-table-scroll"><table className="ui-table wf-muster">
      <thead><tr><th>Worker</th><th>Attendance</th><th className="num">OT hours</th><th className="hide-sm">Note</th></tr></thead>
      <tbody>{shown.map((worker) => {
        const mark = marks[worker._id] || { status: "", otHours: "", note: "" };
        const other = elsewhere.get(worker._id);
        return <tr key={worker._id}>
          <td><strong>{String(worker.name)}</strong><small className="ui-muted">{[worker.trade, projectName(projects, String(worker.projectId))].filter(Boolean).join(" · ")}</small></td>
          <td>{other ? <span className="ui-muted">Marked at {projectName(projects, other) || "another site"}</span> : <div className="wf-marks" role="radiogroup" aria-label={`Attendance for ${worker.name}`}>
            {attendanceStatuses.map((option) => <button type="button" role="radio" key={option.value} aria-checked={mark.status === option.value} className={`wf-mark wf-${option.value} ${mark.status === option.value ? "is-on" : ""}`} onClick={() => set(worker._id, { status: mark.status === option.value ? "" : option.value })}>{option.value === "present" ? "P" : option.value === "half-day" ? "½" : option.value === "absent" ? "A" : "L"}<span className="sr-only"> {option.label}</span></button>)}
          </div>}</td>
          <td className="num"><input type="number" min={0} max={16} step="0.5" aria-label={`Overtime hours for ${worker.name}`} className="wf-ot" disabled={Boolean(other) || !["present", "half-day"].includes(mark.status)} value={mark.otHours} onChange={(event) => set(worker._id, { otHours: event.target.value })} /></td>
          <td className="hide-sm"><input aria-label={`Note for ${worker.name}`} value={mark.note} disabled={Boolean(other)} maxLength={200} onChange={(event) => set(worker._id, { note: event.target.value })} /></td>
        </tr>;
      })}</tbody>
    </table></div> : <EmptyState icon="helmet" title={active.length ? "No workers assigned to this site" : "Add workers first"}>{active.length ? "Tick “Show all active workers” or assign workers to this project." : "Register workers in the Workers tab, then mark attendance here."}</EmptyState>}
    <div className="ui-form-actions"><Button variant="primary" onClick={() => void save()} disabled={busy || !shown.length}>{busy ? "Saving…" : "Save attendance"}</Button></div>
  </PageSection>;
}

function WageSheet({ workers }: { workers: Row[] }) {
  const { projects, money, notify } = useWorkspace();
  const [from, setFrom] = useState(monthStart(todayInput()));
  const [to, setTo] = useState(todayInput());
  const [projectId, setProjectId] = useState("");
  const [paying, setPaying] = useState<{ workerId: string; amount: number } | null>(null);
  const attendance = useResource<Row[]>(`/api/civil-at-hand/attendance?from=${from}&to=${to}`, (raw) => (raw.items as Row[]) || [], []);
  const txns = useEntityList("/api/civil-at-hand/worker-transactions");
  const rows = useMemo(() => wageSheet(workers as unknown as WorkerLite[], attendance.data as unknown as AttendanceLite[], txns.data as unknown as WorkerTxnLite[], from, to, projectId).map((row) => ({ ...row, _id: row.workerId })), [workers, attendance.data, txns.data, from, to, projectId]);
  const totals = rows.reduce((acc, row) => ({ earned: acc.earned + row.earned, net: acc.net + row.netPayable, paid: acc.paid + row.paid, balance: acc.balance + row.balance }), { earned: 0, net: 0, paid: 0, balance: 0 });
  const workerOptions: Option[] = workers.map((worker) => ({ value: worker._id, label: String(worker.name), hint: String(worker.trade || "") }));
  return <PageSection title="Wage sheet" description="Paid days = present + ½ × half days. Basic = paid days × day rate (monthly salary ÷ 30 for salaried staff). Net payable = basic + overtime + bonus − advances − deductions. Balance = net payable − wage payments recorded in this period.">
    <div className="ui-toolbar-row ui-wrap">
      <label className="ui-field ui-inline"><span className="ui-label">From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="ui-field ui-inline"><span className="ui-label">To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <label className="ui-field ui-inline"><span className="ui-label">Project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">All sites</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.title}</option>)}</select></label>
    </div>
    {attendance.error ? <ErrorNote message={attendance.error} /> : null}
    {attendance.loading || txns.loading ? <Loading /> : <DataTable rows={rows} csvName={`wage-sheet-${from}-to-${to}`} searchPlaceholder="Search workers…" columns={[
      { key: "name", label: "Worker", render: (row) => <><strong>{row.name}</strong><small className="ui-muted">{row.trade}</small></>, value: (row) => row.name },
      { key: "paidDays", label: "Paid days", align: "right", value: (row) => row.paidDays, render: (row) => <span title={`${row.presentDays} present, ${row.halfDays} half, ${row.absentDays} absent/leave`}>{row.paidDays}</span> },
      { key: "otHours", label: "OT hrs", align: "right", hideOnMobile: true, value: (row) => row.otHours },
      { key: "dayRate", label: "Day rate", align: "right", hideOnMobile: true, render: (row) => money(row.dayRate), value: (row) => row.dayRate },
      { key: "earned", label: "Earned", align: "right", render: (row) => money(row.earned), value: (row) => row.earned },
      { key: "advances", label: "Advances + deductions", align: "right", hideOnMobile: true, render: (row) => money(row.advances + row.deductions), value: (row) => row.advances + row.deductions },
      { key: "netPayable", label: "Net payable", align: "right", render: (row) => money(row.netPayable), value: (row) => row.netPayable },
      { key: "paid", label: "Paid", align: "right", hideOnMobile: true, render: (row) => money(row.paid), value: (row) => row.paid },
      { key: "balance", label: "Balance", align: "right", render: (row) => <strong className={row.balance < 0 ? "ui-text-danger" : ""}>{money(row.balance)}</strong>, value: (row) => row.balance },
    ]} rowActions={(row) => row.balance > 0 ? <Button size="sm" variant="ghost" onClick={() => setPaying({ workerId: row.workerId, amount: row.balance })}>Record payment</Button> : null}
      empty={<EmptyState icon="wallet" title="No attendance in this period">Mark attendance in the Daily muster tab to build a wage sheet.</EmptyState>} />}
    {rows.length ? <p className="wf-total">Period totals · earned {money(totals.earned)} · net payable {money(totals.net)} · paid {money(totals.paid)} · <strong>balance {money(totals.balance)}</strong></p> : null}
    <p className="ui-footnote">This is a working wage calculation, not a statutory payroll. It does not compute PF, ESI, TDS or other deductions unless you record them as deductions.</p>
    {paying ? <Modal title="Record wage payment" onClose={() => setPaying(null)}>
      <SpecForm fields={workerTxnDef.fields} refs={{ worker: workerOptions }} initial={{ workerId: paying.workerId, type: "payment", amount: paying.amount, date: todayInput(), projectId, mode: "cash", note: `Wages ${from} to ${to}` }}
        onSubmit={async (values) => { await api("/api/civil-at-hand/worker-transactions", { method: "POST", json: values }); notify("Payment recorded."); setPaying(null); txns.reload(); }} onCancel={() => setPaying(null)} submitLabel="Record payment" />
    </Modal> : null}
  </PageSection>;
}

export default function WorkforcePanel({ initialSection = "", projectId = "" }: { initialSection?: string; projectId?: string }) {
  const { projects, money } = useWorkspace();
  const [section, setSection] = useState<Section>((["workers", "attendance", "wages", "payments"].includes(initialSection) ? initialSection : "attendance") as Section);
  const workers = useEntityList("/api/civil-at-hand/workers");
  const workerOptions: Option[] = useMemo(() => workers.data.map((worker) => ({ value: worker._id, label: String(worker.name), hint: String(worker.trade || "") })), [workers.data]);
  const workerName = (id: unknown) => String(workers.data.find((worker) => worker._id === id)?.name || "—");
  return <div className="ui-stack">
    {!projectId ? <Tabs<Section> label="Workforce sections" value={section} onChange={setSection} items={[{ value: "attendance", label: "Daily muster" }, { value: "wages", label: "Wage sheet" }, { value: "workers", label: "Workers", count: workers.data.filter((worker) => worker.status !== "inactive").length }, { value: "payments", label: "Payments & advances" }]} /> : null}
    {workers.error ? <ErrorNote message={workers.error} onRetry={workers.reload} /> : null}
    {section === "attendance" ? (workers.loading && !workers.data.length ? <Loading /> : <Muster workers={workers.data} defaultProjectId={projectId} />) : null}
    {section === "wages" ? <WageSheet workers={workers.data} /> : null}
    {section === "workers" ? <EntityManager def={workerDef} path="/api/civil-at-hand/workers" csvName="workers" addLabel="Add worker" emptyTitle="No workers yet" emptyIcon="helmet" afterSave={() => workers.reload()}
      emptyText="Register site workers with their trade, wage and current project. Only the last four characters of an ID are stored."
      layout={[{ title: "Worker", keys: ["name", "trade", "skillLevel", "phone", "labourSupplierId", "projectId", "status", "joinDate"] }, { title: "Pay", keys: ["wageType", "dailyWage", "monthlySalary", "otRate"] }, { title: "Identity and safety", keys: ["idType", "idLast4", "safetyTrainingExpiry", "emergencyContact", "notes"] }]}
      deletable={false}
      columns={[
        { key: "name", label: "Name", render: (row) => <><strong>{String(row.name)}</strong>{row.status === "inactive" ? <Badge>Inactive</Badge> : null}</>, value: (row) => String(row.name) },
        { key: "trade", label: "Trade", value: (row) => String(row.trade || "") },
        { key: "projectId", label: "Current project", hideOnMobile: true, value: (row) => projectName(projects, String(row.projectId)) },
        { key: "wage", label: "Pay", align: "right", value: (row) => Number(row.wageType === "monthly" ? row.monthlySalary : row.dailyWage) || 0, render: (row) => row.wageType === "monthly" ? `${money(Number(row.monthlySalary || 0))}/month` : `${money(Number(row.dailyWage || 0))}/day` },
        { key: "phone", label: "Phone", hideOnMobile: true, render: (row) => row.phone ? <a href={`tel:${String(row.phone)}`}>{String(row.phone)}</a> : "—", value: (row) => String(row.phone || "") },
        { key: "safetyTrainingExpiry", label: "Permit expiry", hideOnMobile: true, render: (row) => dateLabel(row.safetyTrainingExpiry as string), value: (row) => String(row.safetyTrainingExpiry || "") },
      ]} /> : null}
    {section === "payments" ? <EntityManager def={workerTxnDef} path="/api/civil-at-hand/worker-transactions" csvName="worker-payments" addLabel="Record payment or advance" emptyTitle="No payments recorded" emptyIcon="wallet" refs={{ worker: workerOptions }} defaults={{ date: todayInput(), type: "advance", mode: "cash" }}
      emptyText="Record advances, wage payments, deductions and bonuses. They are used by the wage sheet."
      columns={[
        { key: "date", label: "Date", render: (row) => dateLabel(row.date as string), value: (row) => String(row.date || "") },
        { key: "workerId", label: "Worker", value: (row) => workerName(row.workerId) },
        { key: "type", label: "Type", render: (row) => <Badge tone={row.type === "advance" ? "warning" : row.type === "payment" ? "success" : "neutral"}>{labelOf(workerTxnTypes, String(row.type))}</Badge>, value: (row) => String(row.type) },
        { key: "amount", label: "Amount", align: "right", render: (row) => money(Number(row.amount || 0)), value: (row) => Number(row.amount || 0) },
        { key: "note", label: "Note", hideOnMobile: true, value: (row) => String(row.note || "") },
      ]} /> : null}
  </div>;
}
