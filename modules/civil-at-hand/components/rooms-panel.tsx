"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { categories, contactStatuses } from "@/modules/civil-at-hand/lib/categories";
import { copyToClipboard, dateTime, jsonRequest } from "@/modules/civil-at-hand/lib/client-api";
import { formatINR } from "@/modules/civil-at-hand/lib/format";
import { rateGroups } from "@/modules/civil-at-hand/lib/rates";
import { consentAllows, contactShareFields, rateShareFields, roomStatusLabel, whatsappMessage, type RoomStatus } from "@/modules/civil-at-hand/lib/room-shared";
import type { ContactRecord, RateRecord, RoomRecord } from "@/modules/civil-at-hand/lib/types";

type Notify = (message: string, type?: "success" | "error" | "info") => void;
type Created = { room: RoomRecord; passcode: string; excludedForConsent: number };

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 hour" }, { value: "24", label: "1 day" }, { value: "72", label: "3 days" }, { value: "168", label: "7 days" },
  { value: "360", label: "15 days" }, { value: "720", label: "30 days" }, { value: "2160", label: "90 days" }, { value: "custom", label: "Pick date & time…" },
];
const OPEN_LIMITS = [{ value: "", label: "Unlimited opens" }, { value: "1", label: "1 open" }, { value: "3", label: "3 opens" }, { value: "5", label: "5 opens" }, { value: "10", label: "10 opens" }, { value: "25", label: "25 opens" }];

function StatusBadge({ status }: { status: string }) {
  return <span className={`rm-badge rm-${status}`}>{roomStatusLabel[status as RoomStatus] || status}</span>;
}
function payLabel(room: Pick<RoomRecord, "paymentStatus" | "price">) {
  if (room.paymentStatus === "paid") return `Paid ${formatINR(room.price)}`;
  if (room.paymentStatus === "unpaid") return `Unpaid ${formatINR(room.price)}`;
  return room.price ? `Free (${formatINR(room.price)})` : "Free / no charge";
}

/* ------------------------------------------------------------------ create ------------------------------------------------------------------ */
function CreateRoomModal({ contacts, rates, preselected, onClose, onCreated, ownerName }: { contacts: ContactRecord[]; rates: RateRecord[]; preselected: string[]; onClose: () => void; onCreated: () => Promise<void>; ownerName: string }) {
  const [title, setTitle] = useState(""); const [recipientName, setRecipientName] = useState(""); const [recipientContact, setRecipientContact] = useState(""); const [message, setMessage] = useState("");
  const [dataset, setDataset] = useState<"contacts" | "rates">("contacts");
  const [useSelected, setUseSelected] = useState(preselected.length > 0);
  const [category, setCategory] = useState(""); const [status, setStatus] = useState(""); const [place, setPlace] = useState(""); const [onlyPhone, setOnlyPhone] = useState(false);
  const [requireConsent, setRequireConsent] = useState(false); const [skipAvoid, setSkipAvoid] = useState(true);
  const [group, setGroup] = useState("");
  const [contactFields, setContactFields] = useState<string[]>(["name", "categoryLabel", "organization", "jobTitle", "teamRole", "phoneLabel", "phone", "additionalPhones", "emailLabel", "email", "additionalEmails", "city", "state"]);
  const [rateFields, setRateFields] = useState<string[]>(["item", "groupLabel", "spec", "unit", "rate", "city", "state", "validTill"]);
  const [includeDetails, setIncludeDetails] = useState(false); const [mask, setMask] = useState(false);
  const [expiry, setExpiry] = useState("168"); const [customExpiry, setCustomExpiry] = useState("");
  const [passMode, setPassMode] = useState<"auto" | "custom" | "none">("auto"); const [customPass, setCustomPass] = useState("");
  const [maxViews, setMaxViews] = useState(""); const [allowDownload, setAllowDownload] = useState(false); const [watermark, setWatermark] = useState(true);
  const [price, setPrice] = useState(""); const [payment, setPayment] = useState<"free" | "unpaid" | "paid">("free"); const [requirePayment, setRequirePayment] = useState(false); const [invoiceNote, setInvoiceNote] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [created, setCreated] = useState<Created | null>(null); const [copied, setCopied] = useState("");

  const selectedSet = useMemo(() => new Set(preselected), [preselected]);
  const matchingContacts = useMemo(() => {
    if (useSelected) return contacts.filter((c) => selectedSet.has(c._id));
    const q = place.trim().toLowerCase();
    return contacts.filter((c) => (!category || c.category === category) && (!status || c.status === status) && (!q || `${c.city} ${c.state}`.toLowerCase().includes(q)) && (!onlyPhone || Boolean(c.phone || c.phoneNumbers?.some((item) => item.number.trim()))));
  }, [contacts, useSelected, selectedSet, category, status, place, onlyPhone]);
  const eligibleContacts = useMemo(() => matchingContacts.filter((c) => consentAllows(c.shareConsent, requireConsent) && !(skipAvoid && c.flag === "avoid")), [matchingContacts, requireConsent, skipAvoid]);
  const matchingRates = useMemo(() => {
    const q = place.trim().toLowerCase();
    return rates.filter((r) => (!group || r.group === group) && (!q || `${r.city} ${r.state}`.toLowerCase().includes(q)));
  }, [rates, group, place]);
  const count = dataset === "contacts" ? eligibleContacts.length : matchingRates.length;
  const toggle = (list: string[], set: (v: string[]) => void, key: string) => set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!count) { setError("No records match, so there is nothing to share yet."); return; }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title, recipientName, recipientContact, message, dataset, fields: dataset === "contacts" ? contactFields : rateFields,
        includeDetails, mask, requireConsent, passcodeMode: passMode, passcode: customPass, maxViews: maxViews || null, allowDownload, watermark,
        price, paymentStatus: payment, requirePayment: payment === "unpaid" && requirePayment, invoiceNote,
        contactIds: eligibleContacts.map((c) => c._id), rateIds: matchingRates.map((r) => r._id),
      };
      if (expiry === "custom") { if (!customExpiry) throw new Error("Pick the expiry date and time."); body.expiresAt = new Date(customExpiry).toISOString(); } else body.expiryHours = Number(expiry);
      const data = await jsonRequest("/api/civil-at-hand/rooms", { method: "POST", body: JSON.stringify(body) });
      setCreated(data as Created); await onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create the shared database."); }
    finally { setBusy(false); }
  }
  async function copy(text: string, label: string) { if (await copyToClipboard(text)) { setCopied(label); setTimeout(() => setCopied(""), 1800); } }

  if (created) {
    const msg = whatsappMessage({ recipient: created.room.recipientName, title: created.room.title, url: created.room.shareUrl, passcode: created.passcode, expiresAt: created.room.expiresAt, ownerName });
    return <div className="modal-backdrop" role="presentation"><section className="modal-card record-modal" role="dialog" aria-modal="true" aria-labelledby="room-done-title">
      <div className="modal-head"><div><p className="eyebrow">READY TO SHARE</p><h2 id="room-done-title">“{created.room.title}” is live</h2><p>{created.room.rowCount} record(s) frozen into this link. It expires {dateTime(created.room.expiresAt)}.</p></div></div>
      <div className="record-form">
        {created.excludedForConsent > 0 ? <p className="rm-note">{created.excludedForConsent} contact(s) were left out because they have not agreed to be shared.</p> : null}
        <div className="rm-copy-row"><div><small>Link</small><code>{created.room.shareUrl}</code></div><button className="secondary-button" onClick={() => void copy(created.room.shareUrl, "link")}>{copied === "link" ? "Copied ✓" : "Copy link"}</button></div>
        {created.passcode ? <div className="rm-copy-row"><div><small>Passcode (shown only now)</small><code className="rm-passcode">{created.passcode}</code></div><button className="secondary-button" onClick={() => void copy(created.passcode, "pass")}>{copied === "pass" ? "Copied ✓" : "Copy passcode"}</button></div> : <p className="rm-note">No passcode: anyone with the link can open it until it expires.</p>}
        <textarea className="rm-message" readOnly rows={7} value={msg} aria-label="Message to send" />
        <div className="modal-actions"><button className="secondary-button" onClick={() => void copy(msg, "msg")}>{copied === "msg" ? "Copied ✓" : "Copy message"}</button><a className="primary-button" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a><a className="secondary-button" href={created.room.shareUrl} target="_blank" rel="noopener noreferrer">Test link ↗</a><button className="secondary-button" onClick={onClose}>Done</button></div>
      </div></section></div>;
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card record-modal" role="dialog" aria-modal="true" aria-labelledby="room-modal-title">
    <div className="modal-head"><div><p className="eyebrow">SECURE SHARING</p><h2 id="room-modal-title">Share a database with a client</h2><p>A frozen copy of the records you choose, opened with a private link that expires by itself.</p></div><button className="icon-button" onClick={onClose} aria-label="Close" type="button">×</button></div>
    <form className="record-form" onSubmit={submit}>
      <div className="rm-section"><h3>1 · Who is it for?</h3><div className="form-grid admin-form-grid">
        <label className="field-wrap field-full"><span>Name of this shared database <b className="required-star">*</b></span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required placeholder="e.g. Manpower suppliers — Punjab (Oct 2026)" /></label>
        <label className="field-wrap"><span>Client / company</span><input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} maxLength={160} placeholder="Who will receive it" /></label>
        <label className="field-wrap"><span>Their phone or email (optional)</span><input value={recipientContact} onChange={(e) => setRecipientContact(e.target.value)} maxLength={180} /></label>
        <label className="field-wrap field-full"><span>Short message they will see (optional)</span><textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="e.g. Verified suppliers as of October 2026" /></label>
      </div></div>

      <div className="rm-section"><h3>2 · What do you want to share?</h3><div className="form-grid admin-form-grid">
        <label className="field-wrap field-full"><span>Data</span><select value={dataset} onChange={(e) => setDataset(e.target.value as "contacts" | "rates")}><option value="contacts">Contacts (suppliers, contractors, workers…)</option><option value="rates">Rate book (material, labour, equipment rates)</option></select></label>
        {dataset === "contacts" ? <>
          {preselected.length ? <label className="rm-check field-full"><input type="checkbox" checked={useSelected} onChange={(e) => setUseSelected(e.target.checked)} /> Use the {preselected.length} contact(s) I selected</label> : null}
          {!useSelected ? <>
            <label className="field-wrap"><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            <label className="field-wrap"><span>Relationship status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{contactStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
            <label className="field-wrap"><span>City or state contains</span><input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Punjab" /></label>
            <label className="rm-check"><input type="checkbox" checked={onlyPhone} onChange={(e) => setOnlyPhone(e.target.checked)} /> Only contacts with a phone number</label>
          </> : null}
          <label className="rm-check field-full"><input type="checkbox" checked={requireConsent} onChange={(e) => setRequireConsent(e.target.checked)} /> Only contacts who explicitly agreed to be shared (recommended)</label><p className="rm-note field-full">Contacts marked “No, never share” are always excluded. When this option is off, contacts with no recorded consent may be included—share only where you have a valid reason and permission.</p>
          <label className="rm-check field-full"><input type="checkbox" checked={skipAvoid} onChange={(e) => setSkipAvoid(e.target.checked)} /> Leave out contacts I flagged “Avoid”</label>
        </> : <>
          <label className="field-wrap"><span>Type</span><select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All types</option>{rateGroups.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
          <label className="field-wrap"><span>City or state contains</span><input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Chandigarh" /></label>
        </>}
        <p className={`rm-count field-full ${count ? "" : "rm-count-zero"}`}><strong>{count}</strong> record{count === 1 ? "" : "s"} will be shared{dataset === "contacts" && matchingContacts.length - eligibleContacts.length > 0 ? ` · ${matchingContacts.length - eligibleContacts.length} left out (no consent or flagged)` : ""}</p>
      </div></div>

      <div className="rm-section"><h3>3 · What can they see?</h3>
        <div className="rm-checks">{(dataset === "contacts" ? contactShareFields : rateShareFields).map((f) => { const list = dataset === "contacts" ? contactFields : rateFields; const set = dataset === "contacts" ? setContactFields : setRateFields; return <label className="rm-check" key={f.key}><input type="checkbox" checked={list.includes(f.key)} onChange={() => toggle(list, set, f.key)} /> {f.label}</label>; })}</div>
        {dataset === "contacts" ? <><label className="rm-check"><input type="checkbox" checked={includeDetails} onChange={(e) => setIncludeDetails(e.target.checked)} /> Include category details (skills, capacity, products, licences…)</label>
          <label className="rm-check"><input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} /> Preview mode: hide most of each phone number and email</label></> : null}
        <p className="rm-note">Private notes, relationship status, ratings and follow-ups are never shared. Labels / tags are included only when you explicitly select that field above.</p>
      </div>

      <div className="rm-section"><h3>4 · Access rules</h3><div className="form-grid admin-form-grid">
        <label className="field-wrap"><span>Link works for</span><select value={expiry} onChange={(e) => setExpiry(e.target.value)}>{EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        {expiry === "custom" ? <label className="field-wrap"><span>Expires at</span><input type="datetime-local" value={customExpiry} onChange={(e) => setCustomExpiry(e.target.value)} /></label> : <label className="field-wrap"><span>Number of opens</span><select value={maxViews} onChange={(e) => setMaxViews(e.target.value)}>{OPEN_LIMITS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
        {expiry === "custom" ? <label className="field-wrap"><span>Number of opens</span><select value={maxViews} onChange={(e) => setMaxViews(e.target.value)}>{OPEN_LIMITS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label> : null}
        <label className="field-wrap"><span>Passcode</span><select value={passMode} onChange={(e) => setPassMode(e.target.value as "auto" | "custom" | "none")}><option value="auto">Create a strong one for me</option><option value="custom">I will type one</option><option value="none">No passcode (link only)</option></select></label>
        {passMode === "custom" ? <label className="field-wrap"><span>Your passcode (4+ characters)</span><input value={customPass} onChange={(e) => setCustomPass(e.target.value)} minLength={4} maxLength={40} autoComplete="off" /></label> : null}
        <label className="rm-check"><input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} /> Watermark with their name (traces leaks)</label>
        <label className="rm-check"><input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} /> Let them download Excel / CSV</label>
      </div></div>

      <div className="rm-section"><h3>5 · Payment (your own record)</h3><div className="form-grid admin-form-grid">
        <label className="field-wrap"><span>Price (₹)</span><input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 5000" /></label>
        <label className="field-wrap"><span>Payment status</span><select value={payment} onChange={(e) => setPayment(e.target.value as "free" | "unpaid" | "paid")}><option value="free">Free / not charged</option><option value="unpaid">Unpaid (invoice sent)</option><option value="paid">Paid</option></select></label>
        {payment === "unpaid" ? <label className="rm-check field-full"><input type="checkbox" checked={requirePayment} onChange={(e) => setRequirePayment(e.target.checked)} /> Keep the link locked until I mark it Paid</label> : null}
        <label className="field-wrap field-full"><span>Invoice / payment note (private)</span><input value={invoiceNote} onChange={(e) => setInvoiceNote(e.target.value)} maxLength={500} placeholder="e.g. Invoice #112, UPI after delivery" /></label>
      </div></div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={busy || !count}>{busy ? "Creating…" : `Create secure link (${count})`}</button></div>
    </form></section></div>;
}

/* ------------------------------------------------------------------ details ------------------------------------------------------------------ */
function RoomDetailModal({ id, onClose, onChanged, notify }: { id: string; onClose: () => void; onChanged: () => Promise<void>; notify: Notify }) {
  const [room, setRoom] = useState<RoomRecord | null>(null); const [loadError, setLoadError] = useState("");
  const [newPass, setNewPass] = useState(""); const [priceDraft, setPriceDraft] = useState(""); const [busy, setBusy] = useState(false);

  async function load() {
    try { const data = await jsonRequest(`/api/civil-at-hand/rooms/${id}`); setRoom(data.room); setPriceDraft(data.room.price === null ? "" : String(data.room.price)); }
    catch (err) { setLoadError(err instanceof Error ? err.message : "Could not load details."); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  async function patch(body: Record<string, unknown>, success = "Saved.") {
    setBusy(true);
    try { const data = await jsonRequest(`/api/civil-at-hand/rooms/${id}`, { method: "PATCH", body: JSON.stringify(body) }); if (data.passcode) setNewPass(data.passcode); notify(success); await load(); await onChanged(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not save.", "error"); }
    finally { setBusy(false); }
  }
  async function copy(text: string, label: string) { notify((await copyToClipboard(text)) ? `${label} copied.` : "Copy was blocked by the browser.", "info"); }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card record-modal" role="dialog" aria-modal="true" aria-labelledby="room-detail-title">
    <div className="modal-head"><div><p className="eyebrow">SHARED DATABASE</p><h2 id="room-detail-title">{room?.title || "Loading…"}</h2><p>{room ? `${room.recipientName || "No recipient name"} · ${room.rowCount} record(s) · created ${dateTime(room.createdAt)}` : ""}</p></div><button className="icon-button" onClick={onClose} aria-label="Close" type="button">×</button></div>
    {loadError ? <div className="record-form"><p className="form-error">{loadError}</p></div> : !room ? <div className="record-form"><span className="spinner" /></div> : <div className="record-form">
      <div className="rm-row"><StatusBadge status={room.status} /><span>Expires {dateTime(room.expiresAt)}</span><span>Opened {room.viewCount}{room.maxViews ? ` of ${room.maxViews}` : ""} time(s)</span><span>{payLabel(room)}</span></div>
      <div className="rm-copy-row"><div><small>Link</small><code>{room.shareUrl}</code></div><button className="secondary-button" onClick={() => void copy(room.shareUrl, "Link")}>Copy link</button></div>
      {newPass ? <div className="rm-copy-row"><div><small>New passcode (shown only now)</small><code className="rm-passcode">{newPass}</code></div><button className="secondary-button" onClick={() => void copy(newPass, "Passcode")}>Copy</button></div> : null}

      <div className="rm-section"><h3>Time</h3><div className="rm-actions">{[[24, "+1 day"], [168, "+7 days"], [720, "+30 days"]].map(([h, label]) => <button key={String(h)} className="secondary-button" disabled={busy} onClick={() => void patch({ extendHours: h }, "Expiry extended.")}>{label}</button>)}
        <button className="secondary-button" disabled={busy} onClick={() => void patch({ active: !room.active }, room.active ? "Link paused." : "Link resumed.")}>{room.active ? "Pause link" : "Resume link"}</button></div></div>

      <div className="rm-section"><h3>Access</h3><div className="rm-actions">
        <button className="secondary-button" disabled={busy} onClick={() => void patch({ passcodeAction: "reset" }, "New passcode created.")}>{room.hasPasscode ? "Reset passcode" : "Add a passcode"}</button>
        {room.hasPasscode ? <button className="secondary-button" disabled={busy} onClick={() => { if (window.confirm("Remove the passcode? Anyone with the link could then open it.")) void patch({ passcodeAction: "clear" }, "Passcode removed."); }}>Remove passcode</button> : null}
        {room.status === "locked" ? <button className="secondary-button" disabled={busy} onClick={() => void patch({ unlock: true }, "Unlocked.")}>Unlock now</button> : null}
        <button className="secondary-button" disabled={busy} onClick={() => void patch({ resetViews: true }, "Open counter reset.")}>Reset opens</button>
        <select aria-label="Open limit" value={room.maxViews === null ? "" : String(room.maxViews)} disabled={busy} onChange={(e) => void patch({ maxViews: e.target.value ? Number(e.target.value) : null }, "Open limit updated.")}>{OPEN_LIMITS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <label className="rm-check"><input type="checkbox" checked={room.allowDownload} disabled={busy} onChange={(e) => void patch({ allowDownload: e.target.checked }, "Download setting saved.")} /> Allow Excel / CSV download</label>
        <label className="rm-check"><input type="checkbox" checked={room.watermark} disabled={busy} onChange={(e) => void patch({ watermark: e.target.checked }, "Watermark setting saved.")} /> Watermark with recipient name</label></div>

      <div className="rm-section"><h3>Payment</h3><div className="rm-actions">
        <input className="rm-price" inputMode="numeric" value={priceDraft} onChange={(e) => setPriceDraft(e.target.value)} placeholder="Price ₹" aria-label="Price" />
        <select aria-label="Payment status" value={room.paymentStatus} disabled={busy} onChange={(e) => void patch({ paymentStatus: e.target.value, price: priceDraft }, "Payment updated.")}><option value="free">Free</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select>
        <button className="secondary-button" disabled={busy} onClick={() => void patch({ price: priceDraft }, "Price saved.")}>Save price</button></div>
        {room.paymentStatus === "unpaid" ? <label className="rm-check"><input type="checkbox" checked={room.requirePayment} disabled={busy} onChange={(e) => void patch({ requirePayment: e.target.checked }, "Saved.")} /> Keep locked until marked Paid</label> : null}
        {room.invoiceNote ? <p className="rm-note">Note: {room.invoiceNote}</p> : null}</div>

      <div className="rm-section"><h3>What the client sees (first {room.preview?.length || 0} rows)</h3>
        <div className="table-scroll"><table className="contacts-table"><thead><tr>{(room.columns || []).map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{(room.preview || []).map((row, i) => <tr key={i}>{(room.columns || []).map((c) => <td key={c.key}>{row[c.key] || "—"}</td>)}</tr>)}</tbody></table></div></div>

      <div className="rm-section"><h3>Access log</h3>{room.accessLog?.length ? <ul className="rm-log">{room.accessLog.map((e, i) => <li key={i}><b className={`rm-log-${e.kind}`}>{e.kind === "open" ? "Opened" : e.kind === "download" ? "Downloaded" : "Wrong passcode"}</b><span>{dateTime(e.at)}</span><small>{e.agent} · {e.ip}</small></li>)}</ul> : <p className="rm-note">Nobody has opened this link yet.</p>}</div>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button></div>
    </div>}
  </section></div>;
}

/* ------------------------------------------------------------------ list ------------------------------------------------------------------ */
export default function RoomsPanel({ rooms, contacts, rates, creating, onCloseCreate, onChanged, notify, ownerName }: { rooms: RoomRecord[]; contacts: ContactRecord[]; rates: RateRecord[]; creating: { contactIds: string[] } | null; onCloseCreate: () => void; onChanged: () => Promise<void>; notify: Notify; ownerName: string }) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const live = rooms.filter((r) => r.status === "live").length;
  const opens = rooms.reduce((sum, r) => sum + r.viewCount, 0);
  const earned = rooms.filter((r) => r.paymentStatus === "paid").reduce((sum, r) => sum + (r.price || 0), 0);
  const pending = rooms.filter((r) => r.paymentStatus === "unpaid").reduce((sum, r) => sum + (r.price || 0), 0);

  async function copyLink(room: RoomRecord) { notify((await copyToClipboard(room.shareUrl)) ? "Link copied." : "Copy was blocked by the browser.", "info"); }
  async function toggle(room: RoomRecord) {
    try { await jsonRequest(`/api/civil-at-hand/rooms/${room._id}`, { method: "PATCH", body: JSON.stringify({ active: !room.active }) }); notify(room.active ? "Link paused. It stops working immediately." : "Link resumed."); await onChanged(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not update.", "error"); }
  }
  async function remove(room: RoomRecord) {
    if (!window.confirm(`Delete “${room.title}”? The link stops working and the frozen copy is erased. This cannot be undone.`)) return;
    try { await jsonRequest(`/api/civil-at-hand/rooms/${room._id}`, { method: "DELETE" }); notify("Shared database deleted."); await onChanged(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not delete.", "error"); }
  }
  function whatsapp(room: RoomRecord) {
    const text = whatsappMessage({ recipient: room.recipientName, title: room.title, url: room.shareUrl, expiresAt: room.expiresAt, ownerName });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return <div className="rm-view">
    <div className="pr-tiles">
      <article><span>Live links</span><strong>{live}</strong><small>{rooms.length} shared in total</small></article>
      <article><span>Total opens</span><strong>{opens}</strong><small>By your clients</small></article>
      <article><span>Received</span><strong>{formatINR(earned)}</strong><small>Marked as paid</small></article>
      <article><span>Waiting for payment</span><strong>{formatINR(pending)}</strong><small>Marked as unpaid</small></article>
    </div>
    <div className="link-howto"><div className="howto-badge">🔒</div><div><h2>Sell or share your data safely</h2><p>Pick records, set a price and an expiry, and send a private link. The client gets a frozen copy: your notes stay private, the link dies on time, and every open is logged.</p></div><div className="howto-steps"><span><b>1</b> Choose records</span><span><b>2</b> Set time &amp; passcode</span><span><b>3</b> Send link</span></div></div>
    {rooms.length ? <div className="links-grid">{rooms.map((room) => <article className="share-card" key={room._id}>
      <div className="share-card-top"><span className="share-category-icon">{room.dataset === "rates" ? "₹" : "DB"}</span><div className="share-title"><h3>{room.title}</h3><span>{room.recipientName || "No recipient"} · {room.rowCount} {room.dataset === "rates" ? "rates" : "contacts"}{room.masked ? " · preview" : ""}</span></div><StatusBadge status={room.status} /></div>
      <div className="share-status-line"><span className="submission-count">Opened {room.viewCount}{room.maxViews ? `/${room.maxViews}` : ""}× {room.lastViewedAt ? `· last ${dateTime(room.lastViewedAt)}` : ""}</span><span className="submission-count">{payLabel(room)}</span></div>
      <div className="share-expiry">Expires {dateTime(room.expiresAt)}<span>{room.hasPasscode ? "Passcode on" : "No passcode"}</span></div>
      <div className="share-card-actions"><button className="secondary-button" onClick={() => void copyLink(room)}>Copy link</button><button className="secondary-button" onClick={() => whatsapp(room)} disabled={room.status !== "live"}>WhatsApp</button><button className="secondary-button" onClick={() => setDetailId(room._id)}>Manage</button><button className={`small-state-button ${room.active ? "pause-button" : "activate-button"}`} onClick={() => void toggle(room)}>{room.active ? "Pause" : "Resume"}</button><button className="icon-button row-delete" onClick={() => void remove(room)} title="Delete" aria-label={`Delete ${room.title}`}>🗑</button></div>
    </article>)}</div> : <div className="empty-state links-empty"><h3>No shared databases yet</h3><p>Select contacts in the Contact database (or use filters here), then create a secure time-limited link for a client.</p></div>}
    {creating ? <CreateRoomModal contacts={contacts} rates={rates} preselected={creating.contactIds} onClose={onCloseCreate} onCreated={onChanged} ownerName={ownerName} /> : null}
    {detailId ? <RoomDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={onChanged} notify={notify} /> : null}
  </div>;
}
