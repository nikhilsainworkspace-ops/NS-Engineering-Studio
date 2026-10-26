"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ClipboardList, FileQuestion, LayoutDashboard, LoaderCircle, Pencil, Plus, RefreshCw, Save, Settings2, Trash2, ExternalLink } from "lucide-react";
import type { SiteSettings } from "@/lib/brand";
import { LogoutButton } from "@/components/LogoutButton";

type Tab = "overview" | "leads" | "services" | "faqs" | "settings";
type Lead = { id: string; name: string; email: string; phone: string; subject: string; message: string; status: "new" | "in_progress" | "resolved"; notes: string; createdAt: string; updatedAt: string };
type ServiceRecord = { slug: string; title: string; summary: string; body: string; icon: string; published: boolean; sortOrder: number; isStarter?: boolean; deleted?: boolean };
type FaqRecord = { slug: string; question: string; answer: string; published: boolean; sortOrder: number; isStarter?: boolean; deleted?: boolean };
type Overview = { email: string; stats: { totalLeads: number; newLeads: number; activeLeads: number; totalServices: number; totalFaqs: number }; recentLeads: Array<{ id: string; name: string; subject: string; status: Lead["status"]; createdAt: string }>; recentEvents: Array<{ id: string; action: string; subject: string; actor: "admin" | "system"; createdAt: string }>; configuration: { database: boolean; admin: boolean; emailNotifications: boolean; starterNotice: boolean } };

type Feedback = { message: string; error?: boolean } | null;
const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "leads", label: "Inquiries", icon: ClipboardList },
  { id: "services", label: "Services", icon: Settings2 },
  { id: "faqs", label: "FAQs", icon: FileQuestion },
  { id: "settings", label: "Site settings", icon: Settings2 }
];
const statusLabel: Record<Lead["status"], string> = { new: "New", in_progress: "In progress", resolved: "Resolved" };
const inputString = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString() : "—";

export function AdminDashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState("all");
  const [queryDraft, setQueryDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("all");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [editingFaq, setEditingFaq] = useState<FaqRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (tab === "overview") {
          const response = await fetch("/api/admin/overview", { cache: "no-store" });
          const body = await response.json() as Overview & { error?: string };
          if (!response.ok) throw new Error(body.error || "Dashboard data could not be loaded.");
          if (!cancelled) setOverview(body);
        } else if (tab === "leads") {
          const params = new URLSearchParams({ q: submittedQuery, status: submittedStatus });
          const response = await fetch(`/api/admin/leads?${params}`, { cache: "no-store" });
          const body = await response.json() as { leads?: Lead[]; error?: string };
          if (!response.ok) throw new Error(body.error || "The inquiry inbox could not be loaded.");
          if (!cancelled) setLeads(body.leads ?? []);
        } else if (tab === "services" || tab === "faqs") {
          const response = await fetch(`/api/admin/content/${tab}`, { cache: "no-store" });
          const body = await response.json() as { items?: Array<ServiceRecord | FaqRecord>; error?: string };
          if (!response.ok) throw new Error(body.error || "Content could not be loaded.");
          if (!cancelled && tab === "services") setServices((body.items ?? []) as ServiceRecord[]);
          if (!cancelled && tab === "faqs") setFaqs((body.items ?? []) as FaqRecord[]);
        } else if (tab === "settings") {
          const response = await fetch("/api/admin/settings", { cache: "no-store" });
          const body = await response.json() as { settings?: SiteSettings; error?: string };
          if (!response.ok || !body.settings) throw new Error(body.error || "Settings could not be loaded.");
          if (!cancelled) setSettings(body.settings);
        }
      } catch (error) {
        if (!cancelled) setFeedback({ message: error instanceof Error ? error.message : "Data could not be loaded.", error: true });
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [tab, refreshCounter, submittedQuery, submittedStatus]);

  async function sendJson(url: string, method: string, payload?: unknown): Promise<boolean> {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(url, { method, headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The operation could not be completed.");
      setFeedback({ message: "Saved successfully." });
      setRefreshCounter((value) => value + 1);
      return true;
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "The operation could not be completed. Please retry.", error: true });
      return false;
    } finally { setSaving(false); }
  }

  function goTo(nextTab: Tab) { setFeedback(null); setTab(nextTab); setEditingLead(null); setEditingService(null); setEditingFaq(null); }

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLead) return;
    const fd = new FormData(event.currentTarget);
    const ok = await sendJson("/api/admin/leads", "PATCH", { id: editingLead.id, status: inputString(fd, "status"), notes: inputString(fd, "notes") });
    if (ok) setEditingLead(null);
  }

  async function deleteLead(lead: Lead) {
    if (!window.confirm(`Delete the inquiry from ${lead.name}? This cannot be undone.`)) return;
    await sendJson("/api/admin/leads", "DELETE", { id: lead.id, confirm: true });
    if (editingLead?.id === lead.id) setEditingLead(null);
  }

  function newService() { setFeedback(null); setEditingService({ slug: "", title: "", summary: "", body: "", icon: "Compass", published: false, sortOrder: services.length + 1 }); }
  function editService(service: ServiceRecord) { setFeedback(null); setEditingService({ ...service }); }
  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingService) return;
    const fd = new FormData(event.currentTarget);
    const payload = { slug: editingService.slug || inputString(fd, "slug"), title: inputString(fd, "title"), summary: inputString(fd, "summary"), body: inputString(fd, "body"), icon: inputString(fd, "icon"), published: fd.get("published") === "on", sortOrder: Number(inputString(fd, "sortOrder") || 100) };
    const exists = services.some((item) => item.slug === editingService.slug);
    const url = exists ? `/api/admin/content/services/${encodeURIComponent(editingService.slug)}` : "/api/admin/content/services";
    const ok = await sendJson(url, exists ? "PATCH" : "POST", payload);
    if (ok) setEditingService(null);
  }
  async function deleteService(service: ServiceRecord) {
    if (!window.confirm(`Delete “${service.title}” from the published offerings?`)) return;
    await sendJson(`/api/admin/content/services/${encodeURIComponent(service.slug)}`, "DELETE", { confirm: true });
    if (editingService?.slug === service.slug) setEditingService(null);
  }

  function newFaq() { setFeedback(null); setEditingFaq({ slug: "", question: "", answer: "", published: false, sortOrder: faqs.length + 1 }); }
  function editFaq(faq: FaqRecord) { setFeedback(null); setEditingFaq({ ...faq }); }
  async function saveFaq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFaq) return;
    const fd = new FormData(event.currentTarget);
    const payload = { slug: editingFaq.slug || inputString(fd, "slug"), question: inputString(fd, "question"), answer: inputString(fd, "answer"), published: fd.get("published") === "on", sortOrder: Number(inputString(fd, "sortOrder") || 100) };
    const exists = faqs.some((item) => item.slug === editingFaq.slug);
    const url = exists ? `/api/admin/content/faqs/${encodeURIComponent(editingFaq.slug)}` : "/api/admin/content/faqs";
    const ok = await sendJson(url, exists ? "PATCH" : "POST", payload);
    if (ok) setEditingFaq(null);
  }
  async function deleteFaq(faq: FaqRecord) {
    if (!window.confirm(`Delete “${faq.question}” from the FAQs?`)) return;
    await sendJson(`/api/admin/content/faqs/${encodeURIComponent(faq.slug)}`, "DELETE", { confirm: true });
    if (editingFaq?.slug === faq.slug) setEditingFaq(null);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const payload: SiteSettings = {
      brandName: inputString(fd, "brandName"), tagline: inputString(fd, "tagline"), description: inputString(fd, "description"),
      heroEyebrow: inputString(fd, "heroEyebrow"), heroHeadline: inputString(fd, "heroHeadline"), heroDescription: inputString(fd, "heroDescription"),
      aboutHeadline: inputString(fd, "aboutHeadline"), aboutBody: inputString(fd, "aboutBody"), phone: inputString(fd, "phone"), email: inputString(fd, "email"),
      logoPath: inputString(fd, "logoPath"), siteTitle: inputString(fd, "siteTitle"), siteDescription: inputString(fd, "siteDescription"),
      instagramUrl: inputString(fd, "instagramUrl"), linkedinUrl: inputString(fd, "linkedinUrl"), showStarterNotice: fd.get("showStarterNotice") === "on"
    };
    const ok = await sendJson("/api/admin/settings", "PUT", payload);
    if (ok) setSettings(payload);
  }

  function statusClass(status: string) { return `admin-status ${status}`; }
  const tabTitle: Record<Tab, string> = { overview: "Overview", leads: "Inquiry inbox", services: "Service content", faqs: "Frequently asked questions", settings: "Public site settings" };

  return <div className="admin-page"><div className="shell"><div className="admin-topbar"><Link href="/" className="admin-brand"><Image className="admin-brand-mark" src="/icons/favicon-32x32.png" width={48} height={48} alt="" /><span><strong>NS Studio</strong><span>Website administration</span></span></Link><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="admin-user-label">{email}</span><LogoutButton /></div></div>
    <div className="admin-content"><div><span className="eyebrow">PRIVATE WORKSPACE</span><h1>{tabTitle[tab]}</h1><p className="admin-subtitle">Manage website inquiries and the public content shown to visitors. Changes save to MongoDB.</p></div>
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className="admin-tab" type="button" role="tab" aria-selected={tab === id} onClick={() => goTo(id)}><Icon size={15} style={{ display: "inline-block", marginRight: 7, verticalAlign: "-3px" }} aria-hidden="true" />{label}</button>)}</div>
      {feedback ? <div className={`admin-inline-feedback${feedback.error ? " error" : ""}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</div> : null}
      {loading ? <div className="admin-panel"><div className="admin-empty"><LoaderCircle size={17} className="spin" style={{ display: "inline-block", marginRight: 8, verticalAlign: "-4px" }} />Loading {tabTitle[tab].toLowerCase()}…</div></div> : null}
      {!loading && feedback?.error ? <div className="admin-panel"><button className="button button-outline" type="button" onClick={() => setRefreshCounter((v) => v + 1)}><RefreshCw size={15} /> Retry loading</button></div> : null}

      {!loading && tab === "overview" && overview ? <section className="admin-panel"><div className="admin-panel-header"><div><h2>At a glance</h2><p>Counts reflect records currently stored in MongoDB.</p></div><button className="admin-mini-button" type="button" onClick={() => setRefreshCounter((v) => v + 1)}><RefreshCw size={13} /> Refresh</button></div><div className="admin-stats"><div className="admin-stat"><span>Total inquiries</span><strong>{overview.stats.totalLeads}</strong></div><div className="admin-stat"><span>New inquiries</span><strong>{overview.stats.newLeads}</strong></div><div className="admin-stat"><span>Open / in progress</span><strong>{overview.stats.activeLeads}</strong></div><div className="admin-stat"><span>Stored services / FAQs</span><strong>{overview.stats.totalServices + overview.stats.totalFaqs}</strong></div></div><div className="admin-panel-header"><div><h2>Recent inquiries</h2><p>Newest submissions appear first.</p></div><button className="admin-mini-button" type="button" onClick={() => goTo("leads")}>Open inbox <ArrowUpRight size={13} /></button></div>{overview.recentLeads.length ? <div className="admin-list">{overview.recentLeads.map((lead) => <div className="admin-list-item" key={lead.id}><div><h3>{lead.subject}</h3><p>{lead.name} · {dateLabel(lead.createdAt)}</p></div><div className="admin-item-actions"><span className={statusClass(lead.status)}>{statusLabel[lead.status]}</span></div></div>)}</div> : <div className="admin-empty">No inquiries have been saved yet.</div>}<div className="admin-panel-header" style={{ marginTop: 28 }}><div><h2>Configuration status</h2><p>Optional email notification status is reported from server configuration.</p></div></div><div className="admin-list"><div className="admin-list-item"><div><h3>MongoDB database</h3><p>Persistent storage for inquiries, sessions and edits.</p></div><span className="admin-status resolved">Connected for this request</span></div><div className="admin-list-item"><div><h3>Email notifications</h3><p>{overview.configuration.emailNotifications ? "Resend notification integration has the required values configured." : "Disabled until RESEND_API_KEY, CONTACT_EMAIL_TO and CONTACT_EMAIL_FROM are configured."}</p></div><span className={`admin-status ${overview.configuration.emailNotifications ? "resolved" : "draft"}`}>{overview.configuration.emailNotifications ? "Configured" : "Not configured"}</span></div>{overview.configuration.starterNotice ? <div className="admin-list-item"><div><h3>Starter content notice</h3><p>Visitors are told that the initial service and brand copy needs personalising.</p></div><span className="admin-status new">Visible to visitors</span></div> : null}</div><div className="admin-panel-header" style={{ marginTop: 28 }}><div><h2>Recent activity</h2><p>Security and change events are retained for up to 180 days.</p></div></div>{overview.recentEvents.length ? <div className="admin-list">{overview.recentEvents.map((event) => <div className="admin-list-item" key={event.id}><div><h3>{event.action.replaceAll(".", " · ")}</h3><p>{event.subject ? `Reference ${event.subject}` : "No record details stored"} · {event.actor === "admin" ? "Administrator action" : "System event"}</p></div><div className="admin-item-meta">{dateLabel(event.createdAt)}</div></div>)}</div> : <div className="admin-empty">No audit events recorded yet.</div>}</section> : null}

      {!loading && tab === "leads" ? <section className="admin-panel"><div className="admin-panel-header"><div><h2>Private inquiry inbox</h2><p>Search up to 100 latest matching records. Keep notes concise and appropriate.</p></div><button className="admin-mini-button" type="button" onClick={() => setRefreshCounter((v) => v + 1)}><RefreshCw size={13} /> Refresh</button></div><form className="admin-toolbar" onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(queryDraft.trim()); setSubmittedStatus(statusDraft); }}><input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} maxLength={100} placeholder="Search name, email or message" aria-label="Search inquiries" /><select aria-label="Filter inquiry status" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><button className="button button-primary button-small" type="submit">Apply filters</button></form>{leads.length ? <div className="admin-list">{leads.map((lead) => <article className="admin-list-item" key={lead.id}><div style={{ minWidth: 0, flex: 1 }}><div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9, marginBottom: 6 }}><h3 style={{ margin: 0 }}>{lead.subject}</h3><span className={statusClass(lead.status)}>{statusLabel[lead.status]}</span></div><p>{lead.name} · <a href={`mailto:${lead.email}`}>{lead.email}</a>{lead.phone ? ` · ${lead.phone}` : ""}</p><div className="admin-item-meta"><span>Received {dateLabel(lead.createdAt)}</span><span>Ref {lead.id.slice(0, 8)}</span></div>{editingLead?.id === lead.id ? <form className="admin-editor" style={{ marginTop: 16 }} onSubmit={saveLead}><div className="field"><label htmlFor={`lead-status-${lead.id}`}>Status</label><select id={`lead-status-${lead.id}`} name="status" defaultValue={lead.status}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></div><div className="field field-full"><label htmlFor={`lead-message-${lead.id}`}>Visitor message</label><textarea id={`lead-message-${lead.id}`} readOnly value={lead.message} rows={4} /></div><div className="field field-full"><label htmlFor={`lead-notes-${lead.id}`}>Private admin notes</label><textarea id={`lead-notes-${lead.id}`} name="notes" defaultValue={lead.notes} maxLength={3000} rows={3} placeholder="Notes for internal follow-up" /></div><div className="admin-actions-row"><button type="submit" className="button button-primary button-small" disabled={saving}><Save size={14} /> Save inquiry</button><button type="button" className="button button-quiet button-small" onClick={() => setEditingLead(null)}>Cancel</button></div></form> : <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{lead.message}</p>}{lead.notes && editingLead?.id !== lead.id ? <p style={{ marginTop: 8, color: "#e0c58c" }}>Admin note: {lead.notes}</p> : null}</div><div className="admin-item-actions"><button className="admin-mini-button" type="button" onClick={() => setEditingLead(editingLead?.id === lead.id ? null : lead)}><Pencil size={13} /> {editingLead?.id === lead.id ? "Close" : "Review"}</button><button className="admin-mini-button danger" type="button" onClick={() => void deleteLead(lead)}><Trash2 size={13} /> Delete</button></div></article>)}</div> : <div className="admin-empty">No inquiries match these filters.</div>}</section> : null}

      {!loading && tab === "services" ? <section className="admin-panel"><div className="admin-panel-header"><div><h2>Services and offerings</h2><p>Starter items are replaceable. Publishing changes updates the public service pages.</p></div><button className="button button-primary button-small" type="button" onClick={newService}><Plus size={15} /> Add service</button></div>{editingService ? <form className="admin-editor" key={editingService.slug || "new-service"} onSubmit={saveService}><div className="field"><label htmlFor="service-title">Title</label><input id="service-title" name="title" required maxLength={100} defaultValue={editingService.title} /></div><div className="field"><label htmlFor="service-slug">Slug</label><input id="service-slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} readOnly={services.some((item) => item.slug === editingService.slug)} defaultValue={editingService.slug} placeholder="clear-service-name" /></div><div className="field field-full"><label htmlFor="service-summary">Short summary</label><input id="service-summary" name="summary" required maxLength={220} defaultValue={editingService.summary} /></div><div className="field field-full"><label htmlFor="service-body">Detail copy</label><textarea id="service-body" name="body" rows={5} required maxLength={5000} defaultValue={editingService.body} /></div><div className="field"><label htmlFor="service-icon">Icon</label><select id="service-icon" name="icon" defaultValue={editingService.icon}><option value="Compass">Compass</option><option value="PanelsTopLeft">Digital / panels</option><option value="Route">Route / project</option><option value="Lightbulb">Lightbulb</option><option value="Layers">Layers</option><option value="CircleHelp">Help</option></select></div><div className="field"><label htmlFor="service-order">Sort order</label><input id="service-order" name="sortOrder" type="number" min="0" max="1000" defaultValue={editingService.sortOrder} /></div><div className="admin-actions-row"><label className="admin-check"><input type="checkbox" name="published" defaultChecked={editingService.published} /> Published on the public site</label></div><div className="admin-actions-row"><button className="button button-primary button-small" type="submit" disabled={saving}><Save size={14} /> Save service</button><button className="button button-quiet button-small" type="button" onClick={() => setEditingService(null)}>Cancel</button></div></form> : null}{services.length ? <div className="admin-list">{services.map((service) => <div className="admin-list-item" key={service.slug}><div style={{ minWidth: 0 }}><h3>{service.title}</h3><p>{service.summary}</p><div className="admin-item-meta"><span>/{`services/${service.slug}`}</span>{service.isStarter ? <span>Starter content</span> : null}<span>{service.sortOrder.toString().padStart(2, "0")}</span></div></div><div className="admin-item-actions"><span className={`admin-status ${service.published ? "published" : "draft"}`}>{service.published ? "Published" : "Draft"}</span><button className="admin-mini-button" type="button" onClick={() => editService(service)}><Pencil size={13} /> Edit</button><button className="admin-mini-button danger" type="button" onClick={() => void deleteService(service)}><Trash2 size={13} /> Delete</button>{service.published ? <Link className="admin-mini-button" href={`/services/${service.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${service.title} in a new tab`}><ExternalLink size={13} /> Preview</Link> : null}</div></div>)}</div> : <div className="admin-empty">No services found. Add an offering to get started.</div>}</section> : null}

      {!loading && tab === "faqs" ? <section className="admin-panel"><div className="admin-panel-header"><div><h2>Frequently asked questions</h2><p>Published answers appear on the public FAQ page and homepage.</p></div><button className="button button-primary button-small" type="button" onClick={newFaq}><Plus size={15} /> Add FAQ</button></div>{editingFaq ? <form className="admin-editor" key={editingFaq.slug || "new-faq"} onSubmit={saveFaq}><div className="field field-full"><label htmlFor="faq-question">Question</label><input id="faq-question" name="question" required maxLength={220} defaultValue={editingFaq.question} /></div><div className="field"><label htmlFor="faq-slug">Slug</label><input id="faq-slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} readOnly={faqs.some((item) => item.slug === editingFaq.slug)} defaultValue={editingFaq.slug} placeholder="question-slug" /></div><div className="field"><label htmlFor="faq-order">Sort order</label><input id="faq-order" name="sortOrder" type="number" min="0" max="1000" defaultValue={editingFaq.sortOrder} /></div><div className="field field-full"><label htmlFor="faq-answer">Answer</label><textarea id="faq-answer" name="answer" required maxLength={3000} rows={4} defaultValue={editingFaq.answer} /></div><div className="admin-actions-row"><label className="admin-check"><input type="checkbox" name="published" defaultChecked={editingFaq.published} /> Published on the public site</label></div><div className="admin-actions-row"><button className="button button-primary button-small" type="submit" disabled={saving}><Save size={14} /> Save FAQ</button><button className="button button-quiet button-small" type="button" onClick={() => setEditingFaq(null)}>Cancel</button></div></form> : null}{faqs.length ? <div className="admin-list">{faqs.map((faq) => <div className="admin-list-item" key={faq.slug}><div style={{ minWidth: 0 }}><h3>{faq.question}</h3><p>{faq.answer}</p><div className="admin-item-meta"><span>{faq.isStarter ? "Starter content" : "Custom content"}</span><span>Order {faq.sortOrder}</span></div></div><div className="admin-item-actions"><span className={`admin-status ${faq.published ? "published" : "draft"}`}>{faq.published ? "Published" : "Draft"}</span><button className="admin-mini-button" type="button" onClick={() => editFaq(faq)}><Pencil size={13} /> Edit</button><button className="admin-mini-button danger" type="button" onClick={() => void deleteFaq(faq)}><Trash2 size={13} /> Delete</button></div></div>)}</div> : <div className="admin-empty">No FAQs found. Add an answer to help visitors.</div>}</section> : null}

      {!loading && tab === "settings" && settings ? <section className="admin-panel"><div className="admin-panel-header"><div><h2>Brand and public copy</h2><p>These values change the public site. Use plain text; HTML is not rendered.</p></div></div><form className="admin-editor" onSubmit={saveSettings}><div className="field"><label htmlFor="setting-brandName">Brand name</label><input id="setting-brandName" name="brandName" required maxLength={80} defaultValue={settings.brandName} /></div><div className="field"><label htmlFor="setting-tagline">Short tagline</label><input id="setting-tagline" name="tagline" required maxLength={140} defaultValue={settings.tagline} /></div><div className="field field-full"><label htmlFor="setting-description">Business description</label><textarea id="setting-description" name="description" rows={2} required maxLength={320} defaultValue={settings.description} /></div><div className="field"><label htmlFor="setting-heroEyebrow">Hero eyebrow</label><input id="setting-heroEyebrow" name="heroEyebrow" required maxLength={120} defaultValue={settings.heroEyebrow} /></div><div className="field"><label htmlFor="setting-heroHeadline">Hero headline (use a new line to accent the second line)</label><textarea id="setting-heroHeadline" name="heroHeadline" rows={2} required maxLength={180} defaultValue={settings.heroHeadline} /></div><div className="field field-full"><label htmlFor="setting-heroDescription">Hero description</label><textarea id="setting-heroDescription" name="heroDescription" rows={3} required maxLength={420} defaultValue={settings.heroDescription} /></div><div className="field"><label htmlFor="setting-aboutHeadline">About headline</label><input id="setting-aboutHeadline" name="aboutHeadline" required maxLength={160} defaultValue={settings.aboutHeadline} /></div><div className="field field-full"><label htmlFor="setting-aboutBody">About copy</label><textarea id="setting-aboutBody" name="aboutBody" required maxLength={1600} rows={5} defaultValue={settings.aboutBody} /></div><div className="field"><label htmlFor="setting-phone">Contact phone</label><input id="setting-phone" name="phone" required maxLength={32} defaultValue={settings.phone} /></div><div className="field"><label htmlFor="setting-email">Contact email (optional)</label><input id="setting-email" name="email" type="email" maxLength={254} defaultValue={settings.email} /></div><div className="field"><label htmlFor="setting-logoPath">Logo asset path</label><input id="setting-logoPath" name="logoPath" required maxLength={150} defaultValue={settings.logoPath} /><span className="field-help">Place the file in public/brand and enter a path such as /brand/ns-logo-original.png.</span></div><div className="field"><label htmlFor="setting-siteTitle">SEO / browser title</label><input id="setting-siteTitle" name="siteTitle" required maxLength={150} defaultValue={settings.siteTitle} /></div><div className="field field-full"><label htmlFor="setting-siteDescription">SEO description</label><textarea id="setting-siteDescription" name="siteDescription" required maxLength={320} rows={2} defaultValue={settings.siteDescription} /></div><div className="field"><label htmlFor="setting-instagramUrl">Instagram URL (optional)</label><input id="setting-instagramUrl" name="instagramUrl" type="url" maxLength={300} defaultValue={settings.instagramUrl} placeholder="https://www.instagram.com/…" /></div><div className="field"><label htmlFor="setting-linkedinUrl">LinkedIn URL (optional)</label><input id="setting-linkedinUrl" name="linkedinUrl" type="url" maxLength={300} defaultValue={settings.linkedinUrl} placeholder="https://www.linkedin.com/…" /></div><div className="admin-actions-row"><label className="admin-check"><input type="checkbox" name="showStarterNotice" defaultChecked={settings.showStarterNotice} /> Show the starter-content notice until the default copy is replaced</label></div><div className="admin-actions-row"><button className="button button-primary button-small" type="submit" disabled={saving}><Save size={14} /> Save site settings</button><Link className="button button-quiet button-small" href="/" target="_blank" rel="noopener noreferrer">View public site <ExternalLink size={13} /></Link></div></form><p className="form-privacy-note">WhatsApp appears only when NEXT_PUBLIC_WHATSAPP_NUMBER is set to a valid international digits-only number. Email notifications are configured separately through server-side environment variables.</p></section> : null}
    </div><div className="admin-footer">Signed in as {email}. Sessions expire after 8 hours. <Link href="/" style={{ color: "var(--color-gold)" }}>Open public site</Link></div></div></div>;
}
