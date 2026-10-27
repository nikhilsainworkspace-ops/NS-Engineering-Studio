import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { getContent, type ProjectItem } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = (await getContent<ProjectItem>("projects")).find((item) => item.slug === slug && item.published && item.status !== "draft" && item.status !== "archived");
  return project ? { title: project.seoTitle || project.title, description: project.seoDescription || project.summary, alternates: { canonical: `/projects/${project.slug}` }, openGraph: { title: project.seoTitle || project.title, description: project.seoDescription || project.summary, type: "article" } } : { title: "Project not found", robots: { index: false, follow: false } };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = (await getContent<ProjectItem>("projects")).find((item) => item.slug === slug && item.published && item.status !== "draft" && item.status !== "archived");
  if (!project) notFound();
  const images = [project.coverImageUrl, ...project.gallery].filter(Boolean);
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/projects">Projects</Link><span aria-hidden="true">/</span><span aria-current="page">{project.title}</span></nav><span className="eyebrow">{project.category} PROJECT</span><h1>{project.title}</h1><p>{project.summary}</p><div className="project-detail-meta">{project.location ? <span><MapPin size={15} />{project.location}</span> : null}{project.startDate ? <span><strong>Start</strong> {project.startDate}</span> : null}{project.completionDate ? <span><strong>Completion</strong> {project.completionDate}</span> : null}<span>{project.status === "completed" ? "Completed" : "Project overview"}</span></div></div></section>
    {images.length ? <section className="section"><div className="shell project-gallery">{images.map((image, index) => <div key={`${image}-${index}`} className="project-gallery-image" role="img" aria-label={`${project.title} image ${index + 1}`} style={{ backgroundImage: `url("${image.replaceAll('"', '')}")` }} />)}</div></section> : null}
    <section className="section"><div className="shell project-body-layout"><article className="detail-copy"><h2>Project overview</h2><p>{project.description}</p></article><aside className="service-detail-aside"><span className="eyebrow">A SIMILAR REQUIREMENT?</span><h2>Discuss your project scope</h2><p>Use the contact form to share the location, intended deliverables and any project constraints you can disclose.</p><Link className="button button-primary" href={`/contact?project=${encodeURIComponent(project.slug)}`}>Enquire about a project <ArrowRight size={16} /></Link><div style={{ marginTop: 18 }}><Link className="text-link" href="/projects"><ArrowLeft size={15} /> All projects</Link></div></aside></div></section>
  </>;
}
