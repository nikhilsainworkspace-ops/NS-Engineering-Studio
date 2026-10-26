import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, Compass, FileCheck2, GitBranch, Handshake, Layers3, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Our approach",
  description: "A practical approach to digital product discovery, design, engineering and continuous improvement at NS Engineering Studio.",
  alternates: { canonical: "/process" },
};

const phases = [
  { number: "01", icon: Compass, title: "Understand the context", summary: "Start with the problem, not a predetermined solution.", details: ["Clarify users, goals and constraints", "Review current workflows and systems", "Identify assumptions, dependencies and open questions"], output: "Shared problem statement and priorities" },
  { number: "02", icon: Layers3, title: "Shape the right scope", summary: "Make the plan understandable before work expands.", details: ["Map core journeys and system boundaries", "Agree the first useful increment", "Identify risks, responsibilities and acceptance criteria"], output: "A clear scope and delivery path" },
  { number: "03", icon: GitBranch, title: "Build with feedback", summary: "Work in visible increments and keep decisions connected to the goal.", details: ["Develop against agreed priorities", "Review decisions and edge cases as they emerge", "Keep accessibility, privacy and maintainability in view"], output: "Reviewable progress and documented decisions" },
  { number: "04", icon: FileCheck2, title: "Review and improve", summary: "Finish with a clear view of what is ready and what comes next.", details: ["Check agreed acceptance criteria", "Document handover details and known limitations", "Prioritise the next improvements based on need"], output: "A useful handover and next-step plan" },
];

const workingAgreements = [
  { icon: Handshake, title: "Shared expectations", text: "Agree on scope, responsibilities, communication and decision-making before delivery begins." },
  { icon: ShieldCheck, title: "Responsible by default", text: "Treat security, privacy, accessibility and data handling as part of the work—not optional finishing touches." },
  { icon: CheckCircle2, title: "Useful over impressive", text: "Choose a level of complexity that fits the problem, the people and the long-term cost of change." },
];

export default function ProcessPage() {
  return <>
    <section className="page-hero process-hero"><div className="shell page-hero-inner"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Approach</span></nav><span className="eyebrow">A PRACTICAL WAY OF WORKING</span><h1>Understand first.<br /><span>Build with intent.</span></h1><p>Every project is different. A clear process gives the team a shared direction while leaving room to adapt when the evidence changes.</p><div className="process-hero-tags"><span>01 / Context</span><span>02 / Scope</span><span>03 / Delivery</span><span>04 / Learning</span></div></div></section>

    <section className="section process-detail-section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">THE WORKING FRAMEWORK</span><h2>Four stages.<br /><span>One shared direction.</span></h2></div><p>This is a framework, not a rigid waterfall. Some stages overlap, and the scope of each is agreed to fit the project.</p></div><div className="process-detail-list">{phases.map(({ number, icon: Icon, title, summary, details, output }) => <article className="process-detail-card" key={number}><div className="process-detail-side"><span className="process-detail-number">{number}</span><span className="process-detail-icon"><Icon size={23} aria-hidden="true" /></span></div><div className="process-detail-main"><h3>{title}</h3><p className="process-detail-summary">{summary}</p><ul>{details.map((detail) => <li key={detail}><CheckCircle2 size={15} aria-hidden="true" />{detail}</li>)}</ul><div className="process-output"><span>USEFUL OUTPUT</span><strong>{output}</strong></div></div></article>)}</div></div></section>

    <section className="section section-soft"><div className="shell"><div className="section-heading"><div><span className="eyebrow">WORKING PRINCIPLES</span><h2>Clarity is a team<br /><span>responsibility.</span></h2></div><p>Good collaboration is built through decisions and habits that make the work easier to understand—not through broad promises.</p></div><div className="principle-cards">{workingAgreements.map(({ icon: Icon, title, text }, index) => <article className="principle-card" key={title}><div className="principle-card-top"><span className="principle-card-icon"><Icon size={21} aria-hidden="true" /></span><span className="principle-card-number">0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

    <section className="section"><div className="shell process-question"><div><span className="eyebrow">EVERYTHING STARTS SOMEWHERE</span><h2>Have the goal.<br /><em>Still shaping the how?</em></h2></div><div><p>Bring the context you have. The first conversation can help clarify what needs to be understood before deciding on a solution or estimate.</p><Link className="button button-primary" href="/contact">Talk through your project <ArrowUpRight size={17} aria-hidden="true" /></Link><div className="process-back-link"><Link className="text-link" href="/services">Browse capabilities <ArrowRight size={15} aria-hidden="true" /></Link></div></div></div></section>
  </>;
}
