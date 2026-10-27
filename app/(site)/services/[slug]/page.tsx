import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getContent } from "@/lib/content";
import type { ServiceItem } from "@/lib/brand";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const services = await getContent<ServiceItem>("services");
  const service = services.find((item) => item.slug === slug);
  return service ? { title: service.title, description: service.summary } : { title: "Service not found" };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const services = await getContent<ServiceItem>("services");
  const service = services.find((item) => item.slug === slug);
  if (!service) notFound();
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/services">Services</Link><span aria-hidden="true">/</span><span aria-current="page">{service.title}</span></nav><span className="eyebrow">SERVICE OVERVIEW</span><h1>{service.title.split(" ").slice(0, -1).join(" ") || service.title} <span>{service.title.split(" ").slice(-1).join("") !== service.title ? service.title.split(" ").slice(-1).join("") : ""}</span></h1><p>{service.summary}</p></div></section>
    <section className="section"><div className="shell service-detail-grid"><aside className="service-detail-aside"><span className="eyebrow">TAKE THE NEXT STEP</span><h2>Does this fit what you need?</h2><p>Share the context and questions that matter. The business can clarify scope, availability and suitability directly.</p><Link className="button button-primary" href={`/contact?service=${encodeURIComponent(service.slug)}`}>Ask about this service <ArrowUpRight size={16} /></Link><div style={{ marginTop: 18 }}><Link className="text-link" href="/services"><ArrowLeft size={15} /> All services</Link></div></aside><article className="detail-copy"><h2>About this offering</h2><p>{service.body}</p><p>The exact scope, deliverables and schedule should be confirmed with the business before any engagement begins. Ask about details that are important to your situation.</p></article></div></section>
  </>;
}
