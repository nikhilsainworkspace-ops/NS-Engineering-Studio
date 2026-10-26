import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { PRODUCT_URLS, type SiteSettings } from "@/lib/brand";

export function SiteFooter({ settings, whatsappUrl }: { settings: SiteSettings; whatsappUrl: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-main shell">
        <div className="footer-brand"><Link className="brand-lockup" href="/" aria-label={`${settings.brandName}, home`}><span className="brand-logo brand-logo-footer"><Image src={settings.logoPath} width={78} height={78} alt="" /></span><span className="brand-wording"><span className="brand-name">{settings.brandName}</span><span className="brand-tagline">{settings.tagline}</span></span></Link><p>{settings.description}</p></div>
        <div className="footer-column"><h3>Explore</h3><Link href="/products">Our products</Link><a href={PRODUCT_URLS.civilMargin} target="_blank" rel="noopener noreferrer">CivilMargin <ArrowUpRight size={14} aria-hidden="true" /></a><a href={PRODUCT_URLS.civilAtHand} target="_blank" rel="noopener noreferrer">Civil At Hand <ArrowUpRight size={14} aria-hidden="true" /></a><Link href="/about">About</Link><Link href="/services">Focus areas</Link><Link href="/faq">FAQs</Link><Link href="/contact">Contact</Link></div>
        <div className="footer-column"><h3>Get in touch</h3><a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}><Phone size={15} aria-hidden="true" />{settings.phone}</a>{settings.email ? <a href={`mailto:${settings.email}`}><Mail size={15} aria-hidden="true" />{settings.email}</a> : <span className="muted-inline">Email contact not configured</span>}{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowUpRight size={14} aria-hidden="true" /></a> : null}{settings.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={14} aria-hidden="true" /></a> : null}{settings.linkedinUrl ? <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={14} aria-hidden="true" /></a> : null}</div>
      </div>
      <div className="shell footer-bottom"><span>© {year} {settings.brandName}. All rights reserved.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/admin/login" rel="nofollow">Admin</Link></div></div>
    </footer>
  );
}
