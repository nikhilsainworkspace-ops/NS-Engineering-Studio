"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CustomFormField, CustomFormFieldType } from "@/modules/civil-at-hand/lib/custom-forms";
import styles from "./custom-public-form.module.css";

type PublicForm = { title: string; description: string; fields: CustomFormField[] };
type Branding = { name: string; color: string; logoUrl: string };
type AnswerValue = string | boolean | string[];

function inputType(type: CustomFormFieldType): string {
  if (type === "email" || type === "tel" || type === "number" || type === "date") return type;
  return "text";
}

export default function CustomPublicForm({ token }: { token: string }) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [website, setWebsite] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/civil-at-hand/custom-public/" + encodeURIComponent(token), { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "This form is unavailable.");
        if (live) { setForm(data.form); setBranding(data.brand); }
      })
      .catch((reason: unknown) => { if (live) setError(reason instanceof Error ? reason.message : "This form is unavailable."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token]);

  function setAnswer(key: string, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function toggleChoice(field: CustomFormField, option: string, checked: boolean) {
    const current = Array.isArray(answers[field.key]) ? answers[field.key] as string[] : [];
    setAnswer(field.key, checked ? [...current, option] : current.filter((item) => item !== option));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/civil-at-hand/custom-public/" + encodeURIComponent(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ answers, website }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Your answers could not be submitted.");
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your answers could not be submitted. Please try again.");
    } finally { setSending(false); }
  }

  const requiredFields = (form?.fields || []).filter((field) => field.required);
  const completeCount = requiredFields.filter((field) => {
    const value = answers[field.key];
    return Array.isArray(value) ? value.length > 0 : typeof value === "boolean" ? value : String(value || "").trim().length > 0;
  }).length;
  const progress = requiredFields.length ? Math.round((completeCount / requiredFields.length) * 100) : 100;

  return <main className={styles.page} style={{ "--custom-brand": branding?.color || "#1f3a5c" } as React.CSSProperties}>
    <div className={styles.glow} aria-hidden="true" />
    <header className={styles.header}>
      {branding?.logoUrl ? <img className={styles.logo} src={branding.logoUrl} alt="" /> : <span className={styles.logoFallback} aria-hidden="true">✓</span>}
      <div><span className={styles.eyebrow}>SECURE FORM</span><p>{branding?.name || "Secure form"}</p></div>
      <span className={styles.secure}><span aria-hidden="true">●</span> Private submission</span>
    </header>

    <section className={styles.card} aria-busy={loading || sending}>
      {loading ? <div className={styles.loading}><span className={styles.spinner} />Loading your form…</div>
        : done ? <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <p className={styles.eyebrow}>SUBMISSION RECEIVED</p>
          <h1>Thank you.</h1>
          <p>Your answers have been sent securely to the form owner.</p>
          <p className={styles.hindi}>धन्यवाद। आपकी जानकारी फ़ॉर्म बनाने वाले व्यक्ति को सुरक्षित रूप से भेज दी गई है।</p>
        </div>
        : form ? <>
          <div className={styles.formTop}>
            <span className={styles.eyebrow}>PLEASE COMPLETE THE FORM</span>
            <h1>{form.title}</h1>
            {form.description ? <p className={styles.description}>{form.description}</p> : null}
            <p className={styles.hindi}>कृपया नीचे दी गई जानकारी भरें। तारांकित (*) प्रश्न आवश्यक हैं।</p>
          </div>
          <div className={styles.progressWrap} aria-label={completeCount + " of " + requiredFields.length + " required answers completed"}>
            <div><span>Required questions</span><strong>{completeCount} / {requiredFields.length}</strong></div>
            <div className={styles.progressTrack}><span style={{ width: progress + "%" }} /></div>
          </div>
          <form onSubmit={submit} className={styles.form}>
            {form.fields.map((field, index) => <fieldset className={styles.question} key={field.key}>
              <legend><span className={styles.questionNumber}>{String(index + 1).padStart(2, "0")}</span><span>{field.label}{field.required ? <b className={styles.required}> *</b> : null}</span></legend>
              {field.type === "textarea"
                ? <textarea rows={4} required={field.required} maxLength={6000} value={String(answers[field.key] || "")} placeholder={field.placeholder || "Type your answer / अपना जवाब लिखें"} onChange={(event) => setAnswer(field.key, event.target.value)} />
                : field.type === "select"
                  ? <select required={field.required} value={String(answers[field.key] || "")} onChange={(event) => setAnswer(field.key, event.target.value)}>
                    <option value="">Select an option / विकल्प चुनें</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  : field.type === "radio"
                    ? <div className={styles.choices}>{field.options.map((option) => <label className={styles.choice} key={option}><input type="radio" name={field.key} required={field.required} checked={answers[field.key] === option} onChange={() => setAnswer(field.key, option)} /><span>{option}</span></label>)}</div>
                    : field.type === "multi-select"
                      ? <div className={styles.choices}>{field.options.map((option) => <label className={styles.choice} key={option}><input type="checkbox" checked={(Array.isArray(answers[field.key]) ? answers[field.key] as string[] : []).includes(option)} onChange={(event) => toggleChoice(field, option, event.target.checked)} /><span>{option}</span></label>)}</div>
                      : field.type === "checkbox"
                        ? <label className={styles.choice}><input type="checkbox" required={field.required} checked={answers[field.key] === true} onChange={(event) => setAnswer(field.key, event.target.checked)} /><span>{field.placeholder || "I confirm / मैं पुष्टि करता/करती हूँ"}</span></label>
                        : <input type={inputType(field.type)} required={field.required} maxLength={2000} value={String(answers[field.key] || "")} placeholder={field.placeholder || "Enter your answer / अपना जवाब लिखें"} onChange={(event) => setAnswer(field.key, event.target.value)} autoComplete={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "off"} />}
            </fieldset>)}
            <label className={styles.honeypot} aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
            {error ? <div role="alert" className={styles.error}>{error}</div> : null}
            <button className={styles.submit} type="submit" disabled={sending}>{sending ? "Submitting…" : "Submit form"} <span aria-hidden="true">→</span></button>
            <p className={styles.privacy}>Your response is stored only for this form and is not added to the Contacts database. Share this link only with people who should submit answers.</p>
          </form>
        </> : <div role="alert" className={styles.failure}><h1>Form unavailable</h1><p>{error || "This form link is invalid, closed, or expired."}</p></div>}
    </section>
    <footer className={styles.footer}>Secure form · Your answers are not publicly listed</footer>
  </main>;
}
