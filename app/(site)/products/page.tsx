import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Boxes, CheckCircle2, Calculator, TrendingUp } from "lucide-react";
import { PRODUCT_URLS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Our Products",
  description: "Compare CivilMargin for construction cost visibility and Engineering Workspace for construction operations, project records, estimates, procurement and reporting.",
  alternates: { canonical: "/products" }
};

const products = [
  {
    name: "CivilMargin",
    detailHref: "/products/civilmargin",
    eyebrow: "FOR CONTRACTORS & SUBCONTRACTORS",
    headline: "Know where project money is going.",
    description: "CivilMargin compares BOQs, measurement books, bills, supplier quotes, material issues, variations and cash flow to surface items that deserve a closer look — with calculations behind findings for human review.",
    url: PRODUCT_URLS.civilMargin,
    launchVerified: false,
    icon: TrendingUp,
    bullets: ["Review budget, committed cost and actual cost", "Compare supplier rates and material consumption", "Review bill duplication, variations and cash forecasts"],
    note: "CivilMargin supports review and decision-making; it does not replace accounting software, contract checks or professional judgement."
  },
  {
    name: "Engineering Workspace",
    detailHref: "/products/engineering-workspace",
    eyebrow: "FOR CONTRACTORS & SITE TEAMS",
    headline: "Keep construction workflows connected.",
    description: "Engineering Workspace integrates construction operations such as contacts, project records, estimates, procurement, workforce, finance and documentation under the NS Engineering Studio identity.",
    url: PRODUCT_URLS.civilAtHand,
    launchVerified: true,
    icon: Boxes,
    bullets: ["Contacts, projects and follow-ups", "Estimates, materials, procurement and workforce", "Finance, invoices, documents and reports"],
    note: "Database-backed workspace features require MongoDB and administrator configuration. Access and functionality should be verified in the target deployment."
  }
];

export default function ProductsPage() {
  return <>
    <section className="page-hero ecosystem-products-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Products</span></nav><span className="eyebrow">THE NS ENGINEERING STUDIO ECOSYSTEM</span><h1>Tools for the work.<br /><span>Resources for the people.</span></h1><p>Two distinct products support different parts of construction delivery: project-cost review and operational workflows. Choose the one that matches what you need today.</p><div className="process-hero-tags"><span>Construction operations</span><span>Project-cost review</span><span>Clear records</span></div></div></section>
    <section className="section"><div className="shell product-directory-list">{products.map((product, index) => { const Icon = product.icon; return <article className={`product-directory-card ${index === 0 ? "product-card-margin" : "product-card-learning"}`} key={product.name}><div className="product-directory-side"><span className="product-directory-index">0{index + 1}</span><span className="product-directory-icon"><Icon size={27} aria-hidden="true" /></span><span className="product-directory-label">{index === 0 ? "PROJECT CONTROL" : "CONSTRUCTION OPERATIONS"}</span></div><div className="product-directory-main"><span className="eyebrow">{product.eyebrow}</span><h2>{product.name}</h2><h3>{product.headline}</h3><p>{product.description}</p><ul>{product.bullets.map((bullet) => <li key={bullet}><CheckCircle2 size={16} aria-hidden="true" />{bullet}</li>)}</ul><div className="product-directory-actions"><Link className="button button-outline" href={product.detailHref}>Product overview <ArrowRight size={16} aria-hidden="true" /></Link>{product.launchVerified ? <a className="button button-primary" href={product.url} target={product.url.startsWith("http") ? "_blank" : undefined} rel={product.url.startsWith("http") ? "noopener noreferrer" : undefined}>Visit {product.name} <ArrowUpRight size={17} aria-hidden="true" /></a> : <span className="product-link-unavailable" role="status">External destination requires verification</span>}</div><p className="product-directory-note">{product.note}</p></div></article>; })}</div></section>
    <section className="section section-soft"><div className="shell product-choice-panel"><div><span className="eyebrow">A SIMPLE WAY TO CHOOSE</span><h2>What are you trying<br /><em>to do right now?</em></h2></div><div className="product-choice-list"><div><span className="product-choice-icon"><Calculator size={20} aria-hidden="true" /></span><p><strong>Understand costs across a construction project?</strong><span>Start with CivilMargin.</span></p><Link href="/products/civilmargin" aria-label="View CivilMargin overview"><ArrowRight size={17} /></Link></div><div><span className="product-choice-icon"><Boxes size={20} aria-hidden="true" /></span><p><strong>Coordinate construction work and records?</strong><span>Start with Engineering Workspace.</span></p><a href={PRODUCT_URLS.civilAtHand} aria-label="Open Engineering Workspace"><ArrowUpRight size={17} /></a></div></div></div></section>
  </>;
}
