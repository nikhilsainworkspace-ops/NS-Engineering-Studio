"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { FormField } from "@/modules/civil-at-hand/lib/categories";

type FormInfo = { title: string; category: string; categoryLabel: string; description: string; fields: FormField[] };
type BrandInfo = { name: string; tagline: string; color: string; logoUrl: string };

function inputType(field: FormField) {
  return field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : "text";
}

function autoComplete(field: FormField) {
  if (field.key === "email" || field.type === "email") return "email";
  if (field.key === "phone" || field.type === "tel") return "tel";
  if (field.key === "name" || field.key === "fullName") return "name";
  if (field.key === "organization" || field.key === "company") return "organization";
  if (field.key === "city") return "address-level2";
  if (field.key === "state") return "address-level1";
  return "on";
}

export default function PublicIntakeForm({ token }: { token: string }) {
  const [form, setForm] = useState<FormInfo | null>(null);
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [shareConsent, setShareConsent] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/civil-at-hand/public/${token}`, { cache: "no-store" }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "This form is unavailable.");
      if (live) { setForm(data.form); setBrand(data.brand); }
    }).catch((err: Error) => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token]);

  const progress = useMemo(() => {
    const required = (form?.fields || []).filter((field) => field.required);
    const filled = required.filter((field) => (values[field.key] || "").trim()).length;
    return { filled, total: required.length, percent: required.length ? Math.round((filled / required.length) * 100) : 100 };
  }, [form, values]);

  function change(key: string, value: string) { setValues((previous) => ({ ...previous, [key]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || sending) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/civil-at-hand/public/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ details: values, website: values.__website || "", shareConsent }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Please check your details and try again.");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not submit the form. Please try again."); }
    finally { setSending(false); }
  }

  const name = brand?.name || "NS Engineering Studio";
  const pageStyle = { "--pf-brand": brand?.color || "#1f3a5c" } as CSSProperties;

  return <main className="pf-shell" style={pageStyle}>
    <header className="pf-header">
      <div className="pf-header-inner">
        <span className="pf-brand">
          {brand?.logoUrl ? <img src={brand.logoUrl} alt="" className="pf-logo" /> : <span className="pf-mark" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
          <span><strong>{name}</strong>{brand?.tagline ? <small>{brand.tagline}</small> : null}</span>
        </span>
        <span className="pf-secure"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 2.2 6 2.2V11c0 4-2.6 7.8-6 8.9-3.4-1.1-6-4.9-6-8.9V6.4l6-2.2Z" /></svg>Secure form</span>
      </div>
    </header>

    <div className="pf-body">
      {loading ? <section className="pf-card pf-state" aria-live="polite"><span className="pf-spinner" /><p>Opening form… / फ़ॉर्म खुल रहा है…</p></section>
      : error && !form ? <section className="pf-card pf-state" role="alert">
          <div className="pf-icon pf-icon-warn" aria-hidden="true">!</div>
          <h1>Form unavailable</h1>
          <p>{error}</p>
          <p className="pf-muted">Please ask the person who shared this link for an active form.<br />कृपया लिंक भेजने वाले व्यक्ति से नया फ़ॉर्म माँगें।</p>
        </section>
      : done ? <section className="pf-card pf-state" aria-live="polite">
          <div className="pf-icon pf-icon-ok" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg></div>
          <h1>Thank you / धन्यवाद</h1>
          <p>Your details have been received. The team will review them and contact you if there is a suitable opportunity.</p>
          <p className="pf-muted">आपकी जानकारी मिल गई है। उपयुक्त अवसर होने पर टीम आपसे संपर्क करेगी।</p>
          <p className="pf-small">You can close this page now.</p>
        </section>
      : form ? <>
          <section className="pf-intro">
            <span className="pf-pill">{form.categoryLabel}</span>
            <h1>{form.title}</h1>
            {form.description ? <p>{form.description}</p> : null}
          </section>

          <form className="pf-card pf-form" onSubmit={submit} noValidate={false}>
            <div className="pf-form-head">
              <div>
                <h2>Your details <span>/ आपकी जानकारी</span></h2>
                <p>Fields marked <b className="pf-req">*</b> are required. / * वाले फ़ील्ड ज़रूरी हैं।</p>
              </div>
              {progress.total ? <div className="pf-progress" aria-label={`${progress.filled} of ${progress.total} required fields filled`}>
                <span>{progress.filled}/{progress.total}</span>
                <div className="pf-bar"><i style={{ width: `${progress.percent}%` }} /></div>
              </div> : null}
            </div>

            <div className="pf-grid">
              {form.fields.map((field) => {
                const id = `pf-${field.key}`;
                const wide = field.type === "textarea";
                const max = field.key === "notes" ? 6000 : 2000;
                return <div className={`pf-field${wide ? " pf-wide" : ""}`} key={field.key}>
                  <label htmlFor={id}>{field.label}{field.required ? <b className="pf-req"> *</b> : null}</label>
                  {field.type === "textarea"
                    ? <textarea id={id} required={field.required} rows={4} value={values[field.key] || ""} placeholder={field.placeholder || "Type here / यहाँ लिखें"} onChange={(event) => change(field.key, event.target.value)} maxLength={max} />
                    : field.type === "select"
                      ? <select id={id} required={field.required} value={values[field.key] || ""} onChange={(event) => change(field.key, event.target.value)}>
                          <option value="">Choose / चुनें</option>
                          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      : <input id={id} required={field.required} type={inputType(field)} inputMode={field.type === "tel" ? "tel" : field.type === "email" ? "email" : undefined} value={values[field.key] || ""} placeholder={field.placeholder || "Enter here / यहाँ लिखें"} onChange={(event) => change(field.key, event.target.value)} maxLength={max} autoComplete={autoComplete(field)} />}
                </div>;
              })}
              <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={values.__website || ""} onChange={(event) => change("__website", event.target.value)} /></label>
            </div>

            <label className="pf-check">
              <input type="checkbox" checked={shareConsent} onChange={(event) => setShareConsent(event.target.checked)} />
              <span><strong>Optional:</strong> my business details may be shared with companies looking for this kind of service.<br /><em>मेरी जानकारी इस सेवा की तलाश करने वाली कंपनियों के साथ साझा की जा सकती है (वैकल्पिक)।</em></span>
            </label>

            {error ? <div role="alert" className="pf-error">{error}</div> : null}

            <button className="pf-submit" type="submit" disabled={sending}>{sending ? "Submitting… / भेज रहे हैं…" : "Submit details / जानकारी भेजें"}</button>
            <p className="pf-note">By submitting, you agree to be contacted about relevant work. Your details go only to {name} and are never shown publicly.<br />फ़ॉर्म भेजकर आप संबंधित काम के लिए संपर्क किए जाने की सहमति देते हैं।</p>
          </form>
        </> : null}
    </div>

    <footer className="pf-footer">{name} · Secure form</footer>
  </main>;
}
