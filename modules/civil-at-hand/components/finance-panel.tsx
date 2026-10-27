"use client";

// Client invoices, supplier bills, payments, expenses and project cost summaries. Payment status is
// always derived from recorded payments (lib/finance.ts); nothing is marked paid by hand.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { expenseDef, invoiceDef, labelOf, paymentModes } from "@/modules/civil-at-hand/lib/entities";
import { balanceDue, invoiceTotals, paidAmount, paymentStatus, paymentStatusLabels, type InvoiceLine, type PaymentEntry, type PaymentStatus } from "@/modules/civil-at-hand/lib/finance";
import { projectStatusLabel } from "@/modules/civil-at-hand/lib/projects";
import EntityManager, { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, DetailList, EmptyState, ErrorNote, Loading, Modal, PageSection, projectName, SpecForm, Tabs, todayInput, useConfirm, useResource, useWorkspace, type Tone } from "@/modules/civil-at-hand/components/ui";

type Section = "receivables" | "payables" | "expenses" | "projects";
const tone: Record<PaymentStatus, Tone> = { draft: "neutral", void: "neutral", unpaid: "warning", "partially-paid": "info", paid: "success", overdue: "danger" };

function PaymentForm({ invoice, onSaved, onClose }: { invoice: Row; onSaved: (row: Row) => void; onClose: () => void }) {
  const { notify, money } = useWorkspace();
  const balance = balanceDue(invoice as never);
  const [amount, setAmount] = useState(String(balance));
  const [date, setDate] = useState(todayInput());
  const [mode, setMode] = useState("bank-transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clientRef] = useState(() => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/invoices/${invoice._id}/payments`, { method: "POST", json: { amount: Number(amount), date, mode, reference, note, clientRef } }); notify(invoice.kind === "payable" ? "Payment to supplier recorded." : "Payment received recorded."); onSaved(result.item); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not record the payment."); }
    finally { setBusy(false); }
  }
  return <Modal size="sm" title={invoice.kind === "payable" ? "Record a payment made" : "Record a payment received"} description={`Balance due ${money(balance, false)}`} onClose={onClose}>
    <form className="ui-form" onSubmit={submit}>
      <div className="ui-grid">
        <label className="ui-field"><span className="ui-label">Amount<span className="ui-req">*</span></span><input type="number" step="0.01" min={0.01} max={balance + 0.5} required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label className="ui-field"><span className="ui-label">Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
        <label className="ui-field"><span className="ui-label">Mode</span><select value={mode} onChange={(event) => setMode(event.target.value)}>{paymentModes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="ui-field"><span className="ui-label">Reference / UTR / cheque no.</span><input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} /></label>
        <label className="ui-field ui-span-all"><span className="ui-label">Note</span><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} /></label>
      </div>
      {error ? <p className="ui-form-error" role="alert">{error}</p> : null}
      <div className="ui-form-actions"><Button onClick={onClose}>Cancel</Button><button className="ui-btn ui-btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Record payment"}</button></div>
    </form>
  </Modal>;
}

function InvoiceView({ invoice, onClose, onChanged, onEdit, today }: { invoice: Row; onClose: () => void; onChanged: (row: Row) => void; onEdit: () => void; today: string }) {
  const { money, projects, notify } = useWorkspace();
  const confirm = useConfirm();
  const [paying, setPaying] = useState(false);
  const totals = invoiceTotals((invoice.items || []) as InvoiceLine[], Number(invoice.retentionAmount || 0));
  const payments = (invoice.payments || []) as (PaymentEntry & { _id: string })[];
  const paid = paidAmount(payments);
  const status = paymentStatus(invoice as never, today);
  async function setState(state: "issued" | "void") {
    const answer = await confirm({ title: state === "issued" ? "Issue this document?" : "Void this document?", message: state === "void" ? "A void document stays in the list for your records but no longer counts in any totals." : "Once issued, it counts in receivables or payables and payments can be recorded.", confirmLabel: state === "issued" ? "Issue" : "Void", tone: state === "void" ? "danger" : "primary", input: state === "void" ? { label: "Reason", required: true } : undefined });
    if (!answer.ok) return;
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/invoices/${invoice._id}/state`, { method: "POST", json: { state, reason: answer.text } }); notify(state === "issued" ? "Issued." : "Voided."); onChanged(result.item); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update.", "error"); }
  }
  async function removePayment(payment: PaymentEntry & { _id: string }) {
    const answer = await confirm({ title: "Remove this payment?", message: `${money(payment.amount)} on ${dateLabel(String(payment.date))}. Only do this if it was recorded by mistake. The removal is written to the activity log.`, confirmLabel: "Remove payment" });
    if (!answer.ok) return;
    try { const result = await api<{ item: Row }>(`/api/civil-at-hand/invoices/${invoice._id}/payments/${payment._id}`, { method: "DELETE" }); notify("Payment removed."); onChanged(result.item); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not remove.", "error"); }
  }
  return <Modal size="lg" title={`${invoice.kind === "payable" ? "Supplier bill" : "Client invoice"} ${String(invoice.number)}`} description={String(invoice.partyName || "")} onClose={onClose}
    footer={<>
      <a className="ui-btn ui-btn-ghost" href={`/workspace/print/invoice/${invoice._id}`} target="_blank" rel="noreferrer">Print</a>
      {invoice.state !== "void" && !payments.length ? <Button variant="danger" onClick={() => void setState("void")}>Void</Button> : null}
      {invoice.state !== "void" ? <Button icon="edit" onClick={onEdit}>Edit</Button> : null}
      {invoice.state === "draft" ? <Button variant="primary" onClick={() => void setState("issued")}>Issue</Button> : null}
      {invoice.state === "issued" && status !== "paid" ? <Button variant="primary" icon="wallet" onClick={() => setPaying(true)}>{invoice.kind === "payable" ? "Record payment made" : "Record payment received"}</Button> : null}
    </>}>
    <div className="ui-stack">
      <DetailList items={[["Status", <Badge key="s" tone={tone[status]}>{paymentStatusLabels[status]}</Badge>], ["Project", projectName(projects, String(invoice.projectId))], ["Date", dateLabel(invoice.date as string)], ["Due", dateLabel(invoice.dueDate as string)], ["Their reference", String(invoice.partyReference || "")], ["Void reason", String(invoice.voidReason || "")]]} />
      <div className="ui-table-scroll"><table className="ui-table ui-table-compact"><thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th><th className="num">Tax</th></tr></thead><tbody>{totals.lines.map((line, index) => <tr key={index}><td>{line.description}</td><td className="num">{Number(line.qty || 0).toLocaleString("en-IN")} {line.unit}</td><td className="num">{money(Number(line.rate || 0))}</td><td className="num">{money(line.amount)}</td><td className="num">{line.taxPct ? `${line.taxPct}%` : "—"}</td></tr>)}</tbody></table></div>
      <dl className="fin-totals">
        <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div><div><dt>Tax</dt><dd>{money(totals.tax)}</dd></div>
        {totals.retention ? <div><dt>Retention held</dt><dd>− {money(totals.retention)}</dd></div> : null}
        <div className="fin-strong"><dt>Total due</dt><dd>{money(totals.total)}</dd></div><div><dt>Paid</dt><dd>{money(paid)}</dd></div>
        <div className="fin-strong"><dt>Balance</dt><dd>{money(Math.max(0, totals.total - paid))}</dd></div>
      </dl>
      <PageSection title="Payments">
        {payments.length ? <ul className="ov-list">{payments.map((payment) => <li key={payment._id}><span className="ov-list-main">{dateLabel(String(payment.date))} · {labelOf(paymentModes, String(payment.mode || ""))}{payment.reference ? ` · ${payment.reference}` : ""}</span><span className="ov-list-meta">{money(payment.amount)}</span>{invoice.state !== "void" ? <Button size="sm" variant="quiet" icon="trash" aria-label="Remove payment" onClick={() => void removePayment(payment)} /> : null}</li>)}</ul> : <p className="ui-muted">No payments recorded.</p>}
      </PageSection>
    </div>
    {paying ? <PaymentForm invoice={invoice} onClose={() => setPaying(false)} onSaved={onChanged} /> : null}
  </Modal>;
}

function InvoicesView({ kind, initialFilter = "", projectId = "" }: { kind: "receivable" | "payable"; initialFilter?: string; projectId?: string }) {
  const { money, projects, contacts, notify, settings } = useWorkspace();
  const [filter, setFilter] = useState(initialFilter || "open");
  const { data, loading, error, reload, setData } = useEntityList(`/api/civil-at-hand/invoices?kind=${kind}${projectId ? `&projectId=${projectId}` : ""}`);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const today = todayInput();
  const rows = useMemo(() => data.map((row) => ({ ...row, _status: paymentStatus(row as never, today), _balance: balanceDue(row as never) }) as Row & { _status: PaymentStatus; _balance: number }), [data, today]);
  const shown = rows.filter((row) => filter === "all" ? true : filter === "open" ? ["unpaid", "partially-paid", "overdue", "draft"].includes(row._status) : filter === "overdue" ? row._status === "overdue" : filter === "paid" ? row._status === "paid" : true);
  const openTotal = rows.reduce((sum, row) => sum + row._balance, 0);
  const fields = invoiceDef.fields.map((field) => (field.key === "kind" ? { ...field, hidden: true } : field.key === "purchaseOrderId" && kind === "receivable" ? { ...field, hidden: true } : field));
  async function save(values: Record<string, unknown>) {
    const id = editing?._id as string | undefined;
    const result = await api<{ item: Row }>(id ? `/api/civil-at-hand/invoices/${id}` : "/api/civil-at-hand/invoices", { method: id ? "PUT" : "POST", json: { ...values, kind } });
    setEditing(null); notify(id ? "Saved." : `${kind === "payable" ? "Bill" : "Invoice"} ${result.item.number} created.`); reload(); setViewing(result.item);
  }
  const newDefaults = { kind, date: today, projectId, items: [{ description: "", unit: "", qty: 1, rate: null, taxPct: settings.defaultTaxPct }], state: "issued" };
  return <div className="ui-stack">
    <div className="ui-toolbar-row ui-wrap">
      <Tabs label="Invoice filter" value={filter} onChange={setFilter} items={[{ value: "open", label: "Open" }, { value: "overdue", label: "Overdue", count: rows.filter((row) => row._status === "overdue").length }, { value: "paid", label: "Paid" }, { value: "all", label: "All", count: rows.length }]} />
      <span className="ui-muted">Balance outstanding <strong>{money(openTotal)}</strong></span>
      <Button variant="primary" icon="plus" onClick={() => setEditing(newDefaults)}>{kind === "payable" ? "Record supplier bill" : "New client invoice"}</Button>
    </div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={shown} onRowClick={setViewing} csvName={kind === "payable" ? "supplier-bills" : "client-invoices"} columns={[
      { key: "number", label: "Number", render: (row) => <strong>{String(row.number)}</strong>, value: (row) => String(row.number) },
      { key: "partyName", label: kind === "payable" ? "Supplier" : "Client", value: (row) => String(row.partyName || "") },
      { key: "projectId", label: "Project", hideOnMobile: true, value: (row) => projectName(projects, String(row.projectId)) },
      { key: "date", label: "Date", hideOnMobile: true, render: (row) => dateLabel(row.date as string), value: (row) => String(row.date || "") },
      { key: "dueDate", label: "Due", render: (row) => dateLabel(row.dueDate as string), value: (row) => String(row.dueDate || "9999") },
      { key: "total", label: "Total", align: "right", render: (row) => money(Number(row.total || 0)), value: (row) => Number(row.total || 0) },
      { key: "_balance", label: "Balance", align: "right", render: (row) => <strong>{money(row._balance)}</strong>, value: (row) => row._balance },
      { key: "_status", label: "Status", render: (row) => <Badge tone={tone[row._status]}>{paymentStatusLabels[row._status]}</Badge>, value: (row) => row._status },
    ]} empty={<EmptyState icon={kind === "payable" ? "receipt" : "wallet"} title={kind === "payable" ? "No supplier bills recorded" : "No client invoices yet"} action={<Button variant="primary" icon="plus" onClick={() => setEditing(newDefaults)}>{kind === "payable" ? "Record a bill" : "Create an invoice"}</Button>}>{kind === "payable" ? "Record bills from suppliers and subcontractors, then the payments you make against them." : "Raise invoices or running bills to clients and record each payment received."}</EmptyState>} />}
    {editing ? <Modal size="xl" title={editing._id ? `Edit ${String(editing.number)}` : kind === "payable" ? "Record supplier / subcontractor bill" : "New client invoice"} onClose={() => setEditing(null)}>
      <SpecForm fields={fields} initial={editing} onSubmit={save} onCancel={() => setEditing(null)} submitLabel={editing._id ? "Save changes" : "Save"}
        onFieldChange={(key, value, values) => { if (key === "partyContactId" && value && !values.partyName) { const contact = contacts.find((item) => item._id === value); if (contact) return { ...values, partyName: contact.organization || contact.name }; } }}
        itemSummary={{ items: (lines) => { const totals = invoiceTotals(lines as unknown as InvoiceLine[], Number(editing.retentionAmount || 0)); return <span>Subtotal {money(totals.subtotal)} · tax {money(totals.tax)} · <strong>{money(totals.gross)}</strong></span>; } }} />
    </Modal> : null}
    {viewing ? <InvoiceView invoice={viewing} today={today} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} onChanged={(row) => { setViewing(row); setData((current) => current.map((item) => (item._id === row._id ? row : item))); }} /> : null}
  </div>;
}

type CostRow = Row & { title: string; status: string; clientName: string; billed: number; received: number; toCollect: number; actualCost: number; budget: number; budgetUsedPct: number | null; overBudget: boolean; billsCost: number; expenseCost: number; labourCost: number; marginOnBilled: number; contractValue: number; revenueSource: string; committedPurchases: number };
function ProjectCosts() {
  const { money, navigate } = useWorkspace();
  const { data, loading, error, reload } = useResource<CostRow[]>("/api/civil-at-hand/finance/project-costs", (raw) => (raw.items as CostRow[]) || [], []);
  const rows = data.filter((row) => row.actualCost || row.billed || row.budget || row.contractValue);
  return <PageSection title="Project cost summary" description="Cost = issued supplier bills + expenses + labour earned from attendance. Purchase orders are shown separately as commitments and are not added to cost. Revenue comes from issued client invoices, or from the billed/received figures on the project if it has no invoices.">
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={rows} csvName="project-costs" onRowClick={(row) => navigate("project", { kind: "project", id: row._id })} columns={[
      { key: "title", label: "Project", render: (row) => <><strong>{row.title}</strong><small className="ui-muted">{projectStatusLabel(row.status)}{row.revenueSource === "project-record" && row.billed ? " · billing from project record" : ""}</small></>, value: (row) => row.title },
      { key: "contractValue", label: "Contract value", align: "right", hideOnMobile: true, render: (row) => money(row.contractValue, true), value: (row) => row.contractValue },
      { key: "budget", label: "Budget", align: "right", render: (row) => (row.budget ? money(row.budget, true) : "—"), value: (row) => row.budget },
      { key: "actualCost", label: "Actual cost", align: "right", render: (row) => <span className={row.overBudget ? "ui-text-danger" : ""} title={`Bills ${money(row.billsCost)} · expenses ${money(row.expenseCost)} · labour ${money(row.labourCost)}`}>{money(row.actualCost, true)}{row.budgetUsedPct !== null ? <small className="ui-muted">{row.budgetUsedPct}% of budget</small> : null}</span>, value: (row) => row.actualCost },
      { key: "committedPurchases", label: "On order", align: "right", hideOnMobile: true, render: (row) => money(row.committedPurchases, true), value: (row) => row.committedPurchases },
      { key: "billed", label: "Billed", align: "right", render: (row) => money(row.billed, true), value: (row) => row.billed },
      { key: "toCollect", label: "To collect", align: "right", render: (row) => money(row.toCollect, true), value: (row) => row.toCollect },
      { key: "marginOnBilled", label: "Billed − cost", align: "right", render: (row) => <span className={row.marginOnBilled < 0 ? "ui-text-danger" : ""}>{money(row.marginOnBilled, true)}</span>, value: (row) => row.marginOnBilled },
    ]} empty={<EmptyState icon="chart" title="No project costs recorded yet">Record bills, expenses and attendance against projects to see budget against actual.</EmptyState>} />}
  </PageSection>;
}

export default function FinancePanel({ initialSection = "", initialFilter = "", openNewExpense = false, onOpenHandled }: { initialSection?: string; initialFilter?: string; openNewExpense?: boolean; onOpenHandled?: () => void }) {
  const { money, projects } = useWorkspace();
  const pick = (value: string): Section => (["receivables", "payables", "expenses", "projects"].includes(value) ? value as Section : "receivables");
  const [section, setSection] = useState<Section>(initialFilter === "payables" ? "payables" : openNewExpense ? "expenses" : pick(initialSection));
  const [expenseKey, setExpenseKey] = useState(0);
  useEffect(() => { if (openNewExpense) { setSection("expenses"); setExpenseKey((value) => value + 1); onOpenHandled?.(); } }, [openNewExpense, onOpenHandled]);
  return <div className="ui-stack">
    <Tabs<Section> label="Finance sections" value={section} onChange={setSection} items={[{ value: "receivables", label: "Client invoices" }, { value: "payables", label: "Supplier bills" }, { value: "expenses", label: "Expenses" }, { value: "projects", label: "Project costs" }]} />
    {section === "receivables" ? <InvoicesView key="r" kind="receivable" initialFilter={initialFilter === "overdue-receivables" ? "overdue" : ""} /> : null}
    {section === "payables" ? <InvoicesView key="p" kind="payable" /> : null}
    {section === "expenses" ? <EntityManager key={expenseKey} def={expenseDef} path="/api/civil-at-hand/expenses" csvName="expenses" addLabel="Record expense" emptyTitle="No expenses recorded" emptyIcon="receipt" defaults={{ date: todayInput(), mode: "cash" }}
      emptyText="Petty cash, fuel, equipment hire, site and office expenses. Link them to a project to include them in project cost."
      columns={[
        { key: "date", label: "Date", render: (row) => dateLabel(row.date as string), value: (row) => String(row.date || "") },
        { key: "category", label: "Category", value: (row) => String(row.category || "") },
        { key: "description", label: "Description", value: (row) => String(row.description || "") },
        { key: "projectId", label: "Project", hideOnMobile: true, value: (row) => projectName(projects, String(row.projectId)) || "General" },
        { key: "paidTo", label: "Paid to", hideOnMobile: true, value: (row) => String(row.paidTo || "") },
        { key: "amount", label: "Amount", align: "right", render: (row) => money(Number(row.amount || 0)), value: (row) => Number(row.amount || 0) },
      ]} /> : null}
    {section === "projects" ? <ProjectCosts /> : null}
  </div>;
}

export { InvoicesView };
