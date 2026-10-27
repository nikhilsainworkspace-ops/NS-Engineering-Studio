import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getContent, type SoftwareItem } from "@/lib/content";
import { PublicSoftwareDirectory } from "@/components/PublicSoftwareDirectory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Engineering Software", description: "Explore engineering calculators, construction workflows and software products connected to NS Engineering Studio.", alternates: { canonical: "/engineering-software" } };

type PublicItem = { slug: string; name: string; category: string; summary: string; description: string; href: string; status: string; availableToLaunch: boolean; pricing: string; trialInfo: string; platforms: string; features: string[]; featured: boolean };
const builtIn: PublicItem[] = [
  { slug: "engineering-calculators", name: "Engineering Calculators", category: "Engineering tools", summary: "Browser-based calculation utilities for early-stage quantity and construction checks, with clear scope limitations.", description: "Calculations run locally in the browser and are not saved to an account.", href: "/tools", status: "Included in this website", availableToLaunch: true, pricing: "No purchase flow configured", trialInfo: "Not applicable", platforms: "Web browser", features: ["Concrete volume", "Surface and paint estimates", "Reinforcement weight", "Simple project-margin scenarios"], featured: true },
  { slug: "engineering-workspace", name: "Engineering Workspace", category: "Construction operations", summary: "The integrated workspace retains modules for contacts, projects, estimates, procurement, workforce, finance, documents, tenders and operational records.", description: "Database-backed workflows require the deployment database and administrator account to be configured.", href: "/workspace", status: "Integrated module · configuration required", availableToLaunch: true, pricing: "Not configured", trialInfo: "Not configured", platforms: "Web browser", features: ["Contacts and projects", "Estimates, material and procurement workflows", "Workforce, invoices, documents and reports"], featured: true },
  { slug: "civilmargin", name: "CivilMargin", category: "Project cost visibility", summary: "The supplied source project describes a product for construction project-cost visibility. Its current launch destination has not been verified in this release.", description: "Contact the studio or publish an owner-verified destination after confirming availability, feature details and terms.", href: "", status: "External launch unverified", availableToLaunch: false, pricing: "Not verified", trialInfo: "Not verified", platforms: "External destination pending owner verification", features: ["Project-cost review workflows described by source content"], featured: false }
];
const statusLabels: Record<SoftwareItem["status"], string> = { available: "Available", beta: "Beta", "coming-soon": "Coming soon", maintenance: "Maintenance" };

export default async function EngineeringSoftwarePage() {
  const managed = (await getContent<SoftwareItem>("software")).filter((item) => item.published);
  const managedItems: PublicItem[] = managed.map((item) => ({
    slug: item.slug, name: item.title, category: item.category, summary: item.summary, description: item.description,
    href: item.launchUrl, status: statusLabels[item.status], availableToLaunch: item.status === "available" || item.status === "beta",
    pricing: item.pricing, trialInfo: item.trialInfo, platforms: item.platforms, features: item.features, featured: item.featured
  }));
  const items = [...builtIn, ...managedItems].sort((a, b) => Number(b.featured) - Number(a.featured));
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Engineering Software</span></nav><span className="eyebrow">ONE ENGINEERING SOFTWARE ECOSYSTEM</span><h1>Practical tools for<br /><span>engineering and delivery.</span></h1><p>Discover tools and workflows managed by NS Engineering Studio. Availability and integrations are described as configured rather than assumed.</p></div></section>
    <section className="section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">PLATFORM PRODUCTS</span><h2>Explore the toolset<br /><span>connected to the studio.</span></h2></div><p>Search the catalogue or narrow it by category and status. Some tools run inside this website; other destinations may be independently operated.</p></div><PublicSoftwareDirectory items={items} /></div></section>
    <section className="section section-soft"><div className="shell split-feature"><div><span className="eyebrow">FOR SOFTWARE OWNERS</span><h2>Manage the catalogue<br /><em>from the admin panel.</em></h2></div><div className="split-copy"><p>Authorised administrators can publish software descriptions, launch links, status, supported platforms, features and configured commercial information without editing source files.</p><Link className="button button-primary" href="/contact?service=engineering-software">Ask about a software product <ArrowRight size={16} /></Link></div></div></section>
  </>;
}
