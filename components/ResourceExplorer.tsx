"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock3, Search, X } from "lucide-react";
import type { GuideArticle } from "@/lib/resources";

const categories = ["All guides", "Site practice", "Estimating", "Design & BIM", "Project controls", "Career growth"] as const;

export function ResourceExplorer({ articles }: { articles: GuideArticle[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All guides");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesCategory = category === "All guides" || article.category === category;
      const haystack = `${article.title} ${article.summary} ${article.category} ${article.intro}`.toLowerCase();
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [articles, category, query]);

  return <div className="resource-explorer">
    <div className="resource-controls"><label className="resource-search" htmlFor="resource-search"><Search size={18} aria-hidden="true" /><input id="resource-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search BOQ, BIM, site quality…" /><span className="sr-only">Search guides by title, topic or summary</span>{query ? <button className="resource-clear" type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button> : null}</label><div className="resource-category-list" aria-label="Filter guides by topic">{categories.map((item) => <button key={item} type="button" className={`resource-category${category === item ? " is-active" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><p className="resource-count" role="status">Showing {filtered.length} of {articles.length} guides</p></div>
    {filtered.length ? <div className="resource-card-grid">{filtered.map((article, index) => <article className="resource-card" key={article.slug}><div className="resource-card-top"><span className="resource-card-index">{String(index + 1).padStart(2, "0")}</span><span className="resource-category-label">{article.category}</span></div><h3><Link href={`/resources/${article.slug}`}>{article.title}</Link></h3><p>{article.summary}</p><div className="resource-card-meta"><span><Clock3 size={14} aria-hidden="true" />{article.readTime}</span><span><BookOpen size={14} aria-hidden="true" />Practical guide</span></div><Link className="text-link" href={`/resources/${article.slug}`}>Read this guide <ArrowUpRight size={15} aria-hidden="true" /></Link></article>)}</div> : <div className="resource-empty"><span><Search size={23} /></span><h3>No guides match that search</h3><p>Try a broader phrase or clear your current topic filter.</p><button className="button button-outline button-small" type="button" onClick={() => { setQuery(""); setCategory("All guides"); }}>Clear filters</button></div>}
  </div>;
}
