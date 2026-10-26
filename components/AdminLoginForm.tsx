"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured) return;
    setPending(true); setError("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(body.error || "Sign-in failed. Check your details and try again."); return; }
      router.replace("/admin"); router.refresh();
    } catch { setError("The sign-in service could not be reached. Please try again."); }
    finally { setPending(false); }
  }
  return <form className="login-form" onSubmit={submit}>
    {!configured ? <div className="admin-warning" role="status"><strong>Admin is locked.</strong><span>Configure MongoDB, ADMIN_EMAIL, ADMIN_PASSWORD_HASH and AUTH_SECRET in your environment to enable sign-in.</span></div> : null}
    <div className="field"><label htmlFor="admin-email">Administrator email</label><input id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required disabled={!configured || pending} placeholder="owner@example.com" /></div>
    <div className="field"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required disabled={!configured || pending} placeholder="Your admin password" /></div>
    {error ? <div className="form-feedback error" role="alert">{error}</div> : null}
    <button className="button button-primary form-submit" type="submit" disabled={!configured || pending}>{pending ? <><LoaderCircle size={17} className="spin" /> Signing in…</> : <>Sign in securely <ArrowRight size={17} /></>}</button>
    <p className="form-privacy-note">Admin access uses a server-side session cookie. There is no default account or demo password.</p>
  </form>;
}
