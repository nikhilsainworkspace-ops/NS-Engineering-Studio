"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, LoaderCircle, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type Kind = "projects" | "software";
type CatalogItem = Record<string, unknown> & { slug: string; title: string; category: string; summary: string; description: string; published: boolean; featured: boolean; sortOrder: number; isStarter?: boolean; status: string };
const categories: Record<Kind, string[]> = {
  projects: ["Residential", "Commercial", "Architecture", "Interior", "Civil", "Infrastructure", "Other"],
  software: ["Engineering", "Architecture", "Construction", "Estimation", "Project Management", "Learning", "Other"]
};
const statuses: Record<Kind, { value: string; label: string }[]> = {
  projects: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "completed", label: "Completed" }, { value: "archived", label: "Archived" }],
  software: [{ value: "available", label: "Available" }, { value: "beta", label: "Beta" }, { value: "coming-soon", label: "Coming soon" }, { value: "maintenance", label: "Maintenance" }]
};
const blank = (kind: Kind, order = 1): CatalogItem => kind === "projects" ? ({
  slug: "", title: "", category: "Residential", summary: "", description: "", location: "", status: "draft", startDate: "", completionDate: "", coverImageUrl: "", gallery: [], published: false, featured: false, sortOrder: order, seoTitle: "", seoDescription: ""
} as CatalogItem) : ({
  slug: "", title: "", category: "Engineering", summary: "", description: "", launchUrl: "/workspace", status: "coming-soon", pricing: "Not configured", trialInfo: "Not configured", platforms: "Web", features: [], published: false, featured: false, sortOrder: order
} as CatalogItem);
const asString = (item: CatalogItem, key: string) => String(item[key] ?? "");
const asArrayText = (item: CatalogItem, key: string) => Array.isArray(item[key]) ? (item[key] as string[]).join("\n") : "";

export function AdminCatalogPanel({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requestedProject, setRequestedProject] = useState("");
  const [focusAttempted, setFocusAttempted] = useState(false);
  const title = kind === "projects" ? "Projects" : "Engineering software";
  const endpoint = `/api/admin/content/${kind}`;

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin" });
      const body = await response.json() as { items?: CatalogItem[]; error?: string };
      if (!response.ok) throw new Error(body.error || `${title} could not be loaded.`);
      setItems(body.items ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : `${title} could not be loaded.`); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [endpoint]);
  useEffect(() => { setRequestedProject(new URLSearchParams(window.location.search).get("project") || ""); }, []);
  useEffect(() => {
    if (kind !== "projects" || !requestedProject || loading || focusAttempted) return;
    const matched = items.find((item) => item.slug === requestedProject);
    if (matched) { setDraft({ ...matched }); setNotice(`Opened project referenced by an enquiry: ${matched.title}.`); }
    else { setError(`No project record exists for referenced slug “${requestedProject}”. It may have been deleted.`); }
    setFocusAttempted(true);
  }, [kind, requestedProject, loading, items, focusAttempted]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return;
    setSaving(true); setError(""); setNotice("");
    const fd = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      slug: draft.slug || String(fd.get("slug") ?? "").trim(),
      title: String(fd.get("title") ?? "").trim(),
      category: String(fd.get("category") ?? "Other"),
      summary: String(fd.get("summary") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      status: String(fd.get("status") ?? statuses[kind][0].value),
      published: fd.get("published") === "on",
      featured: fd.get("featured") === "on",
      sortOrder: Number(fd.get("sortOrder") || 100)
    };
    if (kind === "projects") {
      payload.location = String(fd.get("location") ?? "").trim();
      payload.startDate = String(fd.get("startDate") ?? "").trim();
      payload.completionDate = String(fd.get("completionDate") ?? "").trim();
      payload.coverImageUrl = String(fd.get("coverImageUrl") ?? "").trim();
      payload.gallery = String(fd.get("gallery") ?? "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean).slice(0, 20);
      payload.seoTitle = String(fd.get("seoTitle") ?? "").trim();
      payload.seoDescription = String(fd.get("seoDescription") ?? "").trim();
      // A published listing must have a public/completed status as well as the publish checkbox.
      if (payload.published && payload.status === "draft") payload.status = "published";
      if (payload.status === "archived") payload.published = false;
    } else {
      payload.launchUrl = String(fd.get("launchUrl") ?? "").trim();
      payload.pricing = String(fd.get("pricing") ?? "").trim();
      payload.trialInfo = String(fd.get("trialInfo") ?? "").trim();
      payload.platforms = String(fd.get("platforms") ?? "").trim();
      payload.features = String(fd.get("features") ?? "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean).slice(0, 20);
    }
    const exists = items.some((item) => item.slug === draft.slug);
    const url = exists ? `${endpoint}/${encodeURIComponent(draft.slug)}` : endpoint;
    try {
      const response = await fetch(url, { method: exists ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The item could not be saved.");
      setNotice(`${title.slice(0, -1) || title} saved.`); setDraft(null); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The item could not be saved."); }
    finally { setSaving(false); }
  }
  async function remove(item: CatalogItem) {
    if (!window.confirm(`Permanently delete “${item.title}”? This removes its CMS record; published projects/software are not backed up automatically.`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(item.slug)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ confirm: true }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The item could not be deleted.");
      setNotice("Item deleted."); if (draft?.slug === item.slug) setDraft(null); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The item could not be deleted."); }
    finally { setSaving(false); }
  }

  return <main className="admin-page"><div className="shell"><div className="admin-topbar"><Link href="/admin" className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">NS</span><span><strong>NS Engineering Studio</strong><span>Unified administration</span></span></Link><div className="admin-item-actions"><Link className="admin-mini-button" href="/workspace">Open construction workspace <ExternalLink size={13} /></Link><Link className="admin-mini-button" href="/admin">Admin home</Link></div></div><div className="admin-content"><div><Link className="text-link" href="/admin"><ArrowLeft size={15} /> Back to administration</Link><h1>{title} manager</h1><p className="admin-subtitle">Create, edit, publish, reorder and archive content without editing source files. Records are saved in the shared NS content collection.</p></div>
    {notice ? <p className="admin-inline-feedback" role="status">{notice}</p> : null}{error ? <p className="admin-inline-feedback error" role="alert">{error}</p> : null}
    <section className="admin-panel"><div className="admin-panel-header"><div><h2>{title} catalogue</h2><p>{items.length} saved record{items.length === 1 ? "" : "s"}. Publishing is always a deliberate administrator action.</p></div><div className="admin-item-actions"><button className="admin-mini-button" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={13} /> Refresh</button><button className="button button-primary button-small" type="button" onClick={() => { setDraft(blank(kind, items.length + 1)); setError(""); setNotice(""); }}><Plus size={14} /> Add {kind === "projects" ? "project" : "software"}</button></div></div>
      {loading ? <div className="admin-empty"><LoaderCircle size={17} className="spin" /> Loading records…</div> : items.length ? <div className="admin-list">{items.map((item) => <div className="admin-list-item" key={item.slug}><div style={{ minWidth: 0 }}><h3>{item.title}</h3><p>{item.summary}</p><div className="admin-item-meta"><span>/{kind === "projects" ? "projects" : "engineering-software"}/{item.slug}</span><span>{item.category}</span><span>Order {item.sortOrder}</span></div></div><div className="admin-item-actions"><span className={`admin-status ${item.published ? "published" : "draft"}`}>{item.published ? "Published" : "Draft"}</span><button className="admin-mini-button" type="button" onClick={() => { setDraft({ ...item }); setError(""); setNotice(""); }}><Pencil size={13} /> Edit</button><button className="admin-mini-button danger" type="button" disabled={saving} onClick={() => void remove(item)}><Trash2 size={13} /> Delete</button>{item.published ? <Link className="admin-mini-button" href={kind === "projects" ? `/projects/${item.slug}` : "/engineering-software"} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Preview</Link> : null}</div></div>)}</div> : <div className="admin-empty">No {title.toLowerCase()} have been added yet. Create a record when you have verified content ready to publish.</div>}
    </section>
    {draft ? <section className="admin-panel"><div className="admin-panel-header"><div><h2>{items.some((item) => item.slug === draft.slug) ? "Edit record" : "New record"}</h2><p>Use only accurate, approved content. Do not enter credentials or sensitive customer data here.</p></div></div><form className="admin-editor" onSubmit={submit} key={`${kind}:${draft.slug || "new"}`}>
      <div className="field"><label htmlFor="catalog-title">Title</label><input id="catalog-title" name="title" required maxLength={140} defaultValue={asString(draft,"title")} /></div>
      <div className="field"><label htmlFor="catalog-slug">URL slug</label><input id="catalog-slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} readOnly={Boolean(draft.slug)} defaultValue={draft.slug} placeholder="clear-slug" /></div>
      <div className="field"><label htmlFor="catalog-category">Category</label><select id="catalog-category" name="category" defaultValue={asString(draft,"category")}>{categories[kind].map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="field"><label htmlFor="catalog-status">Status</label><select id="catalog-status" name="status" defaultValue={asString(draft,"status")}>{statuses[kind].map((value) => <option key={value.value} value={value.value}>{value.label}</option>)}</select></div>
      <div className="field field-full"><label htmlFor="catalog-summary">Summary</label><input id="catalog-summary" name="summary" required maxLength={240} defaultValue={asString(draft,"summary")} /></div>
      <div className="field field-full"><label htmlFor="catalog-description">Description / scope</label><textarea id="catalog-description" name="description" required maxLength={6000} rows={5} defaultValue={asString(draft,"description")} /></div>
      {kind === "projects" ? <>
        <div className="field"><label htmlFor="project-location">Location (optional)</label><input id="project-location" name="location" maxLength={160} defaultValue={asString(draft,"location")} placeholder="City, state (only if approved to publish)" /></div>
        <div className="field"><label htmlFor="project-start">Start date (optional)</label><input id="project-start" name="startDate" maxLength={30} defaultValue={asString(draft,"startDate")} placeholder="YYYY-MM or YYYY-MM-DD" /></div>
        <div className="field"><label htmlFor="project-completion">Completion date (optional)</label><input id="project-completion" name="completionDate" maxLength={30} defaultValue={asString(draft,"completionDate")} placeholder="YYYY-MM or YYYY-MM-DD" /></div>
        <div className="field"><label htmlFor="project-cover">Cover image path / HTTPS URL (optional)</label><input id="project-cover" name="coverImageUrl" maxLength={500} defaultValue={asString(draft,"coverImageUrl")} placeholder="/brand/project-cover.webp" /></div>
        <div className="field field-full"><label htmlFor="project-gallery">Gallery image paths / HTTPS URLs (one per line, up to 20)</label><textarea id="project-gallery" name="gallery" rows={3} maxLength={10000} defaultValue={asArrayText(draft,"gallery")} placeholder="/brand/detail-1.webp" /></div>
        <div className="field"><label htmlFor="project-seo-title">SEO title (optional)</label><input id="project-seo-title" name="seoTitle" maxLength={150} defaultValue={asString(draft,"seoTitle")} /></div>
        <div className="field"><label htmlFor="project-seo-desc">SEO description (optional)</label><input id="project-seo-desc" name="seoDescription" maxLength={320} defaultValue={asString(draft,"seoDescription")} /></div>
      </> : <>
        <div className="field field-full"><label htmlFor="software-url">Launch URL (HTTPS or local route)</label><input id="software-url" name="launchUrl" required maxLength={500} defaultValue={asString(draft,"launchUrl")} placeholder="/workspace" /></div>
        <div className="field"><label htmlFor="software-pricing">Pricing display</label><input id="software-pricing" name="pricing" maxLength={120} defaultValue={asString(draft,"pricing")} placeholder="Not configured" /></div>
        <div className="field"><label htmlFor="software-trial">Trial information</label><input id="software-trial" name="trialInfo" maxLength={180} defaultValue={asString(draft,"trialInfo")} placeholder="No trial configured" /></div>
        <div className="field field-full"><label htmlFor="software-platforms">Supported platforms</label><input id="software-platforms" name="platforms" maxLength={180} defaultValue={asString(draft,"platforms")} placeholder="Browser, web app" /></div>
        <div className="field field-full"><label htmlFor="software-features">Features (one per line, up to 20)</label><textarea id="software-features" name="features" rows={4} maxLength={5000} defaultValue={asArrayText(draft,"features")} /></div>
      </>}
      <div className="field"><label htmlFor="catalog-order">Display order</label><input id="catalog-order" name="sortOrder" type="number" min="0" max="1000" defaultValue={String(draft.sortOrder ?? 100)} /></div>
      <div className="admin-actions-row"><label className="admin-check"><input type="checkbox" name="published" defaultChecked={draft.published} /> Publish on the public website</label><label className="admin-check"><input type="checkbox" name="featured" defaultChecked={draft.featured} /> Feature on catalogue</label></div>
      <div className="admin-actions-row"><button className="button button-primary button-small" type="submit" disabled={saving}><Save size={14} /> {saving ? "Saving…" : "Save record"}</button><button className="button button-quiet button-small" type="button" onClick={() => setDraft(null)} disabled={saving}>Cancel</button></div>
      {kind === "projects" ? <p className="form-privacy-note">The current editor accepts existing same-site assets or HTTPS image URLs. It does not upload files; configure a durable, validated media store before promising upload support. Only publish projects approved for public disclosure.</p> : null}
    </form></section> : null}
  </div></div></main>;
}
