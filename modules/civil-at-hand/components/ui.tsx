"use client";

// Shared interface kit for the Engineering Workspace: icons, data loading, generic forms driven by the shared field
// specs (lib/entity-spec.ts), tables, dialogs and confirmations. Visual styles live in app/design-system.css.
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { escapeCsv } from "@/modules/civil-at-hand/lib/csv";
import type { FieldSpec } from "@/modules/civil-at-hand/lib/entity-spec";
import { defaultSettings, formatMoney, type BusinessSettings } from "@/modules/civil-at-hand/lib/settings";
import type { ContactRecord, ProjectRecord } from "@/modules/civil-at-hand/lib/types";

/* ================================================================== icons */
const iconPaths: Record<string, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  contacts: <><path d="M16 20c0-3-2.5-5-6-5s-6 2-6 5v1h12z" /><circle cx="10" cy="8" r="4" /><path d="M16 4.5a4 4 0 0 1 0 7.5M18 15c2.8.4 4 2.1 4 4.3V21h-4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20v-1a7 7 0 0 1 14 0v1M16 5.5a3.5 3.5 0 0 1 0 6.8M18 15a5.2 5.2 0 0 1 4 5" /></>,
  links: <><path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11.2 4.7" /><path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1l1.6-1.6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M4 17v4h16v-4" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
  edit: <path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20z" />,
  trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  filter: <path d="M3 5h18M6 12h12M10 19h4" />,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  note: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></>,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4" /></>,
  ruler: <><path d="M3 17 17 3l4 4L7 21z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></>,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  truck: <><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  helmet: <><path d="M4 15a8 8 0 0 1 16 0" /><path d="M2 15h20v3H2zM10 7v4M14 7v4" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  gavel: <><path d="m14 4 6 6M11 7l6 6M4 20l7-7M9 9l6 6" /><path d="M3 21h8" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  print: <><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></>,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
};
export type IconName = keyof typeof iconPaths | string;
export function Icon({ name, size = 18, label }: { name: IconName; size?: number; label?: string }) {
  return <svg className="icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : "true"} role={label ? "img" : undefined} aria-label={label}>{iconPaths[name] || iconPaths.file}</svg>;
}

/* ================================================================== requests */
export class ApiError extends Error {
  status: number; data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) { super(message); this.status = status; this.data = data; }
}

export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json: body, ...rest } = init || {};
  const response = await fetch(url, {
    ...rest, cache: "no-store", credentials: "same-origin",
    headers: { ...(rest.headers || {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : rest.body,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) window.dispatchEvent(new Event("cah-unauthorized"));
  if (!response.ok) throw new ApiError((data as { error?: string }).error || "Something went wrong. Please try again.", response.status, data as Record<string, unknown>);
  return data as T;
}

export function useResource<T>(url: string | null, pick: (data: Record<string, unknown>) => T, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState("");
  const pickRef = useRef(pick);
  useEffect(() => { pickRef.current = pick; });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!url) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError("");
    api(url).then((result) => { if (live) setData(pickRef.current(result)); }).catch((err: Error) => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [url, version]);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { data, setData, loading, error, reload };
}

export function newClientRef(): string {
  const bytes = new Uint8Array(12);
  try { crypto.getRandomValues(bytes); } catch { for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256); }
  return `c${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/* ================================================================== workspace context */
export type Notify = (message: string, type?: "success" | "error" | "info") => void;
export type Workspace = {
  settings: BusinessSettings; money: (value: number | null | undefined, compact?: boolean) => string;
  contacts: ContactRecord[]; projects: ProjectRecord[]; notify: Notify; reloadCore: () => Promise<void> | void;
  navigate: (tab: string, focus?: { kind: string; id: string; filter?: string }) => void;
  saveSettings: (patch: Partial<BusinessSettings>) => Promise<void>;
};
const WorkspaceContext = createContext<Workspace>({
  settings: defaultSettings, money: (value) => formatMoney(value), contacts: [], projects: [], notify: () => undefined, reloadCore: () => undefined, navigate: () => undefined, saveSettings: async () => undefined,
});
export const WorkspaceProvider = WorkspaceContext.Provider;
export function useWorkspace() { return useContext(WorkspaceContext); }

/* ================================================================== formatting */
export function dateLabel(value?: string | Date | null, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dateOnly = !withTime && /T00:00:00(\.000)?Z$/.test(date.toISOString());
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}), ...(dateOnly ? { timeZone: "UTC" } : {}) });
}
export const dayInput = (value?: string | Date | null) => (value ? new Date(value).toISOString().slice(0, 10) : "");
export function todayInput(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
export const qtyLabel = (value?: number | null, unit = "") => (value === null || value === undefined ? "—" : `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ""}`);

/* ================================================================== layout primitives */
export function PageSection({ title, description, actions, children, className = "", id }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return <section className={`ui-section ${className}`} id={id} aria-labelledby={title && id ? `${id}-title` : undefined}>
    {title || actions ? <header className="ui-section-head"><div>{title ? <h2 id={id ? `${id}-title` : undefined}>{title}</h2> : null}{description ? <p>{description}</p> : null}</div>{actions ? <div className="ui-section-actions">{actions}</div> : null}</header> : null}
    {children}
  </section>;
}

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) { return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>; }

export function StatCard({ label, value, detail, tone = "neutral", icon, onClick }: { label: string; value: ReactNode; detail?: ReactNode; tone?: Tone; icon?: IconName; onClick?: () => void }) {
  const body = <>{icon ? <span className={`ui-stat-icon ui-tone-${tone}`}><Icon name={icon} size={17} /></span> : null}<span className="ui-stat-copy"><span className="ui-stat-label">{label}</span><strong className="ui-stat-value">{value}</strong>{detail ? <span className="ui-stat-detail">{detail}</span> : null}</span>{onClick ? <span className="ui-stat-go" aria-hidden="true"><Icon name="chevron" size={16} /></span> : null}</>;
  return onClick ? <button type="button" className="ui-stat" onClick={onClick}>{body}</button> : <div className="ui-stat">{body}</div>;
}

export function EmptyState({ icon = "file", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="ui-empty"><span className="ui-empty-icon"><Icon name={icon} size={20} /></span><strong>{title}</strong>{children ? <p>{children}</p> : null}{action ? <div className="ui-empty-action">{action}</div> : null}</div>;
}

export function Loading({ label = "Loading…" }: { label?: string }) { return <div className="ui-loading" role="status"><span className="ui-spinner" aria-hidden="true" />{label}</div>; }
export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="ui-error" role="alert"><Icon name="alert" size={16} /><span>{message}</span>{onRetry ? <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onRetry}>Try again</button> : null}</div>;
}

export function Button({ variant = "secondary", size, icon, children, className = "", ...rest }: { variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet"; size?: "sm"; icon?: IconName; children?: ReactNode; className?: string } & Record<string, unknown>) {
  return <button type="button" className={`ui-btn ui-btn-${variant}${size ? ` ui-btn-${size}` : ""} ${className}`} {...rest}>{icon ? <Icon name={icon} size={size === "sm" ? 15 : 16} /> : null}{children ? <span>{children}</span> : null}</button>;
}

export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (value: T) => void; items: { value: T; label: string; count?: number }[]; label: string }) {
  return <div className="ui-tabs" role="tablist" aria-label={label}>{items.map((item) => <button type="button" role="tab" key={item.value} aria-selected={value === item.value} className={value === item.value ? "is-active" : ""} onClick={() => onChange(item.value)}>{item.label}{item.count !== undefined ? <span className="ui-tab-count">{item.count}</span> : null}</button>)}</div>;
}

/** Accessible dialog with focus on open, Escape to close and a focus trap. */
export function Modal({ title, description, onClose, children, footer, size = "md" }: { title: string; description?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    window.setTimeout(() => (node?.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]), select, textarea, button") || node)?.focus(), 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      if (event.key === "Tab" && node) {
        const focusable = Array.from(node.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.classList.add("ui-modal-open");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("ui-modal-open"); previous?.focus?.(); };
  }, [onClose]);
  return <div className="ui-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`ui-modal ui-modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
      <header className="ui-modal-head"><div><h2 id={titleId}>{title}</h2>{description ? <p>{description}</p> : null}</div><button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></header>
      <div className="ui-modal-body">{children}</div>
      {footer ? <footer className="ui-modal-foot">{footer}</footer> : null}
    </div>
  </div>;
}

/* ================================================================== confirmations */
type ConfirmRequest = { title: string; message?: ReactNode; confirmLabel?: string; tone?: "danger" | "primary"; input?: { label: string; placeholder?: string; required?: boolean } };
type ConfirmState = ConfirmRequest & { resolve: (value: { ok: boolean; text: string }) => void };
const ConfirmContext = createContext<(request: ConfirmRequest) => Promise<{ ok: boolean; text: string }>>(async () => ({ ok: false, text: "" }));
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [text, setText] = useState("");
  const ask = useCallback((request: ConfirmRequest) => new Promise<{ ok: boolean; text: string }>((resolve) => { setText(""); setState({ ...request, resolve }); }), []);
  const close = (ok: boolean) => { state?.resolve({ ok, text }); setState(null); };
  return <ConfirmContext.Provider value={ask}>
    {children}
    {state ? <Modal size="sm" title={state.title} onClose={() => close(false)} footer={<><Button onClick={() => close(false)}>Cancel</Button><Button variant={state.tone === "primary" ? "primary" : "danger"} onClick={() => close(true)} disabled={Boolean(state.input?.required && !text.trim())} data-autofocus>{state.confirmLabel || "Confirm"}</Button></>}>
      {state.message ? <div className="ui-confirm-message">{state.message}</div> : null}
      {state.input ? <label className="ui-field"><span className="ui-label">{state.input.label}</span><input value={text} onChange={(event) => setText(event.target.value)} placeholder={state.input.placeholder} maxLength={300} /></label> : null}
    </Modal> : null}
  </ConfirmContext.Provider>;
}
export function useConfirm() { return useContext(ConfirmContext); }

/* ================================================================== search select */
export type Option = { value: string; label: string; hint?: string };
export function SearchSelect({ value, onChange, options, placeholder = "Search…", label, required, disabled, emptyLabel = "None" }: { value: string; onChange: (value: string, option?: Option) => void; options: Option[]; placeholder?: string; label: string; required?: boolean; disabled?: boolean; emptyLabel?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((option) => `${option.label} ${option.hint || ""}`.toLowerCase().includes(q)) : options;
    return list.slice(0, 40);
  }, [options, query]);
  function pick(option?: Option) { onChange(option?.value || "", option); setOpen(false); setQuery(""); }
  return <div className="ui-combobox">
    <input role="combobox" aria-expanded={open} aria-controls={listId} aria-label={label} aria-required={required} disabled={disabled}
      value={open ? query : selected?.label || ""} placeholder={selected ? selected.label : placeholder}
      onFocus={() => { setOpen(true); setActive(0); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(index + 1, matches.length - 1)); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
        else if (event.key === "Enter" && open) { event.preventDefault(); pick(matches[active]); }
        else if (event.key === "Escape") setOpen(false);
      }} />
    {value && !disabled ? <button type="button" className="ui-combobox-clear" onClick={() => pick(undefined)} aria-label={`Clear ${label}`}><Icon name="x" size={14} /></button> : null}
    {open ? <ul className="ui-combobox-list" id={listId} role="listbox">
      {!required ? <li role="option" aria-selected={!value} className="ui-combobox-none" onMouseDown={(event) => { event.preventDefault(); pick(undefined); }}>{emptyLabel}</li> : null}
      {matches.length ? matches.map((option, index) => <li role="option" key={option.value} aria-selected={option.value === value} className={index === active ? "is-active" : ""} onMouseDown={(event) => { event.preventDefault(); pick(option); }}><span>{option.label}</span>{option.hint ? <small>{option.hint}</small> : null}</li>) : <li className="ui-combobox-empty">No matches</li>}
    </ul> : null}
  </div>;
}

/* ================================================================== spec-driven form */
export type RefOptions = Partial<Record<string, Option[]>>;
type Values = Record<string, unknown>;

export function useRefOptions(extra: RefOptions = {}): RefOptions {
  const { contacts, projects } = useWorkspace();
  return useMemo(() => ({
    contact: contacts.map((contact) => ({ value: contact._id, label: contact.name, hint: [contact.organization, contact.city].filter(Boolean).join(" · ") })),
    project: projects.map((project) => ({ value: project._id, label: project.title, hint: [project.clientName, project.city].filter(Boolean).join(" · ") })),
    ...extra,
  }), [contacts, projects, extra]);
}

function fieldInputValue(spec: FieldSpec, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (spec.kind === "date") return dayInput(value as string);
  if (spec.kind === "datetime") { const date = new Date(String(value)); if (Number.isNaN(date.getTime())) return ""; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
  if (spec.kind === "tags") return Array.isArray(value) ? value.join(", ") : String(value);
  return String(value);
}

export function FieldInput({ spec, value, onChange, refs, settings }: { spec: FieldSpec; value: unknown; onChange: (value: unknown) => void; refs: RefOptions; settings: BusinessSettings }) {
  const common = { "aria-label": spec.label, required: spec.required, placeholder: spec.placeholder };
  switch (spec.kind) {
    case "textarea": return <textarea {...common} rows={spec.max && spec.max > 2000 ? 5 : 3} maxLength={spec.max ?? 4000} value={fieldInputValue(spec, value)} onChange={(event) => onChange(event.target.value)} />;
    case "number": case "money": case "percent":
      return <div className={`ui-affix ${spec.kind}`}>{spec.kind === "money" ? <span className="ui-affix-text">{settings.currency === "INR" ? "₹" : settings.currency}</span> : null}<input {...common} type="number" inputMode="decimal" step="any" min={spec.min ?? 0} max={spec.maxValue} value={fieldInputValue(spec, value)} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />{spec.kind === "percent" ? <span className="ui-affix-text">%</span> : null}</div>;
    case "date": return <input {...common} type="date" value={fieldInputValue(spec, value)} onChange={(event) => onChange(event.target.value || null)} />;
    case "datetime": return <input {...common} type="datetime-local" value={fieldInputValue(spec, value)} onChange={(event) => onChange(event.target.value ? new Date(event.target.value).toISOString() : null)} />;
    case "bool": return <label className="ui-check"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} /><span>{spec.label}</span></label>;
    case "tags": return <input {...common} value={fieldInputValue(spec, value)} onChange={(event) => onChange(event.target.value)} placeholder={spec.placeholder || "Comma-separated"} />;
    case "ref": return <SearchSelect label={spec.label} required={spec.required} value={String(value || "")} onChange={(next) => onChange(next)} options={refs[spec.ref || ""] || []} placeholder={`Search ${spec.label.toLowerCase()}…`} />;
    case "select": {
      const fromSettings = spec.optionsFrom ? (settings[spec.optionsFrom as keyof BusinessSettings] as string[] | undefined) : undefined;
      const options = spec.options || (fromSettings || []).map((item) => ({ value: item, label: item }));
      const current = String(value ?? "");
      const withCurrent = current && !options.some((option) => option.value === current) ? [{ value: current, label: current }, ...options] : options;
      return <select {...common} value={current} onChange={(event) => onChange(event.target.value)}>{spec.options && spec.options.some((option) => option.value === "") ? null : <option value="">{spec.required ? "Choose…" : "Not set"}</option>}{withCurrent.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
    }
    default: return <input {...common} maxLength={spec.max ?? 200} value={fieldInputValue(spec, value)} onChange={(event) => onChange(event.target.value)} />;
  }
}

/** Editable rows for an "items" field (BOQ lines, order lines, checklists). */
export type RowTransform = (row: Values, key: string, value: unknown) => Values;
export function ItemsEditor({ spec, value, onChange, refs, settings, summary, transform }: { spec: FieldSpec; value: unknown; onChange: (value: Values[]) => void; refs: RefOptions; settings: BusinessSettings; summary?: (rows: Values[]) => ReactNode; transform?: RowTransform }) {
  const rows = (Array.isArray(value) ? value : []) as Values[];
  const fields = (spec.itemFields || []).filter((field) => !field.hidden);
  const blank = () => Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? (field.kind === "bool" ? false : field.kind === "number" || field.kind === "money" || field.kind === "percent" ? null : "")]));
  const update = (index: number, key: string, next: unknown) => onChange(rows.map((row, i) => (i === index ? (transform ? transform({ ...row, [key]: next }, key, next) : { ...row, [key]: next }) : row)));
  return <div className="ui-items">
    <div className="ui-items-scroll"><table className="ui-items-table">
      <thead><tr>{fields.map((field) => <th key={field.key} className={`col-${field.kind}`}>{field.label}{field.required ? <span className="ui-req" aria-hidden="true">*</span> : null}</th>)}<th><span className="sr-only">Remove</span></th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{fields.map((field) => <td key={field.key} className={`col-${field.kind}`}><FieldInput spec={field.kind === "textarea" ? { ...field, kind: "text" } : field} value={row[field.key]} onChange={(next) => update(index, field.key, next)} refs={refs} settings={settings} /></td>)}<td><button type="button" className="ui-icon-btn" onClick={() => onChange(rows.filter((_, i) => i !== index))} aria-label={`Remove row ${index + 1}`}><Icon name="trash" size={15} /></button></td></tr>)}</tbody>
    </table></div>
    {!rows.length ? <p className="ui-muted ui-items-empty">No rows yet.</p> : null}
    <div className="ui-items-foot"><Button size="sm" icon="plus" onClick={() => onChange([...rows, blank()])} disabled={rows.length >= (spec.max ?? 500)}>Add row</Button>{summary ? <div className="ui-items-summary">{summary(rows)}</div> : null}</div>
  </div>;
}

export type FormLayout = { title?: string; keys: string[] }[];

/** A complete form for an entity, generated from its field specs. */
export function SpecForm({ fields, initial, onSubmit, submitLabel = "Save", onCancel, refs, layout, renderExtra, itemSummary, busyLabel = "Saving…", itemTransforms, onFieldChange }: {
  fields: FieldSpec[]; initial: Values; onSubmit: (values: Values) => Promise<void>; submitLabel?: string; onCancel?: () => void; refs?: RefOptions;
  layout?: FormLayout; renderExtra?: (values: Values, set: (key: string, value: unknown) => void) => ReactNode; itemSummary?: Record<string, (rows: Values[]) => ReactNode>; busyLabel?: string;
  itemTransforms?: Record<string, RowTransform>; onFieldChange?: (key: string, value: unknown, values: Values) => Values | void;
}) {
  const { settings } = useWorkspace();
  const baseRefs = useRefOptions();
  const allRefs = useMemo(() => ({ ...baseRefs, ...(refs || {}) }), [baseRefs, refs]);
  const [values, setValues] = useState<Values>(() => ({ ...Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? null])), ...initial }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldChange = useRef(onFieldChange);
  useEffect(() => { fieldChange.current = onFieldChange; });
  const set = useCallback((key: string, value: unknown) => setValues((current) => { const next = { ...current, [key]: value }; return fieldChange.current?.(key, value, next) || next; }), []);
  const visible = fields.filter((field) => !field.hidden);
  const groups: FormLayout = layout || [{ keys: visible.map((field) => field.key) }];
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await onSubmit(values); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save."); }
    finally { setBusy(false); }
  }
  return <form className="ui-form" onSubmit={submit} noValidate={false}>
    {groups.map((group, groupIndex) => <fieldset className="ui-fieldset" key={groupIndex}>
      {group.title ? <legend>{group.title}</legend> : null}
      <div className="ui-grid">{group.keys.map((key) => {
        const spec = visible.find((field) => field.key === key);
        if (!spec) return null;
        if (spec.kind === "items") return <div className="ui-field ui-span-all" key={key}><span className="ui-label">{spec.label}{spec.required ? <span className="ui-req" aria-hidden="true">*</span> : null}</span><ItemsEditor spec={spec} value={values[key]} onChange={(next) => set(key, next)} refs={allRefs} settings={settings} summary={itemSummary?.[key]} transform={itemTransforms?.[key]} /></div>;
        if (spec.kind === "bool") return <div className="ui-field" key={key}><FieldInput spec={spec} value={values[key]} onChange={(next) => set(key, next)} refs={allRefs} settings={settings} /></div>;
        return <label className={`ui-field ${spec.kind === "textarea" ? "ui-span-all" : ""}`} key={key}>
          <span className="ui-label">{spec.label}{spec.required ? <span className="ui-req" aria-hidden="true">*</span> : null}</span>
          <FieldInput spec={spec} value={values[key]} onChange={(next) => set(key, next)} refs={allRefs} settings={settings} />
          {spec.help ? <small className="ui-help">{spec.help}</small> : null}
        </label>;
      })}</div>
    </fieldset>)}
    {renderExtra ? renderExtra(values, set) : null}
    {error ? <p className="ui-form-error" role="alert">{error}</p> : null}
    <div className="ui-form-actions">{onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}<button type="submit" className="ui-btn ui-btn-primary" disabled={busy}>{busy ? busyLabel : submitLabel}</button></div>
  </form>;
}

/* ================================================================== data table */
export type Column<T> = { key: string; label: string; render?: (row: T) => ReactNode; value?: (row: T) => string | number; align?: "right"; width?: string; hideOnMobile?: boolean; csv?: (row: T) => string | number };

function cellContent<T>(column: Column<T>, row: T): ReactNode {
  if (column.render) return column.render(row);
  const raw = column.value ? column.value(row) : (row as Record<string, unknown>)[column.key];
  if (raw === null || raw === undefined || raw === "") return "—";
  return typeof raw === "number" ? raw.toLocaleString("en-IN") : String(raw);
}

export function DataTable<T extends { _id: string }>({ rows, columns, onRowClick, empty, pageSize = 25, searchable = true, searchPlaceholder = "Search…", toolbar, csvName, rowActions, initialSort }: {
  rows: T[]; columns: Column<T>[]; onRowClick?: (row: T) => void; empty?: ReactNode; pageSize?: number; searchable?: boolean; searchPlaceholder?: string; toolbar?: ReactNode; csvName?: string; rowActions?: (row: T) => ReactNode; initialSort?: { key: string; dir: 1 | -1 };
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(initialSort || null);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? rows.filter((row) => columns.some((column) => String(column.value ? column.value(row) : (row as Record<string, unknown>)[column.key] ?? "").toLowerCase().includes(q))) : rows;
    if (sort) {
      const column = columns.find((item) => item.key === sort.key);
      const read = (row: T) => (column?.value ? column.value(row) : (row as Record<string, unknown>)[sort.key] as string | number);
      list = [...list].sort((a, b) => { const x = read(a); const y = read(b); if (x === y) return 0; if (x === undefined || x === null || x === "") return 1; if (y === undefined || y === null || y === "") return -1; return (x > y ? 1 : -1) * sort.dir; });
    }
    return list;
  }, [rows, columns, query, sort]);
  useEffect(() => { setPage(0); }, [query, rows.length]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice(page * pageSize, page * pageSize + pageSize);
  function exportCsv() {
    const header = columns.map((column) => escapeCsv(column.label)).join(",");
    const lines = filtered.map((row) => columns.map((column) => escapeCsv(column.csv ? column.csv(row) : column.value ? column.value(row) : (row as Record<string, unknown>)[column.key])).join(","));
    downloadText(`${csvName || "export"}-${todayInput()}.csv`, [header, ...lines].join("\r\n"), "text/csv");
  }
  return <div className="ui-table-wrap">
    {searchable || toolbar || csvName ? <div className="ui-table-toolbar">
      {searchable ? <label className="ui-search"><Icon name="search" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} /></label> : null}
      <div className="ui-table-tools">{toolbar}{csvName && rows.length ? <Button size="sm" icon="download" onClick={exportCsv}>CSV</Button> : null}</div>
    </div> : null}
    {filtered.length ? <>
      <div className="ui-table-scroll"><table className="ui-table">
        <thead><tr>{columns.map((column) => <th key={column.key} style={column.width ? { width: column.width } : undefined} className={`${column.align === "right" ? "num" : ""} ${column.hideOnMobile ? "hide-sm" : ""}`} aria-sort={sort?.key === column.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
          <button type="button" className="ui-th-btn" onClick={() => setSort((current) => current?.key === column.key ? { key: column.key, dir: current.dir === 1 ? -1 : 1 } : { key: column.key, dir: 1 })}>{column.label}{sort?.key === column.key ? <span aria-hidden="true">{sort.dir === 1 ? " ↑" : " ↓"}</span> : null}</button>
        </th>)}{rowActions ? <th className="ui-actions-col"><span className="sr-only">Actions</span></th> : null}</tr></thead>
        <tbody>{shown.map((row) => <tr key={row._id} className={onRowClick ? "is-clickable" : ""} onClick={onRowClick ? (event) => { if ((event.target as HTMLElement).closest("button, a, input, select, label")) return; onRowClick(row); } : undefined}>
          {columns.map((column, index) => { const content = cellContent(column, row); return <td key={column.key} className={`${column.align === "right" ? "num" : ""} ${column.hideOnMobile ? "hide-sm" : ""}`}>{index === 0 && onRowClick ? <button type="button" className="ui-row-link" onClick={() => onRowClick(row)}>{content}</button> : content}</td>; })}
          {rowActions ? <td className="ui-actions-col"><div className="ui-row-actions">{rowActions(row)}</div></td> : null}
        </tr>)}</tbody>
      </table></div>
      <div className="ui-table-foot"><span>{filtered.length === rows.length ? `${rows.length} record${rows.length === 1 ? "" : "s"}` : `${filtered.length} of ${rows.length} records`}</span>{pages > 1 ? <div className="ui-pager"><Button size="sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>Previous</Button><span>Page {page + 1} of {pages}</span><Button size="sm" onClick={() => setPage((value) => Math.min(pages - 1, value + 1))} disabled={page >= pages - 1}>Next</Button></div> : null}</div>
    </> : rows.length ? <EmptyState icon="search" title="No records match this search" action={<Button size="sm" onClick={() => setQuery("")}>Clear search</Button>} /> : empty || <EmptyState title="Nothing here yet" />}
  </div>;
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([type === "text/csv" ? `﻿${text}` : text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Key-value list for detail views. */
export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return <dl className="ui-details">{items.filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== "—").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function Progress({ value, tone = "accent", label }: { value: number | null | undefined; tone?: Tone; label?: string }) {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  return <span className="ui-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label || "Progress"}><i className={`ui-tone-${tone}`} style={{ width: `${pct}%` }} /></span>;
}

export function projectName(projects: ProjectRecord[], id?: string | null) { return (id && projects.find((project) => project._id === id)?.title) || ""; }
export function contactName(contacts: ContactRecord[], id?: string | null) { return (id && contacts.find((contact) => contact._id === id)?.name) || ""; }
