import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, Compass, FileCheck2, GitBranch, Handshake, Layers3, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Our approach",
  description: "How NS Engineering Studio connects learning and practical tools with reviewable project-cost workflows.",
  alternates: { canonical: "/process" },
};

const phases = [
  { number: "01", icon: Compass, title: "Understand your need", summary: "Decide whether you need to learn, practise, grow professionally or review a construction project’s costs.", details: ["Clarify users, goals and constraints", "Review current workflows and systems", "Identify assumptions, dependencies and open questions"], output: "A clear statement of the need" },
  { number: "02", icon: Layers3, title: "Choose the relevant product", summary: "Match the need to Engineering Workspace or CivilMargin and check current features on its official site.", details: ["Map core journeys and system boundaries", "Agree the first useful increment", "Identify risks, responsibilities and acceptance criteria"], output: "The right product and current feature details" },
  { number: "03", icon: GitBranch, title: "Explore the workflow", summary: "Use the product workflow and understand the assumptions behind any generated output.", details: ["Develop against agreed priorities", "Review decisions and edge cases as they emerge", "Keep accessibility, privacy and maintainability in view"], output: "A supported, reviewable workflow" },
  { number: "04", icon: FileCheck2, title: "Validate before acting", summary: "Have qualified people review important technical, financial, contract or safety decisions before acting.", details: ["Check agreed acceptance criteria", "Document handover details and known limitations", "Prioritise the next improvements based on need"], output: "Human review and a deliberate next step" },
];

const workingAgreements = [
  { icon: Handshake, title: "Shared expectations", text: "Agree on scope, responsibilities, communication and decision-making before delivery begins." },
  { icon: ShieldCheck, title: "Responsible by default", text: "Treat security, privacy, accessibility and data handling as part of the work—not optional finishing touches." },
  { icon: CheckCircle2, title: "Useful over impressive", text: "Choose a level of complexity that fits the problem, the people and the long-term cost of change." },
];

export default function ProcessPage() {
  return <>
    <section className="page-hero process-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Approach</span></nav><span className="eyebrow">A PRACTICAL WAY OF WORKING</span><h1>Start with the need.<br /><span>Choose the right tool.</span></h1><p>Different needs call for different tools. Use the path below to decide whether you need learning resources and career support or project-cost visibility for a construction job.</p><div className="process-hero-tags"><span>01 / Understand the need</span><span>02 / Choose a product</span><span>03 / Explore the workflow</span><span>04 / Review with care</span></div></div></section>

    <section className="section process-detail-section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">CHOOSE THE RIGHT PATH</span><h2>Four practical steps.<br /><span>One clearer next move.</span></h2></div><p>Use these steps to orient yourself. Product functionality, terms and availability are confirmed on each official product website.</p></div><div className="process-detail-list">{phases.map(({ number, icon: Icon, title, summary, details, output }) => <article className="process-detail-card" key={number}><div className="process-detail-side"><span className="process-detail-number">{number}</span><span className="process-detail-icon"><Icon size={23} aria-hidden="true" /></span></div><div className="process-detail-main"><h3>{title}</h3><p className="process-detail-summary">{summary}</p><ul>{details.map((detail) => <li key={detail}><CheckCircle2 size={15} aria-hidden="true" />{detail}</li>)}</ul><div className="process-output"><span>USEFUL OUTPUT</span><strong>{output}</strong></div></div></article>)}</div></div></section>

    <section className="section section-soft"><div className="shell"><div className="section-heading"><div><span className="eyebrow">WORKING PRINCIPLES</span><h2>Clarity is a team<br /><span>responsibility.</span></h2></div><p>Good collaboration is built through decisions and habits that make the work easier to understand—not through broad promises.</p></div><div className="principle-cards">{workingAgreements.map(({ icon: Icon, title, text }, index) => <article className="principle-card" key={title}><div className="principle-card-top"><span className="principle-card-icon"><Icon size={21} aria-hidden="true" /></span><span className="principle-card-number">0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="section"><div className="shell process-question"><div><span className="eyebrow">EVERYTHING STARTS SOMEWHERE</span><h2>Have the goal.<br /><em>Still shaping the how?</em></h2></div><div><p>Bring the context you have. The first conversation can help clarify what needs to be understood before deciding on a solution or estimate.</p><Link className="button button-primary" href="/contact">Find the right product <ArrowUpRight size={17} aria-hidden="true" /></Link><div className="process-back-link"><Link className="text-link" href="/products">Compare our products <ArrowRight size={15} aria-hidden="true" /></Link></div></div></div></section>
  </>;
}
