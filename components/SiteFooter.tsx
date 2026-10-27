import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/brand";

export function SiteFooter({ settings, whatsappUrl }: { settings: SiteSettings; whatsappUrl: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="shell footer-cta footer-cta-wide">
        <div className="footer-cta-copy"><span className="eyebrow">A GOOD NEXT STEP STARTS WITH A CLEAR QUESTION</span><h2>Make the built world<br /><span>easier to understand.</span></h2><p>Explore a practical tool, find a guide or tell us what you are trying to solve.</p></div>
        <div className="footer-cta-actions"><Link className="button button-primary" href="/tools">Open engineering tools <ArrowUpRight size={16} aria-hidden="true" /></Link><Link className="button button-outline" href="/contact">Contact the team <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </div>
      <div className="footer-main shell footer-main-extended">
        <div className="footer-brand"><Link className="brand-lockup" href="/" aria-label={`${settings.brandName}, home`}><span className="brand-logo brand-logo-footer"><Image src={settings.logoPath} width={78} height={78} alt="" /></span><span className="brand-wording"><span className="brand-name">{settings.brandName}</span><span className="brand-tagline">{settings.tagline}</span></span></Link><p>{settings.description}</p><p className="footer-brand-note">Engineering services and integrated digital workflows for civil engineering, architecture and construction.</p></div>
        <div className="footer-column"><h3>Explore</h3><Link href="/products">All products</Link><Link href="/products/civilmargin">CivilMargin overview</Link><Link href="/products/engineering-workspace">Engineering Workspace overview</Link><Link href="/industries">Who we serve</Link><Link href="/services">Services</Link><Link href="/service-coverage">Service coverage</Link><Link href="/projects">Projects</Link><Link href="/engineering-software">Engineering software</Link><Link href="/workspace">Construction workspace</Link><Link href="/process">How we work</Link><Link href="/about">About the studio</Link></div>
        <div className="footer-column"><h3>Tools & knowledge</h3><Link href="/tools">Engineering calculators</Link><Link href="/resources">Guides & resources</Link><Link href="/resources/start-with-a-clear-boq">BOQ review guide</Link><Link href="/resources/concrete-volume-basics">Concrete volume basics</Link><Link href="/resources/bim-coordination-basics">BIM coordination basics</Link><Link href="/faq">Frequently asked questions</Link></div>
        <div className="footer-column"><h3>Get in touch</h3><a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}><Phone size={15} aria-hidden="true" />{settings.phone}</a>{settings.email ? <a href={`mailto:${settings.email}`}><Mail size={15} aria-hidden="true" />{settings.email}</a> : <span className="muted-inline">Email contact not configured</span>}{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowUpRight size={14} aria-hidden="true" /></a> : null}{settings.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={14} aria-hidden="true" /></a> : null}{settings.linkedinUrl ? <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={14} aria-hidden="true" /></a> : null}<Link href="/contact">Send an inquiry <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
      </div>
      <div className="shell footer-bottom"><span>© {year} {settings.brandName}. All rights reserved.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link><Link href="/refund-cancellation">Refunds & cancellations</Link><Link href="/admin/login" rel="nofollow">Admin</Link></div></div>
    </footer>
  );
}
