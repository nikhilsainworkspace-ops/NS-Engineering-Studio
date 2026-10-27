"use client";

import { useMemo, useState } from "react";
import { categoryLabel } from "@/modules/civil-at-hand/lib/categories";
import { jsonRequest } from "@/modules/civil-at-hand/lib/client-api";
import { duplicateGroups } from "@/modules/civil-at-hand/lib/duplicates";
import { shortDate } from "@/modules/civil-at-hand/lib/format";
import { completeness, type MergeContact } from "@/modules/civil-at-hand/lib/merge";
import type { ContactRecord } from "@/modules/civil-at-hand/lib/types";

type Notify = (message: string, type?: "success" | "error" | "info") => void;

export default function MergeModal({ contacts, onClose, onDone, notify }: { contacts: ContactRecord[]; onClose: () => void; onDone: () => Promise<void>; notify: Notify }) {
  const groups = useMemo(() => duplicateGroups(contacts), [contacts]);
  const [keep, setKeep] = useState<Record<number, string>>({});
  const [busyGroup, setBusyGroup] = useState<number | null>(null);

  function best(group: ContactRecord[]): string {
    return [...group].sort((a, b) => completeness(b as unknown as MergeContact) - completeness(a as unknown as MergeContact) || b.updatedAt.localeCompare(a.updatedAt))[0]._id;
  }
  async function merge(index: number, group: ContactRecord[]) {
    const primaryId = keep[index] || best(group);
    const others = group.filter((c) => c._id !== primaryId);
    if (!window.confirm(`Keep “${group.find((c) => c._id === primaryId)?.name}” and merge ${others.length} duplicate(s) into it? Missing details are copied across; the duplicates are then deleted.`)) return;
    setBusyGroup(index);
    try { await jsonRequest("/api/civil-at-hand/contacts/merge", { method: "POST", body: JSON.stringify({ primaryId, otherIds: others.map((c) => c._id) }) }); notify("Duplicates merged."); await onDone(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not merge.", "error"); }
    finally { setBusyGroup(null); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card record-modal" role="dialog" aria-modal="true" aria-labelledby="merge-title">
    <div className="modal-head"><div><p className="eyebrow">CLEAN UP</p><h2 id="merge-title">Merge duplicate contacts</h2><p>Choose which record to keep. Phone, email, tags, notes and history from the others are copied into it.</p></div><button className="icon-button" onClick={onClose} aria-label="Close" type="button">×</button></div>
    <div className="record-form">{groups.length ? groups.map((group, index) => { const chosen = keep[index] || best(group); return <div className="mg-group" key={group.map((c) => c._id).join("-")}>
      {group.map((c) => <label className={`mg-row ${chosen === c._id ? "mg-keep" : ""}`} key={c._id}><input type="radio" name={`keep-${index}`} checked={chosen === c._id} onChange={() => setKeep({ ...keep, [index]: c._id })} />
        <span><strong>{c.name}</strong><small>{[c.phone, c.email].filter(Boolean).join(" · ") || "No phone/email"}</small><small>{categoryLabel(c.category)}{c.organization ? ` · ${c.organization}` : ""} · updated {shortDate(c.updatedAt)}</small></span>{chosen === c._id ? <b className="mg-tag">Keep</b> : null}</label>)}
      <button className="primary-button" onClick={() => void merge(index, group)} disabled={busyGroup !== null}>{busyGroup === index ? "Merging…" : `Merge ${group.length - 1} into the kept one`}</button></div>; }) : <div className="empty-state compact-empty"><h3>No duplicates left</h3><p>Every contact has a unique phone number and email.</p></div>}
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button></div></div>
  </section></div>;
}
