// Merging duplicate contacts: keep one record, fill its blanks from the others, never lose information.
type Interaction = { at: Date | string; type: string; note: string };
export type MergeContact = {
  _id: string; phone?: string; email?: string; organization?: string; city?: string; state?: string; status?: string; tags?: string[]; notes?: string;
  followUpAt?: Date | string | null; details?: Record<string, string>; rating?: number; flag?: string; shareConsent?: string; interactions?: Interaction[];
};

const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";

export function mergeContactRecords(primary: MergeContact, others: MergeContact[]) {
  const all = [primary, ...others];
  const pick = (get: (c: MergeContact) => string | undefined) => { for (const c of all) { const v = get(c); if (!blank(v)) return String(v).trim(); } return ""; };
  const details: Record<string, string> = {};
  for (const key of new Set(all.flatMap((c) => Object.keys(c.details || {})))) details[key] = pick((c) => c.details?.[key]);
  const notes: string[] = [];
  for (const c of all) { const text = (c.notes || "").trim(); if (text && !notes.includes(text)) notes.push(text); }
  const dates = all.map((c) => c.followUpAt).filter((d): d is Date | string => !blank(d)).map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  const interactions = all.flatMap((c) => c.interactions || []).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(-200);
  // "no" (a refusal to be shared) always wins over "yes".
  const consents = all.map((c) => c.shareConsent || "");
  const shareConsent = consents.includes("no") ? "no" : consents.includes("yes") ? "yes" : "";
  const flag = all.some((c) => c.flag === "avoid") ? "avoid" : pick((c) => c.flag);
  return {
    phone: pick((c) => c.phone), email: pick((c) => c.email).toLowerCase(), organization: pick((c) => c.organization), city: pick((c) => c.city), state: pick((c) => c.state),
    tags: Array.from(new Set(all.flatMap((c) => c.tags || []))).slice(0, 30), notes: notes.join("\n---\n").slice(0, 6000), followUpAt: dates[0] || null,
    details, rating: Math.max(0, ...all.map((c) => Number(c.rating) || 0)), flag, shareConsent, interactions,
  };
}

/** How complete a record is; used to pre-select the best record to keep. */
export function completeness(c: MergeContact): number {
  return Object.values(c.details || {}).filter((v) => !blank(v)).length + (c.interactions?.length || 0) + (c.notes ? 1 : 0);
}
