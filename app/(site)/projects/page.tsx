import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getContent, type ProjectItem } from "@/lib/content";
import { PublicProjectDirectory } from "@/components/PublicProjectDirectory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects", description: "Explore projects published by NS Engineering Studio. Project information is shown only when approved for public display.", alternates: { canonical: "/projects" } };

export default async function ProjectsPage() {
  const records = await getContent<ProjectItem>("projects");
  const projects = records.filter((item) => item.published && item.status !== "draft" && item.status !== "archived");
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Projects</span></nav><span className="eyebrow">PROJECT PORTFOLIO</span><h1>Work shared with<br /><span>permission and context.</span></h1><p>This portfolio displays projects that the studio has explicitly approved for public presentation. No sample or placeholder work is presented as a completed client project.</p></div></section>
    <section className="section"><div className="shell"><PublicProjectDirectory projects={projects} /></div></section>
    <section className="section section-soft"><div className="shell split-feature"><div><span className="eyebrow">PLANNING A PROJECT?</span><h2>Start with the scope.<br /><em>Then choose the right support.</em></h2></div><div className="split-copy"><p>Share the location, broad requirements, available drawings and intended timeline. Service availability and deliverables are confirmed individually.</p><Link className="button button-primary" href="/contact?service=project-enquiry">Request a project discussion <ArrowRight size={16} /></Link></div></div></section>
  </>;
}
