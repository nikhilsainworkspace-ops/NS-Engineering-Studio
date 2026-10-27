"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import { categories, contactStatuses, getFields, categoryLabel, type FormField } from "@/modules/civil-at-hand/lib/categories";
import { clearBrowserAppState } from "@/modules/civil-at-hand/lib/client-api";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { dateKey, type FollowUpItem } from "@/modules/civil-at-hand/lib/followups";
import { duplicateIdSet } from "@/modules/civil-at-hand/lib/duplicates";
import { shortDate as dateOnly } from "@/modules/civil-at-hand/lib/format";
import type { ContactRecord, ProjectRecord, RateRecord, RoomRecord, ShareLinkRecord, TaskRecord, PrivateNoteRecord } from "@/modules/civil-at-hand/lib/types";
import FollowUpsPanel from "@/modules/civil-at-hand/components/followups-panel";
import ProjectsPanel, { ProjectModal } from "@/modules/civil-at-hand/components/projects-panel";
import ReportsPanel from "@/modules/civil-at-hand/components/reports-panel";
import RoomsPanel from "@/modules/civil-at-hand/components/rooms-panel";
import RatesPanel from "@/modules/civil-at-hand/components/rates-panel";
import SecurityPanel from "@/modules/civil-at-hand/components/security-panel";
import MergeModal from "@/modules/civil-at-hand/components/merge-modal";
import InteractionLog from "@/modules/civil-at-hand/components/interaction-log";
import TasksPanel from "@/modules/civil-at-hand/components/tasks-panel";
import PrivateNotesPanel from "@/modules/civil-at-hand/components/private-notes-panel";
import BusinessReports from "@/modules/civil-at-hand/components/business-reports";
import DocumentsPanel from "@/modules/civil-at-hand/components/documents-panel";
import EstimatesPanel from "@/modules/civil-at-hand/components/estimates-panel";
import FinancePanel from "@/modules/civil-at-hand/components/finance-panel";
import OverviewPanel from "@/modules/civil-at-hand/components/overview-panel";
import ProcurementPanel from "@/modules/civil-at-hand/components/procurement-panel";
import ProjectWorkspace from "@/modules/civil-at-hand/components/project-workspace";
import PublicPagesPanel from "@/modules/civil-at-hand/components/public-pages-panel";
import CustomFormsPanel from "@/modules/civil-at-hand/components/custom-forms-panel";
import SettingsPanel from "@/modules/civil-at-hand/components/settings-panel";
import SiteReportsPanel from "@/modules/civil-at-hand/components/site-reports-panel";
import TendersPanel from "@/modules/civil-at-hand/components/tenders-panel";
import WorkforcePanel from "@/modules/civil-at-hand/components/workforce-panel";
import { ConfirmProvider, Icon, WorkspaceProvider, type Workspace } from "@/modules/civil-at-hand/components/ui";
import { defaultSettings, formatMoney, withDefaults, type BusinessSettings } from "@/modules/civil-at-hand/lib/settings";
import { finishedStatuses } from "@/modules/civil-at-hand/lib/projects";

type Session = { authenticated: boolean; configured: boolean; appName: string; twoFactor?: boolean };
type Toast = { type: "success" | "error" | "info"; message: string };
type Tab = "overview" | "followups" | "tasks" | "notes" | "contacts" | "team" | "projects" | "rates" | "rooms" | "reports" | "links" | "security" | "settings"
  | "project" | "site" | "estimates" | "procurement" | "workforce" | "finance" | "documents" | "tenders" | "pages" | "customForms";
type Focus = { kind: string; id: string; filter?: string; seq: number };
type ServerHit = { kind: string; id: string; title: string; subtitle: string };
/** Navigation, grouped the way the business works. Every earlier panel is still here. */
const navGroups: { id: string; label: string; items: [Tab, string, string][] }[] = [
  { id: "today", label: "Overview", items: [["overview", "Command centre", "overview"], ["followups", "Follow-ups", "clock"], ["tasks", "Task planner", "calendar"], ["notes", "Private notes", "note"]] },
  { id: "crm", label: "Business & CRM", items: [["contacts", "Contacts", "contacts"], ["team", "Team directory", "users"], ["tenders", "Tenders & bids", "gavel"]] },
  { id: "projects", label: "Projects & site", items: [["projects", "Projects & leads", "briefcase"], ["site", "Site diary", "clipboard"]] },
  { id: "commercial", label: "Estimation", items: [["estimates", "Estimates & quotations", "calculator"], ["rates", "Rate book", "database"]] },
  { id: "supply", label: "Procurement & stock", items: [["procurement", "Materials & purchasing", "box"]] },
  { id: "people", label: "Workforce", items: [["workforce", "Labour & attendance", "helmet"]] },
  { id: "money", label: "Finance", items: [["finance", "Invoices, bills & expenses", "wallet"]] },
  { id: "docs", label: "Documents", items: [["documents", "Documents & approvals", "folder"]] },
  { id: "insight", label: "Reports", items: [["reports", "Reports", "chart"]] },
  { id: "public", label: "Public pages & forms", items: [["links", "Public form links", "links"], ["customForms", "Custom forms", "clipboard"], ["pages", "Public pages", "globe"], ["rooms", "Shared databases", "share"]] },
  { id: "admin", label: "Administration", items: [["settings", "Settings", "settings"], ["security", "Security & backups", "lock"]] },
];
type GlobalSearchResult =
  | { kind: "contact"; id: string; title: string; subtitle: string; record: ContactRecord }
  | { kind: "project"; id: string; title: string; subtitle: string; record: ProjectRecord }
  | { kind: "task"; id: string; title: string; subtitle: string; record: TaskRecord }
  | { kind: "note"; id: string; title: string; subtitle: string; record: PrivateNoteRecord }
  | { kind: "rate"; id: string; title: string; subtitle: string; record: RateRecord }
  | { kind: "room"; id: string; title: string; subtitle: string; record: RoomRecord }
  | { kind: "link"; id: string; title: string; subtitle: string; record: ShareLinkRecord };
const taskPriorityLabels: Record<TaskRecord["priority"], string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
const taskStatusLabels: Record<TaskRecord["status"], string> = { todo: "Pending", "in-progress": "In progress", done: "Completed", cancelled: "Cancelled" };

const brandName = brand.name;
const brandLogo = brand.logoUrl;
const brandColor = brand.color;

class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) { super(message); this.status = status; this.data = data; }
}

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !url.startsWith("/api/civil-at-hand/auth/") && !url.startsWith("/api/auth/")) window.dispatchEvent(new Event("cah-unauthorized"));
  if (!response.ok) throw new ApiError(data.error || "Something went wrong. Please try again.", response.status, data);
  return data;
}
function siteBase() {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  return (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C"; }
function shortDate(value?: string | null) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function relativeDate(value?: string) { if (!value) return "No date"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "No date"; const diff = Math.max(0, Date.now() - date.getTime()); if (diff < 60000) return "Just now"; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`; return shortDate(value); }
function statusLabel(status: string) { return contactStatuses.find((item) => item.value === status)?.label || status; }
function StatusPill({ status }: { status: string }) { return <span className={`status-pill status-${status}`}>{statusLabel(status)}</span>; }
function BrandMark({ large = false }: { large?: boolean }) { return brandLogo ? <img className={large ? "brand-logo-large" : "brand-logo"} src={brandLogo} alt={`${brandName} logo`} /> : <span className={`brand-mark ${large ? "large-mark" : ""}`} aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M4 25h24M7 25V13l9-7 9 7v12M12 25v-8h8v8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 13h2m6 0h2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/></svg></span>; }

function LoginScreen({ configured, twoFactor, onLogin, toast, clearToast }: { configured: boolean; twoFactor: boolean; onLogin: (user: string, pass: string, code: string) => Promise<void>; toast: Toast | null; clearToast: () => void }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false); const [code, setCode] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); clearToast(); setBusy(true); try { await onLogin(username, password, code); } catch { /* the message is shown by the parent */ } finally { setBusy(false); } }
  return <main className="auth-shell" style={{ "--brand": brandColor } as CSSProperties}>
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-brand"><BrandMark large /><span>{brandName}</span></div>
      <h1 id="auth-title" className="auth-title">Sign in</h1>
      {toast ? <div className={`auth-alert auth-alert-${toast.type}`} role="alert">{toast.message}</div> : null}
      {!configured ? <div className="auth-alert auth-alert-info" role="status">Sign-in is not set up yet. Configure <code>ADMIN_EMAIL</code>, an Argon2id <code>ADMIN_PASSWORD_HASH</code>, and a random 32+ character <code>AUTH_SECRET</code> in the server environment, then redeploy.</div> : null}
      <form onSubmit={submit} className="auth-form">
        <label className="auth-field"><span>Administrator email</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={!configured} /></label>
        <label className="auth-field"><span>Password</span><span className="auth-password"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={!configured} /><button type="button" className="auth-reveal" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><Icon name={showPassword ? "eyeOff" : "eye"} size={18} /></button></span></label>
        {twoFactor ? <label className="auth-field"><span>Authenticator code</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={!configured} /></label> : null}
        <button className="auth-submit" type="submit" disabled={busy || !configured}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  </main>;
}

function FieldControl({ field, value, onChange }: { field: FormField; value: string; onChange: (value: string) => void }) {
  if (field.type === "textarea") return <textarea rows={3} value={value || ""} required={field.required} placeholder={field.placeholder || "Enter details"} onChange={(event) => onChange(event.target.value)} maxLength={field.key === "notes" ? 6000 : 2000} />;
  if (field.type === "select") return <select value={value || ""} required={field.required} onChange={(event) => onChange(event.target.value)}><option value="">Select…</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  const type = field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : "text";
  return <input type={type} value={value || ""} required={field.required} placeholder={field.placeholder || "Enter details"} onChange={(event) => onChange(event.target.value)} maxLength={field.key === "notes" ? 6000 : 2000} />;
}

function ContactModal({ initial, onClose, onSave, saving, defaultTeam = false }: { initial: ContactRecord | null; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void>; saving: boolean; defaultTeam?: boolean }) {
  type PhoneLabel = "Mobile" | "Work" | "Home" | "Main" | "Other";
  type EmailLabel = "Work" | "Home" | "Other";
  type PhoneDraft = { label: PhoneLabel; number: string };
  type EmailDraft = { label: EmailLabel; value: string };
  const splitName = (name: string) => { const parts = String(name || "").trim().split(/\s+/).filter(Boolean); return { first: parts[0] || "", last: parts.length > 1 ? parts.slice(1).join(" ") : "" }; };
  const initialSplit = splitName(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "general-contact");
  const [details, setDetails] = useState<Record<string, string>>(initial?.details || {});
  const [firstName, setFirstName] = useState(initial?.firstName || initialSplit.first);
  const [lastName, setLastName] = useState(initial?.lastName || initialSplit.last);
  const [organization, setOrganization] = useState(initial?.organization || initial?.details?.organization || "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle || "");
  const [phone, setPhone] = useState(initial?.phone || initial?.details?.phone || "");
  const [phoneLabel, setPhoneLabel] = useState<PhoneLabel>((initial?.phoneLabel as PhoneLabel) || "Mobile");
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneDraft[]>((initial?.phoneNumbers || []).map((p) => ({ label: p.label, number: p.number })));
  const [email, setEmail] = useState(initial?.email || initial?.details?.email || "");
  const [emailLabel, setEmailLabel] = useState<EmailLabel>((initial?.emailLabel as EmailLabel) || "Work");
  const [emailAddresses, setEmailAddresses] = useState<EmailDraft[]>((initial?.emailAddresses || []).map((e) => ({ label: e.label, value: e.value })));
  const [birthday, setBirthday] = useState((initial?.birthday || "").slice(0, 10));
  const [city, setCity] = useState(initial?.city || initial?.details?.city || "");
  const [stateName, setStateName] = useState(initial?.state || initial?.details?.state || "");
  const [contactNotes, setContactNotes] = useState(initial?.notes || initial?.details?.notes || "");
  const [isTeamMember, setIsTeamMember] = useState(Boolean(initial?.isTeamMember || (!initial && defaultTeam)));
  const [teamRole, setTeamRole] = useState(initial?.teamRole || "");
  const [teamDepartment, setTeamDepartment] = useState(initial?.teamDepartment || "");
  const [status, setStatus] = useState(initial?.status || "new");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [followUpAt, setFollowUpAt] = useState(initial?.followUpAt ? initial.followUpAt.substring(0, 10) : "");
  const [rating, setRating] = useState(String(initial?.rating || 0));
  const [flag, setFlag] = useState(initial?.flag || "");
  const [shareConsent, setShareConsent] = useState(initial?.shareConsent || "");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fallback = splitName(initial?.name || "");
    setCategory(initial?.category || "general-contact"); setDetails(initial?.details || {});
    setFirstName(initial?.firstName || fallback.first); setLastName(initial?.lastName || fallback.last);
    setOrganization(initial?.organization || initial?.details?.organization || ""); setJobTitle(initial?.jobTitle || "");
    setPhone(initial?.phone || initial?.details?.phone || ""); setPhoneLabel((initial?.phoneLabel as PhoneLabel) || "Mobile");
    setPhoneNumbers((initial?.phoneNumbers || []).map((p) => ({ label: p.label, number: p.number })));
    setEmail(initial?.email || initial?.details?.email || ""); setEmailLabel((initial?.emailLabel as EmailLabel) || "Work"); setEmailAddresses((initial?.emailAddresses || []).map((e) => ({ label: e.label, value: e.value })));
    setBirthday((initial?.birthday || "").slice(0, 10)); setCity(initial?.city || initial?.details?.city || ""); setStateName(initial?.state || initial?.details?.state || "");
    setContactNotes(initial?.notes || initial?.details?.notes || ""); setIsTeamMember(Boolean(initial?.isTeamMember || (!initial && defaultTeam))); setTeamRole(initial?.teamRole || ""); setTeamDepartment(initial?.teamDepartment || "");
    setStatus(initial?.status || "new"); setTags((initial?.tags || []).join(", ")); setFollowUpAt(initial?.followUpAt ? initial.followUpAt.substring(0, 10) : "");
    setRating(String(initial?.rating || 0)); setFlag(initial?.flag || ""); setShareConsent(initial?.shareConsent || "");
  }, [initial, defaultTeam]);
  function update(key: string, value: string) { setDetails((current) => ({ ...current, [key]: value })); }
  function updatePhone(index: number, key: "label" | "number", value: string) { setPhoneNumbers((current) => current.map((item, i) => i === index ? { ...item, [key]: value } as PhoneDraft : item)); }
  function updateEmail(index: number, key: "label" | "value", value: string) { setEmailAddresses((current) => current.map((item, i) => i === index ? { ...item, [key]: value } as EmailDraft : item)); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setFormError("");
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
    if (!fullName) { setFormError("Please enter a first name or surname."); return; }
    if (!phone.trim() && !email.trim() && !phoneNumbers.some((item) => item.number.trim()) && !emailAddresses.some((item) => item.value.trim())) { setFormError("Add at least one phone number or email address."); return; }
    const mergedDetails = { ...details, fullName, phone: phone.trim(), email: email.trim(), organization: organization.trim(), city: city.trim(), state: stateName.trim(), notes: contactNotes, jobTitle: jobTitle.trim(), birthday };
    try {
      await onSave({ category, details: mergedDetails, name: fullName, firstName: firstName.trim(), lastName: lastName.trim(), organization, jobTitle, phone, phoneLabel, phoneNumbers, email, emailLabel, emailAddresses, birthday, city, state: stateName, notes: contactNotes, isTeamMember, teamRole, teamDepartment, status, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), followUpAt: followUpAt || null, rating: Number(rating), flag, shareConsent });
    } catch (error) { setFormError(error instanceof Error ? error.message : "Could not save this record."); }
  }
  const standardKeys = new Set(["fullName", "phone", "email", "organization", "city", "state", "notes"]);
  const specialtyFields = getFields(category).filter((field) => !standardKeys.has(field.key));

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card record-modal contact-google-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title"><div className="modal-head"><div><p className="eyebrow">CONTACTS · PRIVATE DATABASE</p><h2 id="record-modal-title">{initial ? "Edit contact" : "Create a contact"}</h2><p>Save phone numbers, emails, labels and team details in your MongoDB database.</p></div><button className="icon-button" onClick={onClose} aria-label="Close" type="button">×</button></div>
    <form onSubmit={submit} className="record-form contact-google-form">
      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">01</span><div><h3>Contact information</h3><p>Start with the person's name and the best way to reach them.</p></div></div>
        <div className="form-grid admin-form-grid">
          <label className="field-wrap"><span>First name *</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={80} autoComplete="given-name" placeholder="e.g. Rahul" required /></label>
          <label className="field-wrap"><span>Surname</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={80} autoComplete="family-name" placeholder="e.g. Sharma" /></label>
          <label className="field-wrap"><span>Company / organisation</span><input value={organization} onChange={(event) => setOrganization(event.target.value)} maxLength={180} autoComplete="organization" placeholder="Company or business name" /></label>
          <label className="field-wrap"><span>Job title</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={120} placeholder="e.g. Site Engineer, Owner" /></label>
          <div className="contact-labeled-value"><label className="field-wrap"><span>Phone number</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="tel" placeholder="+91 98765 43210" /></label><label className="field-wrap label-select-wrap"><span>Label</span><select value={phoneLabel} onChange={(event) => setPhoneLabel(event.target.value as PhoneLabel)}><option>Mobile</option><option>Work</option><option>Home</option><option>Main</option><option>Other</option></select></label></div>
          <div className="contact-labeled-value"><label className="field-wrap"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={180} autoComplete="email" placeholder="name@company.com" /></label><label className="field-wrap label-select-wrap"><span>Label</span><select value={emailLabel} onChange={(event) => setEmailLabel(event.target.value as EmailLabel)}><option>Work</option><option>Home</option><option>Other</option></select></label></div>
          <label className="field-wrap"><span>Birthday</span><input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} /></label>
          <label className="field-wrap"><span>City</span><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={120} autoComplete="address-level2" placeholder="City" /></label>
          <label className="field-wrap"><span>State / region</span><input value={stateName} onChange={(event) => setStateName(event.target.value)} maxLength={120} autoComplete="address-level1" placeholder="State" /></label>
        </div>
      </section>

      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">02</span><div><h3>More ways to reach them</h3><p>Optional additional phone numbers and email addresses.</p></div></div>
        <div className="contact-repeat-list">{phoneNumbers.map((item, index) => <div className="contact-repeat-row" key={`phone-${index}`}><label className="field-wrap"><span>Phone label</span><select value={item.label} onChange={(event) => updatePhone(index, "label", event.target.value as PhoneLabel)}><option>Mobile</option><option>Work</option><option>Home</option><option>Main</option><option>Other</option></select></label><label className="field-wrap contact-repeat-value"><span>Phone number</span><input type="tel" value={item.number} onChange={(event) => updatePhone(index, "number", event.target.value)} maxLength={40} placeholder="Additional number" /></label><button type="button" className="contact-remove-row" onClick={() => setPhoneNumbers((current) => current.filter((_, i) => i !== index))} aria-label={`Remove additional phone ${index + 1}`}>×</button></div>)}
          <button type="button" className="contact-add-row" onClick={() => setPhoneNumbers((current) => current.length < 10 ? [...current, { label: "Work", number: "" }] : current)} disabled={phoneNumbers.length >= 10}>＋ Add another phone</button>
        </div>
        <div className="contact-repeat-list">{emailAddresses.map((item, index) => <div className="contact-repeat-row" key={`email-${index}`}><label className="field-wrap"><span>Email label</span><select value={item.label} onChange={(event) => updateEmail(index, "label", event.target.value as EmailLabel)}><option>Work</option><option>Home</option><option>Other</option></select></label><label className="field-wrap contact-repeat-value"><span>Email address</span><input type="email" value={item.value} onChange={(event) => updateEmail(index, "value", event.target.value)} maxLength={180} placeholder="another@email.com" /></label><button type="button" className="contact-remove-row" onClick={() => setEmailAddresses((current) => current.filter((_, i) => i !== index))} aria-label={`Remove additional email ${index + 1}`}>×</button></div>)}
          <button type="button" className="contact-add-row" onClick={() => setEmailAddresses((current) => current.length < 10 ? [...current, { label: "Work", value: "" }] : current)} disabled={emailAddresses.length >= 10}>＋ Add another email</button>
        </div>
      </section>

      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">03</span><div><h3>Team and labels</h3><p>Organise your team directory and quickly find contacts later.</p></div></div>
        <label className="contact-team-toggle"><input type="checkbox" checked={isTeamMember} onChange={(event) => setIsTeamMember(event.target.checked)} /><span><strong>Add to Team directory</strong><small>This person will also appear in the dedicated Team panel.</small></span></label>
        {isTeamMember ? <div className="form-grid admin-form-grid"><label className="field-wrap"><span>Team role</span><input value={teamRole} onChange={(event) => setTeamRole(event.target.value)} maxLength={120} placeholder="e.g. Project Manager" /></label><label className="field-wrap"><span>Department / team</span><input value={teamDepartment} onChange={(event) => setTeamDepartment(event.target.value)} maxLength={120} placeholder="e.g. Site Operations" /></label></div> : null}
        <div className="form-grid admin-form-grid meta-fields"><label className="field-wrap field-full"><span>Labels / tags (comma-separated)</span><input value={tags} onChange={(event) => setTags(event.target.value)} maxLength={500} placeholder="e.g. trusted, Delhi, concrete, urgent" /><small>Use labels like Google Contacts to group people. Labels are private to your workspace.</small></label><label className="field-wrap"><span>Contact type</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label className="field-wrap"><span>Relationship status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="field-wrap"><span>Follow-up date</span><input type="date" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} /></label><label className="field-wrap"><span>Your rating</span><select value={rating} onChange={(event) => setRating(event.target.value)}><option value="0">Not rated</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)} ({n})</option>)}</select></label><label className="field-wrap"><span>Flag</span><select value={flag} onChange={(event) => setFlag(event.target.value)}><option value="">None</option><option value="preferred">Preferred / trusted</option><option value="avoid">Avoid / unreliable</option></select></label><label className="field-wrap field-full"><span>May this contact be shared with clients?</span><select value={shareConsent} onChange={(event) => setShareConsent(event.target.value)}><option value="">Not recorded</option><option value="yes">Yes, they agreed</option><option value="no">No, never share</option></select></label></div>
      </section>

      {specialtyFields.length ? <details className="contact-specialty-details"><summary>Business-specific details <span>Optional fields for civil work contacts</span></summary><div className="form-grid admin-form-grid">{specialtyFields.map((field) => <label className={`field-wrap ${field.type === "textarea" ? "field-full" : ""}`} key={`${category}-${field.key}`}><span>{field.label}{field.required ? <b className="required-star"> *</b> : null}</span><FieldControl field={field} value={details[field.key] || ""} onChange={(value) => update(field.key, value)} /></label>)}</div></details> : null}
      <section className="contact-form-section"><div className="contact-section-title"><span className="contact-section-mark">04</span><div><h3>Private notes</h3><p>Keep details that help you remember the relationship. These are not shared by default.</p></div></div><label className="field-wrap"><span>Notes</span><textarea rows={4} value={contactNotes} onChange={(event) => setContactNotes(event.target.value)} maxLength={6000} placeholder="Meeting context, preferences, useful details…" /></label></section>
      {initial ? <InteractionLog contactId={initial._id} /> : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving to database…" : initial ? "Save changes" : "Save contact"}<Icon name="check" /></button></div>
    </form></section></div>;
}

function LinkModal({ onClose, onCreate, busy }: { onClose: () => void; onCreate: (title: string, category: string, expiryDays: number) => Promise<void>; busy: boolean }) {
  const [title, setTitle] = useState("Manpower supplier enquiry"); const [category, setCategory] = useState("manpower-supplier"); const [expiry, setExpiry] = useState("0"); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); try { await onCreate(title, category, Number(expiry)); } catch (err) { setError(err instanceof Error ? err.message : "Could not create link."); } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="link-modal-title"><div className="modal-head"><div><p className="eyebrow">PUBLIC INTAKE</p><h2 id="link-modal-title">Create a share link</h2><p>Anyone with the link can submit this form. Your records stay private.</p></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div><form className="record-form" onSubmit={submit}><label className="field-wrap"><span>Link name / purpose</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Vendor registration – Jaipur" required maxLength={160} /></label><label className="field-wrap"><span>Form category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field-wrap"><span>Link expiry</span><select value={expiry} onChange={(event) => setExpiry(event.target.value)}><option value="0">Never (until I pause or delete it)</option><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option></select></label>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Creating…" : "Create link"}<Icon name="arrow" /></button></div></form></section></div>;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [navFilter, setNavFilter] = useState("");
  const sidebarNavRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => sidebarNavRef.current?.querySelector<HTMLElement>(".nav-item-active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" }));
    return () => window.cancelAnimationFrame(frame);
  }, [tab, navFilter]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [links, setLinks] = useState<ShareLinkRecord[]>([]);
  const [health, setHealth] = useState<{ database: string; databaseName?: string; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [notes, setNotes] = useState<PrivateNoteRecord[]>([]);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState<ProjectRecord | null | "new">(null);
  const [savingProject, setSavingProject] = useState(false);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [rates, setRates] = useState<RateRecord[]>([]);
  const [roomCreate, setRoomCreate] = useState<{ contactIds: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [autoLock, setAutoLock] = useState(15);
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [workspaceProjectId, setWorkspaceProjectId] = useState("");
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [serverHits, setServerHits] = useState<ServerHit[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const lastActivity = useRef(Date.now());
  const lastServerTouch = useRef(Date.now());
  useEffect(() => {
    const onUnauthorized = () => {
      clearClientWorkspaceState();
      clearBrowserAppState();
      setSession((current) => current ? { ...current, authenticated: false } : current);
    };
    window.addEventListener("cah-unauthorized", onUnauthorized);
    return () => window.removeEventListener("cah-unauthorized", onUnauthorized);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- the reset uses stable React setters only.
  useEffect(() => {
    if (!session?.authenticated) return;
    let checking = false;
    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch("/api/civil-at-hand/auth/session", { cache: "no-store", credentials: "same-origin", headers: { "Cache-Control": "no-store" } });
        const current = await response.json() as Session;
        if (!current.authenticated) {
          clearClientWorkspaceState();
          clearBrowserAppState();
          setSession(current);
        }
      } catch { /* A temporary network issue must not erase the current work view; each API still checks auth. */ }
      finally { checking = false; }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void checkSession(); };
    const timer = window.setInterval(() => void checkSession(), 60_000);
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.authenticated]); // eslint-disable-line react-hooks/exhaustive-deps -- the reset uses stable React setters only.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("cah-session");
    channel.addEventListener("message", (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "logout") {
        clearClientWorkspaceState();
        clearBrowserAppState();
        setSession((current) => current ? { ...current, authenticated: false } : current);
      }
    });
    return () => channel.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- event handler uses stable React setters only.
  useEffect(() => {
    if (!session?.authenticated) return;
    const mark = () => {
      const now = Date.now();
      lastActivity.current = now;
      // Only genuine page interaction sends a throttled heartbeat. The periodic status probe does not keep
      // an unattended session alive, but someone actively working in client-side forms does not expire mid-edit.
      if (now - lastServerTouch.current > 4 * 60_000) {
        lastServerTouch.current = now;
        void fetch("/api/civil-at-hand/auth/activity", { method: "POST", cache: "no-store", credentials: "same-origin" })
          .then((response) => { if (response.status === 401) window.dispatchEvent(new Event("cah-unauthorized")); })
          .catch(() => undefined);
      }
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    lastActivity.current = Date.now();
    lastServerTouch.current = Date.now();
    let timer: number | null = null;
    if (autoLock !== 0) {
      timer = window.setInterval(() => {
        if (Date.now() - (lastActivity.current ?? 0) > autoLock * 60_000) {
          if (timer !== null) window.clearInterval(timer);
          void logout().then((confirmed) => { if (confirmed) setToast({ type: "info", message: "Signed out automatically after a period of inactivity." }); });
        }
      }, 15_000);
    }
    return () => {
      if (timer !== null) window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, mark));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.authenticated, autoLock]);
  const [modalContact, setModalContact] = useState<ContactRecord | null | "new">(null);
  const [linkModal, setLinkModal] = useState(false);
  const [search, setSearch] = useState(""); const [appliedSearch, setAppliedSearch] = useState(""); const [filterCategory, setFilterCategory] = useState(""); const [filterStatus, setFilterStatus] = useState("");
  const [globalSearch, setGlobalSearch] = useState(""); const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    function handleWorkspaceShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
        window.setTimeout(() => globalSearchInputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", handleWorkspaceShortcut);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcut);
  }, []);

  function clearClientWorkspaceState() {
    setContacts([]); setLinks([]); setHealth(null); setBusy(false); setImporting(false); setSaving(false);
    setProjects([]); setTasks([]); setNotes([]); setFocusedTaskId(null); setFocusedNoteId(null);
    setModalProject(null); setSavingProject(false); setOnlyDuplicates(false); setRooms([]); setRates([]);
    setRoomCreate(null); setSelectedIds([]); setMergeOpen(false); setPrivacy(false); setModalContact(null);
    setLinkModal(false); setSearch(""); setAppliedSearch(""); setFilterCategory(""); setFilterStatus("");
    setGlobalSearch(""); setGlobalSearchOpen(false); setNavFilter(""); setTab("overview"); setToast(null);
    setAutoLock(15);
    setSettings(defaultSettings); setFocus(null); setWorkspaceProjectId(""); setMobileNavOpen(false); setServerHits([]); setQuickAddOpen(false);
    if (importInputRef.current) importInputRef.current.value = "";
  }

  const notify = useCallback((message: string, type: Toast["type"] = "success") => setToast({ message, type }), []);
  useEffect(() => {
    if (!toast || toast.type === "error") return;
    const timer = window.setTimeout(() => setToast((current) => (current === toast ? null : current)), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const clearFocusedTask = useCallback(() => setFocusedTaskId(null), []);
  const clearFocusedNote = useCallback(() => setFocusedNoteId(null), []);
  const loadData = useCallback(async (showError = true) => {
    try {
      const [contactData, linkData, projectData, roomData, rateData, healthData, taskData, noteData, trashNoteData, preferenceData] = await Promise.all([
        jsonRequest("/api/civil-at-hand/contacts?limit=5000"), jsonRequest("/api/civil-at-hand/links"), jsonRequest("/api/civil-at-hand/projects").catch(() => ({ projects: [] })), jsonRequest("/api/civil-at-hand/rooms").catch(() => ({ rooms: [] })), jsonRequest("/api/civil-at-hand/rates").catch(() => ({ rates: [] })), jsonRequest("/api/civil-at-hand/health").catch((error) => ({ database: "error", message: error.message })), jsonRequest("/api/civil-at-hand/tasks").catch(() => ({ tasks: [] })), jsonRequest("/api/civil-at-hand/notes"), jsonRequest("/api/civil-at-hand/notes?view=trash").catch(() => ({ notes: [] })), jsonRequest("/api/civil-at-hand/security/preferences").catch(() => ({ autoLockMinutes: 15 })),
      ]);
      jsonRequest("/api/civil-at-hand/settings").then((data) => setSettings(withDefaults(data.settings))).catch(() => undefined);
      setContacts(contactData.contacts || []); setLinks(linkData.links || []); setProjects(projectData.projects || []); setRooms(roomData.rooms || []); setRates(rateData.rates || []); setHealth(healthData); setTasks(taskData.tasks || []); setNotes([...(noteData.notes || []), ...(trashNoteData.notes || [])]);
      const storedAutoLock = Number(preferenceData.autoLockMinutes);
      setAutoLock([0, 5, 15, 30, 60].includes(storedAutoLock) ? storedAutoLock : 15);
    } catch (error) { if (showError) notify(error instanceof Error ? error.message : "Could not load the dashboard.", "error"); }
  }, [notify]);

  useEffect(() => {
    let active = true;
    // Remove legacy app-prefixed storage from earlier builds before showing the workspace.
    clearBrowserAppState();
    fetch("/api/civil-at-hand/auth/session", { cache: "no-store", credentials: "same-origin", headers: { "Cache-Control": "no-store" } }).then((res) => res.json()).then((data: Session) => { if (active) { setSession(data); if (data.authenticated) void loadData(); } }).catch(() => { if (active) { clearClientWorkspaceState(); setSession({ authenticated: false, configured: false, appName: brandName }); } });
    return () => { active = false; };
  }, [loadData]);

  async function login(username: string, password: string, code: string) {
    try {
      await jsonRequest("/api/civil-at-hand/auth/login", { method: "POST", body: JSON.stringify({ username, password, code }) });
      const freshSession = await jsonRequest("/api/civil-at-hand/auth/session") as Session;
      lastActivity.current = Date.now();
      lastServerTouch.current = Date.now();
      setSession(freshSession);
      setToast(null); setTab("overview");
      await loadData();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not sign in.", "error"); throw error; }
  }
  async function saveAutoLockPreference(minutes: number) {
    const previous = autoLock;
    setAutoLock(minutes);
    try {
      await jsonRequest("/api/civil-at-hand/security/preferences", { method: "PATCH", body: JSON.stringify({ autoLockMinutes: minutes }) });
      notify("Auto-lock preference saved to your database.");
    } catch (error) {
      setAutoLock(previous);
      notify(error instanceof Error ? error.message : "Could not save the auto-lock preference.", "error");
    }
  }
  async function logout(): Promise<boolean> {
    let serverConfirmed = false;
    let warning = "";
    try {
      await jsonRequest("/api/civil-at-hand/auth/logout", { method: "POST" });
      serverConfirmed = true;
    } catch {
      warning = "This browser's workspace has been cleared, but the server did not confirm sign-out. Reconnect and sign out again before leaving this device.";
    } finally {
      clearClientWorkspaceState();
      clearBrowserAppState();
      setSession((current) => current ? { ...current, authenticated: false } : current);
      try { const channel = new BroadcastChannel("cah-session"); channel.postMessage({ type: "logout" }); channel.close(); } catch { /* BroadcastChannel is optional. */ }
    }
    if (warning) setToast({ type: "error", message: warning });
    return serverConfirmed;
  }

  async function saveContact(payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const isNew = modalContact === "new";
      const endpoint = isNew ? "/api/civil-at-hand/contacts" : `/api/civil-at-hand/contacts/${(modalContact as ContactRecord)._id}`;
      try {
        await jsonRequest(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify(payload) });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409 && Array.isArray(error.data.duplicates)) {
          const found = (error.data.duplicates as { name: string; phone: string; email: string }[]).map((d) => `• ${d.name} (${[d.phone, d.email].filter(Boolean).join(", ")})`).join("\n");
          if (!window.confirm(`Possible duplicate found:\n${found}\n\nSave this contact anyway?`)) throw new Error("Not saved. This looks like a duplicate of an existing contact — open that contact instead, or change the phone/email.");
          await jsonRequest(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify({ ...payload, allowDuplicate: true }) });
        } else throw error;
      }
      setModalContact(null); notify(isNew ? "Contact saved to your database." : "Contact details updated."); await loadData(false);
    } finally { setSaving(false); }
  }
  async function deleteContact(contact: ContactRecord) {
    if (!window.confirm(`Delete ${contact.name} from your database? This cannot be undone.`)) return;
    try { await jsonRequest(`/api/civil-at-hand/contacts/${contact._id}`, { method: "DELETE" }); notify("Contact deleted."); await loadData(false); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete contact.", "error"); }
  }
  async function importContacts(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/civil-at-hand/import", { method: "POST", body, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not import this file.");
      const summary = `Import complete: ${data.created} added, ${data.duplicates} duplicates skipped, ${data.failed} row(s) need attention.`;
      notify(summary, data.failed ? "info" : "success");
      if (Array.isArray(data.errors) && data.errors.length) {
        const details = data.errors.slice(0, 8).map((item: { row: number; message: string }) => `Row ${item.row}: ${item.message}`).join("\n");
        window.alert(`${summary}\n\nReview these rows and correct the file before trying them again:\n${details}`);
      }
      await loadData(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not import this file.", "error");
    } finally {
      setImporting(false);
      input.value = "";
    }
  }
  async function saveProject(payload: Record<string, unknown>) {
    setSavingProject(true);
    try {
      const isNew = modalProject === "new";
      const endpoint = isNew ? "/api/civil-at-hand/projects" : `/api/civil-at-hand/projects/${(modalProject as ProjectRecord)._id}`;
      await jsonRequest(endpoint, { method: isNew ? "POST" : "PUT", body: JSON.stringify(payload) });
      setModalProject(null); notify(isNew ? "Project saved." : "Project updated."); await loadData(false); setWorkspaceVersion((value) => value + 1);
    } finally { setSavingProject(false); }
  }
  async function deleteProject(project: ProjectRecord) {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    try { await jsonRequest(`/api/civil-at-hand/projects/${project._id}`, { method: "DELETE" }); notify("Project deleted."); await loadData(false); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete project.", "error"); }
  }
  async function changeProjectStatus(project: ProjectRecord, status: string) {
    try { await jsonRequest(`/api/civil-at-hand/projects/${project._id}`, { method: "PATCH", body: JSON.stringify({ status }) }); setProjects((current) => current.map((item) => item._id === project._id ? { ...item, status } : item)); notify("Stage updated."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not change the stage.", "error"); }
  }
  async function updateFollowUp(item: FollowUpItem, followUpAt: string | null) {
    try {
      await jsonRequest(`/api/civil-at-hand/${item.kind === "contact" ? "contacts" : "projects"}/${item.id}`, { method: "PATCH", body: JSON.stringify({ followUpAt }) });
      notify(followUpAt ? "Follow-up moved." : "Follow-up marked as done.");
      await loadData(false);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not update the follow-up.", "error"); }
  }
  function openFollowUp(item: FollowUpItem) {
    if (item.kind === "contact") { const found = contacts.find((c) => c._id === item.id); if (found) setModalContact(found); }
    else { const found = projects.find((p) => p._id === item.id); if (found) setModalProject(found); }
  }
  async function createLink(title: string, category: string, expiryDays: number) {
    setBusy(true);
    try { const data = await jsonRequest("/api/civil-at-hand/links", { method: "POST", body: JSON.stringify({ title, category, expiryDays }) }); setLinks((current) => [data.link, ...current]); setLinkModal(false); setTab("links"); notify("Share link created. Copy it to start collecting details."); }
    finally { setBusy(false); }
  }
  async function toggleLink(link: ShareLinkRecord) {
    try { await jsonRequest(`/api/civil-at-hand/links/${link._id}`, { method: "PATCH", body: JSON.stringify({ active: !link.active }) }); setLinks((current) => current.map((item) => item._id === link._id ? { ...item, active: !item.active } : item)); notify(link.active ? "Link paused. New submissions are blocked." : "Link activated."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not update link.", "error"); }
  }
  async function renameLink(link: ShareLinkRecord) {
    const title = window.prompt("New link name", link.title); if (!title?.trim()) return;
    try { await jsonRequest(`/api/civil-at-hand/links/${link._id}`, { method: "PATCH", body: JSON.stringify({ title: title.trim() }) }); setLinks((current) => current.map((item) => item._id === link._id ? { ...item, title: title.trim() } : item)); notify("Link name updated."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not rename link.", "error"); }
  }
  async function deleteLink(link: ShareLinkRecord) {
    if (!window.confirm(`Delete “${link.title}”? Anyone using the link will no longer be able to open it.`)) return;
    try { await jsonRequest(`/api/civil-at-hand/links/${link._id}`, { method: "DELETE" }); setLinks((current) => current.filter((item) => item._id !== link._id)); notify("Share link deleted."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete link.", "error"); }
  }
  async function copyText(value: string, success = "Copied to clipboard.") {
    try { await navigator.clipboard.writeText(value); notify(success); }
    catch { notify("Clipboard access was blocked by your browser. Open the link and copy it manually.", "error"); }
  }
  function openWhatsApp(phone: string, text: string) {
    const number = phone.replace(/\D/g, ""); if (!number) { notify("No phone number has been saved for this contact.", "error"); return; }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  function shareLink(link: ShareLinkRecord) { const url = link.shareUrl || `${siteBase()}/workspace/join/${link.token}`; window.open(`https://wa.me/?text=${encodeURIComponent(`${link.title}\n${url}`)}`, "_blank", "noopener,noreferrer"); }
  function contactSummary(contact: ContactRecord) {
    const lines = [`${brandName} — Contact details`, `Name: ${contact.name}`, `Category: ${categoryLabel(contact.category)}`];
    if (contact.organization) lines.push(`Business: ${contact.organization}`);
    if (contact.phone) lines.push(`Phone: ${contact.phone}`);
    if (contact.details?.whatsapp) lines.push(`WhatsApp: ${contact.details.whatsapp}`);
    if (contact.email) lines.push(`Email: ${contact.email}`);
    if (contact.city || contact.state) lines.push(`Location: ${[contact.city, contact.state].filter(Boolean).join(", ")}`);
    lines.push(`Status: ${statusLabel(contact.status)}`);
    const reserved = new Set(["fullName", "phone", "whatsapp", "email", "organization", "city", "state", "workingLocations", "notes"]);
    for (const field of getFields(contact.category)) {
      const value = contact.details?.[field.key];
      if (!reserved.has(field.key) && value) lines.push(`${field.label}: ${value}`);
    }
    if (contact.details?.workingLocations) lines.push(`Working / supply locations: ${contact.details.workingLocations}`);
    if (contact.notes) lines.push(`Notes: ${contact.notes}`);
    return lines.join("\n");
  }
  function shareContact(contact: ContactRecord) { window.open(`https://wa.me/?text=${encodeURIComponent(contactSummary(contact))}`, "_blank", "noopener,noreferrer"); }
  function emailContactSummary(contact: ContactRecord) { const subject = `${brandName} — ${contact.name}`; window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(contactSummary(contact))}`; }
  function applyFilters(event: FormEvent) { event.preventDefault(); setAppliedSearch(search.trim()); }

  const duplicateIds = useMemo(() => duplicateIdSet(contacts), [contacts]);
  const filteredContacts = useMemo(() => contacts.filter((contact) => {
    const matchCategory = !filterCategory || contact.category === filterCategory;
    const matchStatus = !filterStatus || contact.status === filterStatus;
    const matchTeamView = tab !== "team" || Boolean(contact.isTeamMember);
    const q = appliedSearch.toLowerCase();
    const values = [contact.name, contact.firstName, contact.lastName, contact.phone, ...(contact.phoneNumbers || []).map((item) => item.number), contact.email, ...(contact.emailAddresses || []).map((item) => item.value), contact.organization, contact.jobTitle, contact.teamRole, contact.teamDepartment, contact.city, contact.state, contact.birthday, ...(contact.tags || []), ...Object.values(contact.details || {})];
    const matchSearch = !q || values.some((value) => String(value || "").toLowerCase().includes(q));
    const matchDuplicate = !onlyDuplicates || duplicateIds.has(contact._id);
    return matchCategory && matchStatus && matchTeamView && matchSearch && matchDuplicate;
  }), [contacts, filterCategory, filterStatus, appliedSearch, onlyDuplicates, duplicateIds, tab]);
  const counts = useMemo(() => ({ total: contacts.length, new: contacts.filter((item) => item.status === "new").length, active: contacts.filter((item) => item.status === "active" || item.status === "qualified").length, followUps: contacts.filter((item) => item.followUpAt && item.status !== "closed" && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length + projects.filter((item) => item.followUpAt && !["completed", "lost"].includes(item.status) && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length, links: links.filter((item) => item.active && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now())).length }), [contacts, links, projects]);
  const categoryCounts = useMemo(() => categories.map((category) => ({ ...category, count: contacts.filter((item) => item.category === category.id).length })), [contacts]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done" && task.status !== "cancelled"), [tasks]);
  const overdueTaskCount = useMemo(() => openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < new Date(new Date().toDateString()).getTime()).length, [openTasks]);
  const activeNotes = useMemo(() => notes.filter((note) => !note.archived && !note.deletedAt).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [notes]);
  const globalSearchResults = useMemo<GlobalSearchResult[]>(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return [];
    const results: GlobalSearchResult[] = [];
    for (const contact of contacts) {
      const haystack = [contact.name, contact.firstName, contact.lastName, contact.phone, ...(contact.phoneNumbers || []).map((item) => item.number), contact.email, ...(contact.emailAddresses || []).map((item) => item.value), contact.organization, contact.jobTitle, contact.teamRole, contact.teamDepartment, contact.city, contact.state, contact.birthday, ...(contact.tags || []), ...Object.values(contact.details || {})].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "contact", id: contact._id, title: contact.name, subtitle: `${contact.teamRole || contact.jobTitle || contact.organization || categoryLabel(contact.category)} · ${contact.city || (contact.isTeamMember ? "Team member" : "Contact")}`, record: contact });
    }
    for (const project of projects) {
      const haystack = [project.title, project.clientName, project.city, project.state, project.status, project.projectType, project.notes].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "project", id: project._id, title: project.title, subtitle: `${project.clientName || "Project"} · ${project.city || project.status}`, record: project });
    }
    for (const task of tasks) {
      const assignee = contacts.find((contact) => contact._id === task.assignedContactId);
      const haystack = [task.title, task.description, assignee?.name, assignee?.teamRole].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "task", id: task._id, title: task.title, subtitle: `${taskPriorityLabels[task.priority]} priority · ${taskStatusLabels[task.status]} · ${assignee?.name || "Unassigned"}`, record: task });
    }
    for (const note of activeNotes) {
      const haystack = [note.title, note.content, note.folder, note.category, ...(note.tags || [])].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "note", id: note._id, title: note.title, subtitle: `${note.pinned ? "Pinned note" : "Private note"} · ${note.folder || "Inbox"} · Updated ${shortDate(note.updatedAt)}`, record: note });
    }
    for (const rate of rates) {
      const haystack = [rate.item, rate.group, rate.spec, rate.unit, rate.supplierName, rate.city, rate.state, rate.notes].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "rate", id: rate._id, title: rate.item, subtitle: `${rate.group || "Rate book"} · ${rate.supplierName || rate.city || rate.unit}`, record: rate });
    }
    for (const room of rooms) {
      const haystack = [room.title, room.recipientName, room.recipientContact, room.message, room.dataset, room.status, room.paymentStatus].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "room", id: room._id, title: room.title, subtitle: `Shared database · ${room.recipientName || room.dataset} · ${room.status}`, record: room });
    }
    for (const link of links) {
      const haystack = [link.title, link.category, link.active ? "active" : "paused", link.submissions, link.expiresAt].join(" ").toLowerCase();
      if (haystack.includes(query)) results.push({ kind: "link", id: link._id, title: link.title, subtitle: `Public form · ${link.category} · ${link.active ? "Active" : "Paused"}`, record: link });
    }
    return results.slice(0, 10);
  }, [globalSearch, contacts, projects, tasks, activeNotes, rates, rooms, links]);
  function openGlobalSearchResult(result: GlobalSearchResult) {
    setGlobalSearchOpen(false);
    setGlobalSearch("");
    if (result.kind === "contact") { setTab(result.record.isTeamMember ? "team" : "contacts"); setModalContact(result.record); return; }
    if (result.kind === "project") { navigate("project", { kind: "project", id: result.record._id }); return; }
    if (result.kind === "task") { setFocusedTaskId(result.id); setTab("tasks"); return; }
    if (result.kind === "rate") { setTab("rates"); return; }
    if (result.kind === "room") { setTab("rooms"); return; }
    if (result.kind === "link") { setTab("links"); return; }
    setFocusedNoteId(result.id); setTab("notes");
  }
  const navigate = useCallback((next: string, spec?: { kind: string; id: string; filter?: string }) => {
    if (next === "project" && spec?.id) { setWorkspaceProjectId(spec.id); setWorkspaceVersion((value) => value + 1); setTab("project"); }
    else setTab(next as Tab);
    if (next === "tasks" && spec?.kind === "task") setFocusedTaskId(spec.id);
    setFocus(spec ? { ...spec, seq: Date.now() } : null);
    setMobileNavOpen(false); setQuickAddOpen(false);
    try { window.scrollTo({ top: 0 }); } catch { /* older browsers */ }
  }, []);
  const clearFocus = useCallback(() => setFocus(null), []);
  const saveBusinessSettings = useCallback(async (patch: Partial<BusinessSettings>) => {
    const data = await jsonRequest("/api/civil-at-hand/settings", { method: "PUT", body: JSON.stringify(patch) });
    setSettings(withDefaults(data.settings)); notify("Settings saved.");
  }, [notify]);
  const workspace = useMemo<Workspace>(() => ({
    settings, money: (value, compact) => formatMoney(value, settings.currency, { compact }), contacts, projects, notify,
    reloadCore: () => loadData(false), navigate, saveSettings: saveBusinessSettings,
  }), [settings, contacts, projects, notify, loadData, navigate, saveBusinessSettings]);
  useEffect(() => {
    const query = globalSearch.trim();
    if (!session?.authenticated || query.length < 2) { setServerHits([]); return; }
    let live = true;
    const timer = window.setTimeout(() => {
      jsonRequest(`/api/civil-at-hand/search?q=${encodeURIComponent(query)}`).then((data) => { if (live) setServerHits((data.results as ServerHit[]) || []); }).catch(() => { if (live) setServerHits([]); });
    }, 250);
    return () => { live = false; window.clearTimeout(timer); };
  }, [globalSearch, session?.authenticated]);
  function openServerHit(hit: ServerHit) {
    setGlobalSearchOpen(false); setGlobalSearch("");
    const routes: Record<string, [string, { kind: string; id: string; filter?: string }]> = {
      estimate: ["estimates", { kind: "estimate", id: hit.id }], invoice: ["finance", { kind: "invoice", id: hit.id }],
      "purchase-order": ["procurement", { kind: "filter", id: hit.id, filter: "orders" }], "material-request": ["procurement", { kind: "filter", id: hit.id, filter: "requests" }],
      material: ["procurement", { kind: "filter", id: hit.id, filter: "materials" }], worker: ["workforce", { kind: "filter", id: hit.id, filter: "workers" }],
      tender: ["tenders", { kind: "tender", id: hit.id }], document: ["documents", { kind: "document", id: hit.id }], "public-page": ["pages", { kind: "page", id: hit.id }],
    };
    const route = routes[hit.kind];
    if (route) navigate(route[0], route[1]);
  }
  const followUpsDue = contacts.filter((item) => item.followUpAt && item.status !== "closed" && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length + projects.filter((item) => item.followUpAt && !finishedStatuses.includes(item.status) && item.followUpAt.slice(0, 10) <= dateKey(new Date())).length;
  const exportParams = new URLSearchParams();
  if (filterCategory) exportParams.set("category", filterCategory);
  if (filterStatus) exportParams.set("status", filterStatus);
  if (appliedSearch) exportParams.set("q", appliedSearch);
  const exportFilterQuery = exportParams.toString() ? `&${exportParams.toString()}` : "";
  const allShownSelected = filteredContacts.length > 0 && filteredContacts.every((contact) => selectedIds.includes(contact._id));
  function toggleAllShown() { setSelectedIds(allShownSelected ? selectedIds.filter((id) => !filteredContacts.some((contact) => contact._id === id)) : Array.from(new Set([...selectedIds, ...filteredContacts.map((contact) => contact._id)]))); }
  function toggleOne(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  async function bulk(action: string, value = "") {
    if (!selectedIds.length) return;
    if (action === "delete" && !window.confirm(`Delete ${selectedIds.length} contact(s)? This cannot be undone.`)) return;
    try {
      const data = await jsonRequest("/api/civil-at-hand/contacts/bulk", { method: "POST", body: JSON.stringify({ ids: selectedIds, action, value }) });
      notify(action === "delete" ? `${data.affected} contact(s) deleted.` : `Updated ${data.affected} contact(s).`);
      setSelectedIds([]); await loadData(false);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not apply this action.", "error"); }
  }
  const hasActiveExportFilters = Boolean(filterCategory || filterStatus || appliedSearch);

  if (!session) return <main className="boot-screen"><BrandMark large /><span className="spinner" /><p>Preparing your private workspace…</p></main>;
  if (!session.authenticated) return <LoginScreen configured={session.configured} twoFactor={Boolean(session.twoFactor)} onLogin={login} toast={toast} clearToast={() => setToast(null)} />;

  const tabMeta: Record<Tab, { title: string; subtitle: string; group: string }> = {
    overview: { title: "Command centre", subtitle: "", group: "Overview" },
    followups: { title: "Follow-ups", subtitle: "Who to call or message next. Overdue and upcoming reminders in one list.", group: "Overview" },
    tasks: { title: "Task planner", subtitle: "Site visits, quotations, documents and business actions, saved in your database.", group: "Overview" },
    notes: { title: "Private notes", subtitle: "Your own notes, checklists and drafts. Visible only in this signed-in workspace.", group: "Overview" },
    contacts: { title: "Contacts", subtitle: "Every supplier, contractor, partner and client in one place.", group: "Business & CRM" },
    team: { title: "Team directory", subtitle: "Staff, project teams and your internal phone book.", group: "Business & CRM" },
    tenders: { title: "Tenders & bids", subtitle: "Opportunities, deadlines, EMD, bid / no-bid decisions and outcomes.", group: "Business & CRM" },
    projects: { title: "Projects & leads", subtitle: "Every enquiry from first contact to completion and final accounts.", group: "Projects & site" },
    project: { title: "Project workspace", subtitle: "", group: "Projects & site" },
    site: { title: "Site diary", subtitle: "Daily site reports with work done, labour, materials, issues and approval.", group: "Projects & site" },
    estimates: { title: "Estimates & quotations", subtitle: "BOQs with material, labour and equipment rates, markups, revisions and printable quotations.", group: "Estimation" },
    rates: { title: "Rate book", subtitle: "Material, labour and equipment rates, and who quoted them.", group: "Estimation" },
    procurement: { title: "Materials & purchasing", subtitle: "Stock at the store and sites, material requests, purchase orders and goods receipts.", group: "Procurement & stock" },
    workforce: { title: "Labour & attendance", subtitle: "Workers, daily muster, wage sheets, advances and payments.", group: "Workforce" },
    finance: { title: "Invoices, bills & expenses", subtitle: "Money in, money out and what each project has really cost.", group: "Finance" },
    documents: { title: "Documents & approvals", subtitle: "Contracts, drawings, certificates and records with versions and renewal dates.", group: "Documents" },
    reports: { title: "Reports", subtitle: "Network, pipeline and business figures. Use your browser’s print to save a PDF.", group: "Reports" },
    links: { title: "Public form links", subtitle: "Share a form link and collect structured details without giving dashboard access.", group: "Public pages & forms" },
    pages: { title: "Public pages", subtitle: "Optional showcase and enquiry pages that you publish yourself.", group: "Public pages & forms" },
    customForms: { title: "Custom forms", subtitle: "Build shareable forms, review submissions and export responses.", group: "Public pages & forms" },
    rooms: { title: "Shared databases", subtitle: "Share selected data with clients through private links that expire.", group: "Public pages & forms" },
    settings: { title: "Settings", subtitle: "Business profile, document numbering, lists and alerts.", group: "Administration" },
    security: { title: "Security & backups", subtitle: "2-step verification, signed-in devices, activity log, backups and restore.", group: "Administration" },
  };
  const navCount = (value: Tab): { count: number; alert?: boolean } | null => {
    if (value === "contacts" && contacts.length) return { count: contacts.length };
    if (value === "team") { const count = contacts.filter((contact) => contact.isTeamMember).length; return count ? { count } : null; }
    if (value === "projects" && projects.length) return { count: projects.length };
    if (value === "followups" && counts.followUps) return { count: counts.followUps, alert: true };
    if (value === "tasks" && overdueTaskCount) return { count: overdueTaskCount, alert: true };
    if (value === "links" && links.length) return { count: links.length };
    if (value === "rates" && rates.length) return { count: rates.length };
    if (value === "rooms" && rooms.length) return { count: rooms.length };
    return null;
  };
  const filterText = navFilter.trim().toLowerCase();
  const activeGroup = navGroups.find((group) => group.items.some(([value]) => value === tab || (tab === "project" && value === "projects")))?.id;
  const meta = tabMeta[tab];
  const headingActions = tab === "projects" ? <><button className="ui-btn ui-btn-ghost" onClick={() => window.print()}><Icon name="print" size={16} /><span>Print</span></button><button className="ui-btn ui-btn-primary" onClick={() => setModalProject("new")}><Icon name="plus" size={16} /><span>Add project / lead</span></button></>
    : tab === "reports" || tab === "followups" ? <button className="ui-btn ui-btn-ghost" onClick={() => window.print()}><Icon name="print" size={16} /><span>Print / save PDF</span></button>
    : tab === "contacts" || tab === "team" ? <><button className="ui-btn ui-btn-ghost" onClick={() => window.print()}><Icon name="print" size={16} /><span>Print</span></button><button className="ui-btn ui-btn-primary" onClick={() => setModalContact("new")}><Icon name="plus" size={16} /><span>{tab === "team" ? "Add team member" : "Add contact"}</span></button></>
    : tab === "rooms" ? <button className="ui-btn ui-btn-primary" onClick={() => setRoomCreate({ contactIds: [] })}><Icon name="plus" size={16} /><span>Share a database</span></button>
    : tab === "links" ? <button className="ui-btn ui-btn-primary" onClick={() => setLinkModal(true)}><Icon name="plus" size={16} /><span>Create link</span></button> : null;
  const quickAdd: [string, string, () => void][] = [
    ["Contact", "contacts", () => { setTab("contacts"); setModalContact("new"); }],
    ["Project or lead", "briefcase", () => { setTab("projects"); setModalProject("new"); }],
    ["Estimate / quotation", "calculator", () => navigate("estimates", { kind: "new", id: "" })],
    ["Daily site report", "clipboard", () => navigate("site", { kind: "new", id: "" })],
    ["Expense", "receipt", () => navigate("finance", { kind: "new-expense", id: "" })],
    ["Task", "calendar", () => setTab("tasks")],
    ["Form link", "links", () => { setTab("links"); setLinkModal(true); }],
    ["Custom form", "clipboard", () => setTab("customForms")],
  ];
  const focusKey = focus ? `${focus.kind}-${focus.id}-${focus.seq}` : "none";
  const allResultsCount = globalSearchResults.length + serverHits.length;

  return <WorkspaceProvider value={workspace}><ConfirmProvider>
  <div className={`app-shell v4-shell ${privacy ? "privacy-on" : ""} ${mobileNavOpen ? "nav-open" : ""}`} style={{ "--brand": brandColor } as CSSProperties}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar v4-sidebar" aria-label="Workspace navigation">
      <div className="sidebar-brand"><BrandMark /><div className="brand-copy"><strong>{settings.businessName || brandName}</strong><small>Private workspace</small></div><button type="button" className="ui-icon-btn v4-nav-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><Icon name="x" /></button></div>
      <label className="v4-nav-find"><Icon name="search" size={15} /><input type="search" value={navFilter} onChange={(event) => setNavFilter(event.target.value)} placeholder="Find a section…" aria-label="Find a navigation section" /></label>
      <nav className="v4-nav" ref={sidebarNavRef} aria-label="Main navigation">
        {navGroups.map((group) => {
          const items = group.items.filter(([, label]) => !filterText || label.toLowerCase().includes(filterText) || group.label.toLowerCase().includes(filterText));
          if (!items.length) return null;
          const collapsed = !filterText && collapsedGroups.includes(group.id) && activeGroup !== group.id;
          return <div className="v4-nav-group" key={group.id}>
            <button type="button" className="v4-nav-group-label" aria-expanded={!collapsed} onClick={() => setCollapsedGroups((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}><span>{group.label}</span><Icon name={collapsed ? "chevron" : "chevronDown"} size={14} /></button>
            {!collapsed ? <ul>{items.map(([value, label, icon]) => { const active = tab === value || (tab === "project" && value === "projects"); const badge = navCount(value); return <li key={value}>
              <button type="button" className={`v4-nav-item ${active ? "is-active nav-item-active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => { setTab(value); setFocus(null); setNavFilter(""); setMobileNavOpen(false); }}><Icon name={icon} size={17} /><span>{label}</span>{badge ? <small className={badge.alert ? "is-alert" : ""}>{badge.count}</small> : null}</button>
            </li>; })}</ul> : null}
          </div>;
        })}
        {filterText && !navGroups.some((group) => group.items.some(([, label]) => label.toLowerCase().includes(filterText) || group.label.toLowerCase().includes(filterText))) ? <div className="v4-nav-empty">No sections match “{navFilter}”. <button type="button" onClick={() => setNavFilter("")}>Clear</button></div> : null}
      </nav>
      <div className="v4-sidebar-foot"><span className="user-avatar" aria-hidden="true">{initials(settings.businessName || brandName)}</span><div><strong>Owner</strong><small>Signed in</small></div><button type="button" className="ui-icon-btn" onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button></div>
    </aside>
    {mobileNavOpen ? <div className="v4-scrim" role="presentation" onClick={() => setMobileNavOpen(false)} /> : null}

    <div className="main-column">
      <header className="topbar v4-topbar">
        <button type="button" className="ui-icon-btn v4-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Open menu" aria-expanded={mobileNavOpen}><Icon name="menu" /></button>
        <form className="workspace-search" role="search" onSubmit={(event) => { event.preventDefault(); setGlobalSearchOpen(true); }}>
          <span className="workspace-search-icon"><Icon name="search" /></span>
          <input ref={globalSearchInputRef} value={globalSearch} onChange={(event) => { setGlobalSearch(event.target.value); setGlobalSearchOpen(Boolean(event.target.value.trim())); }} onFocus={() => { if (globalSearch.trim()) setGlobalSearchOpen(true); }} onBlur={() => setGlobalSearchOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setGlobalSearchOpen(false); }} placeholder="Search everything…" aria-label="Search contacts, projects, quotations, invoices, materials, workers, documents and more" autoComplete="off" />
          {globalSearch ? <button type="button" className="workspace-search-clear" onClick={() => { setGlobalSearch(""); setGlobalSearchOpen(false); }} aria-label="Clear search">×</button> : <kbd className="workspace-search-hint">Ctrl K</kbd>}
          {globalSearchOpen && globalSearch.trim() ? <div className="global-search-results" role="listbox" aria-label="Search results">
            {globalSearchResults.map((result) => <button type="button" className="global-search-result" key={`${result.kind}-${result.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => openGlobalSearchResult(result)}>
              <span className={`global-result-icon global-result-${result.kind}`}><Icon name={result.kind === "contact" ? "contacts" : result.kind === "project" ? "briefcase" : result.kind === "task" ? "calendar" : result.kind === "rate" || result.kind === "room" ? "database" : result.kind === "link" ? "links" : "note"} size={16} /></span>
              <span className="global-result-copy"><strong>{result.title}</strong><small>{result.subtitle}</small></span><span className="global-result-type">{result.kind}</span>
            </button>)}
            {serverHits.map((hit) => <button type="button" className="global-search-result" key={`s-${hit.kind}-${hit.id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => openServerHit(hit)}>
              <span className="global-result-icon"><Icon name={({ estimate: "calculator", invoice: "wallet", "purchase-order": "truck", "material-request": "box", material: "box", worker: "helmet", tender: "gavel", document: "folder", "public-page": "globe" } as Record<string, string>)[hit.kind] || "file"} size={16} /></span>
              <span className="global-result-copy"><strong>{hit.title}</strong><small>{hit.subtitle}</small></span><span className="global-result-type">{hit.kind.replace("-", " ")}</span>
            </button>)}
            {!allResultsCount ? <div className="global-search-empty"><strong>No matches</strong><span>Try a name, number, phone, material or project.</span></div> : null}
          </div> : null}
        </form>
        <div className="topbar-actions">
          <button className={`ui-btn ui-btn-ghost privacy-toggle ${privacy ? "is-on" : ""}`} onClick={() => setPrivacy((value) => !value)} aria-pressed={privacy} title="Blur phone numbers and emails while someone is looking at your screen"><Icon name={privacy ? "eye" : "eyeOff"} size={16} /><span>{privacy ? "Show numbers" : "Hide numbers"}</span></button>
          <div className="v4-quick">
            <button type="button" className="ui-btn ui-btn-primary" aria-haspopup="menu" aria-expanded={quickAddOpen} onClick={() => setQuickAddOpen((value) => !value)}><Icon name="plus" size={16} /><span>New</span></button>
            {quickAddOpen ? <><div className="v4-quick-scrim" role="presentation" onClick={() => setQuickAddOpen(false)} /><ul className="v4-quick-menu" role="menu">{quickAdd.map(([label, icon, action]) => <li key={label} role="none"><button type="button" role="menuitem" onClick={() => { setQuickAddOpen(false); action(); }}><Icon name={icon} size={16} />{label}</button></li>)}</ul></> : null}
          </div>
          <button className="ui-icon-btn mobile-logout v4-logout" onClick={logout} aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>
        </div>
      </header>
      <main id="main-content" className="content-area v4-content" data-print-title={`${settings.businessName || brandName} · ${meta.title}`} tabIndex={-1}>
        {tab !== "overview" && tab !== "project" ? <div className="v4-heading">
          <div><p className="ui-kicker">{meta.group}</p><h1>{meta.title}</h1>{meta.subtitle ? <p>{meta.subtitle}</p> : null}</div>
          {headingActions ? <div className="v4-heading-actions">{headingActions}</div> : null}
        </div> : null}

        {tab === "overview" ? <>
          <OverviewPanel tasks={tasks} followUpsDue={followUpsDue} onNewTask={() => setTab("tasks")} onNewProject={() => { setTab("projects"); setModalProject("new"); }} />
          <div className="ov-grid ov-grid-even ov-network">
            <section className="ui-section"><header className="ui-section-head"><div><h2>Your network</h2><p>Contacts by category. Select one to see those contacts.</p></div><button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setTab("contacts")}>All contacts</button></header>
              {contacts.length ? <ul className="ov-categories">{categoryCounts.filter((category) => category.count > 0).sort((a, b) => b.count - a.count).map((category) => <li key={category.id}><button type="button" onClick={() => { setFilterCategory(category.id); setTab("contacts"); }}><span>{category.label}</span><span className="ui-progress"><i className="ui-tone-accent" style={{ width: `${Math.max(4, Math.round(category.count / Math.max(1, counts.total) * 100))}%` }} /></span><strong>{category.count}</strong></button></li>)}</ul> : <div className="ui-empty"><strong>No contacts yet</strong><p>Add a contact or share a public form to collect details.</p><div className="ui-empty-action"><button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => { setTab("contacts"); setModalContact("new"); }}>Add contact</button></div></div>}
            </section>
            <section className="ui-section"><header className="ui-section-head"><div><h2>Recently updated</h2><p>Contacts and private notes you changed last.</p></div><button type="button" className="ui-icon-btn" onClick={() => loadData()} aria-label="Refresh records"><Icon name="refresh" size={16} /></button></header>
              {contacts.length || activeNotes.length ? <ul className="ov-list">
                {[...contacts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map((contact) => <li key={contact._id}><button type="button" onClick={() => { setTab("contacts"); setModalContact(contact); }}><span className="ov-avatar" aria-hidden="true">{initials(contact.name)}</span><span className="ov-list-main">{contact.name}<small>{contact.organization || categoryLabel(contact.category)}</small></span><span className="ov-list-meta">{relativeDate(contact.updatedAt)}</span></button></li>)}
                {activeNotes.slice(0, 3).map((note) => <li key={note._id}><button type="button" onClick={() => { setFocusedNoteId(note._id); setTab("notes"); }}><span className="ov-avatar ov-avatar-note" aria-hidden="true"><Icon name="note" size={14} /></span><span className="ov-list-main">{note.title}<small>Private note{note.pinned ? " · pinned" : ""}</small></span><span className="ov-list-meta">{relativeDate(note.updatedAt)}</span></button></li>)}
              </ul> : <div className="ui-empty"><strong>Nothing yet</strong><p>Records you add or edit will appear here.</p></div>}
            </section>
          </div>
        </> : null}

        {(tab === "contacts" || tab === "team") ? <section className="panel database-panel"><div className="contact-directory-switch"><button type="button" className={tab === "contacts" ? "active" : ""} onClick={() => setTab("contacts")}>All contacts <span>{contacts.length}</span></button><button type="button" className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}>Team directory <span>{contacts.filter((contact) => contact.isTeamMember).length}</span></button></div><div className="database-toolbar"><form className="search-form" onSubmit={applyFilters}><span className="search-icon"><Icon name="search" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "team" ? "Search team names, roles, phone numbers…" : "Search name, phone, company, city…"} aria-label={tab === "team" ? "Search team directory" : "Search contacts"} /><button type="submit">Search</button></form><div className="database-actions"><label className="filter-control"><Icon name="filter" /><select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} aria-label="Filter by category"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><select className="filter-control status-filter" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button className={`secondary-button dup-toggle ${onlyDuplicates ? "dup-toggle-on" : ""}`} type="button" onClick={() => setOnlyDuplicates((v) => !v)} disabled={!duplicateIds.size && !onlyDuplicates} title="Show contacts that share a phone number or email">Duplicates ({duplicateIds.size})</button>{onlyDuplicates && duplicateIds.size ? <button className="primary-button" type="button" onClick={() => setMergeOpen(true)}>Merge duplicates…</button> : null}<input ref={importInputRef} className="hidden-file-input" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importContacts} aria-label="Choose a CSV or Excel file to import" /><button className="secondary-button import-trigger" type="button" onClick={() => importInputRef.current?.click()} disabled={importing} title="Import CSV or Excel contacts; duplicates by phone or email are skipped"><Icon name="upload" /> {importing ? "Importing…" : "Import"}</button><a className="secondary-button import-trigger" href="/api/civil-at-hand/export?scope=template&format=xlsx" title="A blank Excel file with the right column names">Template</a><div className="export-menu"><button className="secondary-button export-trigger"><Icon name="download" /> Export <span>⌄</span></button><div className="export-options"><a href={`/api/civil-at-hand/export?format=xlsx${exportFilterQuery}`}><span className="export-file-icon">X</span><span><strong>Excel workbook</strong><small>.xlsx · {hasActiveExportFilters ? "Current filters" : "Full database"}</small></span></a><a href={`/api/civil-at-hand/export?format=csv${exportFilterQuery}`}><span className="export-file-icon csv-file">≡</span><span><strong>CSV file</strong><small>.csv · {hasActiveExportFilters ? "Current filters" : "Full database"}</small></span></a><button onClick={() => window.print()}><span className="export-file-icon pdf-file">P</span><span><strong>Save as PDF</strong><small>Print / Save PDF</small></span></button></div></div><button className="primary-button compact-add" onClick={() => setModalContact("new")}><Icon name="plus" /> Add</button></div></div>
          <div className="table-summary"><span><strong>{filteredContacts.length}</strong> {tab === "team" ? "team member" : "contact"}{filteredContacts.length === 1 ? "" : "s"}{(filterCategory || filterStatus || appliedSearch || onlyDuplicates) ? " match your filters" : " in your current view"}</span><div><span className="summary-dot" /> MongoDB synced on refresh</div></div>
          {selectedIds.length ? <div className="bulk-bar" role="region" aria-label="Bulk actions"><strong>{selectedIds.length} selected</strong>
            <select aria-label="Set status for selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("status", value); }}><option value="">Set status…</option>{contactStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select aria-label="Sharing consent for selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("consent", value === "clear" ? "" : value); }}><option value="">Sharing consent…</option><option value="yes">Agreed to be shared</option><option value="no">Never share</option><option value="clear">Not recorded</option></select>
            <select aria-label="Flag selected" defaultValue="" onChange={(event) => { const value = event.target.value; event.target.value = ""; if (value) void bulk("flag", value === "clear" ? "" : value); }}><option value="">Flag…</option><option value="preferred">Preferred</option><option value="avoid">Avoid</option><option value="clear">Clear flag</option></select>
            <button className="secondary-button" type="button" onClick={() => { const tag = window.prompt("Tag to add to the selected contacts:"); if (tag && tag.trim()) void bulk("add-tag", tag.trim()); }}>+ Tag</button>
            <button className="primary-button" type="button" onClick={() => { setRoomCreate({ contactIds: selectedIds }); setTab("rooms"); }}>Share selected…</button>
            <button className="secondary-button bulk-delete" type="button" onClick={() => void bulk("delete")}>Delete</button>
            <button className="icon-button" type="button" onClick={() => setSelectedIds([])} aria-label="Clear selection">×</button></div> : null}
          {filteredContacts.length ? <div className="table-scroll"><table className="contacts-table"><thead><tr><th className="select-col"><input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} aria-label="Select all shown contacts" /></th><th>CONTACT</th><th>CATEGORY</th><th>PHONE / EMAIL</th><th>LOCATION</th><th>STATUS</th><th>UPDATED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredContacts.map((contact, index) => <tr key={contact._id} className={selectedIds.includes(contact._id) ? "row-selected" : ""}><td className="select-col"><input type="checkbox" checked={selectedIds.includes(contact._id)} onChange={() => toggleOne(contact._id)} aria-label={`Select ${contact.name}`} /></td><td><div className="table-person"><span className={`contact-avatar avatar-${index % 5}`}>{initials(contact.name)}</span><span><strong>{contact.name || "Unnamed contact"}{duplicateIds.has(contact._id) ? <span className="dup-badge" title="Another contact has the same phone or email">Duplicate?</span> : null}{contact.flag === "avoid" ? <span className="dup-badge flag-avoid">Avoid</span> : contact.flag === "preferred" ? <span className="dup-badge flag-pref">Preferred</span> : null}{contact.rating ? <span className="rt-stars" title={`${contact.rating} of 5`}>{"★".repeat(contact.rating)}</span> : null}</strong><small>{contact.organization || contact.details?.supplierType || contact.details?.contractorType || (contact.isTeamMember ? "Team member" : "Individual / business")}</small>{contact.teamRole || contact.jobTitle ? <small className="contact-person-role">{[contact.teamRole, contact.jobTitle].filter(Boolean).join(" · ")}</small> : null}{contact.tags?.length ? <span className="contact-person-tags">{contact.tags.slice(0, 2).map((tag) => <i key={`${contact._id}-${tag}`}>{tag}</i>)}{contact.tags.length > 2 ? <i>+{contact.tags.length - 2}</i> : null}</span> : null}</span></div></td><td><span className="category-tag">{categoryLabel(contact.category)}</span></td><td><div className="contact-methods">{contact.phone ? <a href={`tel:${contact.phone}`} title={`${contact.phoneLabel || "Mobile"}: ${contact.phone}`}>{contact.phoneLabel && contact.phoneLabel !== "Mobile" ? `${contact.phoneLabel}: ` : ""}{contact.phone}</a> : null}{(contact.phoneNumbers || []).filter((item) => item.number && item.number !== contact.phone).slice(0, 2).map((item, phoneIndex) => <a key={`${contact._id}-phone-${phoneIndex}`} href={`tel:${item.number}`} title={`${item.label}: ${item.number}`}>{item.label}: {item.number}</a>)}{contact.email ? <a href={`mailto:${contact.email}`} title={`${contact.emailLabel || "Work"}: ${contact.email}`}>{contact.emailLabel && contact.emailLabel !== "Work" ? `${contact.emailLabel}: ` : ""}{contact.email}</a> : null}{(contact.emailAddresses || []).filter((item) => item.value && item.value.toLowerCase() !== (contact.email || "").toLowerCase()).slice(0, 1).map((item, emailIndex) => <a key={`${contact._id}-email-${emailIndex}`} href={`mailto:${item.value}`} title={item.value}>{item.label}: {item.value}</a>)}{!contact.phone && !contact.email && !(contact.phoneNumbers || []).length && !(contact.emailAddresses || []).length ? <span className="muted-cell">No phone or email</span> : null}{((contact.phoneNumbers || []).filter((item) => item.number && item.number !== contact.phone).length > 2 || (contact.emailAddresses || []).filter((item) => item.value && item.value.toLowerCase() !== (contact.email || "").toLowerCase()).length > 1) ? <small className="contact-more-methods">More saved in contact</small> : null}</div></td><td><span className="location-cell">{[contact.city, contact.state].filter(Boolean).join(", ") || "—"}</span></td><td><StatusPill status={contact.status} /></td><td><span className="updated-cell">{relativeDate(contact.updatedAt)}</span>{contact.followUpAt ? <small className={`fu-chip ${contact.followUpAt.slice(0, 10) < dateKey(new Date()) && contact.status !== "closed" ? "fu-chip-late" : ""}`}>Follow-up {dateOnly(contact.followUpAt)}</small> : null}</td><td><div className="row-actions"><button className="icon-button row-edit" onClick={() => setModalContact(contact)} title="View / edit" aria-label={`Edit ${contact.name}`}><Icon name="edit" /></button><button className="icon-button row-more" onClick={() => openWhatsApp(contact.details?.whatsapp || contact.phone, `Hello ${contact.name}, contacting you regarding ${categoryLabel(contact.category)}.`)} title="Message this contact" aria-label={`Message ${contact.name} on WhatsApp`}>◉</button><button className="icon-button row-share" onClick={() => shareContact(contact)} title="Share contact details on WhatsApp" aria-label={`Share details for ${contact.name}`}><Icon name="share" /></button><button className="icon-button row-mail" onClick={() => emailContactSummary(contact)} title="Email contact details" aria-label={`Email details for ${contact.name}`}><Icon name="mail" /></button><button className="icon-button row-delete" onClick={() => deleteContact(contact)} title="Delete record" aria-label={`Delete ${contact.name}`}><Icon name="trash" /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><span className="empty-icon"><Icon name="search" /></span><h3>{contacts.length ? "No records match these filters" : tab === "team" ? "Your team directory is ready" : "Your contact database is ready"}</h3><p>{contacts.length ? "Try another search term or clear one of the filters." : "Add a contact yourself, or create a share link so a supplier or contractor can fill in their own details."}</p><div className="empty-actions">{contacts.length ? <button className="secondary-button" onClick={() => { setSearch(""); setAppliedSearch(""); setFilterCategory(""); setFilterStatus(""); setOnlyDuplicates(false); }}>Clear filters</button> : <><button className="secondary-button" onClick={() => setModalContact("new")}>Add contact</button><button className="primary-button" onClick={() => { setTab("links"); setLinkModal(true); }}>Create a share form</button></>}</div></div>}
          <div className="database-footer"><span>Personal database · Visible only after admin sign-in</span><span>Up to 5,000 records are loaded at a time</span></div>
        </section> : null}


        {tab === "followups" ? <FollowUpsPanel contacts={contacts} projects={projects} onOpen={openFollowUp} onUpdate={updateFollowUp} onWhatsApp={openWhatsApp} /> : null}
        {tab === "tasks" ? <TasksPanel tasks={tasks} contacts={contacts} projects={projects} onChanged={() => loadData(false)} notify={notify} focusTaskId={focusedTaskId} onFocusHandled={clearFocusedTask} /> : null}
        {tab === "notes" ? <PrivateNotesPanel notes={notes} projects={projects} tasks={tasks} onChanged={() => loadData(false)} notify={notify} focusNoteId={focusedNoteId} onFocusHandled={clearFocusedNote} /> : null}
        {tab === "projects" ? <ProjectsPanel projects={projects} contacts={contacts} onEdit={(project) => setModalProject(project)} onDelete={deleteProject} onStatus={changeProjectStatus} onOpen={(project) => navigate("project", { kind: "project", id: project._id })} /> : null}
        {tab === "project" && workspaceProjectId ? <ProjectWorkspace key={`${workspaceProjectId}-${workspaceVersion}`} projectId={workspaceProjectId} tasks={tasks} onBack={() => setTab("projects")} onEdit={(project) => setModalProject(project)} /> : null}
        {tab === "site" ? <SiteReportsPanel key={focusKey} initialFilter={focus?.filter || ""} openNew={focus?.kind === "new"} onOpenHandled={clearFocus} /> : null}
        {tab === "estimates" ? <EstimatesPanel key={focusKey} initialFilter={focus?.filter || ""} openNew={focus?.kind === "new"} openId={focus?.kind === "estimate" ? focus.id : ""} onOpenHandled={clearFocus} /> : null}
        {tab === "procurement" ? <ProcurementPanel key={focusKey} initialSection={focus?.filter || ""} /> : null}
        {tab === "workforce" ? <WorkforcePanel key={focusKey} initialSection={focus?.filter || (focus?.kind === "worker" ? "workers" : "")} /> : null}
        {tab === "finance" ? <FinancePanel key={focusKey} initialFilter={focus?.filter || ""} openNewExpense={focus?.kind === "new-expense"} onOpenHandled={clearFocus} /> : null}
        {tab === "documents" ? <DocumentsPanel key={focusKey} initialFilter={focus?.filter || ""} openId={focus?.kind === "document" ? focus.id : ""} onOpenHandled={clearFocus} /> : null}
        {tab === "tenders" ? <TendersPanel key={focusKey} openId={focus?.kind === "tender" ? focus.id : ""} onOpenHandled={clearFocus} /> : null}
        {tab === "pages" ? <PublicPagesPanel /> : null}
        {tab === "rates" ? <RatesPanel rates={rates} contacts={contacts} onChanged={() => loadData(false)} notify={notify} /> : null}
        {tab === "rooms" ? <RoomsPanel rooms={rooms} contacts={contacts} rates={rates} creating={roomCreate} onCloseCreate={() => setRoomCreate(null)} onChanged={() => loadData(false)} notify={notify} ownerName={brandName} /> : null}
        {mergeOpen ? <MergeModal contacts={contacts} onClose={() => setMergeOpen(false)} onDone={() => loadData(false)} notify={notify} /> : null}
        {tab === "security" ? <SecurityPanel twoFactor={Boolean(session.twoFactor)} autoLockMinutes={autoLock} onAutoLock={(minutes) => { void saveAutoLockPreference(minutes); }} notify={notify} /> : null}
        {tab === "reports" ? <><ReportsPanel contacts={contacts} projects={projects} links={links} rooms={rooms} duplicateCount={duplicateIds.size} /><BusinessReports /></> : null}

        {tab === "customForms" ? <CustomFormsPanel /> : null}

        {tab === "links" ? <div className="links-view"><div className="link-howto"><div className="howto-badge"><Icon name="links" /></div><div><h2>Collect details without giving dashboard access</h2><p>Make a separate form for each kind of contact. Share the link on WhatsApp, email or anywhere else. People can submit without a password; only you can view the saved records.</p></div><div className="howto-steps"><span><b>1</b> Create link</span><span><b>2</b> Share it</span><span><b>3</b> Review entries</span></div></div>
          <div className="links-section-heading"><div><h2>Your share links</h2><p>Pause a link any time. Paused or expired links stop accepting submissions.</p></div><span className="neutral-count">{links.length} total</span></div>
          {links.length ? <div className="links-grid">{links.map((link) => { const expired = Boolean(link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()); const isLive = link.active && !expired; const shareUrl = link.shareUrl || `${siteBase()}/workspace/join/${link.token}`; return <article className="share-card" key={link._id}><div className="share-card-top"><span className={`share-category-icon share-icon-${categories.findIndex((item) => item.id === link.category) % 6}`}>{initials(categoryLabel(link.category))}</span><div className="share-title"><h3>{link.title}</h3><span>{categoryLabel(link.category)}</span></div><button className="more-menu-button" title="Rename link" onClick={() => renameLink(link)}>•••</button></div><div className="share-status-line"><span className={`link-state ${isLive ? "link-live" : expired ? "link-expired" : "link-paused"}`}><i />{expired ? "Expired" : link.active ? "Active" : "Paused"}</span><span className="submission-count"><Icon name="contacts" /> {link.submissions || 0} submission{link.submissions === 1 ? "" : "s"}</span></div><div className="share-url-box"><span>{shareUrl.replace(/^https?:\/\//, "")}</span><button onClick={() => copyText(shareUrl, "Public form link copied.")} title="Copy share link" aria-label="Copy share link"><Icon name="copy" /></button></div><div className="share-expiry">{link.expiresAt ? `Expires ${shortDate(link.expiresAt)}` : "No expiry set"}<span>Created {shortDate(link.createdAt)}</span></div><div className="share-card-actions"><button className="secondary-button" onClick={() => shareLink(link)} disabled={!isLive}>Share via WhatsApp <Icon name="external" /></button><button className={`small-state-button ${isLive ? "pause-button" : "activate-button"}`} onClick={() => toggleLink(link)}>{isLive ? "Pause" : "Activate"}</button><button className="icon-button row-delete" onClick={() => deleteLink(link)} title="Delete link" aria-label="Delete link"><Icon name="trash" /></button></div></article>; })}</div> : <div className="empty-state links-empty"><span className="empty-icon"><Icon name="links" /></span><h3>No share links yet</h3><p>Create a form for manpower suppliers, vendors, subcontractors, contractors, potential clients, investors or project partners. Each link collects the correct details for its category.</p><button className="primary-button" onClick={() => setLinkModal(true)}><Icon name="plus" /> Create first share link</button></div>}
          <div className="links-security-note"><Icon name="lock" /><div><strong>Keep your dashboard private.</strong><p>The share link opens only its own form. It cannot show existing contacts, other forms or admin pages. If a link is forwarded too widely, pause or delete it here.</p></div></div>
        </div> : null}


        {tab === "settings" ? <SettingsPanel health={health} onTestConnection={async () => { setHealth(null); try { const result = await jsonRequest("/api/civil-at-hand/health"); setHealth(result); notify("Database connection is healthy."); } catch (error) { setHealth({ database: "error", message: error instanceof Error ? error.message : "Connection failed" }); notify("Database check failed.", "error"); } }} /> : null}
      </main>
      <footer className="app-footer v4-footer"><span>© {new Date().getFullYear()} {settings.businessName || brandName}</span><span>Private workspace · records stored in your MongoDB database</span></footer>
    </div>
    {toast ? <div className={`v4-toast v4-toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"} aria-live={toast.type === "error" ? "assertive" : "polite"}><Icon name={toast.type === "error" ? "alert" : toast.type === "info" ? "clock" : "check"} size={16} /><span>{toast.message}</span><button type="button" onClick={() => setToast(null)} aria-label="Dismiss message"><Icon name="x" size={14} /></button></div> : null}
    {modalContact ? <ContactModal key={modalContact === "new" ? "new-contact" : modalContact._id} initial={modalContact === "new" ? null : modalContact} onClose={() => setModalContact(null)} onSave={saveContact} saving={saving} defaultTeam={tab === "team"} /> : null}
    {modalProject ? <ProjectModal key={modalProject === "new" ? "new-project" : modalProject._id} initial={modalProject === "new" ? null : modalProject} contacts={contacts} onClose={() => setModalProject(null)} onSave={saveProject} saving={savingProject} /> : null}
    {linkModal ? <LinkModal onClose={() => setLinkModal(false)} onCreate={createLink} busy={busy} /> : null}
  </div>
  </ConfirmProvider></WorkspaceProvider>;
}
