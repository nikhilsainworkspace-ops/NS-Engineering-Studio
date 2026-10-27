// Follow-up reminder helpers. Follow-up dates are calendar dates (YYYY-MM-DD), so they are
// compared as date strings against the viewer's local "today" to avoid time-zone surprises.

export type FollowUpItem = {
  kind: "contact" | "project";
  id: string;
  title: string;
  subtitle: string;
  date: string; // ISO date or date-time; only the first 10 characters are used
  phone?: string;
};

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

export type FollowUpBuckets = { overdue: FollowUpItem[]; today: FollowUpItem[]; week: FollowUpItem[]; later: FollowUpItem[] };

export function bucketFollowUps(items: FollowUpItem[], now: Date = new Date()): FollowUpBuckets {
  const today = dateKey(now);
  const weekEnd = addDays(today, 7);
  const out: FollowUpBuckets = { overdue: [], today: [], week: [], later: [] };
  const sorted = items.filter((item) => /^\d{4}-\d{2}-\d{2}/.test(item.date)).sort((a, b) => a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)));
  for (const item of sorted) {
    const key = item.date.slice(0, 10);
    if (key < today) out.overdue.push(item);
    else if (key === today) out.today.push(item);
    else if (key <= weekEnd) out.week.push(item);
    else out.later.push(item);
  }
  return out;
}

export function collectFollowUps(
  contacts: { _id: string; name: string; organization?: string; phone?: string; followUpAt?: string | null; status?: string }[],
  projects: { _id: string; title: string; clientName?: string; followUpAt?: string | null; status?: string }[],
): FollowUpItem[] {
  const items: FollowUpItem[] = [];
  for (const c of contacts) if (c.followUpAt && c.status !== "closed") items.push({ kind: "contact", id: c._id, title: c.name, subtitle: c.organization || "", date: c.followUpAt, phone: c.phone });
  for (const p of projects) if (p.followUpAt && !["completed", "closed", "lost"].includes(p.status || "")) items.push({ kind: "project", id: p._id, title: p.title, subtitle: p.clientName || "", date: p.followUpAt });
  return items;
}
