import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAdminSession } from "@/lib/auth";
import { adminIsConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Administrator sign in", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  let configured = false;
  try { configured = adminIsConfigured(); } catch { configured = false; }
  return <main className="admin-page"><div className="shell"><div className="login-wrap"><Link className="admin-brand" href="/" style={{ display: "inline-flex" }}><Image className="admin-brand-mark" src="/icons/favicon-32x32.png" width={48} height={48} alt="" /><span><strong>NS Studio</strong><span>Website administration</span></span></Link><div className="login-card"><span className="eyebrow"><LockKeyhole size={13} aria-hidden="true" /> PRIVATE WORKSPACE</span><h1>Sign in</h1><p>Use the administrator credentials configured by the site owner. There is no default or demo account.</p><AdminLoginForm configured={configured} /></div><div className="admin-footer"><Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ArrowLeft size={13} /> Return to public website</Link></div></div></div></main>;
}
