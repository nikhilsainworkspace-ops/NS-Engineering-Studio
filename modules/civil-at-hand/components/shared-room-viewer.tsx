"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

type Brand = { name: string; tagline: string; color: string; logoUrl: string };
type Column = { key: string; label: string };
type Meta = { kind?: "note"; title: string; recipientName: string; requiresPasscode: boolean; expiresAt: string; locked: boolean };
type Data = {
  kind?: "note"; title: string; content?: string; tags?: string[]; assetIds?: string[]; recipientName: string; message: string; columns: Column[]; rows: Record<string, string>[]; rowCount: number;
  expiresAt: string; allowDownload: boolean; watermark: boolean; masked: boolean; licenseCode: string;
};

const PAGE = 100;

function safeUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
function renderSharedNote(content: string, token: string) {
  return <div className="note-rich-preview shared-note-content">{content.split(/\r?\n/).map((line, index) => {
    const key = `shared-line-${index}`;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const checkbox = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const renderInline = (text: string) => {
      const parts: ReactNode[] = []; const pattern = /(!\[[^\]]*\]\(\/api\/notes\/assets\/[a-f\d]{24}\)|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]+)/gi; let last = 0;
      for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0; if (index > last) parts.push(text.slice(last, index));
        let item = match[0]; let trailing = ""; while (/[.,!?;:]$/.test(item)) { trailing = item.slice(-1) + trailing; item = item.slice(0, -1); }
        const image = item.match(/^!\[([^\]]*)\]\(\/api\/notes\/assets\/([a-f\d]{24})\)$/i);
        const markdown = item.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
        if (image) parts.push(<img className="note-inline-image" key={`img-${index}`} src={`/api/civil-at-hand/workspace/shared/${token}/assets/${image[2]}`} alt={image[1] || "Shared note image"} loading="lazy" />);
        else if (item.startsWith("**") && item.endsWith("**")) parts.push(<strong key={`bold-${index}`}>{item.slice(2, -2)}</strong>);
        else if (item.startsWith("*") && item.endsWith("*")) parts.push(<em key={`italic-${index}`}>{item.slice(1, -1)}</em>);
        else { const href = markdown ? markdown[2] : item; const label = markdown ? markdown[1] : item; parts.push(safeUrl(href) ? <a key={`url-${index}`} href={href} target="_blank" rel="noopener noreferrer nofollow">{label}</a> : item); }
        if (trailing) parts.push(trailing); last = index + match[0].length;
      }
      if (last < text.length) parts.push(text.slice(last)); return parts;
    };
    if (heading) return heading[1].length === 1 ? <h2 key={key}>{renderInline(heading[2])}</h2> : heading[1].length === 2 ? <h3 key={key}>{renderInline(heading[2])}</h3> : <h4 key={key}>{renderInline(heading[2])}</h4>;
    if (checkbox) return <div className="note-check-line" key={key}><span>{checkbox[1].trim() ? "✓" : "□"}</span><span className={checkbox[1].trim() ? "note-check-done" : ""}>{renderInline(checkbox[2])}</span></div>;
    if (bullet) return <div className="note-bullet-line" key={key}><span>•</span><span>{renderInline(bullet[1])}</span></div>;
    return <p key={key}>{line ? renderInline(line) : <span className="note-rich-spacer" />}</p>;
  })}</div>;
}

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "expired";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${Math.floor(hours / 24)} days`;
}

export default function SharedRoomViewer({ token }: { token: string }) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDesc, setSortDesc] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [downloading, setDownloading] = useState(false);

  async function unlock(code: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/civil-at-hand/workspace/shared/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code }), cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const remaining = typeof body.remaining === "number" ? ` (${body.remaining} attempt${body.remaining === 1 ? "" : "s"} left)` : "";
        setError(`${body.error || "Could not open this link."}${body.code === "passcode" ? remaining : ""}`);
        if (body.code !== "passcode") setFatal(true);
        return;
      }
      if (body.brand) setBrand(body.brand);
      setData(body as Data);
    } catch { setError("Network problem. Please check your connection and try again."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let live = true;
    fetch(`/api/civil-at-hand/workspace/shared/${token}`, { cache: "no-store" }).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (body.brand && live) setBrand(body.brand);
      if (!res.ok) { if (live) { setError(body.error || "This link is unavailable."); setFatal(true); } return; }
      if (!live) return;
      setMeta(body as Meta);
      if (!body.requiresPasscode) void unlock("");
    }).catch(() => { if (live) { setError("We could not open this link right now. Please try again shortly."); setFatal(true); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function submit(event: FormEvent) { event.preventDefault(); void unlock(passcode.trim()); }

  async function download(format: "csv" | "xlsx") {
    setDownloading(true); setError("");
    try {
      const response = await fetch(`/api/civil-at-hand/workspace/shared/${token}/download`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: passcode.trim(), format }), cache: "no-store" });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || "Could not download."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${(data?.title || "shared-data").replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.${format}`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not download."); }
    finally { setDownloading(false); }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    let list = q ? data.rows.filter((row) => Object.values(row).some((value) => String(value || "").toLowerCase().includes(q))) : data.rows;
    if (sortKey) {
      const dir = sortDesc ? -1 : 1;
      list = [...list].sort((a, b) => String(a[sortKey] || "").localeCompare(String(b[sortKey] || ""), "en", { numeric: true, sensitivity: "base" }) * dir);
    }
    return list;
  }, [data, query, sortKey, sortDesc]);

  const pageStyle = { "--brand": brand?.color || "#176b59" } as CSSProperties;
  const mark = data?.watermark ? `${data.recipientName || "Licensed copy"} · ${data.licenseCode}` : "";

  return <main className="public-shell sv-shell" style={pageStyle}>
    <div className="public-top"><div className="public-brand">
      {brand?.logoUrl ? <img src={brand.logoUrl} alt={`${brand.name} logo`} className="public-logo-image" /> : <span className="brand-mark small-mark">⌂</span>}
      <span><strong>{brand?.name || "NS Engineering Studio"}</strong><small>{brand?.tagline || "Secure shared data"}</small></span>
    </div><span className="secure-note"><span className="secure-dot" /> Private &amp; confidential</span></div>

    {loading || (busy && !data && !error && !meta?.requiresPasscode) ? <section className="public-card loading-card"><span className="spinner" /><p>Opening secure link…</p></section>
      : fatal ? <section className="public-card error-card"><div className="status-illustration">!</div><h1>Link unavailable</h1><p>{error}</p><p className="muted">Please contact the person who shared this link.</p></section>
      : !data && meta ? <section className="public-card sv-gate">
        <div className="login-card-icon sv-lock"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg></div>
        <p className="eyebrow">PROTECTED ACCESS</p><h1>{meta.title}</h1>
        <p className="muted">{meta.recipientName ? `Prepared for ${meta.recipientName}. ` : ""}Enter the passcode you were sent. Link valid for another {timeLeft(meta.expiresAt)}.</p>
        <form onSubmit={submit} className="sv-gate-form">
          <label className="field-wrap"><span>Passcode</span><input value={passcode} onChange={(event) => setPasscode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Enter passcode" required autoFocus /></label>
          {error ? <div role="alert" className="form-error">{error}</div> : null}
          <button className="primary-button submit-button" type="submit" disabled={busy || meta.locked}>{busy ? "Checking…" : "Unlock"}</button>
        </form>
      </section>
      : data ? data.kind === "note" ? <>
        <section className="public-intro sv-intro"><span className="eyebrow">PRIVATE SHARED NOTE</span><h1>{data.title}</h1><p>This is a read-only snapshot shared from NS Engineering Studio.</p><div className="sv-meta"><span className="form-type-pill">Read only</span><span className="form-type-pill">Expires in {timeLeft(data.expiresAt)}</span></div></section>
        <section className="public-card shared-note-card"><article className="shared-note-document">{renderSharedNote(data.content || "", token)}</article>{data.tags?.length ? <div className="private-note-tags shared-note-tags">{data.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}</section>
        <p className="privacy-foot sv-terms">This link gives access to a saved snapshot until it expires or is revoked. Recipients can still copy, photograph or screenshot anything they can view; keep sensitive information out of shared notes.</p>
      </> : <>
        {mark ? <div className="sv-watermark" aria-hidden="true">{Array.from({ length: 60 }, (_, index) => <span key={index}>{mark}</span>)}</div> : null}
        <section className="public-intro sv-intro"><span className="eyebrow">SECURE SHARED DATA</span><h1>{data.title}</h1>
          {data.message ? <p>{data.message}</p> : null}
          <div className="sv-meta"><span className="form-type-pill">{data.rowCount} record{data.rowCount === 1 ? "" : "s"}</span><span className="form-type-pill">Expires in {timeLeft(data.expiresAt)}</span>{data.masked ? <span className="form-type-pill">Preview · contact details hidden</span> : null}</div>
        </section>
        <section className={`public-card sv-card ${data.allowDownload ? "" : "sv-noprint"}`}>
          <div className="sv-toolbar">
            <input className="sv-search" value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} placeholder="Search this list…" aria-label="Search this list" />
            <span className="sv-count">{rows.length} shown</span>
            {data.allowDownload ? <div className="sv-downloads"><button className="secondary-button" onClick={() => void download("xlsx")} disabled={downloading}>Excel</button><button className="secondary-button" onClick={() => void download("csv")} disabled={downloading}>CSV</button></div> : null}
          </div>
          {error ? <div role="alert" className="form-error">{error}</div> : null}
          <div className="table-scroll"><table className="contacts-table sv-table"><thead><tr>{data.columns.map((column) => <th key={column.key}><button className="sv-sort" onClick={() => { if (sortKey === column.key) setSortDesc(!sortDesc); else { setSortKey(column.key); setSortDesc(false); } }}>{column.label}{sortKey === column.key ? (sortDesc ? " ▼" : " ▲") : ""}</button></th>)}</tr></thead>
            <tbody>{rows.slice(0, shown).map((row, index) => <tr key={index}>{data.columns.map((column) => <td key={column.key}>{row[column.key] || "—"}</td>)}</tr>)}</tbody></table></div>
          {rows.length > shown ? <button className="secondary-button sv-more" onClick={() => setShown(shown + PAGE)}>Show more ({rows.length - shown} remaining)</button> : null}
          {!rows.length ? <p className="sv-empty">No records match your search.</p> : null}
        </section>
        <p className="privacy-foot sv-terms">Confidential. Licensed to {data.recipientName || "the recipient"} for their own business use only. Do not copy, resell or share this information. Access is logged and expires automatically.</p>
      </> : null}
    <footer className="public-footer"><span>Confidential shared data</span><span>{brand?.name || "NS Engineering Studio"} · Secure access</span></footer>
  </main>;
}
