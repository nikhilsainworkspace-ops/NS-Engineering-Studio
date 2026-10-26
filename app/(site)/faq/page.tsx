import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getContent } from "@/lib/content";
import type { FaqItem } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Frequently asked questions", description: "Answers to common questions about getting started with NS Studio." };

export default async function FaqPage() {
  const faqs = await getContent<FaqItem>("faqs");
  return <>
    <section className="page-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">FAQ</span></nav><span className="eyebrow">A FEW USEFUL ANSWERS</span><h1>Good questions deserve<br /><span>clear answers.</span></h1><p>These are a starting point, not a substitute for confirming the details of a specific service or engagement.</p></div></section>
    <section className="section"><div className="shell faq-page-layout"><div className="faq-page-intro"><span className="eyebrow">NEED A LITTLE MORE?</span><h2>Ask about your situation.</h2><p>If your question is not covered, share a little context and we can clarify the details directly. The service descriptions and answers are editable starter copy.</p><Link className="button button-primary" href="/contact">Ask a question <ArrowUpRight size={16} /></Link></div><div className="accordion-list">{faqs.map((faq) => <details className="accordion-item" key={faq.slug}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}{faqs.length === 0 ? <div className="empty-state">No FAQs are published right now. <Link className="text-link" href="/contact">Contact us <ArrowUpRight size={14} /></Link></div> : null}</div></div></section>
  </>;
}
