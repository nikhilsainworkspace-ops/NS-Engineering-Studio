import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, CheckCircle2, Compass, MessageCircle, ShieldCheck, Sparkles, Target, Workflow } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { getContent } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import type { FaqItem, ServiceItem } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, services, faqs] = await Promise.all([
    getSiteSettings(),
    getContent<ServiceItem>("services"),
    getContent<FaqItem>("faqs")
  ]);
  const [firstLine, ...restLines] = settings.heroHeadline.split("\n");
  const secondLine = restLines.join(" ");
  return <>
    <section className="hero"><div className="shell hero-grid"><div className="hero-copy"><span className="eyebrow">{settings.heroEyebrow}</span><h1>{firstLine}{secondLine ? <><br /><em>{secondLine}</em></> : null}</h1><p className="hero-description">{settings.heroDescription}</p><div className="hero-actions"><Link className="button button-primary" href="/contact">Start a conversation <ArrowUpRight size={17} aria-hidden="true" /></Link><Link className="button button-outline" href="/services">Explore services <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="hero-meta"><span><CheckCircle2 size={15} aria-hidden="true" /> Practical next steps</span><span><ShieldCheck size={15} aria-hidden="true" /> Clear expectations</span><span><MessageCircle size={15} aria-hidden="true" /> A human conversation</span></div></div><div className="hero-art" aria-label="NS monogram in white and gold"><div className="hero-art-ring" aria-hidden="true" /><span className="orbit-dot" aria-hidden="true" /><div className="hero-logo-card"><Image src={settings.logoPath} alt={`${settings.brandName} monogram in white and gold`} width={1254} height={1254} sizes="(max-width: 480px) 245px, 365px" priority /><div className="hero-logo-caption"><span>Clarity / Craft / Care</span><span>NS</span></div></div></div></div></section>

    <div className="trust-strip"><div className="shell trust-strip-inner"><span><Target size={15} aria-hidden="true" /> Begin with the real goal</span><span><Workflow size={15} aria-hidden="true" /> Keep the process practical</span><span><Sparkles size={15} aria-hidden="true" /> Make the work feel considered</span></div></div>

    <section className="section" id="services"><div className="shell"><div className="section-heading"><div><span className="eyebrow">WHAT WE CAN WORK ON</span><h2>Thoughtful services.<br /><span>Useful outcomes.</span></h2></div><p>Explore the current service areas below. Each can be adapted to reflect your real expertise, deliverables and way of working.</p></div>{services.length ? <div className="service-grid">{services.slice(0, 3).map((service) => <ServiceCard key={service.slug} service={service} />)}</div> : <div className="empty-state">No published services yet. Please check back later or get in touch to ask a question.</div>}<div className="section-actions"><Link className="text-link" href="/services">View all services <ArrowRight size={16} aria-hidden="true" /></Link></div></div></section>

    <section className="section section-soft"><div className="shell split-feature"><div><span className="eyebrow">A LITTLE ABOUT OUR APPROACH</span><h2>{settings.aboutHeadline}</h2></div><div className="split-copy"><p>{settings.aboutBody}</p><p>Good work starts with listening, honest scope and shared understanding. The details will look different from one project to another, but the first step is always a clear conversation.</p><div className="principle-list"><article className="principle"><Compass size={19} aria-hidden="true" /><h3>Purpose before polish</h3><p>Start by understanding the problem and the people it affects.</p></article><article className="principle"><ShieldCheck size={19} aria-hidden="true" /><h3>Clear expectations</h3><p>Make the scope, responsibilities and next steps easier to follow.</p></article></div><div style={{ marginTop: 24 }}><Link className="text-link" href="/about">Get to know us <ArrowRight size={16} aria-hidden="true" /></Link></div></div></div></section>

    <section className="section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">HOW WE GET STARTED</span><h2>Clarity at every<br /><span>step of the work.</span></h2></div><p>A simple, conversational framework you can customise to match the way your business actually works.</p></div><div className="process-grid"><article className="process-step"><span className="process-index">STEP 01</span><h3>Listen</h3><p>Share the goal, context and what is making the next step difficult.</p></article><article className="process-step"><span className="process-index">STEP 02</span><h3>Define</h3><p>Agree what matters, what is in scope and how to recognise progress.</p></article><article className="process-step"><span className="process-index">STEP 03</span><h3>Work</h3><p>Move through the agreed work with updates and questions along the way.</p></article><article className="process-step"><span className="process-index">STEP 04</span><h3>Review</h3><p>Review what is complete, note open items and identify sensible next steps.</p></article></div></div></section>

    <section className="section section-soft"><div className="shell faq-preview"><div className="faq-intro"><span className="eyebrow">GOOD TO KNOW</span><h2 className="section-heading" style={{ display: "block", margin: "15px 0 0" }}>A few questions,<br />made clearer.</h2><p>Not sure where to begin? These answers offer a starting point. Ask us directly if your situation is different.</p><Link className="text-link" href="/faq">Visit all FAQs <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="accordion-list">{faqs.slice(0, 4).map((faq) => <details className="accordion-item" key={faq.slug}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}{faqs.length === 0 ? <p className="empty-state">FAQs will appear here when published.</p> : null}</div></div></section>

    <section className="section"><div className="shell split-feature"><div><span className="eyebrow">START WITH A CONVERSATION</span><h2>Have something in <em>mind?</em></h2></div><div className="split-copy"><p>You do not need a polished brief to get started. Tell us what you are thinking about, what you hope to achieve and any questions you already have.</p><Link className="button button-primary" href="/contact">Contact {settings.brandName} <ArrowUpRight size={17} aria-hidden="true" /></Link></div></div></section>
  </>;
}
