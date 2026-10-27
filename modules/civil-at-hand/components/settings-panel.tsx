"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { currencyOptions, formatMoney, timezoneOptions, type BusinessSettings } from "@/modules/civil-at-hand/lib/settings";
import { Badge, Button, Icon, PageSection, Tabs, useWorkspace } from "@/modules/civil-at-hand/components/ui";

type Health = { database: string; databaseName?: string; message?: string } | null;
type Section = "business" | "documents" | "lists" | "alerts" | "system";

function Field({ label, help, children, wide }: { label: string; help?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`ui-field ${wide ? "ui-span-all" : ""}`}><span className="ui-label">{label}</span>{children}{help ? <small className="ui-help">{help}</small> : null}</label>;
}

export default function SettingsPanel({ health, onTestConnection }: { health: Health; onTestConnection: () => void }) {
  const { settings, saveSettings } = useWorkspace();
  const [section, setSection] = useState<Section>("business");
  const [draft, setDraft] = useState<BusinessSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setDraft(settings); }, [settings]);
  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const listText = (key: "units" | "projectTypes" | "materialCategories" | "expenseCategories" | "trades") => draft[key].join("\n");
  const setList = (key: "units" | "projectTypes" | "materialCategories" | "expenseCategories" | "trades", value: string) => set(key, value.split("\n").map((item) => item.trim()).filter(Boolean) as BusinessSettings[typeof key]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await saveSettings(draft); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save settings."); }
    finally { setBusy(false); }
  }

  return <form className="ui-stack settings-v4" onSubmit={submit}>
    <Tabs<Section> label="Settings sections" value={section} onChange={setSection} items={[
      { value: "business", label: "Business profile" }, { value: "documents", label: "Documents & numbering" },
      { value: "lists", label: "Lists & categories" }, { value: "alerts", label: "Alerts" }, { value: "system", label: "Branding & system" },
    ]} />

    {section === "business" ? <PageSection title="Business profile" description="Printed on quotations, invoices, purchase orders and site reports, and shown on public pages where you add a contact block.">
      <div className="ui-grid">
        <Field label="Business name"><input value={draft.businessName} onChange={(event) => set("businessName", event.target.value)} maxLength={160} placeholder={brand.name} /></Field>
        <Field label="Legal / registered name" help="Used on printed documents if different."><input value={draft.legalName} onChange={(event) => set("legalName", event.target.value)} maxLength={200} /></Field>
        <Field label="Address" wide><textarea rows={2} value={draft.address} onChange={(event) => set("address", event.target.value)} maxLength={500} /></Field>
        <Field label="City"><input value={draft.city} onChange={(event) => set("city", event.target.value)} maxLength={120} /></Field>
        <Field label="State"><input value={draft.state} onChange={(event) => set("state", event.target.value)} maxLength={120} /></Field>
        <Field label="PIN code"><input value={draft.pincode} onChange={(event) => set("pincode", event.target.value)} maxLength={12} inputMode="numeric" /></Field>
        <Field label="Phone"><input value={draft.phone} onChange={(event) => set("phone", event.target.value)} maxLength={60} type="tel" /></Field>
        <Field label="Email"><input value={draft.email} onChange={(event) => set("email", event.target.value)} maxLength={180} type="email" /></Field>
        <Field label="Website"><input value={draft.website} onChange={(event) => set("website", event.target.value)} maxLength={200} placeholder="https://" /></Field>
        <Field label="GSTIN" help="15 characters. Leave blank if not registered."><input value={draft.gstin} onChange={(event) => set("gstin", event.target.value.toUpperCase())} maxLength={15} /></Field>
        <Field label="PAN"><input value={draft.pan} onChange={(event) => set("pan", event.target.value.toUpperCase())} maxLength={10} /></Field>
        <Field label="Logo for printed documents" help="An https:// address or a file in /public such as /civil-at-hand-logo.png. Blank uses the app logo."><input value={draft.logoUrl} onChange={(event) => set("logoUrl", event.target.value)} maxLength={400} placeholder={brand.logoUrl} /></Field>
        <Field label="Currency" help={`Example: ${formatMoney(1250000, draft.currency)}`}><select value={draft.currency} onChange={(event) => set("currency", event.target.value)}>{currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Time zone" help="Used for “today”, due dates and printed dates."><select value={draft.timezone} onChange={(event) => set("timezone", event.target.value)}>{timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select></Field>
      </div>
    </PageSection> : null}

    {section === "documents" ? <PageSection title="Documents and numbering" description="Numbers are issued automatically and restart each calendar year, e.g. QT-2026-0001. Changing a prefix affects new documents only.">
      <div className="ui-grid">
        <Field label="Quotation prefix"><input value={draft.prefixes.quotation} onChange={(event) => set("prefixes", { ...draft.prefixes, quotation: event.target.value.toUpperCase() })} maxLength={12} /></Field>
        <Field label="Client invoice prefix"><input value={draft.prefixes.invoice} onChange={(event) => set("prefixes", { ...draft.prefixes, invoice: event.target.value.toUpperCase() })} maxLength={12} /></Field>
        <Field label="Supplier bill prefix"><input value={draft.prefixes.bill} onChange={(event) => set("prefixes", { ...draft.prefixes, bill: event.target.value.toUpperCase() })} maxLength={12} /></Field>
        <Field label="Purchase order prefix"><input value={draft.prefixes.purchaseOrder} onChange={(event) => set("prefixes", { ...draft.prefixes, purchaseOrder: event.target.value.toUpperCase() })} maxLength={12} /></Field>
        <Field label="Material request prefix"><input value={draft.prefixes.materialRequest} onChange={(event) => set("prefixes", { ...draft.prefixes, materialRequest: event.target.value.toUpperCase() })} maxLength={12} /></Field>
        <Field label="Tax name" help="Shown on documents, e.g. GST or VAT."><input value={draft.taxLabel} onChange={(event) => set("taxLabel", event.target.value)} maxLength={20} /></Field>
        <Field label="Default tax % for new quotations and lines" help="You can change it on every document. This app does not certify tax compliance."><input type="number" min={0} max={100} step="any" value={draft.defaultTaxPct} onChange={(event) => set("defaultTaxPct", Number(event.target.value))} /></Field>
        <Field label="Quotation validity (days)" help="Sets “Valid until” on new quotations. 0 leaves it blank."><input type="number" min={0} max={365} value={draft.quotationValidityDays} onChange={(event) => set("quotationValidityDays", Number(event.target.value))} /></Field>
        <Field label="Default quotation terms" wide><textarea rows={6} value={draft.quotationTerms} onChange={(event) => set("quotationTerms", event.target.value)} maxLength={6000} /></Field>
        <Field label="Note printed on client invoices" wide><textarea rows={2} value={draft.invoiceNotes} onChange={(event) => set("invoiceNotes", event.target.value)} maxLength={3000} /></Field>
        <Field label="Bank details printed on client invoices" wide help="Account name, bank, account number, IFSC, UPI ID."><textarea rows={3} value={draft.bankDetails} onChange={(event) => set("bankDetails", event.target.value)} maxLength={1000} /></Field>
      </div>
    </PageSection> : null}

    {section === "lists" ? <PageSection title="Lists and categories" description="One item per line. These lists feed the dropdowns in projects, BOQ items, materials, expenses and workforce. Existing records keep their values even if you remove an item.">
      <div className="ui-grid">
        <Field label="Units of measurement"><textarea rows={10} value={listText("units")} onChange={(event) => setList("units", event.target.value)} /></Field>
        <Field label="Project / work types"><textarea rows={10} value={listText("projectTypes")} onChange={(event) => setList("projectTypes", event.target.value)} /></Field>
        <Field label="Material categories"><textarea rows={10} value={listText("materialCategories")} onChange={(event) => setList("materialCategories", event.target.value)} /></Field>
        <Field label="Expense categories"><textarea rows={10} value={listText("expenseCategories")} onChange={(event) => setList("expenseCategories", event.target.value)} /></Field>
        <Field label="Worker trades"><textarea rows={10} value={listText("trades")} onChange={(event) => setList("trades", event.target.value)} /></Field>
      </div>
    </PageSection> : null}

    {section === "alerts" ? <PageSection title="Alerts on the overview" description="These control what the owner dashboard flags. Nothing is emailed or sent by text message.">
      <div className="ui-grid">
        <div className="ui-field"><label className="ui-check"><input type="checkbox" checked={draft.lowStockAlerts} onChange={(event) => set("lowStockAlerts", event.target.checked)} /><span>Show materials below their reorder level</span></label></div>
        <Field label="Warn about expiring documents and permits (days ahead)"><input type="number" min={1} max={365} value={draft.documentExpiryWarningDays} onChange={(event) => set("documentExpiryWarningDays", Number(event.target.value))} /></Field>
      </div>
    </PageSection> : null}

    {section === "system" ? <div className="ui-stack">
      <PageSection title="Branding and domain" description="These come from Vercel environment variables. Change them in Vercel → Settings → Environment Variables, then redeploy.">
        <dl className="ui-details settings-env">
          <div><dt>App name <code>NEXT_PUBLIC_APP_NAME</code></dt><dd>{brand.name}</dd></div>
          <div><dt>Tagline <code>NEXT_PUBLIC_APP_TAGLINE</code></dt><dd>{brand.tagline}</dd></div>
          <div><dt>Canonical URL <code>NEXT_PUBLIC_SITE_URL</code></dt><dd>{process.env.NEXT_PUBLIC_SITE_URL || "Detected from the current domain"}</dd></div>
          <div><dt>Brand colour <code>NEXT_PUBLIC_BRAND_COLOR</code></dt><dd><i className="color-swatch" style={{ background: brand.color }} /> {brand.color}</dd></div>
          <div><dt>Logo <code>NEXT_PUBLIC_BRAND_LOGO_URL</code></dt><dd>{brand.logoUrl}</dd></div>
          <div><dt>Favicon <code>NEXT_PUBLIC_FAVICON_URL</code></dt><dd>{brand.faviconUrl}</dd></div>
        </dl>
      </PageSection>
      <PageSection title="Database and access" actions={<Button size="sm" icon="refresh" onClick={onTestConnection}>Test connection</Button>}>
        <div className="settings-health"><span className={`settings-health-dot ${health?.database === "connected" ? "is-ok" : health?.database === "error" ? "is-bad" : ""}`} aria-hidden="true" /><div><strong>{health?.database === "connected" ? "MongoDB connected" : health?.database === "error" ? "Database needs attention" : "Checking…"}</strong><p>{health?.database === "connected" ? `Database: ${health.databaseName || "configured"}` : health?.message || "The connection status will appear here."}</p></div></div>
        <p className="ui-footnote"><Icon name="lock" size={14} /> Server-side secrets (<code>MONGODB_URI</code>, <code>CIVIL_AT_HAND_MONGODB_URI</code>, <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code>, <code>AUTH_SECRET</code>, <code>ADMIN_TOTP_SECRET</code>, <code>GEMINI_API_KEY</code>) are never shown here and must not use the <code>NEXT_PUBLIC_</code> prefix.</p>
      </PageSection>
    </div> : null}

    {section !== "system" ? <div className="settings-savebar">
      {dirty ? <Badge tone="warning">Unsaved changes</Badge> : <span className="ui-muted">All changes saved</span>}
      {error ? <span className="ui-text-danger" role="alert">{error}</span> : null}
      <Button onClick={() => setDraft(settings)} disabled={!dirty || busy}>Discard</Button>
      <button type="submit" className="ui-btn ui-btn-primary" disabled={!dirty || busy}>{busy ? "Saving…" : "Save settings"}</button>
    </div> : null}
  </form>;
}
