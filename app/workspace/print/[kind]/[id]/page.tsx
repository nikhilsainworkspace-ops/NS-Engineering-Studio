import type { Metadata } from "next";
import PrintButton from "@/modules/civil-at-hand/components/print-button";
import { todayKey } from "@/modules/civil-at-hand/lib/api-helpers";
import { rupeesInWords } from "@/modules/civil-at-hand/lib/amount-words";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { estimateStatuses, labelOf, purchaseOrderStatuses, siteReportStatuses } from "@/modules/civil-at-hand/lib/entities";
import { computeEstimate, revisionLabel, type EstimateInput } from "@/modules/civil-at-hand/lib/estimates";
import { invoiceTotals, paidAmount, paymentStatus, paymentStatusLabels, type InvoiceLine, type PaymentEntry } from "@/modules/civil-at-hand/lib/finance";
import { purchaseOrderTotals, type PoLine } from "@/modules/civil-at-hand/lib/inventory";
import { getSettings } from "@/modules/civil-at-hand/lib/server-settings";
import { formatMoney, type BusinessSettings } from "@/modules/civil-at-hand/lib/settings";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { SiteReport } from "@/modules/civil-at-hand/models/SiteReport";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Print", robots: { index: false, follow: false } };

type Props = { params: Promise<{ kind: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
type Row = Record<string, unknown>;

function dateText(value: unknown, timezone: string) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: /T00:00:00/.test(date.toISOString()) ? "UTC" : timezone });
}
const s = (value: unknown) => (value === null || value === undefined ? "" : String(value));

function Letterhead({ settings, title, number, meta }: { settings: BusinessSettings; title: string; number?: string; meta: [string, string][] }) {
  const logo = settings.logoUrl || brand.logoUrl;
  const name = settings.businessName || brand.name;
  return <header className="doc-head">
    <div className="doc-from">
      {logo ? <img src={logo} alt="" className="doc-logo" /> : null}
      <div>
        <strong>{settings.legalName || name}</strong>
        {settings.address || settings.city ? <span>{[settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ")}</span> : null}
        {settings.phone || settings.email ? <span>{[settings.phone, settings.email].filter(Boolean).join(" · ")}</span> : null}
        {settings.gstin ? <span>GSTIN: {settings.gstin}{settings.pan ? ` · PAN: ${settings.pan}` : ""}</span> : null}
      </div>
    </div>
    <div className="doc-title">
      <h1>{title}</h1>
      {number ? <p className="doc-number">{number}</p> : null}
      <dl>{meta.filter(([, value]) => value && value !== "—").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
  </header>;
}

function Party({ label, name, lines }: { label: string; name: string; lines: string[] }) {
  return <section className="doc-party"><span>{label}</span><strong>{name || "—"}</strong>{lines.filter(Boolean).map((line, index) => <span key={index}>{line}</span>)}</section>;
}

async function partyLines(contactId: unknown): Promise<string[]> {
  if (!contactId || !/^[a-f\d]{24}$/i.test(String(contactId))) return [];
  const contact = await Contact.findById(String(contactId), { organization: 1, phone: 1, email: 1, city: 1, state: 1, details: 1 }).lean() as Row | null;
  if (!contact) return [];
  const details = (contact.details || {}) as Record<string, string>;
  return [s(contact.organization), [s(contact.city), s(contact.state)].filter(Boolean).join(", "), [s(contact.phone), s(contact.email)].filter(Boolean).join(" · "), details.gstin ? `GSTIN: ${details.gstin}` : ""];
}

async function projectTitle(projectId: unknown): Promise<string> {
  if (!projectId || !/^[a-f\d]{24}$/i.test(String(projectId))) return "";
  const project = await Project.findById(String(projectId), { title: 1 }).lean() as Row | null;
  return s(project?.title);
}

function Unavailable({ message }: { message: string }) {
  return <main className="doc-page doc-unavailable"><h1>Not available</h1><p>{message}</p><p><a href="/">Open {brand.name}</a></p></main>;
}

export default async function PrintPage(props: Props) {
  // Print views show private business records, so they need the same signed-in session as the dashboard.
  if (!(await isAdmin())) return <Unavailable message="Sign in to your workspace in this browser, then open the print view again." />;
  const { kind, id } = await props.params;
  const query = await props.searchParams;
  if (!/^[a-f\d]{24}$/i.test(id)) return <Unavailable message="This document link is not valid." />;
  await dbConnect();
  const settings = await getSettings();
  const money = (value: number) => formatMoney(value, settings.currency, { decimals: true });
  const tz = settings.timezone;

  if (kind === "estimate") {
    const estimate = await Estimate.findById(id).lean() as Row | null;
    if (!estimate) return <Unavailable message="This quotation was not found." />;
    const internal = query.view === "internal";
    const totals = computeEstimate(estimate as unknown as EstimateInput);
    const project = await projectTitle(estimate.projectId);
    const lines = await partyLines(estimate.clientContactId);
    let section = "";
    return <main className="doc-page">
      <div className="doc-toolbar"><PrintButton /><a href={`?view=${internal ? "client" : "internal"}`}>{internal ? "Show client quotation" : "Show internal cost breakdown"}</a></div>
      <Letterhead settings={settings} title={internal ? "Estimate – internal cost sheet" : "Quotation"} number={revisionLabel(s(estimate.number), Number(estimate.version || 1))}
        meta={[["Date", dateText(estimate.issueDate, tz)], ["Valid until", dateText(estimate.validUntil, tz)], ["Status", labelOf(estimateStatuses, s(estimate.status))]]} />
      <div className="doc-parties">
        <Party label="To" name={s(estimate.clientName)} lines={[...lines, s(estimate.clientAddress)]} />
        <Party label="Subject" name={s(estimate.title)} lines={[project ? `Project: ${project}` : "", estimate.siteLocation ? `Site: ${s(estimate.siteLocation)}` : ""]} />
      </div>
      {internal ? <p className="doc-note">Internal document – shows cost build-up and margins. Do not send to the client.</p> : null}
      <table className="doc-table">
        <thead><tr><th>No.</th><th>Description</th><th>Unit</th><th className="num">Qty</th>{internal ? <><th className="num">Material</th><th className="num">Wastage</th><th className="num">Labour</th><th className="num">Equip.</th><th className="num">Other</th><th className="num">Unit cost</th><th className="num">Cost</th></> : null}<th className="num">Rate</th><th className="num">Amount</th></tr></thead>
        <tbody>{totals.items.map((item, index) => {
          const heading = item.section && item.section !== section ? item.section : "";
          if (heading) section = heading;
          return [heading ? <tr className="doc-section" key={`s-${index}`}><td colSpan={internal ? 13 : 6}>{heading}</td></tr> : null,
            <tr key={index}>
              <td>{item.code || index + 1}</td><td className="doc-desc">{item.description}{internal && item.rateSource ? <small>Rate: {item.rateSource}{item.rateDate ? `, ${dateText(item.rateDate, tz)}` : ""}{item.rateOverridden ? " (changed manually)" : ""}</small> : null}</td><td>{item.unit}</td><td className="num">{Number(item.qty || 0).toLocaleString("en-IN")}</td>
              {internal ? <><td className="num">{money(Number(item.materialRate || 0))}</td><td className="num">{Number(item.wastagePct || 0)}%</td><td className="num">{money(Number(item.labourRate || 0))}</td><td className="num">{money(Number(item.equipmentRate || 0))}</td><td className="num">{money(Number(item.otherRate || 0))}</td><td className="num">{money(item.unitCost)}</td><td className="num">{money(item.costAmount)}</td></> : null}
              <td className="num">{money(item.quotedRate)}</td><td className="num">{money(item.amount)}</td>
            </tr>];
        })}</tbody>
      </table>
      <div className="doc-summary">
        {internal ? <dl className="doc-breakdown">
          <div><dt>Material (incl. wastage)</dt><dd>{money(totals.materialCost)}</dd></div><div><dt>Labour</dt><dd>{money(totals.labourCost)}</dd></div>
          <div><dt>Equipment</dt><dd>{money(totals.equipmentCost)}</dd></div><div><dt>Other / transport</dt><dd>{money(totals.otherCost)}</dd></div>
          <div><dt>Direct cost</dt><dd>{money(totals.directCost)}</dd></div>
          <div><dt>Markup factor</dt><dd>(1 + {Number(estimate.overheadPct || 0)}% + {Number(estimate.contingencyPct || 0)}%) × (1 + {Number(estimate.marginPct || 0)}%) = {totals.factor.toFixed(4)}</dd></div>
          <div><dt>Planned profit (before tax)</dt><dd>{money(totals.plannedProfit)}</dd></div>
        </dl> : <div />}
        <dl className="doc-totals">
          <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
          {totals.discount ? <div><dt>Discount</dt><dd>− {money(totals.discount)}</dd></div> : null}
          {totals.discount ? <div><dt>Taxable value</dt><dd>{money(totals.taxable)}</dd></div> : null}
          {Number(estimate.taxPct || 0) ? <div><dt>{s(estimate.taxLabel) || settings.taxLabel} @ {Number(estimate.taxPct)}%</dt><dd>{money(totals.tax)}</dd></div> : null}
          <div className="doc-grand"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
          {settings.currency === "INR" ? <div className="doc-words"><dd>{rupeesInWords(totals.total)}</dd></div> : null}
        </dl>
      </div>
      {estimate.terms ? <section className="doc-terms"><h2>Terms and conditions</h2><p>{s(estimate.terms)}</p></section> : null}
      {internal && estimate.notes ? <section className="doc-terms"><h2>Internal notes</h2><p>{s(estimate.notes)}</p></section> : null}
      <footer className="doc-sign"><span>For {settings.legalName || settings.businessName || brand.name}</span><span className="doc-sign-line">Authorised signatory</span></footer>
    </main>;
  }

  if (kind === "invoice") {
    const invoice = await Invoice.findById(id).lean() as Row | null;
    if (!invoice) return <Unavailable message="This invoice was not found." />;
    const payable = invoice.kind === "payable";
    const totals = invoiceTotals((invoice.items || []) as InvoiceLine[], Number(invoice.retentionAmount || 0));
    const paid = paidAmount((invoice.payments || []) as PaymentEntry[]);
    const status = paymentStatus(invoice as never, todayKey(tz));
    const project = await projectTitle(invoice.projectId);
    const lines = await partyLines(invoice.partyContactId);
    return <main className="doc-page">
      <div className="doc-toolbar"><PrintButton /></div>
      <Letterhead settings={settings} title={payable ? "Supplier bill record" : settings.gstin && totals.tax ? "Tax invoice" : "Invoice"} number={s(invoice.number)}
        meta={[["Date", dateText(invoice.date, tz)], ["Due date", dateText(invoice.dueDate, tz)], ["Their reference", s(invoice.partyReference)], ["Status", paymentStatusLabels[status]]]} />
      <div className="doc-parties">
        <Party label={payable ? "Supplier" : "Bill to"} name={s(invoice.partyName)} lines={lines} />
        <Party label="Project" name={project || "—"} lines={[]} />
      </div>
      <table className="doc-table">
        <thead><tr><th>No.</th><th>Description</th><th>Unit</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th><th className="num">Tax</th></tr></thead>
        <tbody>{totals.lines.map((line, index) => <tr key={index}><td>{index + 1}</td><td className="doc-desc">{line.description}</td><td>{line.unit}</td><td className="num">{Number(line.qty || 0).toLocaleString("en-IN")}</td><td className="num">{money(Number(line.rate || 0))}</td><td className="num">{money(line.amount)}</td><td className="num">{line.taxPct ? `${line.taxPct}% · ${money(line.tax)}` : "—"}</td></tr>)}</tbody>
      </table>
      <div className="doc-summary"><div />
        <dl className="doc-totals">
          <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
          {totals.tax ? <div><dt>{settings.taxLabel}</dt><dd>{money(totals.tax)}</dd></div> : null}
          {totals.retention ? <div><dt>Retention held</dt><dd>− {money(totals.retention)}</dd></div> : null}
          <div className="doc-grand"><dt>{payable ? "Amount payable" : "Amount due"}</dt><dd>{money(totals.total)}</dd></div>
          {paid ? <div><dt>Paid so far</dt><dd>{money(paid)}</dd></div> : null}
          {paid ? <div><dt>Balance</dt><dd>{money(Math.max(0, totals.total - paid))}</dd></div> : null}
          {settings.currency === "INR" ? <div className="doc-words"><dd>{rupeesInWords(totals.total)}</dd></div> : null}
        </dl>
      </div>
      {!payable && settings.bankDetails ? <section className="doc-terms"><h2>Payment details</h2><p>{settings.bankDetails}</p></section> : null}
      {invoice.notes || (!payable && settings.invoiceNotes) ? <section className="doc-terms"><h2>Notes</h2><p>{s(invoice.notes) || settings.invoiceNotes}</p></section> : null}
      {!payable ? <footer className="doc-sign"><span>For {settings.legalName || settings.businessName || brand.name}</span><span className="doc-sign-line">Authorised signatory</span></footer> : null}
    </main>;
  }

  if (kind === "purchase-order") {
    const order = await PurchaseOrder.findById(id).lean() as Row | null;
    if (!order) return <Unavailable message="This purchase order was not found." />;
    const items = (order.items || []) as PoLine[];
    const totals = purchaseOrderTotals(items, Number(order.freight || 0));
    const project = await projectTitle(order.projectId);
    const lines = await partyLines(order.supplierContactId);
    return <main className="doc-page">
      <div className="doc-toolbar"><PrintButton /></div>
      <Letterhead settings={settings} title="Purchase order" number={s(order.number)} meta={[["Order date", dateText(order.orderDate, tz)], ["Delivery by", dateText(order.expectedDate, tz)], ["Status", labelOf(purchaseOrderStatuses, s(order.status))]]} />
      <div className="doc-parties">
        <Party label="Supplier" name={s(order.supplierName)} lines={lines} />
        <Party label="Deliver to" name={order.deliverTo === "project" ? project || "Project site" : "Main store / yard"} lines={[order.deliverTo === "project" ? "" : [settings.address, settings.city].filter(Boolean).join(", ")]} />
      </div>
      <table className="doc-table">
        <thead><tr><th>No.</th><th>Description</th><th>Unit</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Tax</th><th className="num">Amount</th></tr></thead>
        <tbody>{items.map((line, index) => <tr key={index}><td>{index + 1}</td><td className="doc-desc">{line.description}</td><td>{line.unit}</td><td className="num">{Number(line.qty).toLocaleString("en-IN")}</td><td className="num">{money(Number(line.rate || 0))}</td><td className="num">{line.taxPct ? `${line.taxPct}%` : "—"}</td><td className="num">{money(Math.round(line.qty * Number(line.rate || 0) * 100) / 100)}</td></tr>)}</tbody>
      </table>
      <div className="doc-summary"><div />
        <dl className="doc-totals">
          <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
          {totals.tax ? <div><dt>{settings.taxLabel}</dt><dd>{money(totals.tax)}</dd></div> : null}
          {totals.freight ? <div><dt>Freight / delivery</dt><dd>{money(totals.freight)}</dd></div> : null}
          <div className="doc-grand"><dt>Order total</dt><dd>{money(totals.total)}</dd></div>
        </dl>
      </div>
      {order.terms ? <section className="doc-terms"><h2>Terms</h2><p>{s(order.terms)}</p></section> : null}
      <footer className="doc-sign"><span>For {settings.legalName || settings.businessName || brand.name}</span><span className="doc-sign-line">Authorised signatory</span></footer>
    </main>;
  }

  if (kind === "site-report") {
    const report = await SiteReport.findById(id).lean() as Row | null;
    if (!report) return <Unavailable message="This site report was not found." />;
    const project = await projectTitle(report.projectId);
    const quantities = (report.quantities || []) as { description: string; unit: string; qty: number }[];
    const sections: [string, unknown][] = [["Work completed", report.workDone], ["Labour and subcontractors", report.labourNotes], ["Materials received or used", report.materialsUsed], ["Equipment", report.equipment], ["Delays, issues or hindrances", report.issues], ["Safety and quality", report.safetyNotes], ["Plan for the next day", report.nextDayPlan], ["Reviewer note", report.reviewNote]];
    return <main className="doc-page">
      <div className="doc-toolbar"><PrintButton /></div>
      <Letterhead settings={settings} title="Daily site report" number={project} meta={[["Date", dateText(report.date, tz)], ["Weather", s(report.weather)], ["Workers on site", report.labourCount === null || report.labourCount === undefined ? "" : String(report.labourCount)], ["Prepared by", s(report.preparedBy)], ["Status", labelOf(siteReportStatuses, s(report.status))]]} />
      {quantities.length ? <table className="doc-table"><thead><tr><th>Measured work item</th><th>Unit</th><th className="num">Quantity</th></tr></thead><tbody>{quantities.map((row, index) => <tr key={index}><td>{row.description}</td><td>{row.unit}</td><td className="num">{Number(row.qty).toLocaleString("en-IN")}</td></tr>)}</tbody></table> : null}
      {sections.filter(([, value]) => value).map(([title, value]) => <section className="doc-terms" key={title}><h2>{title}</h2><p>{s(value)}</p></section>)}
    </main>;
  }

  return <Unavailable message="This kind of document cannot be printed." />;
}
