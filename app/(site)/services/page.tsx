import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { getContent } from "@/lib/content";
import type { ServiceItem } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Capabilities", description: "Explore learning, practical tools and project-cost visibility across NS Engineering Studio products." };

export default async function ServicesPage() {
  const services = await getContent<ServiceItem>("services");
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Services</span></nav><span className="eyebrow">WAYS WE CAN WORK TOGETHER</span><h1>Find the tools for<br /><span>the work ahead.</span></h1><p>Explore practical focus areas across civil engineering, architecture and construction. Some areas are served by Civil At Hand learning resources; others by CivilMargin project-cost workflows. Each product site explains its current features.</p></div></section>
    <section className="section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">BUILT-WORLD FOCUS AREAS</span><h2>Explore the focus<br /><span>of the work.</span></h2></div><p>Choose an area to understand which product may be relevant, then continue to its official website for current availability.</p></div>{services.length ? <div className="service-grid">{services.map((service) => <ServiceCard key={service.slug} service={service} />)}</div> : <div className="empty-state">There are no published services at the moment. <Link className="text-link" href="/contact">Ask a question <ArrowRight size={15} /></Link></div>}</div></section>
    <section className="section section-soft"><div className="shell split-feature"><div><span className="eyebrow">NOT SURE WHICH ONE FITS?</span><h2>Bring the question.<br /><em>We’ll start there.</em></h2></div><div className="split-copy"><p>Describe what you need help with, even if it does not map neatly to a service above. The owner can clarify what is offered and whether there is a reasonable fit.</p><Link className="button button-primary" href="/contact">Discuss your project <ArrowRight size={17} /></Link></div></div></section>
  </>;
}
