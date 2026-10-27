"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import type { ProjectItem } from "@/lib/content";

export function PublicProjectDirectory({ projects }: { projects: ProjectItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const categories = useMemo(() => ["All categories", ...Array.from(new Set(projects.map((item) => item.category))).sort()], [projects]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter((item) => (category === "All categories" || item.category === category) && (!term || [item.title, item.summary, item.description, item.location, item.category, item.status].join(" ").toLowerCase().includes(term)));
  }, [projects, query, category]);
  return <>
    <div className="directory-controls"><label className="directory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search projects</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, category or location" /></label><label className="directory-filter"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <p className="directory-result-count" aria-live="polite">{filtered.length} published project{filtered.length === 1 ? "" : "s"}</p>
    <div className="project-public-grid">{filtered.length ? filtered.map((project) => <article className="project-public-card" key={project.slug}>
      {project.coverImageUrl ? <div className="project-public-image" role="img" aria-label={`Cover image for ${project.title}`} style={{ backgroundImage: `url("${project.coverImageUrl.replaceAll('"', '')}")` }} /> : <div className="project-public-image project-public-image-empty"><span>NS Engineering Studio</span><strong>{project.category}</strong></div>}
      <div className="project-public-copy"><div className="project-public-meta"><span>{project.category}</span>{project.location ? <span><MapPin size={13} />{project.location}</span> : null}</div><h2>{project.title}</h2><p>{project.summary}</p><Link className="text-link" href={`/projects/${project.slug}`}>View project details <ArrowRight size={15} /></Link></div>
    </article>) : <div className="empty-state project-empty-state"><h2>{projects.length ? "No projects match that search." : "Verified project details will appear here."}</h2><p>{projects.length ? "Try another term or choose a different category." : "There are no projects currently published for public display. The administrator can add approved case studies through the Projects manager when descriptions and media are ready."}</p>{projects.length ? <button className="button button-outline" type="button" onClick={() => { setQuery(""); setCategory("All categories"); }}>Clear search</button> : <Link className="button button-primary" href="/contact">Discuss a project <ArrowRight size={16} /></Link>}</div>}</div>
  </>;
}
