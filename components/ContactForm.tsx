"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";

type Feedback = { kind: "success" | "error"; message: string } | null;

export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submissionKey, setSubmissionKey] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries());
    payload.consent = formData.get("consent") === "on";
    const key = submissionKey || crypto.randomUUID();
    payload.submissionKey = key;
    setSubmissionKey(key);
    setPending(true);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({})) as { error?: string; message?: string; reference?: string };
      if (!response.ok) {
        setFeedback({ kind: "error", message: data.error || "We couldn’t submit your inquiry. Please check the fields and try again." });
        return;
      }
      form.reset();
      setSubmissionKey("");
      setFeedback({ kind: "success", message: `${data.message || "Your inquiry has been received."}${data.reference ? ` Reference: ${data.reference}` : ""}` });
    } catch {
      setFeedback({ kind: "error", message: "We couldn’t reach the website right now. Your message has not been confirmed as received; please retry or call us." });
    } finally {
      setPending(false);
    }
  }

  return <form className="contact-form" onSubmit={onSubmit} noValidate>
    <div className="form-grid">
      <div className="field"><label htmlFor="contact-name">Your name <span aria-hidden="true">*</span></label><input id="contact-name" name="name" autoComplete="name" minLength={1} maxLength={100} required placeholder="Name" /></div>
      <div className="field"><label htmlFor="contact-email">Email address <span aria-hidden="true">*</span></label><input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></div>
      <div className="field"><label htmlFor="contact-phone">Phone <span className="optional-label">Optional</span></label><input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={32} placeholder="Your preferred number" /></div>
      <div className="field field-full"><label htmlFor="contact-subject">Project or question <span aria-hidden="true">*</span></label><input id="contact-subject" name="subject" maxLength={120} required placeholder="A few words about what you need" /></div>
      <div className="field"><label htmlFor="contact-project-type">Area of interest</label><select id="contact-project-type" name="projectType" defaultValue="Not sure yet"><option>Not sure yet</option><option>Web engineering</option><option>Product strategy &amp; discovery</option><option>Product design &amp; design systems</option><option>Integrations &amp; automation</option><option>Technical architecture</option><option>Ongoing improvement</option></select></div>
      <div className="field"><label htmlFor="contact-timeline">Preferred timeline</label><select id="contact-timeline" name="timeline" defaultValue="Not decided yet"><option>Not decided yet</option><option>Exploring options</option><option>Within 1 month</option><option>1–3 months</option><option>3+ months</option><option>Time-sensitive</option></select></div>
      <div className="field field-full"><label htmlFor="contact-message">Tell us a little more <span aria-hidden="true">*</span></label><textarea id="contact-message" name="message" rows={5} maxLength={3000} required placeholder="What are you hoping to work on?" /><span className="field-help">Please don’t include passwords, payment details or other sensitive information.</span></div>
      <div className="honeypot" aria-hidden="true"><label htmlFor="contact-website">Leave this field empty</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    </div>
    <label className="consent-label"><input type="checkbox" name="consent" required /><span>I agree that my details can be used to respond to this inquiry. Read our <a href="/privacy">privacy notice</a>.</span></label>
    {feedback ? <div className={`form-feedback ${feedback.kind}`} role="status" aria-live="polite">{feedback.kind === "success" ? <CheckCircle2 size={19} aria-hidden="true" /> : null}<span>{feedback.message}</span></div> : null}
    <button className="button button-primary form-submit" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="spin" size={17} aria-hidden="true" /> Sending…</> : <>Send inquiry <ArrowRight size={17} aria-hidden="true" /></>}</button>
    <p className="form-privacy-note">Your inquiry is stored privately so it can be reviewed by the site administrator. Email notifications depend on the owner’s configuration.</p>
  </form>;
}
