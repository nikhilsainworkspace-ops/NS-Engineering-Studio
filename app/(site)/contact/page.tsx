import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { getSiteSettings } from "@/lib/settings";
import { getWhatsappUrl } from "@/lib/public-config";

export const metadata: Metadata = { title: "Contact", description: "Contact NS Engineering Studio about civil engineering services, architectural planning, project enquiries, manpower requirements or engineering software." };
export const dynamic = "force-dynamic";

type ContactPageProps = { searchParams: Promise<{ service?: string | string[]; project?: string | string[] }> };
const SERVICE_LABELS: Record<string, string> = {
  "civil-engineering-consultancy": "Civil engineering consultancy", "civil-engineering-services": "Civil engineering consultancy",
  "architectural-planning": "Architectural planning & design", "architectural-planning-and-design": "Architectural planning & design", "architectural-design-and-planning": "Architectural planning & design",
  "estimation-boq": "Estimation & BOQ", "estimation-boq-and-quantity-surveying": "Estimation & BOQ", "quantity-surveying": "Estimation & BOQ",
  "construction-planning": "Construction & project planning", "construction-planning-and-consultancy": "Construction & project planning", "construction-project-planning": "Construction & project planning",
  "manpower-supply": "Construction & civil manpower supply", "manpower-supply-and-site-staffing": "Construction & civil manpower supply",
  "engineering-software": "Engineering software", "project-enquiry": "Project enquiry"
};
function resolveService(slug: string, projectPresent: boolean): string {
  if (SERVICE_LABELS[slug]) return SERVICE_LABELS[slug];
  if (slug.includes("manpower") || slug.includes("staffing")) return "Construction & civil manpower supply";
  if (slug.includes("architect") || slug.includes("design") || slug.includes("drafting")) return "Architectural planning & design";
  if (slug.includes("estimate") || slug.includes("quantity") || slug.includes("boq")) return "Estimation & BOQ";
  if (slug.includes("software") || slug.includes("tool")) return "Engineering software";
  if (slug.includes("construction") || slug.includes("planning")) return "Construction & project planning";
  if (slug.includes("civil") || slug.includes("structural")) return "Civil engineering consultancy";
  return projectPresent ? "Project enquiry" : "Not sure yet";
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const query = await searchParams;
  const serviceQuery = typeof query.service === "string" ? query.service : "";
  const projectQuery = typeof query.project === "string" ? query.project : "";
  const initialProjectType = resolveService(serviceQuery, Boolean(projectQuery));
  const initialSubject = projectQuery ? `Project enquiry: ${projectQuery}` : serviceQuery ? `Service enquiry: ${initialProjectType}` : "";
  const settings = await getSiteSettings();
  const whatsappUrl = getWhatsappUrl();
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Contact</span></nav><span className="eyebrow">LET’S START WITH THE QUESTION</span><h1>Tell us what you<br /><span>need a hand with.</span></h1><p>Ask about civil engineering services, architectural design, manpower requirements, project quotations, software or the right place to start. Share only the context needed to route your question.</p></div></section>
    <section className="section"><div className="shell contact-layout"><div className="contact-info"><span className="eyebrow">GET IN TOUCH</span><h2>A clear first step<br />starts here.</h2><p>Use the form to ask about services, project quotations, manpower supply or the software ecosystem. Service availability depends on project location, scope, qualifications and applicable requirements. A submitted enquiry does not confirm availability or a contract.</p><div className="contact-details"><a className="contact-detail" href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}><span className="contact-detail-icon"><Phone size={19} aria-hidden="true" /></span><span><strong>Call us</strong><span>{settings.phone}</span></span></a>{settings.email ? <a className="contact-detail" href={`mailto:${settings.email}`}><span className="contact-detail-icon"><Mail size={19} aria-hidden="true" /></span><span><strong>Email</strong><span>{settings.email}</span></span></a> : <div className="contact-detail"><span className="contact-detail-icon"><Mail size={19} aria-hidden="true" /></span><span><strong>Contact form</strong><span>Email address not configured</span></span></div>}{whatsappUrl ? <a className="contact-detail" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><span className="contact-detail-icon"><MessageCircle size={19} aria-hidden="true" /></span><span><strong>WhatsApp</strong><span>Open a chat in a new tab</span></span></a> : null}</div><div className="note-panel" style={{ marginTop: 22 }}><h3>One small privacy note</h3><p>Please share only the information needed to understand your inquiry. Do not include passwords, payment details or sensitive personal records.</p></div></div><div className="contact-form-wrap"><h2 className="contact-form-heading">Send an inquiry</h2><ContactForm initialProjectType={initialProjectType} initialSubject={initialSubject} initialProjectSlug={projectQuery} /></div></div></section>
  </>;
}
