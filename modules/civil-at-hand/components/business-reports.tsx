"use client";

import { useState, type ReactNode } from "react";
import { estimateStatuses, labelOf, tenderStatuses, attendanceStatuses } from "@/modules/civil-at-hand/lib/entities";
import { Button, downloadText, ErrorNote, Loading, PageSection, projectName, todayInput, useResource, useWorkspace } from "@/modules/civil-at-hand/components/ui";
import { escapeCsv } from "@/modules/civil-at-hand/lib/csv";

type Group = { key: string; count: number; amount: number };
type Aging = Record<"current" | "1-30" | "31-60" | "61-90" | "90+", { count: number; amount: number }>;
type Report = {
  from: string; to: string; expensesByCategory: Group[]; purchasesBySupplier: Group[]; receivablesAging: Aging; payablesAging: Aging; quotations: Group[]; tenders: Group[];
  attendance: { projectId: string; status: string; count: number; otHours: number }[]; siteReports: { projectId: string; status: string; count: number }[];
  stock: { materialId: string; name: string; unit: string; qty: number; averageRate: number | null; value: number | null }[]; stockValue: number; notes: string[];
};

function csv(name: string, header: string[], rows: (string | number)[][]) {
  downloadText(`${name}-${todayInput()}.csv`, [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n"), "text/csv");
}

function Card({ title, children, onExport }: { title: string; children: ReactNode; onExport?: () => void }) {
  return <PageSection title={title} actions={onExport ? <Button size="sm" variant="ghost" icon="download" onClick={onExport}>CSV</Button> : null}>{children}</PageSection>;
}

export default function BusinessReports() {
  const { money, projects } = useWorkspace();
  const year = todayInput().slice(0, 4);
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(todayInput());
  const { data, loading, error, reload } = useResource<Report | null>(`/api/civil-at-hand/reports/business?from=${from}&to=${to}`, (raw) => raw as unknown as Report, null);
  const groupTable = (rows: Group[], label: (key: string) => string, amountLabel = "Amount") => rows.length ? <table className="ui-table ui-table-compact"><thead><tr><th>{" "}</th><th className="num">Count</th><th className="num">{amountLabel}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key}><td>{label(row.key)}</td><td className="num">{row.count}</td><td className="num">{money(row.amount)}</td></tr>)}</tbody></table> : <p className="ui-muted">No records in this period.</p>;
  const agingTable = (aging: Aging) => <table className="ui-table ui-table-compact"><thead><tr><th>Overdue by</th><th className="num">Documents</th><th className="num">Balance</th></tr></thead><tbody>{(Object.keys(aging) as (keyof Aging)[]).map((bucket) => <tr key={bucket}><td>{bucket === "current" ? "Not yet due" : `${bucket} days`}</td><td className="num">{aging[bucket].count}</td><td className="num">{money(aging[bucket].amount)}</td></tr>)}</tbody></table>;
  const attendanceByProject = data ? Array.from(data.attendance.reduce((map, row) => { const item = map.get(row.projectId) || { present: 0, half: 0, absent: 0, ot: 0 }; if (row.status === "present") item.present += row.count; else if (row.status === "half-day") item.half += row.count; else item.absent += row.count; item.ot += row.otHours; map.set(row.projectId, item); return map; }, new Map<string, { present: number; half: number; absent: number; ot: number }>())) : [];
  return <div className="ui-stack br">
    <div className="ui-subhead"><div><h2>Business reports</h2><p>Construction, purchasing, workforce and finance figures for a date range. Every figure is a plain total of your stored records.</p></div>
      <div className="ui-toolbar-row ui-wrap"><label className="ui-field ui-inline"><span className="ui-label">From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="ui-field ui-inline"><span className="ui-label">To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
    </div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data ? <Loading /> : data ? <div className="br-grid">
      <Card title="Money owed to you (ageing)" onExport={() => csv("receivables-ageing", ["Bucket", "Documents", "Balance"], Object.entries(data.receivablesAging).map(([key, value]) => [key, value.count, value.amount]))}>{agingTable(data.receivablesAging)}</Card>
      <Card title="Money you owe (ageing)" onExport={() => csv("payables-ageing", ["Bucket", "Documents", "Balance"], Object.entries(data.payablesAging).map(([key, value]) => [key, value.count, value.amount]))}>{agingTable(data.payablesAging)}</Card>
      <Card title="Expenses by category" onExport={() => csv("expenses-by-category", ["Category", "Entries", "Amount"], data.expensesByCategory.map((row) => [row.key, row.count, row.amount]))}>{groupTable(data.expensesByCategory, (key) => key)}</Card>
      <Card title="Purchase orders by supplier" onExport={() => csv("purchases-by-supplier", ["Supplier", "Orders", "Value"], data.purchasesBySupplier.map((row) => [row.key, row.count, row.amount]))}>{groupTable(data.purchasesBySupplier, (key) => key, "Order value")}</Card>
      <Card title="Quotations issued" onExport={() => csv("quotations", ["Status", "Versions", "Value"], data.quotations.map((row) => [row.key, row.count, row.amount]))}>{groupTable(data.quotations, (key) => labelOf(estimateStatuses, key), "Value")}</Card>
      <Card title="Tender outcomes" onExport={() => csv("tenders", ["Stage", "Tenders", "Bid value"], data.tenders.map((row) => [row.key, row.count, row.amount]))}>{groupTable(data.tenders, (key) => labelOf(tenderStatuses, key), "Bid value")}</Card>
      <Card title="Labour attendance by site" onExport={() => csv("attendance-by-site", ["Project", "Present", "Half days", "Absent / leave", "OT hours"], attendanceByProject.map(([id, value]) => [projectName(projects, id) || "Not linked", value.present, value.half, value.absent, value.ot]))}>
        {attendanceByProject.length ? <table className="ui-table ui-table-compact"><thead><tr><th>Site</th><th className="num">Present</th><th className="num">Half</th><th className="num">Absent</th><th className="num">OT hrs</th></tr></thead><tbody>{attendanceByProject.map(([id, value]) => <tr key={id}><td>{projectName(projects, id) || "Not linked"}</td><td className="num">{value.present}</td><td className="num">{value.half}</td><td className="num">{value.absent}</td><td className="num">{value.ot}</td></tr>)}</tbody></table> : <p className="ui-muted">No attendance in this period.</p>}
        <p className="ui-footnote">{labelOf(attendanceStatuses, "absent")} includes leave.</p>
      </Card>
      <Card title="Site reports filed">
        {data.siteReports.length ? <table className="ui-table ui-table-compact"><thead><tr><th>Site</th><th>Status</th><th className="num">Reports</th></tr></thead><tbody>{data.siteReports.map((row) => <tr key={`${row.projectId}-${row.status}`}><td>{projectName(projects, row.projectId) || "—"}</td><td>{row.status}</td><td className="num">{row.count}</td></tr>)}</tbody></table> : <p className="ui-muted">No site reports in this period.</p>}
      </Card>
      <Card title={`Stock on hand · ${money(data.stockValue)}`} onExport={() => csv("stock-valuation", ["Material", "Quantity", "Unit", "Average rate", "Value"], data.stock.map((row) => [row.name, row.qty, row.unit, row.averageRate ?? "", row.value ?? ""]))}>
        {data.stock.length ? <table className="ui-table ui-table-compact"><thead><tr><th>Material</th><th className="num">On hand</th><th className="num">Value</th></tr></thead><tbody>{data.stock.slice(0, 15).map((row) => <tr key={row.materialId}><td>{row.name}</td><td className="num">{row.qty.toLocaleString("en-IN")} {row.unit}</td><td className="num">{row.value === null ? "—" : money(row.value)}</td></tr>)}</tbody></table> : <p className="ui-muted">No stock recorded.</p>}
      </Card>
      <section className="br-notes ui-span-all"><h3>How these figures are calculated</h3><ul>{data.notes.map((note) => <li key={note}>{note}</li>)}</ul><p>Use your browser’s print command (Save as PDF) for a printable copy.</p></section>
    </div> : null}
  </div>;
}
