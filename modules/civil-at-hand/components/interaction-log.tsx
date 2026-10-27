"use client";

import { useEffect, useState } from "react";
import { dateTime, jsonRequest } from "@/modules/civil-at-hand/lib/client-api";
import type { InteractionRecord } from "@/modules/civil-at-hand/lib/types";

const TYPES = [
  { value: "call", label: "Phone call" }, { value: "whatsapp", label: "WhatsApp" }, { value: "meeting", label: "Meeting" },
  { value: "site-visit", label: "Site visit" }, { value: "email", label: "Email" }, { value: "note", label: "Note" },
];
const typeLabel = (value: string) => TYPES.find((t) => t.value === value)?.label || value;

/** History of calls, meetings and notes for one contact. Lives inside the contact form, so it never uses a <form> or submit buttons. */
export default function InteractionLog({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<InteractionRecord[]>([]); const [loading, setLoading] = useState(true);
  const [type, setType] = useState("call"); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    jsonRequest(`/api/civil-at-hand/contacts/${contactId}`).then((data) => { if (live) setItems((data.contact?.interactions || []).slice().reverse()); })
      .catch(() => { if (live) setError("Could not load the history."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [contactId]);

  async function add() {
    if (!note.trim()) { setError("Write a short note first."); return; }
    setBusy(true); setError("");
    try { const data = await jsonRequest(`/api/civil-at-hand/contacts/${contactId}/interactions`, { method: "POST", body: JSON.stringify({ type, note }) }); setItems((data.interactions || []).slice().reverse()); setNote(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    try { const data = await jsonRequest(`/api/civil-at-hand/contacts/${contactId}/interactions?interactionId=${id}`, { method: "DELETE" }); setItems((data.interactions || []).slice().reverse()); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not remove."); }
  }

  return <div className="il-box"><h3>History &amp; notes <small>(calls, meetings, site visits)</small></h3>
    <div className="il-add"><select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type of interaction">{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
      <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} maxLength={1000} placeholder="What happened? e.g. Quoted ₹385/bag, will confirm Friday" aria-label="Interaction note" />
      <button type="button" className="secondary-button" onClick={() => void add()} disabled={busy}>{busy ? "Adding…" : "Add"}</button></div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {loading ? <span className="spinner" /> : items.length ? <ul className="il-list">{items.map((item) => <li key={item._id}><span className="il-type">{typeLabel(item.type)}</span><span className="il-note">{item.note}</span><small>{dateTime(item.at)}</small><button type="button" className="il-del" onClick={() => void remove(item._id)} aria-label="Remove this entry">×</button></li>)}</ul> : <p className="il-empty">No history yet. Add the first entry above.</p>}
  </div>;
}
