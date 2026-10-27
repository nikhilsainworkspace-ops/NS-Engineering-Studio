import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { getBillingStatus } from "@/lib/billing-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing status · NS Engineering Studio", robots: { index: false, follow: false } };

export default async function AdminBillingPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login?next=%2Fadmin%2Fbilling");
  const billing = getBillingStatus();
  return <section className="admin-page-wrap"><div className="admin-page-heading"><div><span className="admin-eyebrow">PLANS · PAYMENTS · SUBSCRIPTIONS</span><h1>Billing activation</h1><p>Verified payment integration status for NS Engineering Studio.</p></div><Link className="admin-mini-button" href="/admin"><ArrowLeft size={15} /> Back to dashboard</Link></div><div className="billing-status-card"><span className="billing-status-icon"><AlertTriangle size={22} /></span><div><span className="billing-status-label">{billing.mode === "disabled" ? "Disabled by default" : "Provider configuration pending"}</span><h2>Checkout is not active</h2><p>{billing.message}</p><p><strong>Provider setting:</strong> {billing.provider}</p><p className="billing-safety-note"><ShieldCheck size={16} /> No fake payment-success path is enabled. Do not accept payments until a verified adapter and webhook pipeline are deployed.</p></div></div><div className="admin-card billing-next-steps"><h2>Release requirements</h2><ol>{billing.requiredBeforeActivation.map((item) => <li key={item}>{item}</li>)}</ol><p>See <code>PAYMENTS_INTEGRATION.md</code> and the <Link href="/terms">Terms</Link> and <Link href="/refund-cancellation">Refund/Cancellation Policy</Link> drafts before any paid plans are published.</p></div></section>;
}
