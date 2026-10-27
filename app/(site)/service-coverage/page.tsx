import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Service Coverage", description: "Learn how NS Engineering Studio handles civil engineering, architectural and construction service enquiries across India.", alternates: { canonical: "/service-coverage" } };

export default async function ServiceCoveragePage() {
  const settings = await getSiteSettings();
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Service coverage</span></nav><span className="eyebrow">LOCATION-AWARE ENQUIRIES</span><h1>Across India.<br /><span>Confirmed project by project.</span></h1><p>Send an enquiry from your state or city. Availability and deliverables are checked against the exact location, scope, qualifications, resource availability and applicable requirements.</p></div></section>
    <section className="section"><div className="shell coverage-layout"><div className="coverage-content"><span className="eyebrow">OUR COVERAGE APPROACH</span><h2>Start with your location<br /><em>and project requirements.</em></h2>{settings.serviceCoverage.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="coverage-note"><MapPin size={18} /><span>Submitting an enquiry does not confirm an office, site visit, service slot or project engagement in a particular location.</span></div><Link className="button button-primary" href="/contact?service=project-enquiry">Share a project location <ArrowRight size={16} /></Link></div><aside className="coverage-side"><h3>What to include</h3><ul><li>State / Union Territory and city or district</li><li>Service category and project type</li><li>Known scope, drawings or required deliverables</li><li>Target timeline and preferred contact method</li></ul><p>Contact information and project details are used to respond to the enquiry. Avoid sending sensitive personal information, passwords or confidential documents at the initial stage.</p></aside></div></section>
  </>;
}
