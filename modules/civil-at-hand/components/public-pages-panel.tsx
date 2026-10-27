"use client";

// Owner-controlled public pages. Pages start unpublished and show only what is typed or uploaded here;
// nothing is pulled from contacts, projects, finance or any other private record.
import { useMemo, useState } from "react";
import { labelOf, publicBlockTypes, publicPageTemplates } from "@/modules/civil-at-hand/lib/entities";
import { useEntityList, type Row } from "@/modules/civil-at-hand/components/entity-manager";
import { api, Badge, Button, DataTable, dateLabel, EmptyState, ErrorNote, Icon, Loading, Modal, PageSection, Tabs, useConfirm, useResource, useWorkspace } from "@/modules/civil-at-hand/components/ui";

type Block = { type: string; text: string; items: string[]; facts: { label: string; value: string }[]; imageIds: string[]; caption: string; linkUrl: string; linkLabel: string };
type Page = { _id?: string; slug: string; title: string; template: string; summary: string; visibility: string; expiresAt: string; seoTitle: string; seoDescription: string; allowIndexing: boolean; showInNav: boolean; navOrder: number; coverImageId: string; blocks: Block[]; status?: string; accessToken?: string; publishedAt?: string };
type Image = { _id: string; filename: string; alt: string; size: number };

const blank = (type: string, text = ""): Block => ({ type, text, items: [], facts: [], imageIds: [], caption: "", linkUrl: "", linkLabel: "" });
const templateBlocks: Record<string, Block[]> = {
  "company-profile": [blank("heading", "About us"), blank("text"), blank("facts"), blank("heading", "What we do"), blank("list"), blank("contact", "Get in touch")],
  services: [blank("text"), blank("heading", "Our services"), blank("list"), blank("cta"), blank("contact", "Talk to us")],
  portfolio: [blank("text"), blank("gallery"), blank("heading", "Selected work"), blank("list")],
  "project-showcase": [blank("image"), blank("facts"), blank("heading", "The brief"), blank("text"), blank("heading", "What we delivered"), blank("text"), blank("gallery")],
  "case-study": [blank("heading", "Challenge"), blank("text"), blank("heading", "Approach"), blank("text"), blank("heading", "Result"), blank("text"), blank("facts")],
  capabilities: [blank("text"), blank("heading", "Capabilities"), blank("list"), blank("heading", "Experience"), blank("facts")],
  gallery: [blank("gallery")],
  documents: [blank("text"), blank("cta")],
  contact: [blank("text"), blank("contact", "Contact details"), blank("cta")],
  custom: [blank("text")],
};
const emptyPage = (template = "company-profile"): Page => ({ slug: "", title: "", template, summary: "", visibility: "public", expiresAt: "", seoTitle: "", seoDescription: "", allowIndexing: false, showInNav: true, navOrder: 0, coverImageId: "", blocks: (templateBlocks[template] || [blank("text")]).map((block) => ({ ...block })) });
const slugify = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function liveUrl(page: Page) {
  if (typeof window === "undefined") return `/workspace/p/${page.slug}`;
  const base = `${window.location.origin}/workspace/p/${page.slug}`;
  return page.visibility === "unlisted" && page.accessToken ? `${base}?k=${page.accessToken}` : base;
}

function ImagePicker({ images, onPick, onClose, onUploaded, multiple = false, selected = [] }: { images: Image[]; onPick: (ids: string[]) => void; onClose: () => void; onUploaded: () => void; multiple?: boolean; selected?: string[] }) {
  const { notify } = useWorkspace();
  const [chosen, setChosen] = useState<string[]>(selected);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/civil-at-hand/public-pages/images", { method: "POST", body, cache: "no-store", credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      onUploaded(); setChosen((current) => (multiple ? [...current, result.item._id] : [result.item._id]));
    } catch (err) { notify(err instanceof Error ? err.message : "Upload failed.", "error"); }
    finally { setBusy(false); }
  }
  return <Modal size="lg" title={multiple ? "Choose images" : "Choose an image"} description="Images uploaded here are only shown publicly on published pages that use them." onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!chosen.length} onClick={() => onPick(chosen)}>Use {chosen.length || ""} image{chosen.length === 1 ? "" : "s"}</Button></>}>
    <label className="ui-dropzone"><Icon name="upload" /><span>{busy ? "Uploading…" : "Upload a JPG, PNG or WebP image (up to 2 MB)"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></label>
    {images.length ? <ul className="pp-images">{images.map((image) => <li key={image._id}><button type="button" aria-pressed={chosen.includes(image._id)} className={chosen.includes(image._id) ? "is-on" : ""} onClick={() => setChosen((current) => (multiple ? (current.includes(image._id) ? current.filter((id) => id !== image._id) : [...current, image._id]) : [image._id]))}><img src={`/api/civil-at-hand/public-pages/images/${image._id}`} alt={image.alt || image.filename} loading="lazy" /><span>{image.filename}</span></button></li>)}</ul> : <p className="ui-muted">No images uploaded yet.</p>}
  </Modal>;
}

function Preview({ page }: { page: Page }) {
  const { settings } = useWorkspace();
  const img = (id: string) => `/api/civil-at-hand/public-pages/images/${id}`;
  return <div className="site-shell pp-preview" aria-label="Page preview">
    <header className="site-header"><div className="site-header-inner"><span className="site-brand"><strong>{settings.businessName || "Your business"}</strong></span></div></header>
    <main className="site-main">
      <section className="site-hero">{page.coverImageId ? <img className="site-cover" src={img(page.coverImageId)} alt="" /> : null}<h1>{page.title || "Page title"}</h1>{page.summary ? <p className="site-summary">{page.summary}</p> : null}</section>
      {page.blocks.map((block, index) => {
        switch (block.type) {
          case "heading": return <h2 className="site-heading" key={index}>{block.text || <em className="pp-missing">Heading</em>}</h2>;
          case "text": return <div className="site-text" key={index}>{block.text ? block.text.split(/\n{2,}/).map((paragraph, i) => <p key={i}>{paragraph}</p>) : <p className="pp-missing">Paragraph text</p>}</div>;
          case "list": return <ul className="site-list" key={index}>{block.items.length ? block.items.map((item, i) => <li key={i}>{item}</li>) : <li className="pp-missing">List items</li>}</ul>;
          case "facts": return <dl className="site-facts" key={index}>{block.facts.length ? block.facts.map((fact, i) => <div key={i}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>) : <div><dt className="pp-missing">Label</dt><dd className="pp-missing">Value</dd></div>}</dl>;
          case "image": return <figure className="site-figure" key={index}>{block.imageIds[0] ? <img src={img(block.imageIds[0])} alt="" /> : <div className="pp-missing pp-placeholder">Image</div>}{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
          case "gallery": return <figure className="site-gallery" key={index}><div>{block.imageIds.length ? block.imageIds.map((id) => <img key={id} src={img(id)} alt="" />) : <div className="pp-missing pp-placeholder">Gallery images</div>}</div>{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
          case "cta": return <p className="site-cta" key={index}><a href="#preview" onClick={(event) => event.preventDefault()}>{block.linkLabel || "Button label"}</a>{block.text ? <span>{block.text}</span> : null}</p>;
          case "contact": return <address className="site-contact" key={index}><strong>{block.text || "Get in touch"}</strong>{[settings.address, settings.city].filter(Boolean).length ? <span>{[settings.address, settings.city, settings.state].filter(Boolean).join(", ")}</span> : null}{settings.phone ? <span>{settings.phone}</span> : null}{settings.email ? <span>{settings.email}</span> : null}{!settings.phone && !settings.email ? <span className="pp-missing">Add phone and email in Settings → Business profile</span> : null}</address>;
          case "divider": return <hr className="site-divider" key={index} />;
          default: return null;
        }
      })}
    </main>
  </div>;
}

function BlockEditor({ block, onChange, images, onPickImages }: { block: Block; onChange: (block: Block) => void; images: Image[]; onPickImages: (multiple: boolean) => void }) {
  const { links } = useLinks();
  switch (block.type) {
    case "heading": return <input aria-label="Heading text" value={block.text} maxLength={200} onChange={(event) => onChange({ ...block, text: event.target.value })} placeholder="Section heading" />;
    case "text": return <textarea aria-label="Paragraph text" rows={5} value={block.text} maxLength={6000} onChange={(event) => onChange({ ...block, text: event.target.value })} placeholder="Write in plain sentences. Leave a blank line between paragraphs." />;
    case "list": return <textarea aria-label="List items, one per line" rows={5} value={block.items.join("\n")} onChange={(event) => onChange({ ...block, items: event.target.value.split("\n").map((item: string) => item.trimStart()).slice(0, 40) })} placeholder="One item per line" />;
    case "facts": return <div className="pp-facts">{[...block.facts, { label: "", value: "" }].slice(0, 24).map((fact, index) => <div key={index} className="pp-fact-row"><input aria-label={`Fact ${index + 1} label`} placeholder="Label, e.g. Built-up area" value={fact.label} maxLength={80} onChange={(event) => { const facts = [...block.facts]; facts[index] = { ...fact, label: event.target.value }; onChange({ ...block, facts: facts.filter((item) => item.label || item.value) }); }} /><input aria-label={`Fact ${index + 1} value`} placeholder="Value, e.g. 42,000 sq ft" value={fact.value} maxLength={160} onChange={(event) => { const facts = [...block.facts]; facts[index] = { ...fact, value: event.target.value }; onChange({ ...block, facts: facts.filter((item) => item.label || item.value) }); }} /></div>)}</div>;
    case "image": case "gallery": return <div className="pp-image-block">
      <div className="pp-thumbs">{block.imageIds.map((id) => <img key={id} src={`/api/civil-at-hand/public-pages/images/${id}`} alt={images.find((image) => image._id === id)?.filename || ""} />)}</div>
      <Button size="sm" icon="image" onClick={() => onPickImages(block.type === "gallery")}>{block.imageIds.length ? "Change images" : "Choose images"}</Button>
      <input aria-label="Caption" value={block.caption} maxLength={300} onChange={(event) => onChange({ ...block, caption: event.target.value })} placeholder="Caption (optional)" />
    </div>;
    case "cta": return <div className="ui-grid">
      <label className="ui-field"><span className="ui-label">Button label</span><input value={block.linkLabel} maxLength={80} onChange={(event) => onChange({ ...block, linkLabel: event.target.value })} placeholder="e.g. Send an enquiry" /></label>
      <label className="ui-field"><span className="ui-label">Link</span><input value={block.linkUrl} maxLength={500} onChange={(event) => onChange({ ...block, linkUrl: event.target.value })} placeholder="https://…, /workspace/join/…, mailto:… or tel:…" list="pp-form-links" /><datalist id="pp-form-links">{links.map((link) => <option key={link.url} value={link.url}>{link.title}</option>)}</datalist><small className="ui-help">Tip: pick one of your active public form links to collect enquiries.</small></label>
      <label className="ui-field ui-span-all"><span className="ui-label">Text beside the button (optional)</span><input value={block.text} maxLength={300} onChange={(event) => onChange({ ...block, text: event.target.value })} /></label>
    </div>;
    case "contact": return <><input aria-label="Contact block heading" value={block.text} maxLength={200} onChange={(event) => onChange({ ...block, text: event.target.value })} placeholder="Heading, e.g. Get in touch" /><small className="ui-help">Shows the address, phone, email and website from Settings → Business profile. Nothing else is shown.</small></>;
    default: return <small className="ui-muted">A thin dividing line.</small>;
  }
}

function useLinks() {
  const { data } = useResource<{ title: string; url: string }[]>("/api/civil-at-hand/links", (raw) => ((raw.links as { title: string; shareUrl: string; token: string; active: boolean }[]) || []).filter((link) => link.active).map((link) => ({ title: link.title, url: `/workspace/join/${link.token}` })), []);
  return { links: data };
}

function PageEditor({ initial, onClose, onSaved }: { initial: Page; onClose: () => void; onSaved: (page: Page) => void }) {
  const { notify } = useWorkspace();
  const confirm = useConfirm();
  const [page, setPage] = useState<Page>(initial);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState<{ target: "cover" | number; multiple: boolean } | null>(null);
  const images = useResource<Image[]>("/api/civil-at-hand/public-pages/images", (raw) => (raw.items as Image[]) || [], []);
  const set = (patch: Partial<Page>) => setPage((current) => ({ ...current, ...patch }));
  const setBlock = (index: number, block: Block) => setPage((current) => ({ ...current, blocks: current.blocks.map((item, i) => (i === index ? block : item)) }));
  const move = (index: number, delta: number) => setPage((current) => { const blocks = [...current.blocks]; const [item] = blocks.splice(index, 1); blocks.splice(Math.max(0, Math.min(blocks.length, index + delta)), 0, item); return { ...current, blocks }; });
  async function save(): Promise<Page | null> {
    setBusy(true); setError("");
    try {
      const payload = { ...page, slug: page.slug || slugify(page.title), expiresAt: page.expiresAt || null };
      const result = await api<{ item: Page }>(page._id ? `/api/civil-at-hand/public-pages/${page._id}` : "/api/civil-at-hand/public-pages", { method: page._id ? "PUT" : "POST", json: payload });
      const next = { ...result.item, expiresAt: result.item.expiresAt ? String(result.item.expiresAt).slice(0, 10) : "" };
      setPage(next); onSaved(next); notify(page._id ? "Page saved." : "Page created as an unpublished draft.");
      return next;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the page."); return null; }
    finally { setBusy(false); }
  }
  async function publish(action: "publish" | "unpublish" | "rotate-token") {
    const saved = page._id ? (action === "publish" ? await save() : page) : await save();
    if (!saved?._id) return;
    if (action === "publish") {
      const answer = await confirm({ title: "Publish this page?", message: <>Anyone with the address will be able to see the title, text and images on this page. {saved.visibility === "unlisted" ? "It is unlisted: only people with the private link can open it." : "It is public: search engines can index it only if you turned that on."}</>, confirmLabel: "Publish", tone: "primary" });
      if (!answer.ok) return;
    }
    if (action === "rotate-token") {
      const answer = await confirm({ title: "Create a new private link?", message: "The old private link stops working immediately.", confirmLabel: "Create new link" });
      if (!answer.ok) return;
    }
    try { const result = await api<{ item: Page }>(`/api/civil-at-hand/public-pages/${saved._id}/publish`, { method: "POST", json: { action } }); const next = { ...result.item, expiresAt: result.item.expiresAt ? String(result.item.expiresAt).slice(0, 10) : "" }; setPage(next); onSaved(next); notify(action === "publish" ? "Page published." : action === "unpublish" ? "Page unpublished. Its address now shows “not available”." : "New private link created."); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update.", "error"); }
  }
  const live = page.status === "published";
  return <Modal size="xl" title={page._id ? page.title || "Public page" : "New public page"} description={<span className="est-head-meta">{live ? <Badge tone="success">Published</Badge> : <Badge>Draft — not public</Badge>}{page.visibility === "unlisted" ? <Badge tone="accent">Unlisted</Badge> : null}{page.slug ? <code>/workspace/p/{page.slug}</code> : null}</span>} onClose={onClose}
    footer={<div className="est-foot"><div className="est-foot-left">
      <Tabs label="Editor view" value={view} onChange={setView} items={[{ value: "edit", label: "Edit" }, { value: "preview", label: "Preview" }]} />
    </div><div className="est-foot-right">
      {live ? <><a className="ui-btn ui-btn-ghost" href={liveUrl(page)} target="_blank" rel="noreferrer">Open live page</a><Button onClick={() => void navigator.clipboard?.writeText(liveUrl(page)).then(() => notify("Link copied."))}>Copy link</Button><Button variant="danger" onClick={() => void publish("unpublish")}>Unpublish</Button></> : null}
      {page.visibility === "unlisted" && page._id ? <Button onClick={() => void publish("rotate-token")}>New private link</Button> : null}
      <Button onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      {!live ? <Button variant="primary" onClick={() => void publish("publish")} disabled={busy}>Save and publish</Button> : null}
    </div></div>}>
    {error ? <ErrorNote message={error} /> : null}
    {view === "preview" ? <Preview page={page} /> : <div className="pp-editor">
      <div className="ui-stack">
        <PageSection title="Content" description="Add, edit and reorder blocks. Text is shown exactly as typed; no formatting code is accepted.">
          <ol className="pp-blocks">{page.blocks.map((block, index) => <li key={index} className="pp-block">
            <div className="pp-block-head"><span className="pp-block-type">{labelOf(publicBlockTypes, block.type)}</span><div className="ui-row-actions"><Button size="sm" variant="quiet" aria-label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>↑</Button><Button size="sm" variant="quiet" aria-label="Move down" onClick={() => move(index, 1)} disabled={index === page.blocks.length - 1}>↓</Button><Button size="sm" variant="quiet" icon="trash" aria-label="Remove block" onClick={() => setPage((current) => ({ ...current, blocks: current.blocks.filter((_, i) => i !== index) }))} /></div></div>
            <BlockEditor block={block} onChange={(next) => setBlock(index, next)} images={images.data} onPickImages={(multiple) => setPicking({ target: index, multiple })} />
          </li>)}</ol>
          <div className="pp-add"><span className="ui-label">Add a block</span><div className="ui-chips">{publicBlockTypes.map((type) => <button type="button" key={type.value} className="ui-chip-btn" onClick={() => setPage((current) => ({ ...current, blocks: [...current.blocks, blank(type.value)] }))}>+ {type.label}</button>)}</div></div>
        </PageSection>
      </div>
      <aside className="ui-stack pp-side">
        <PageSection title="Page">
          <div className="ui-stack">
            <label className="ui-field"><span className="ui-label">Title<span className="ui-req">*</span></span><input value={page.title} maxLength={160} onChange={(event) => set({ title: event.target.value, ...(page._id ? {} : { slug: slugify(event.target.value) }) })} /></label>
            <label className="ui-field"><span className="ui-label">Web address</span><div className="ui-affix"><span className="ui-affix-text">/workspace/p/</span><input value={page.slug} maxLength={60} onChange={(event) => set({ slug: slugify(event.target.value) })} /></div>{page._id && live ? <small className="ui-help">Changing the address of a published page breaks links already shared.</small> : null}</label>
            <label className="ui-field"><span className="ui-label">Short introduction</span><textarea rows={3} maxLength={400} value={page.summary} onChange={(event) => set({ summary: event.target.value })} /></label>
            <div className="ui-field"><span className="ui-label">Cover image</span><div className="pp-image-block">{page.coverImageId ? <div className="pp-thumbs"><img src={`/api/civil-at-hand/public-pages/images/${page.coverImageId}`} alt="" /></div> : null}<div className="ui-row-actions"><Button size="sm" icon="image" onClick={() => setPicking({ target: "cover", multiple: false })}>{page.coverImageId ? "Change" : "Choose"}</Button>{page.coverImageId ? <Button size="sm" variant="quiet" onClick={() => set({ coverImageId: "" })}>Remove</Button> : null}</div></div></div>
          </div>
        </PageSection>
        <PageSection title="Who can see it">
          <div className="ui-stack">
            <label className="ui-check"><input type="radio" name="visibility" checked={page.visibility === "public"} onChange={() => set({ visibility: "public" })} /><span><strong>Public</strong> — anyone with the address</span></label>
            <label className="ui-check"><input type="radio" name="visibility" checked={page.visibility === "unlisted"} onChange={() => set({ visibility: "unlisted", allowIndexing: false, showInNav: false })} /><span><strong>Unlisted</strong> — only people with a private link</span></label>
            <label className="ui-field"><span className="ui-label">Stop showing after (optional)</span><input type="date" value={page.expiresAt} onChange={(event) => set({ expiresAt: event.target.value })} /></label>
            {page.visibility === "public" ? <><label className="ui-check"><input type="checkbox" checked={page.showInNav} onChange={(event) => set({ showInNav: event.target.checked })} /><span>Show in the menu of other public pages</span></label><label className="ui-check"><input type="checkbox" checked={page.allowIndexing} onChange={(event) => set({ allowIndexing: event.target.checked })} /><span>Allow search engines to index this page</span></label></> : null}
          </div>
        </PageSection>
        <PageSection title="Search and sharing">
          <div className="ui-stack">
            <label className="ui-field"><span className="ui-label">Search title</span><input value={page.seoTitle} maxLength={160} onChange={(event) => set({ seoTitle: event.target.value })} placeholder={page.title} /></label>
            <label className="ui-field"><span className="ui-label">Search description</span><textarea rows={2} maxLength={300} value={page.seoDescription} onChange={(event) => set({ seoDescription: event.target.value })} /></label>
            <label className="ui-field"><span className="ui-label">Menu order</span><input type="number" min={0} max={999} value={page.navOrder} onChange={(event) => set({ navOrder: Number(event.target.value) })} /></label>
          </div>
        </PageSection>
      </aside>
    </div>}
    {picking ? <ImagePicker images={images.data} multiple={picking.multiple} selected={picking.target === "cover" ? (page.coverImageId ? [page.coverImageId] : []) : page.blocks[picking.target]?.imageIds || []} onUploaded={images.reload} onClose={() => setPicking(null)} onPick={(ids) => { if (picking.target === "cover") set({ coverImageId: ids[0] || "" }); else setBlock(picking.target, { ...page.blocks[picking.target], imageIds: ids }); setPicking(null); }} /> : null}
  </Modal>;
}

export default function PublicPagesPanel() {
  const { notify } = useWorkspace();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useEntityList("/api/civil-at-hand/public-pages");
  const [editing, setEditing] = useState<Page | null>(null);
  const [choosing, setChoosing] = useState(false);
  const pages = useMemo(() => data as unknown as (Page & Row)[], [data]);
  async function open(row: Row) {
    try { const result = await api<{ item: Page }>(`/api/civil-at-hand/public-pages/${row._id}`); setEditing({ ...result.item, expiresAt: result.item.expiresAt ? String(result.item.expiresAt).slice(0, 10) : "" }); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not open the page.", "error"); }
  }
  async function remove(row: Row) {
    const answer = await confirm({ title: "Delete this page?", message: "Unpublished pages can be deleted. Uploaded images stay in the image library.", confirmLabel: "Delete" });
    if (!answer.ok) return;
    try { await api(`/api/civil-at-hand/public-pages/${row._id}`, { method: "DELETE" }); notify("Page deleted."); reload(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not delete.", "error"); }
  }
  return <div className="ui-stack">
    <div className="pp-intro"><Icon name="shield" /><p><strong>Private by default.</strong> A page is visible only after you publish it, and shows only the text and images you add to that page. Contacts, projects, finance, documents and notes are never shown. Unpublish at any time and the address stops working.</p></div>
    <div className="ui-toolbar-row"><span /><Button variant="primary" icon="plus" onClick={() => setChoosing(true)}>New page</Button></div>
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={pages} onRowClick={(row) => void open(row)} columns={[
      { key: "title", label: "Page", render: (row) => <><strong>{row.title}</strong><small className="ui-muted">/workspace/p/{row.slug}</small></>, value: (row) => row.title },
      { key: "template", label: "Type", hideOnMobile: true, value: (row) => labelOf(publicPageTemplates, row.template) },
      { key: "status", label: "Status", render: (row) => row.status === "published" ? (row.expiresAt && String(row.expiresAt) < new Date().toISOString() ? <Badge tone="warning">Expired</Badge> : <Badge tone="success">Published</Badge>) : <Badge>Draft</Badge>, value: (row) => String(row.status) },
      { key: "visibility", label: "Visibility", render: (row) => row.visibility === "unlisted" ? <Badge tone="accent">Unlisted</Badge> : "Public", value: (row) => row.visibility },
      { key: "updatedAt", label: "Updated", hideOnMobile: true, render: (row) => dateLabel(String(row.updatedAt)), value: (row) => String(row.updatedAt || "") },
    ]} rowActions={(row) => row.status !== "published" ? <Button size="sm" variant="quiet" icon="trash" aria-label={`Delete ${row.title}`} onClick={() => void remove(row)} /> : null}
      empty={<EmptyState icon="globe" title="No public pages yet" action={<Button variant="primary" icon="plus" onClick={() => setChoosing(true)}>Create a page</Button>}>Build a company profile, services page, project showcase or enquiry page — without touching code. Nothing is public until you publish.</EmptyState>} />}
    {choosing ? <Modal title="Choose a starting layout" description="You can add, remove and reorder blocks afterwards." onClose={() => setChoosing(false)} size="lg">
      <ul className="pp-templates">{publicPageTemplates.map((template) => <li key={template.value}><button type="button" onClick={() => { setChoosing(false); setEditing(emptyPage(template.value)); }}><strong>{template.label}</strong><small>{(templateBlocks[template.value] || []).map((block) => labelOf(publicBlockTypes, block.type)).join(" · ")}</small></button></li>)}</ul>
    </Modal> : null}
    {editing ? <PageEditor key={editing._id || "new"} initial={editing} onClose={() => { setEditing(null); reload(); }} onSaved={() => reload()} /> : null}
  </div>;
}
