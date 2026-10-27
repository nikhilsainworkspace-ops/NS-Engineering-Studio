import "server-only";
import { emailIsConfigured, getEnv } from "@/lib/env";

export async function sendLeadNotification(lead: { id: string; name: string; email: string; phone: string; organization?: string; state?: string; city?: string; projectSlug?: string; subject: string; projectType?: string; timeline?: string; message: string }): Promise<"sent" | "disabled" | "failed"> {
  if (!emailIsConfigured()) return "disabled";
  const env = getEnv();
  const text = [
    "A new inquiry was received by the website.",
    `Reference: ${lead.id}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "Not supplied"}`,
    `Organization: ${lead.organization || "Not supplied"}`,
    `Location: ${[lead.city, lead.state].filter(Boolean).join(", ") || "Not supplied"}`,
    `Project reference: ${lead.projectSlug || "Not applicable"}`,
    `Subject: ${lead.subject}`,
    `Area of interest: ${lead.projectType || "Not sure yet"}`,
    `Preferred timeline: ${lead.timeline || "Not decided yet"}`,
    "",
    lead.message
  ].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.CONTACT_EMAIL_FROM, to: [env.CONTACT_EMAIL_TO], subject: `New website inquiry: ${lead.subject}`, text, reply_to: lead.email }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("Contact notification provider returned an unsuccessful response.");
      return "failed";
    }
    return "sent";
  } catch {
    console.error("Contact notification provider could not be reached.");
    return "failed";
  }
}
