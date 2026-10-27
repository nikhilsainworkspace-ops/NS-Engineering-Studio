import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Compass } from "lucide-react";
import { ResourceExplorer } from "@/components/ResourceExplorer";
import { GUIDE_ARTICLES } from "@/lib/resources";

export const metadata: Metadata = {
  title: "Civil Engineering & Construction Guides",
  description: "Practical guides for BOQ reviews, site quality, concrete quantities, drawing revisions, BIM coordination, project margin and early-career development.",
  alternates: { canonical: "/resources" }
};

export default function ResourcesPage() {
  return <>
    <section className="page-hero resources-page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Guides & resources</span></nav><span className="eyebrow">KNOWLEDGE FOR THE BUILT WORLD</span><h1>Practical knowledge.<br /><span>Clearer next steps.</span></h1><p>Browse straightforward guides for site practice, estimating, design coordination, project controls and professional growth. Start with the question in front of you.</p><div className="process-hero-tags"><span>Short practical reads</span><span>Searchable library</span><span>Plain-language guidance</span></div></div></section>
    <section className="section"><div className="shell"><div className="resources-intro-row"><div><span className="eyebrow">THE RESOURCE LIBRARY</span><h2>Find a guide for<br /><em>the task at hand.</em></h2></div><p>These guides are educational starting points, not project-specific design instructions or substitutions for approved specifications, codes, supervision and professional review.</p></div><ResourceExplorer articles={GUIDE_ARTICLES} /></div></section>
    <section className="section section-soft"><div className="shell resources-path-grid"><article><span className="resources-path-icon"><BookOpenCheck size={22} /></span><h3>Learn and practise</h3><p>Use concepts, worked examples and checklists to build understanding. Engineering Workspace is the separate product for broader learning and practical resources.</p><a className="text-link" href="/workspace">Visit Engineering Workspace <ArrowRight size={15} /></a></article><article><span className="resources-path-icon resources-path-icon-green"><Compass size={22} /></span><h3>Manage project records</h3><p>When the issue is BOQ quantities, supplier costs, measurements, bills, materials or margin, explore the CivilMargin workflow and its current feature details.</p><a className="text-link" href="https://civilmarzin.civilathand.in/" target="_blank" rel="noopener noreferrer">Visit CivilMargin <ArrowRight size={15} /></a></article><div className="resources-count-panel"><span className="eyebrow">EDITORIAL STARTER LIBRARY</span><strong>{String(GUIDE_ARTICLES.length).padStart(2, "0")}</strong><span>guides to search and explore</span><p>Guides are reviewed as the site evolves; always follow current project documents and applicable rules for real work.</p></div></div></section>
  </>;
}
