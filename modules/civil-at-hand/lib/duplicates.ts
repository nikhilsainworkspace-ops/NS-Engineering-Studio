// Duplicate detection helpers shared by the server (create/import) and the dashboard (badges).
// Two contacts are treated as the same person/business when they share a phone number
// (compared on the last 10 digits, so "+91 98765 43210" matches "098765-43210") or an email address.

export function phoneKey(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 7) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function emailKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

type Keyed = {
  _id: string; phone?: string | null; email?: string | null;
  phoneNumbers?: { number?: string | null }[]; emailAddresses?: { value?: string | null }[];
};

function phoneKeys(item: Keyed): string[] {
  return [item.phone, ...(item.phoneNumbers || []).map((entry) => entry.number)].map(phoneKey).filter(Boolean);
}
function emailKeys(item: Keyed): string[] {
  return [item.email, ...(item.emailAddresses || []).map((entry) => entry.value)].map(emailKey).filter(Boolean);
}

/** Records in `list` that share the given phone or email (optionally ignoring one record, e.g. the one being edited). */
export function findMatches<T extends Keyed>(list: T[], phone: string, email: string, excludeId?: string): T[] {
  const p = phoneKey(phone);
  const e = emailKey(email);
  if (!p && !e) return [];
  return list.filter((item) => item._id !== excludeId && (
    (p && phoneKeys(item).includes(p)) || (e && emailKeys(item).includes(e))
  ));
}

/** Groups of two or more records that share a phone or email (connected through either). */
export function duplicateGroups<T extends Keyed>(list: T[]): T[][] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    let cursor = id;
    while (parent.get(cursor) !== root) { const next = parent.get(cursor) as string; parent.set(cursor, root); cursor = next; }
    return root;
  };
  const union = (a: string, b: string) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  const seen = new Map<string, string>();
  for (const item of list) parent.set(item._id, item._id);
  for (const item of list) {
    const keys = [
      ...phoneKeys(item).map((value) => `p:${value}`),
      ...emailKeys(item).map((value) => `e:${value}`),
    ];
    for (const key of new Set(keys)) {
      const other = seen.get(key);
      if (other) union(item._id, other); else seen.set(key, item._id);
    }
  }
  const groups = new Map<string, T[]>();
  for (const item of list) {
    const root = find(item._id);
    groups.set(root, [...(groups.get(root) || []), item]);
  }
  return Array.from(groups.values()).filter((group) => group.length > 1);
}

export function duplicateIdSet<T extends Keyed>(list: T[]): Set<string> {
  return new Set(duplicateGroups(list).flatMap((group) => group.map((item) => item._id)));
}
