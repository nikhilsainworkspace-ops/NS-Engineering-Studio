import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles and Permissions · NS Engineering Studio", robots: { index: false, follow: false } };

const plannedRoles = [
  { role: "Super Admin", scope: "All administrative settings, security controls and modules", state: "Only active privileged role" },
  { role: "Admin", scope: "Operational administration with restricted security/ownership actions", state: "Not activated" },
  { role: "Content Manager", scope: "Approved public pages, services, FAQs and software copy", state: "Not activated" },
  { role: "Project Manager", scope: "Projects and project-linked enquiries only", state: "Not activated" },
  { role: "Support Staff", scope: "Assigned enquiries and support records only", state: "Not activated" },
  { role: "Customer", scope: "Own profile, own subscription and explicitly entitled products", state: "Customer identity system not present" }
];

export default async function AdminRolesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login?next=%2Fadmin%2Froles");
  return <section className="admin-page-wrap"><div className="admin-page-heading"><div><span className="admin-eyebrow">IDENTITY · ACCESS CONTROL</span><h1>Roles and permissions</h1><p>Current access model and activation status.</p></div><Link className="admin-mini-button" href="/admin"><ArrowLeft size={15} /> Back to dashboard</Link></div><div className="billing-status-card"><span className="billing-status-icon"><AlertTriangle size={22} /></span><div><span className="billing-status-label">Single-admin mode</span><h2>Only the environment-configured administrator is active</h2><p>The source projects did not provide a verified multi-user administrator credential store or customer identity/entitlement system. This page is intentionally read-only: it does not create accounts or pretend that unimplemented roles are enforcing permissions.</p><p className="billing-safety-note"><ShieldCheck size={16} /> Server routes currently require the shared NS administrator session. Do not invite customers or additional staff until individual identities, role persistence, password recovery and per-record authorization are implemented and tested.</p></div></div><div className="admin-card billing-next-steps"><h2>Role scope inventory</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Role</th><th>Intended scope</th><th>Current state</th></tr></thead><tbody>{plannedRoles.map((item) => <tr key={item.role}><td>{item.role}</td><td>{item.scope}</td><td>{item.state}</td></tr>)}</tbody></table></div><p>See <code>ROLE_MODEL.md</code> for the recommended implementation sequence and the restrictions that must remain in place until then.</p></div></section>;
}
