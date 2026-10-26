import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Calculator, TrendingUp } from "lucide-react";
import { PRODUCT_URLS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Our Products",
  description: "Compare CivilMargin for civil construction project cost visibility and Civil At Hand for civil engineering and architecture learning, practical tools and careers.",
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
    icon: TrendingUp,
    bullets: ["Review budget, committed cost and actual cost", "Compare supplier rates and material consumption", "Review bill duplication, variations and cash forecasts"],
    note: "CivilMargin supports review and decision-making; it does not replace accounting software, contract checks or professional judgement."
  },
  {
    name: "Civil At Hand",
    detailHref: "/products/civil-at-hand",
    eyebrow: "FOR LEARNERS & BUILT-ENVIRONMENT PROFESSIONALS",
    headline: "Learn the craft. Keep growing.",
    description: "Civil At Hand brings civil engineering and architecture learning resources, practical tools, mentorship and career information together for people across the built-environment journey.",
    url: PRODUCT_URLS.civilAtHand,
    icon: BookOpen,
    bullets: ["Explore courses and study material", "Practise with examples and practical workflows", "Discover mentorship, careers and industry knowledge"],
    note: "The live Civil At Hand website is the source for currently available resources, courses and career opportunities."
  }
];

export default function ProductsPage() {
  return <>
    <section className="page-hero ecosystem-products-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Products</span></nav><span className="eyebrow">THE NS ENGINEERING STUDIO ECOSYSTEM</span><h1>Tools for the work.<br /><span>Resources for the people.</span></h1><p>Two distinct products support different parts of the civil engineering, architecture and construction journey. Choose the one that matches what you need today.</p><div className="process-hero-tags"><span>Learn & practise</span><span>Manage project costs</span><span>Keep decisions reviewable</span></div></div></section>
    <section className="section"><div className="shell product-directory-list">{products.map((product, index) => { const Icon = product.icon; return <article className={`product-directory-card ${index === 0 ? "product-card-margin" : "product-card-learning"}`} key={product.name}><div className="product-directory-side"><span className="product-directory-index">0{index + 1}</span><span className="product-directory-icon"><Icon size={27} aria-hidden="true" /></span><span className="product-directory-label">{index === 0 ? "PROJECT CONTROL" : "LEARNING & GROWTH"}</span></div><div className="product-directory-main"><span className="eyebrow">{product.eyebrow}</span><h2>{product.name}</h2><h3>{product.headline}</h3><p>{product.description}</p><ul>{product.bullets.map((bullet) => <li key={bullet}><CheckCircle2 size={16} aria-hidden="true" />{bullet}</li>)}</ul><div className="product-directory-actions"><Link className="button button-outline" href={product.detailHref}>Product overview <ArrowRight size={16} aria-hidden="true" /></Link><a className="button button-primary" href={product.url} target="_blank" rel="noopener noreferrer">Visit {product.name} <ArrowUpRight size={17} aria-hidden="true" /></a></div><p className="product-directory-note">{product.note}</p></div></article>; })}</div></section>
    <section className="section section-soft"><div className="shell product-choice-panel"><div><span className="eyebrow">A SIMPLE WAY TO CHOOSE</span><h2>What are you trying<br /><em>to do right now?</em></h2></div><div className="product-choice-list"><div><span className="product-choice-icon"><Calculator size={20} aria-hidden="true" /></span><p><strong>Understand costs across a construction project?</strong><span>Start with CivilMargin.</span></p><a href={PRODUCT_URLS.civilMargin} target="_blank" rel="noopener noreferrer" aria-label="Open CivilMargin website"><ArrowUpRight size={17} /></a></div><div><span className="product-choice-icon"><BookOpen size={20} aria-hidden="true" /></span><p><strong>Learn, practise or explore a career?</strong><span>Start with Civil At Hand.</span></p><a href={PRODUCT_URLS.civilAtHand} target="_blank" rel="noopener noreferrer" aria-label="Open Civil At Hand website"><ArrowUpRight size={17} /></a></div></div></div></section>
  </>;
}
