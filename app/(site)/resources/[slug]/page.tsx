import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3 } from "lucide-react";
import { GUIDE_ARTICLES, getGuideBySlug } from "@/lib/resources";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getGuideBySlug(slug);
  if (!article) return { title: "Guide not found" };
  return { title: article.title, description: article.summary, alternates: { canonical: `/resources/${article.slug}` }, openGraph: { title: article.title, description: article.summary, type: "article" } };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const article = getGuideBySlug(slug);
  if (!article) notFound();
  const related = GUIDE_ARTICLES.filter((item) => item.slug !== article.slug && (item.category === article.category || item.category === "Site practice")).slice(0, 3);
  return <>
    <section className="page-hero guide-detail-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/resources">Guides</Link><span aria-hidden="true">/</span><span aria-current="page">{article.title}</span></nav><span className="eyebrow">{article.category.toUpperCase()} · PRACTICAL GUIDE</span><h1>{article.title}</h1><p>{article.summary}</p><div className="guide-meta"><span><Clock3 size={15} />{article.readTime}</span><span><BookOpen size={15} />Built-environment knowledge</span></div></div></section>
    <section className="section"><div className="shell guide-article-layout"><article className="guide-article"><p className="guide-intro">{article.intro}</p>{article.sections.map((section, index) => <section key={section.heading}><span className="guide-section-number">{String(index + 1).padStart(2, "0")}</span><h2>{section.heading}</h2><p>{section.paragraph}</p>{section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</section>)}<div className="guide-takeaways"><h2><CheckCircle2 size={20} /> Key takeaways</h2><ul>{article.takeaways.map((item) => <li key={item}>{item}</li>)}</ul></div><p className="guide-disclaimer">Educational reference only. Follow the current project documents, applicable local codes and standards, approved methods, manufacturer instructions and qualified professional review for real work.</p><Link className="text-link" href="/resources"><ArrowLeft size={15} /> Back to all guides</Link></article><aside className="guide-sidebar"><div className="guide-sidebar-card"><span className="eyebrow">TRY A PRACTICAL TOOL</span><h2>Take the first calculation step.</h2><p>Explore concrete quantity, coating, theoretical reinforcement weight and simplified margin calculators—with editable assumptions and visible formulas.</p><Link className="button button-primary button-small" href="/tools">Open the toolbench <ArrowRight size={15} /></Link></div><div className="guide-sidebar-links"><h3>Related guides</h3>{related.map((item) => <Link href={`/resources/${item.slug}`} key={item.slug}><span>{item.category}</span><strong>{item.title}</strong><ArrowRight size={15} /></Link>)}</div></aside></div></section>
  </>;
}
