import { getCollection } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { privateJson, jsonError } from "@/lib/http";
import { getSiteSettings } from "@/lib/settings";
import { adminIsConfigured, emailIsConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeadDoc = { _id: string; name: string; subject: string; status: "new" | "contacted" | "in_progress" | "converted" | "closed" | "resolved"; createdAt: Date };
type AuditDoc = { _id: string; action: string; subject?: string; actor: "admin" | "system"; createdAt: Date };

export async function GET() {
  const session = await getAdminSession();
  if (!session) return jsonError("Authentication required.", 401);
  try {
    const [leads, content, settings, auditEvents] = await Promise.all([
      getCollection<LeadDoc>("leads"),
      getCollection<{ _id: string; type: string; deleted?: boolean }>("content"),
      getSiteSettings(),
      getCollection<AuditDoc>("auditEvents")
    ]).then(([leadCollection, contentCollection, siteSettings, auditCollection]) => [leadCollection, contentCollection, siteSettings, auditCollection] as const);
    const [totalLeads, newLeads, activeLeads, totalServices, totalFaqs, totalProjects, totalSoftware, latestLeads, latestEvents] = await Promise.all([
      leads.countDocuments({}), leads.countDocuments({ status: "new" }), leads.countDocuments({ status: { $in: ["new", "contacted", "in_progress"] } }),
      content.countDocuments({ type: "services", deleted: { $ne: true } }), content.countDocuments({ type: "faqs", deleted: { $ne: true } }),
      content.countDocuments({ type: "projects", deleted: { $ne: true } }), content.countDocuments({ type: "software", deleted: { $ne: true } }),
      leads.find({}, { projection: { _id: 1, name: 1, subject: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(6).toArray(),
      auditEvents.find({}, { projection: { _id: 1, action: 1, subject: 1, actor: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(8).toArray()
    ]);
    return privateJson({ email: session.email, stats: { totalLeads, newLeads, activeLeads, totalServices, totalFaqs, totalProjects, totalSoftware }, recentLeads: latestLeads.map((lead) => ({ id: lead._id, name: lead.name, subject: lead.subject, status: lead.status, createdAt: lead.createdAt })), recentEvents: latestEvents.map((event) => ({ id: event._id, action: event.action, subject: event.subject ?? "", actor: event.actor, createdAt: event.createdAt })), configuration: { database: true, admin: adminIsConfigured(), emailNotifications: emailIsConfigured(), starterNotice: settings.showStarterNotice } });
  } catch {
    return jsonError("Dashboard data is temporarily unavailable. Confirm the database connection.", 503);
  }
}
