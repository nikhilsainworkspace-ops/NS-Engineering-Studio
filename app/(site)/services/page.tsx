import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { getContent } from "@/lib/content";
import type { ServiceItem } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Services", description: "Explore the service areas available from NS Studio. Confirm final scope directly with the business." };

export default async function ServicesPage() {
  const services = await getContent<ServiceItem>("services");
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Services</span></nav><span className="eyebrow">WAYS WE CAN WORK TOGETHER</span><h1>Work shaped around<br /><span>what matters.</span></h1><p>Start with a clear understanding of the goal, the work involved and the questions that need answering. These service descriptions are editable starter content; confirm actual offerings and scope with the business before relying on them.</p></div></section>
    <section className="section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">CURRENT SERVICE AREAS</span><h2>Explore the focus<br /><span>of the work.</span></h2></div><p>Each offering has its own detail page. Use the contact form to ask about fit, scope or a need that is not listed here.</p></div>{services.length ? <div className="service-grid">{services.map((service) => <ServiceCard key={service.slug} service={service} />)}</div> : <div className="empty-state">There are no published services at the moment. <Link className="text-link" href="/contact">Ask a question <ArrowRight size={15} /></Link></div>}</div></section>
    <section className="section section-soft"><div className="shell split-feature"><div><span className="eyebrow">NOT SURE WHICH ONE FITS?</span><h2>Bring the question.<br /><em>We’ll start there.</em></h2></div><div className="split-copy"><p>Describe what you need help with, even if it does not map neatly to a service above. The owner can clarify what is offered and whether there is a reasonable fit.</p><Link className="button button-primary" href="/contact">Discuss your project <ArrowRight size={17} /></Link></div></div></section>
  </>;
}
