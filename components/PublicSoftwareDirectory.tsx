"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Boxes, Calculator, Search, Wrench } from "lucide-react";

type PublicSoftwareItem = { slug: string; name: string; category: string; summary: string; description: string; href: string; status: string; availableToLaunch: boolean; pricing: string; trialInfo: string; platforms: string; features: string[]; featured: boolean };
const icons = { "Engineering tools": Calculator, "Construction operations": Boxes, "Project cost visibility": Wrench } as const;

export function PublicSoftwareDirectory({ items }: { items: PublicSoftwareItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All statuses");
  const categories = useMemo(() => ["All categories", ...Array.from(new Set(items.map((item) => item.category))).sort()], [items]);
  const statuses = useMemo(() => ["All statuses", ...Array.from(new Set(items.map((item) => item.status))).sort()], [items]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => (category === "All categories" || item.category === category) && (status === "All statuses" || item.status === status) && (!term || [item.name, item.category, item.summary, item.description, item.features.join(" "), item.platforms].join(" ").toLowerCase().includes(term)));
  }, [items, query, category, status]);
  return <>
    <div className="directory-controls software-directory-controls"><label className="directory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search engineering software</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools, features or platforms" /></label><label className="directory-filter"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="directory-filter"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <p className="directory-result-count" aria-live="polite">{filtered.length} software item{filtered.length === 1 ? "" : "s"}</p>
    <div className="software-public-grid">{filtered.length ? filtered.map((item) => {
      const Icon = item.category in icons ? icons[item.category as keyof typeof icons] : Boxes;
      const external = item.href.startsWith("http");
      return <article className="software-public-card" key={item.slug}><span className="software-public-icon"><Icon size={22} /></span><span className="software-public-status">{item.status}</span>{item.featured ? <span className="software-featured-label">Featured</span> : null}<h3>{item.name}</h3><p className="software-public-category">{item.category}{item.platforms ? ` · ${item.platforms}` : ""}</p><p>{item.summary}</p>{item.features.length ? <ul className="software-feature-list">{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul> : null}{item.pricing ? <p><strong>Pricing:</strong> {item.pricing}</p> : null}{item.trialInfo ? <p><strong>Trial:</strong> {item.trialInfo}</p> : null}{item.description ? <p>{item.description}</p> : null}{item.availableToLaunch && item.href ? <a className="text-link" href={item.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{external ? "Open product destination" : "Open product"} {external ? <ArrowUpRight size={15} /> : <ArrowRight size={15} />}</a> : <span className="software-unavailable">{item.href ? `Launch unavailable while the listing is ${item.status.toLowerCase()}.` : "Launch destination has not been configured or verified."}</span>}</article>;
    }) : <div className="empty-state project-empty-state"><h2>No software items match those filters.</h2><p>Try another keyword, category or status.</p><button className="button button-outline" type="button" onClick={() => { setQuery(""); setCategory("All categories"); setStatus("All statuses"); }}>Clear filters</button></div>}</div>
  </>;
}
