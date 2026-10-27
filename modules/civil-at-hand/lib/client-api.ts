// Small fetch helper shared by the admin screens (browser only).
export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) { super(message); this.status = status; this.data = data; }
}

export async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", response.status, data);
  return data;
}

export function dateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Clear app-owned browser storage after logout. Persistent business records belong in MongoDB, not here. */
export function clearBrowserAppState(): void {
  if (typeof window === "undefined") return;
  const clearPrefixed = (storage: Storage) => {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key && (key.startsWith("cah-") || key.startsWith("civil-at-hand-"))) storage.removeItem(key);
    }
  };
  try { clearPrefixed(window.localStorage); } catch { /* Storage can be disabled by browser policy. */ }
  try { clearPrefixed(window.sessionStorage); } catch { /* Storage can be disabled by browser policy. */ }
  try {
    if ("caches" in window) {
      void window.caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("cah-") || key.startsWith("civil-at-hand-")).map((key) => window.caches.delete(key)))).catch(() => undefined);
    }
  } catch { /* Cache Storage is optional and not used for database records. */ }
}
