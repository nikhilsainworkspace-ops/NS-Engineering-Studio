"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/brand";

const links = [
  { label: "Products", href: "/products" },
  { label: "Services", href: "/services" },
  { label: "Search", href: "/search" },
  { label: "Projects", href: "/projects" },
  { label: "Engineering Software", href: "/engineering-software" },
  { label: "Who we serve", href: "/industries" },
  { label: "Tools", href: "/tools" },
  { label: "Guides", href: "/resources" },
  { label: "About", href: "/about" }
];

export function SiteHeader({ settings, whatsappUrl }: { settings: SiteSettings; whatsappUrl: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand-lockup" href="/" aria-label={`${settings.brandName}, home`}>
          <span className="brand-logo"><Image src={settings.logoPath} alt="" width={92} height={92} priority /></span>
          <span className="brand-wording"><span className="brand-name">{settings.brandName}</span><span className="brand-tagline">{settings.tagline}</span></span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)) ? "page" : undefined}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          {whatsappUrl ? <a className="button button-small button-outline header-contact" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Chat with us <ArrowUpRight size={15} aria-hidden="true" /></a> : <Link className="button button-small button-outline header-contact" href="/contact">Let’s talk <ArrowUpRight size={15} aria-hidden="true" /></Link>}
          <button className="mobile-menu-button" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((v) => !v)}><span className="sr-only">{open ? "Close menu" : "Open menu"}</span>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      <div id="mobile-navigation" className={`mobile-nav${open ? " is-open" : ""}`} hidden={!open}>
        <nav className="shell mobile-nav-inner" aria-label="Mobile navigation">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)) ? "page" : undefined} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={17} aria-hidden="true" /></Link>)}
          <Link className="button button-primary mobile-contact-link" href="/contact" onClick={() => setOpen(false)}>Start a conversation <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </div>
    </header>
  );
}
