"use client";

import { useMemo } from "react";
import { categoryLabel, contactStatuses } from "@/modules/civil-at-hand/lib/categories";
import { formatINR } from "@/modules/civil-at-hand/lib/format";
import { projectStatusLabel } from "@/modules/civil-at-hand/lib/projects";
import { buildReport, type Count } from "@/modules/civil-at-hand/lib/reports";
import type { ContactRecord, ProjectRecord, RoomRecord, ShareLinkRecord } from "@/modules/civil-at-hand/lib/types";

function Bars({ rows, label, empty = "No data yet." }: { rows: Count[]; label: (key: string) => string; empty?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="rp-empty">{empty}</p>;
  return <div className="rp-bars">{rows.map((row) => <div className="rp-bar-row" key={row.key}><span className="rp-bar-label">{label(row.key)}</span><span className="rp-bar-track"><i style={{ width: `${Math.max(3, Math.round((row.count / max) * 100))}%` }} /></span><b>{row.count}</b></div>)}</div>;
}

export default function ReportsPanel({ contacts, projects, links, rooms = [], duplicateCount }: { contacts: ContactRecord[]; projects: ProjectRecord[]; links: ShareLinkRecord[]; rooms?: RoomRecord[]; duplicateCount: number }) {
  const report = useMemo(() => buildReport(contacts, projects, links, new Date(), rooms), [contacts, projects, links, rooms]);
  const statusLabel = (key: string) => contactStatuses.find((s) => s.value === key)?.label || key;
  const sourceLabel = (key: string) => key === "public-link" ? "Public form link" : key === "import" ? "Imported file" : "Added manually";
  const monthMax = Math.max(1, ...report.addedPerMonth.map((m) => m.count));
  return <div className="rp-view">
    <div className="pr-tiles">
      <article><span>Total contacts</span><strong>{report.totalContacts}</strong><small>{duplicateCount ? `${duplicateCount} possible duplicates` : "No duplicates found"}</small></article>
      <article><span>Open leads</span><strong>{report.openLeads}</strong><small>Pipeline {formatINR(report.pipelineValue)}</small></article>
      <article><span>Projects won</span><strong>{report.wonProjects}</strong><small>Awarded through closed</small></article>
      <article><span>Follow-ups overdue</span><strong>{report.followUpsOverdueContacts + report.followUpsOverdueProjects}</strong><small>{report.followUpsOverdueContacts} contacts · {report.followUpsOverdueProjects} projects</small></article>
    </div>
    <div className="pr-tiles">
      <article><span>Billed to clients</span><strong>{formatINR(report.billedTotal)}</strong><small>Typed on project records</small></article>
      <article><span>Money received</span><strong>{formatINR(report.receivedTotal)}</strong><small>Typed on project records</small></article>
      <article><span>Still to collect</span><strong>{formatINR(report.outstanding)}</strong><small>Project records; invoices are in Finance</small></article>
      <article><span>Data sold</span><strong>{formatINR(report.dataSold)}</strong><small>{report.dataPending ? `${formatINR(report.dataPending)} unpaid · ` : ""}{report.liveRooms} live link(s)</small></article>
    </div>
    <div className="rp-grid">
      <section className="panel rp-card"><h2>Contacts by category</h2><Bars rows={report.byCategory} label={categoryLabel} /></section>
      <section className="panel rp-card"><h2>Contacts by status</h2><Bars rows={report.byStatus} label={statusLabel} /></section>
      <section className="panel rp-card"><h2>Projects and leads by stage</h2>
        <div className="rp-table-wrap"><table className="rp-table"><thead><tr><th>Stage</th><th>Count</th><th>Estimated value</th></tr></thead><tbody>{report.projectRows.map((row) => <tr key={row.status}><td>{projectStatusLabel(row.status)}</td><td>{row.count}</td><td>{formatINR(row.value)}</td></tr>)}</tbody></table></div>
        <p className="rp-note">Won = awarded, planning, active, completed, defects period or closed ({report.wonProjects}). Lost = {report.lostProjects}.</p></section>
      <section className="panel rp-card"><h2>New contacts, last 6 months</h2><div className="rp-months">{report.addedPerMonth.map((m) => <div key={m.key}><span className="rp-month-bar"><i style={{ height: `${Math.round((m.count / monthMax) * 100)}%` }} /></span><b>{m.count}</b><small>{m.label}</small></div>)}</div></section>
      <section className="panel rp-card"><h2>Top states</h2><Bars rows={report.byState} label={(key) => key} empty="Add a state to your contacts to see this." /></section>
      <section className="panel rp-card"><h2>Where contacts came from</h2><Bars rows={report.bySource} label={sourceLabel} />
        {report.linkRows.length ? <><h3 className="rp-sub">Busiest public form links</h3><div className="rp-table-wrap"><table className="rp-table"><tbody>{report.linkRows.map((l) => <tr key={l._id}><td>{l.title}</td><td>{l.submissions} submission{l.submissions === 1 ? "" : "s"}</td></tr>)}</tbody></table></div></> : null}</section>
    </div>
  </div>;
}
