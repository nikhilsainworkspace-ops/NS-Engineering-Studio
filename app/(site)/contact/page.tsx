import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { getSiteSettings } from "@/lib/settings";
import { getWhatsappUrl } from "@/lib/public-config";

export const metadata: Metadata = { title: "Contact", description: "Contact NS Studio or send an inquiry through the private website contact form." };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const whatsappUrl = getWhatsappUrl();
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Contact</span></nav><span className="eyebrow">LET’S START WITH THE QUESTION</span><h1>Tell us what you’re<br /><span>thinking about.</span></h1><p>You do not need all the answers to get in touch. A little context is enough to begin a useful conversation.</p></div></section>
    <section className="section"><div className="shell contact-layout"><div className="contact-info"><span className="eyebrow">GET IN TOUCH</span><h2>A clear first step<br />starts here.</h2><p>Use the form to share your question or call directly. The owner can confirm the right next step, scope and timing.</p><div className="contact-details"><a className="contact-detail" href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}><span className="contact-detail-icon"><Phone size={19} aria-hidden="true" /></span><span><strong>Call us</strong><span>{settings.phone}</span></span></a>{settings.email ? <a className="contact-detail" href={`mailto:${settings.email}`}><span className="contact-detail-icon"><Mail size={19} aria-hidden="true" /></span><span><strong>Email</strong><span>{settings.email}</span></span></a> : <div className="contact-detail"><span className="contact-detail-icon"><Mail size={19} aria-hidden="true" /></span><span><strong>Contact form</strong><span>Email address not configured</span></span></div>}{whatsappUrl ? <a className="contact-detail" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><span className="contact-detail-icon"><MessageCircle size={19} aria-hidden="true" /></span><span><strong>WhatsApp</strong><span>Open a chat in a new tab</span></span></a> : null}</div><div className="note-panel" style={{ marginTop: 22 }}><h3>One small privacy note</h3><p>Please share only the information needed to understand your inquiry. Do not include passwords, payment details or sensitive personal records.</p></div></div><div className="contact-form-wrap"><h2 className="contact-form-heading">Send an inquiry</h2><ContactForm /></div></div></section>
  </>;
}
