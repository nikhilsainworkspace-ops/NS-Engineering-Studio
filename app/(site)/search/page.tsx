import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search as SearchIcon } from "lucide-react";
import { getContent, type ProjectItem, type SoftwareItem } from "@/lib/content";
import type { FaqItem, ServiceItem } from "@/lib/brand";
import { PRODUCT_GUIDES } from "@/lib/product-content";
import { GUIDE_ARTICLES } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search", description: "Search NS Engineering Studio services, projects, software, products and practical resources.", alternates: { canonical: "/search" } };
type SearchPageProps = { searchParams: Promise<{ q?: string | string[] }> };
type SearchResult = { title: string; summary: string; category: string; href: string };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = typeof params.q === "string" ? params.q : Array.isArray(params.q) ? params.q[0] || "" : "";
  const query = rawQuery.trim().slice(0, 100);
  const needle = query.toLowerCase();
  const [services, projects, software, faqs] = await Promise.all([
    getContent<ServiceItem>("services"), getContent<ProjectItem>("projects"), getContent<SoftwareItem>("software"), getContent<FaqItem>("faqs")
  ]);
  const candidates: SearchResult[] = [
    ...services.map((item) => ({ title: item.title, summary: item.summary, category: "Service", href: `/services/${item.slug}` })),
    ...projects.filter((item) => item.published && item.status !== "draft" && item.status !== "archived").map((item) => ({ title: item.title, summary: item.summary, category: "Project", href: `/projects/${item.slug}` })),
    ...software.filter((item) => item.published).map((item) => ({ title: item.title, summary: item.summary, category: "Engineering software", href: "/engineering-software" })),
    ...PRODUCT_GUIDES.map((item) => ({ title: item.name, summary: item.summary, category: "Product", href: `/products/${item.slug}` })),
    ...GUIDE_ARTICLES.map((item) => ({ title: item.title, summary: item.summary, category: "Guide", href: `/resources/${item.slug}` })),
    ...faqs.map((item) => ({ title: item.question, summary: item.answer, category: "FAQ", href: "/faq" }))
  ];
  const results = query ? candidates.filter((item) => `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(needle)).slice(0, 60) : [];
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Search</span></nav><span className="eyebrow">SEARCH THE STUDIO</span><h1>Find a service,<br /><span>tool or resource.</span></h1><p>Search published service details, project records, engineering software, product guides and practical articles.</p><form action="/search" method="get" className="site-search-form"><label htmlFor="site-search-query">Search this website</label><div><SearchIcon size={18} aria-hidden="true" /><input id="site-search-query" name="q" type="search" maxLength={100} defaultValue={query} placeholder="Try “BOQ”, “manpower” or “project”…" /><button className="button button-primary" type="submit">Search</button></div></form></div></section>
    <section className="section"><div className="shell"><div className="search-results-heading"><h2>{query ? `Results for “${query}”` : "Start with a keyword"}</h2>{query ? <span>{results.length} result{results.length === 1 ? "" : "s"}</span> : null}</div>{!query ? <div className="empty-state"><p>Search across services, published projects, software listings, products, FAQs and guides. Private admin and workspace records are not indexed or searched here.</p></div> : results.length ? <div className="search-results-list">{results.map((result, index) => <article key={`${result.category}-${result.href}-${result.title}-${index}`} className="search-result-card"><div><span>{result.category}</span><h3><Link href={result.href}>{result.title}</Link></h3><p>{result.summary}</p></div><Link className="search-result-open" href={result.href} aria-label={`Open ${result.title}`}><ArrowRight size={17} /></Link></article>)}</div> : <div className="empty-state"><h3>No matching public content found.</h3><p>Try a broader keyword, browse <Link href="/services">services</Link> or <Link href="/engineering-software">engineering software</Link>, or <Link href="/contact">send an enquiry</Link>.</p></div>}</div></section>
  </>;
}
