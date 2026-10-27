import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, CircleHelp, ExternalLink } from "lucide-react";
import { getProductGuide, PRODUCT_GUIDES } from "@/lib/product-content";

export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCT_GUIDES.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductGuide(slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.summary, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: `${product.name} | NS Engineering Studio`, description: product.summary, type: "website" } };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductGuide(slug);
  if (!product) notFound();
  const isMargin = product.slug === "civilmargin";
  return <>
    <section className={`page-hero product-detail-hero ${isMargin ? "product-detail-margin" : "product-detail-learning"}`}><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/products">Products</Link><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span></nav><span className="eyebrow">{product.eyebrow}</span><h1>{product.headline}</h1><p>{product.summary}</p><div className="product-detail-meta"><span><strong>Designed for</strong>{product.audience}</span><span><strong>Primary role</strong>{product.role}</span></div><div className="hero-actions">{product.launchVerified ? <a className="button button-primary" href={product.officialUrl} target={product.officialUrl.startsWith("http") ? "_blank" : undefined} rel={product.officialUrl.startsWith("http") ? "noopener noreferrer" : undefined}>Open {product.name} <ArrowUpRight size={17} /></a> : <span className="product-link-unavailable" role="status">External launch link not verified — contact us for current access details.</span>}<Link className="button button-outline" href="/contact">Ask a general question <ArrowRight size={16} /></Link></div></div></section>
    <section className="section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">WHAT IT HELPS WITH</span><h2>Made for the work<br /><span>you are trying to do.</span></h2></div><p>Product scope evolves. Use these overviews to understand the purpose, then check the official product site for current availability, terms and detailed features.</p></div><div className="product-benefit-grid">{product.benefits.map((benefit, index) => <article className="product-benefit-card" key={benefit.title}><span className="product-benefit-index">0{index + 1}</span><CheckCircle2 size={19} aria-hidden="true" /><h3>{benefit.title}</h3><p>{benefit.body}</p></article>)}</div></div></section>
    <section className="section section-soft"><div className="shell product-flow-layout"><div className="product-flow-intro"><span className="eyebrow">HOW TO GET STARTED</span><h2>From a real need<br /><em>to the next step.</em></h2><p>Begin with one well-defined task and confirm the product's current workflow on its official site.</p><Link className="text-link" href="/process">Read our approach <ArrowRight size={15} /></Link></div><div className="product-flow-list">{product.workflows.map((workflow) => <article key={workflow.number}><span>{workflow.number}</span><div><h3>{workflow.title}</h3><p>{workflow.body}</p></div></article>)}</div></div></section>
    <section className="section"><div className="shell product-fit-layout"><div><span className="eyebrow">COULD THIS FIT?</span><h2>Check the need<br /><em>before you choose.</em></h2><p>These are practical indicators to help decide whether to explore the product—not a guarantee of fit.</p>{product.launchVerified ? <a className="button button-primary" href={product.officialUrl} target={product.officialUrl.startsWith("http") ? "_blank" : undefined} rel={product.officialUrl.startsWith("http") ? "noopener noreferrer" : undefined}>Open {product.name} <ExternalLink size={16} /></a> : <p className="product-link-unavailable" role="status">The outbound link needs owner verification before it can be enabled.</p>}</div><div className="product-fit-list">{product.goodFit.map((item) => <p key={item}><CheckCircle2 size={17} aria-hidden="true" />{item}</p>)}</div></div><div className="shell product-boundary"><CircleHelp size={20} aria-hidden="true" /><div><strong>Important boundaries</strong><p>{product.boundaries}</p>{product.launchVerified ? <a href={product.officialUrl} target={product.officialUrl.startsWith("http") ? "_blank" : undefined} rel={product.officialUrl.startsWith("http") ? "noopener noreferrer" : undefined}>Check current product details <ArrowUpRight size={14} /></a> : <p className="product-link-unavailable">Current external destination not verified. Contact the studio to confirm access.</p>}</div></div><div className="shell product-back-link"><Link className="text-link" href="/products"><ArrowLeft size={15} /> Back to all products</Link></div></section>
  </>;
}
