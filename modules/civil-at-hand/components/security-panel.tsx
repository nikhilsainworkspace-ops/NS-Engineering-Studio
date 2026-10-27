"use client";

import { useEffect, useRef, useState } from "react";
import { copyToClipboard, dateTime, jsonRequest } from "@/modules/civil-at-hand/lib/client-api";

type Notify = (message: string, type?: "success" | "error" | "info") => void;
type Device = { _id: string; ip: string; agent: string; createdAt: string; lastSeenAt: string; current: boolean };
type Entry = { _id?: string; at: string; action: string; detail: string; ip: string; agent: string };
type RestorePreview = { counts: Record<string, number>; invalid: string[]; warnings: string[] };
type ScheduledBackup = { _id: string; createdAt: string; completedAt?: string | null; byteLength: number; chunkCount: number; counts: Record<string, number>; trigger: string };
type ScheduledRestorePreview = RestorePreview & { _id: string };

const ACTION_LABELS: Record<string, string> = {
  login: "Signed in", "login-failed": "Failed sign-in", logout: "Signed out", "logout-failed": "Sign-out needs attention", "contact-deleted": "Contact deleted", "contacts-bulk-deleted": "Contacts deleted (bulk)",
  "contacts-bulk-updated": "Contacts updated (bulk)", "contacts-merged": "Duplicates merged", "room-created": "Shared database created", "room-updated": "Shared database changed",
  "room-deleted": "Shared database deleted", "backup-downloaded": "Backup downloaded", "sessions-revoked": "Devices signed out", "session-revoked": "Device signed out", "data-exported": "Data exported", "data-imported": "Contacts imported", "security-setting-updated": "Security preference updated",
};

export default function SecurityPanel({ twoFactor, autoLockMinutes, onAutoLock, notify }: { twoFactor: boolean; autoLockMinutes: number; onAutoLock: (minutes: number) => void; notify: Notify }) {
  const [devices, setDevices] = useState<Device[]>([]); const [entries, setEntries] = useState<Entry[]>([]); const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; url: string } | null>(null); const [code, setCode] = useState(""); const [verified, setVerified] = useState<boolean | null>(null); const [busy, setBusy] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const [restoreBackup, setRestoreBackup] = useState<Record<string, unknown> | null>(null);
  const [restoreFileName, setRestoreFileName] = useState("");
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [scheduledBackups, setScheduledBackups] = useState<ScheduledBackup[]>([]);
  const [scheduledPreview, setScheduledPreview] = useState<ScheduledRestorePreview | null>(null);
  const [scheduledBusy, setScheduledBusy] = useState(false);

  async function load() {
    try {
      const [d, a] = await Promise.all([jsonRequest("/api/civil-at-hand/security/sessions"), jsonRequest("/api/civil-at-hand/security/audit")]);
      setDevices(d.sessions || []); setEntries(a.entries || []);
    } catch (err) { notify(err instanceof Error ? err.message : "Could not load security details.", "error"); }
    try {
      const backups = await jsonRequest("/api/civil-at-hand/backup/scheduled");
      setScheduledBackups(Array.isArray(backups.backups) ? backups.backups : []);
    } catch { /* Backups may be unavailable if the database is temporarily offline. Keep the rest of Security usable. */ }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function revoke(device: Device) {
    if (device.current && !window.confirm("This is the device you are using now. Sign it out?")) return;
    try { await jsonRequest(`/api/civil-at-hand/security/sessions?id=${device._id}`, { method: "DELETE" }); notify("Device signed out."); await load(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not sign out that device.", "error"); }
  }
  async function revokeOthers() {
    if (!window.confirm("Sign out every other phone and computer?")) return;
    try { await jsonRequest("/api/civil-at-hand/security/sessions?others=1", { method: "DELETE" }); notify("All other devices were signed out."); await load(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not sign out the other devices.", "error"); }
  }
  async function startSetup() {
    setBusy(true); setVerified(null); setCode("");
    try { setSetup(await jsonRequest("/api/civil-at-hand/security/2fa", { method: "POST", body: JSON.stringify({ action: "generate" }) })); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not start setup.", "error"); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!setup) return; setBusy(true);
    try { const data = await jsonRequest("/api/civil-at-hand/security/2fa", { method: "POST", body: JSON.stringify({ action: "verify", secret: setup.secret, code }) }); setVerified(Boolean(data.ok)); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not check the code.", "error"); }
    finally { setBusy(false); }
  }
  const grouped = setup ? setup.secret.replace(/(.{4})/g, "$1 ").trim() : "";

  async function createScheduledBackup() {
    setScheduledBusy(true);
    try {
      const result = await jsonRequest("/api/civil-at-hand/backup/scheduled", { method: "POST", body: JSON.stringify({}) });
      notify(`Backup snapshot created (${(Number(result.backup?.byteLength || 0) / 1024 / 1024).toFixed(2)} MB).`);
      const latest = await jsonRequest("/api/civil-at-hand/backup/scheduled");
      setScheduledBackups(Array.isArray(latest.backups) ? latest.backups : []);
      setScheduledPreview(null);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not create a backup snapshot.", "error"); }
    finally { setScheduledBusy(false); }
  }

  async function previewScheduledBackup(backup: ScheduledBackup) {
    setScheduledBusy(true); setScheduledPreview(null);
    try {
      const result = await jsonRequest(`/api/civil-at-hand/backup/scheduled/${backup._id}/restore`, { method: "POST", body: JSON.stringify({ action: "preview" }) });
      setScheduledPreview({ _id: backup._id, counts: result.counts || {}, invalid: result.invalid || [], warnings: result.warnings || [] });
      notify("Snapshot verified. Review its records and warnings before restoring.", "info");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not verify this backup snapshot.", "error"); }
    finally { setScheduledBusy(false); }
  }

  async function restoreScheduledBackupNow() {
    if (!scheduledPreview) return;
    if (scheduledPreview.invalid.length) { notify("Restore is blocked because validation found invalid records.", "error"); return; }
    if (!window.confirm("Merge this server-side snapshot into MongoDB? Matching IDs will be updated, records absent from the snapshot will not be deleted, and this cannot be automatically undone. Download a fresh backup first.")) return;
    setScheduledBusy(true);
    try {
      const result = await jsonRequest(`/api/civil-at-hand/backup/scheduled/${scheduledPreview._id}/restore`, { method: "POST", body: JSON.stringify({ action: "restore" }) });
      const total = Object.values(result.restored || {}).reduce((sum: number, count: unknown) => sum + Number(count || 0), 0);
      notify(`Snapshot merged successfully: ${total.toLocaleString()} record(s) processed.`);
      setScheduledPreview(null);
      const latest = await jsonRequest("/api/civil-at-hand/backup/scheduled");
      setScheduledBackups(Array.isArray(latest.backups) ? latest.backups : []);
      await load();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not restore this snapshot.", "error"); }
    finally { setScheduledBusy(false); }
  }

  async function inspectBackup(file?: File) {
    if (!file) return;
    if (file.size > 4_000_000) { notify("For safe browser-based restore, choose a JSON backup smaller than 4 MB.", "error"); return; }
    setRestoreBusy(true); setRestorePreview(null); setRestoreBackup(null); setRestoreFileName(file.name);
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const preview = await jsonRequest("/api/civil-at-hand/backup/restore", { method: "POST", body: JSON.stringify({ action: "preview", backup: parsed }) });
      setRestoreBackup(parsed); setRestorePreview({ counts: preview.counts || {}, invalid: preview.invalid || [], warnings: preview.warnings || [] });
      notify("Backup checked. Review the counts and warnings before restoring.", "info");
    } catch (error) { notify(error instanceof Error ? error.message : "This file is not a valid supported backup.", "error"); }
    finally { setRestoreBusy(false); if (restoreInputRef.current) restoreInputRef.current.value = ""; }
  }
  async function restoreBackupNow() {
    if (!restoreBackup || !restorePreview) return;
    if (restorePreview.invalid.length) { notify("Restore is blocked because this backup contains invalid records. Fix the source backup first.", "error"); return; }
    if (!window.confirm("Merge these records into the current MongoDB database? Existing records with matching IDs will be updated. Records absent from the backup will not be deleted. Download a fresh backup first if you are unsure.")) return;
    setRestoreBusy(true);
    try {
      const result = await jsonRequest("/api/civil-at-hand/backup/restore", { method: "POST", body: JSON.stringify({ action: "restore", backup: restoreBackup }) });
      notify(`Backup merged successfully: ${Object.values(result.restored || {}).reduce((sum: number, count: unknown) => sum + Number(count || 0), 0)} record(s) processed.`);
      setRestoreBackup(null); setRestorePreview(null); setRestoreFileName("");
      await load();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not restore the backup.", "error"); }
    finally { setRestoreBusy(false); }
  }

  return <div className="sec-view">
    <section className="panel sec-card sec-hero"><div><p className="eyebrow">PRIVATE PORTAL</p><h2>Security centre</h2><p>This portal is for you only. Nobody can register; outsiders receive only the specific public form or limited shared data you choose to send them.</p></div>
      <ul className="sec-checks"><li className="ok">Passwords and sessions are checked on the server for every request</li><li className="ok">Sessions can be revoked, and expire when idle</li><li className="ok">Cross-site requests are blocked; failed logins are throttled</li><li className="ok">Business records are kept in MongoDB, not browser local storage</li><li className="ok">Logout clears app state, browser cache/storage and other open tabs</li><li className="ok">Sensitive dashboard and API responses disable browser caching</li><li className={twoFactor ? "ok" : "warn"}>{twoFactor ? "2-step verification is ON" : "2-step verification is OFF. Turn it on below (strongly recommended)"}</li></ul></section>
    <p className="rm-note">Shared-device reminder: downloaded exports, screenshots, clipboard history and browser-saved passwords are outside the website's control. Delete downloaded files and do not save credentials when using someone else's computer.</p>

    <div className="sec-grid">
      <section className="panel sec-card"><h3>2-step verification (authenticator app)</h3>
        {twoFactor ? <p className="rm-note">Enabled. Every sign-in needs a 6-digit code from your authenticator app. To change the key, generate a new one below and replace <code>ADMIN_TOTP_SECRET</code>. To turn it off, delete that variable and redeploy.</p> : <p className="rm-note">Adds a 6-digit code from your phone to every sign-in, so a stolen password alone cannot open your data.</p>}
        {!setup ? <button className="secondary-button" onClick={() => void startSetup()} disabled={busy}>{twoFactor ? "Create a new key" : "Set up 2-step verification"}</button> : <div className="sec-steps">
          <p><b>1.</b> In Google Authenticator / Microsoft Authenticator / Authy choose “Enter a setup key” and type this key (or tap the button on your phone):</p>
          <div className="rm-copy-row"><div><small>Setup key</small><code className="rm-passcode">{grouped}</code></div><button className="secondary-button" onClick={async () => notify((await copyToClipboard(setup.secret)) ? "Key copied." : "Copy was blocked.", "info")}>Copy</button></div>
          <a className="secondary-button sec-open" href={setup.url}>Open in authenticator app</a>
          <p><b>2.</b> Type the 6-digit code it shows, to prove it works:</p>
          <div className="sec-verify"><input inputMode="numeric" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setVerified(null); }} placeholder="123456" aria-label="6-digit code" /><button className="primary-button" onClick={() => void verify()} disabled={busy || code.length !== 6}>Check</button>{verified === true ? <span className="sec-ok">✓ Correct</span> : verified === false ? <span className="sec-bad">Not correct. Try the newest code.</span> : null}</div>
          <p><b>3.</b> In Vercel → Settings → Environment Variables add <code>ADMIN_TOTP_SECRET</code> with the setup key (no spaces), then Redeploy. From then on, sign-in asks for the code.</p>
          <p className="rm-note">Keep a copy of the key somewhere safe. If you lose both the phone and the key, remove the variable in Vercel to get back in.</p>
        </div>}
      </section>

      <section className="panel sec-card"><h3>Auto-lock &amp; backup</h3>
        <label className="field-wrap"><span>Sign out automatically after no activity for</span><select value={autoLockMinutes} onChange={(e) => onAutoLock(Number(e.target.value))}><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={0}>Never (not recommended)</option></select></label>
        <p className="rm-note">This preference is saved in the workspace database and controls the dashboard’s client-side idle lock across devices. The server independently expires sessions after <code>ADMIN_IDLE_MINUTES</code> (default 60 minutes) and enforces an 8-hour absolute session lifetime. The client-side setting does not change the server idle timeout. Choose 5–15 minutes on shared computers; “Never” disables only the browser timer and is not recommended.</p>
        <div className="sec-backup"><a className="primary-button" href="/api/civil-at-hand/backup">Download full backup (JSON)</a><p className="rm-note">Includes contacts, projects, rates, tasks, private notes and note images, plus quotations, site reports, materials and stock, purchase orders, workers and attendance, invoices, bills, expenses, documents with their files, tenders, public pages and business settings. Public form tokens, private share tokens, unlisted page keys and shared-database row snapshots are excluded intentionally. Keep the file private and store it safely.</p>
          <div className="restore-backup-tools"><h4>Restore or merge a backup</h4><p className="rm-note">Choose a NS Engineering Studio JSON backup to validate it and preview record counts before making changes. Restore merges matching record IDs and never deletes records missing from the backup.</p><input ref={restoreInputRef} type="file" accept="application/json,.json" onChange={(event) => void inspectBackup(event.target.files?.[0])} aria-label="Choose NS Engineering Studio backup JSON"/><button className="secondary-button" onClick={() => restoreInputRef.current?.click()} disabled={restoreBusy}>{restoreBusy ? "Checking…" : "Choose backup and preview"}</button>
            {restorePreview ? <div className="restore-preview"><strong>Preview: {restoreFileName}</strong><div className="restore-count-grid">{Object.entries(restorePreview.counts).map(([key, count]) => <span key={key}><b>{Number(count).toLocaleString()}</b>{key.replace(/([A-Z])/g, " $1")}</span>)}</div>{restorePreview.warnings.map((warning) => <p className="rm-note" key={warning}>• {warning}</p>)}{restorePreview.invalid.length ? <div className="restore-invalid"><strong>Validation issues ({restorePreview.invalid.length})</strong><ul>{restorePreview.invalid.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : <p className="restore-ready">✓ All records passed basic validation.</p>}<button className="primary-button" onClick={() => void restoreBackupNow()} disabled={restoreBusy || Boolean(restorePreview.invalid.length)}>{restoreBusy ? "Restoring…" : "Merge backup into database"}</button></div> : null}
          </div>
        </div>
      </section>
    </div>

    <section className="panel sec-card">
      <div className="sec-head"><div><h3>Scheduled database backups</h3><p className="rm-note">Create a server-side snapshot, verify it before restore, and retain recent versions.</p></div><button className="primary-button" onClick={() => void createScheduledBackup()} disabled={scheduledBusy}>{scheduledBusy ? "Working…" : "Create backup now"}</button></div>
      <div className="restore-backup-tools">
        <p className="rm-note">On Vercel, the included daily schedule runs at 03:00 UTC when <code>CRON_SECRET</code> is configured. Retention defaults to 7 days and is capped at 30 snapshots. Set <code>BACKUP_RETENTION_DAYS</code> to 1–30. Snapshots are stored in the same MongoDB database, so also keep an independent downloaded backup for disaster recovery.</p>
        {scheduledBackups.length ? <div className="table-scroll"><table className="contacts-table"><thead><tr><th>CREATED</th><th>SIZE</th><th>TYPE</th><th>CONTENTS</th><th>ACTION</th></tr></thead><tbody>{scheduledBackups.map((backup) => <tr key={backup._id}><td>{dateTime(backup.completedAt || backup.createdAt)}</td><td>{(backup.byteLength / 1024 / 1024).toFixed(2)} MB</td><td>{backup.trigger === "scheduled" ? "Automatic" : "Manual"}</td><td>{Object.entries(backup.counts || {}).filter(([, count]) => Number(count) > 0).map(([name, count]) => `${name}: ${Number(count).toLocaleString()}`).join(" · ") || "Empty snapshot"}</td><td><button className="secondary-button sec-small" onClick={() => void previewScheduledBackup(backup)} disabled={scheduledBusy}>Verify / restore</button></td></tr>)}</tbody></table></div> : <p className="rm-note">No server-side snapshots yet. Create one now or configure the scheduled job and wait for its next run.</p>}
        {scheduledPreview ? <div className="restore-preview"><strong>Verified snapshot · {scheduledPreview._id}</strong><div className="restore-count-grid">{Object.entries(scheduledPreview.counts).map(([key, count]) => <span key={key}><b>{Number(count).toLocaleString()}</b>{key.replace(/([A-Z])/g, " $1")}</span>)}</div>{scheduledPreview.warnings.map((warning) => <p className="rm-note" key={warning}>• {warning}</p>)}{scheduledPreview.invalid.length ? <div className="restore-invalid"><strong>Validation issues ({scheduledPreview.invalid.length})</strong><ul>{scheduledPreview.invalid.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : <p className="restore-ready">✓ Snapshot checksum and basic record validation passed.</p>}<button className="primary-button" onClick={() => void restoreScheduledBackupNow()} disabled={scheduledBusy || Boolean(scheduledPreview.invalid.length)}>{scheduledBusy ? "Restoring…" : "Merge this snapshot into database"}</button><button className="secondary-button" onClick={() => setScheduledPreview(null)} disabled={scheduledBusy}>Cancel</button></div> : null}
      </div>
    </section>

    <section className="panel sec-card"><div className="sec-head"><h3>Signed-in devices</h3><button className="secondary-button" onClick={() => void revokeOthers()} disabled={devices.length < 2}>Sign out all other devices</button></div>
      {loading ? <span className="spinner" /> : devices.length ? <ul className="rm-log">{devices.map((d) => <li key={d._id}><b>{d.agent || "Unknown device"}{d.current ? " (this device)" : ""}</b><span>Last active {dateTime(d.lastSeenAt)}</span><small>Signed in {dateTime(d.createdAt)} · {d.ip}</small><button className="secondary-button sec-small" onClick={() => void revoke(d)}>Sign out</button></li>)}</ul> : <p className="rm-note">No active sessions.</p>}</section>

    <section className="panel sec-card"><div className="sec-head"><h3>Activity log</h3><button className="secondary-button" onClick={() => void load()}>Refresh</button></div>
      {entries.length ? <div className="table-scroll"><table className="contacts-table"><thead><tr><th>WHEN</th><th>WHAT</th><th>DETAIL</th><th>FROM</th></tr></thead><tbody>{entries.map((e, i) => <tr key={e._id || i}><td>{dateTime(e.at)}</td><td><span className={e.action === "login-failed" ? "sec-bad" : ""}>{ACTION_LABELS[e.action] || e.action}</span></td><td>{e.detail || "—"}</td><td>{e.agent || "—"}{e.ip ? ` · ${e.ip}` : ""}</td></tr>)}</tbody></table></div> : <p className="rm-note">Nothing recorded yet. Sign-ins, deletions, exports and shared links appear here for 180 days.</p>}</section>
  </div>;
}
