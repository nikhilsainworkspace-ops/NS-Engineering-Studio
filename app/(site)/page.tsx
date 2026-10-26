import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  CircleCheck,
  Code2,
  Compass,
  Gauge,
  Layers3,
  LockKeyhole,
  MessageCircle,
  MoveUpRight,
  Network,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { ServiceCard } from "@/components/ServiceCard";
import { getContent } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import type { FaqItem, ServiceItem } from "@/lib/brand";

export const dynamic = "force-dynamic";
const operatingPrinciples = [
  { icon: Compass, title: "Start with context", text: "Understand the people, constraints and goal before jumping to a solution." },
  { icon: Layers3, title: "Design the whole system", text: "Connect the interface, data, integrations and operational reality." },
  { icon: ShieldCheck, title: "Engineer responsibly", text: "Keep accessibility, privacy, security and maintainability in the conversation." },
];

const qualityAreas = [
  { icon: PanelsTopLeft, title: "Useful by design", text: "Clear structure, responsive layouts and interactions that help people finish the task." },
  { icon: Code2, title: "Built to evolve", text: "A considered foundation that makes future changes easier to reason about." },
  { icon: LockKeyhole, title: "Security considered early", text: "Thoughtful data handling, access control and sensible defaults from the start." },
  { icon: Gauge, title: "Performance in the details", text: "Attention to loading, layout stability and the experience on smaller devices." },
];

export default async function HomePage() {
  const [settings, services, faqs] = await Promise.all([
    getSiteSettings(),
    getContent<ServiceItem>("services"),
    getContent<FaqItem>("faqs"),
  ]);
  const [firstLine, ...restLines] = settings.heroHeadline.split("\n");
  const secondLine = restLines.join(" ");

  return <>
    <section className="hero hero-premium">
      <div className="hero-grid shell">
        <div className="hero-copy">
          <span className="eyebrow">{settings.heroEyebrow}</span>
          <h1>{firstLine}{secondLine ? <><br /><em>{secondLine}</em></> : null}</h1>
          <p className="hero-description">{settings.heroDescription}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/contact">Discuss your project <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link className="button button-outline" href="/services">Explore capabilities <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="hero-meta" aria-label="How we approach the work">
            <span><CircleCheck size={15} aria-hidden="true" /> Clear scope</span>
            <span><ShieldCheck size={15} aria-hidden="true" /> Responsible delivery</span>
            <span><MessageCircle size={15} aria-hidden="true" /> Direct conversations</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Illustration of a digital product moving from discovery to design to engineering">
          <div className="hero-art-ring" aria-hidden="true" />
          <div className="hero-console">
            <div className="console-topbar">
              <div className="console-brand"><Image src={settings.logoPath} alt="" width={44} height={44} priority /><span><strong>NS / ENGINEERING</strong><small>PRODUCT SYSTEMS</small></span></div>
              <span className="console-live"><i /> IN PRINCIPLE</span>
            </div>
            <div className="console-title-row"><div><span className="console-eyebrow">A PRACTICAL FRAMEWORK</span><h2>From first question<br />to useful product.</h2></div><span className="console-index">01—03</span></div>
            <div className="architecture-flow">
              <div className="architecture-node node-discover"><span className="node-symbol"><Compass size={18} /></span><span><strong>Discover</strong><small>Context & priorities</small></span><Check size={15} /></div>
              <div className="flow-connector"><span /></div>
              <div className="architecture-node node-design"><span className="node-symbol"><Blocks size={18} /></span><span><strong>Design</strong><small>Journeys & systems</small></span><Check size={15} /></div>
              <div className="flow-connector"><span /></div>
              <div className="architecture-node node-engineer"><span className="node-symbol"><Code2 size={18} /></span><span><strong>Engineer</strong><small>Build & learn</small></span><ArrowUpRight size={15} /></div>
            </div>
            <div className="console-foot"><span><span className="console-foot-dot" /> A good plan stays adaptable</span><span>NS / 001</span></div>
          </div>
          <div className="hero-float-note"><span className="float-note-icon"><Workflow size={17} /></span><span><strong>One connected process</strong><small>Product · Design · Engineering</small></span></div>
        </div>
      </div>
    </section>

    <div className="trust-strip"><div className="shell trust-strip-inner"><span><Compass size={15} aria-hidden="true" /> Start with the real problem</span><span><Network size={15} aria-hidden="true" /> Connect the moving parts</span><span><Sparkles size={15} aria-hidden="true" /> Sweat the details that matter</span></div></div>

    <section className="section capability-section" id="capabilities">
      <div className="shell">
        <div className="section-heading">
          <div><span className="eyebrow">CAPABILITIES</span><h2>Make the complex<br /><span>feel considered.</span></h2></div>
          <p>Bring us a defined brief or an early-stage question. Start with the need, then shape the right mix of strategy, design and engineering around it.</p>
        </div>
        {services.length ? <div className="service-grid">{services.slice(0, 6).map((service) => <ServiceCard key={service.slug} service={service} />)}</div> : <div className="empty-state">No published capabilities yet. <Link className="text-link" href="/contact">Start a conversation <ArrowRight size={15} /></Link></div>}
        <div className="section-actions"><Link className="text-link" href="/services">Explore all capabilities <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </div>
    </section>

    <section className="section section-soft principles-section">
      <div className="shell">
        <div className="section-heading"><div><span className="eyebrow">THE WAY WE THINK</span><h2>Good engineering is<br /><span>more than code.</span></h2></div><p>The best solution is not always the biggest one. It is the one that fits the people, the problem and the environment it needs to live in.</p></div>
        <div className="principle-cards">{operatingPrinciples.map(({ icon: Icon, title, text }, index) => <article className="principle-card" key={title}><div className="principle-card-top"><span className="principle-card-icon"><Icon size={21} aria-hidden="true" /></span><span className="principle-card-number">0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        <div className="principle-cta"><p>Not sure what the right solution looks like yet? That is a useful place to start.</p><Link className="text-link" href="/process">Explore our approach <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </div>
    </section>

    <section className="section quality-section">
      <div className="shell quality-layout">
        <div className="quality-intro"><span className="eyebrow">BUILT AROUND QUALITY</span><h2>Make the right things<br /><em>part of the plan.</em></h2><p>Quality is not a final coat of paint. It comes from the choices made throughout discovery, design, implementation and release.</p><Link className="button button-outline" href="/process">See the process <ArrowRight size={16} aria-hidden="true" /></Link></div>
        <div className="quality-grid">{qualityAreas.map(({ icon: Icon, title, text }) => <article className="quality-item" key={title}><span><Icon size={19} aria-hidden="true" /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </div>
    </section>

    <section className="section process-preview">
      <div className="shell">
        <div className="section-heading"><div><span className="eyebrow">A CLEARER PATH</span><h2>Small, deliberate steps.<br /><span>Shared understanding.</span></h2></div><p>Strong delivery starts with an honest view of the work. Here is the framework; individual projects may adapt it to suit their context.</p></div>
        <div className="process-grid"><article className="process-step"><span className="process-index">PHASE 01</span><h3>Understand</h3><p>Align on the problem, users, constraints and what success should mean.</p></article><article className="process-step"><span className="process-index">PHASE 02</span><h3>Shape</h3><p>Make priorities, scope, assumptions and open questions visible.</p></article><article className="process-step"><span className="process-index">PHASE 03</span><h3>Build</h3><p>Deliver in considered increments, review decisions and surface risks early.</p></article><article className="process-step"><span className="process-index">PHASE 04</span><h3>Improve</h3><p>Review what is ready, document what matters and plan the next useful step.</p></article></div>
        <div className="section-actions"><Link className="button button-outline" href="/process">See how we work <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </div>
    </section>

    <section className="section section-soft faq-section">
      <div className="shell faq-preview"><div className="faq-intro"><span className="eyebrow">GOOD TO KNOW</span><h2 className="faq-preview-title">A few questions,<br /><em>made clearer.</em></h2><p>Understand the first conversation, how scope is shaped and what to consider before work begins.</p><Link className="text-link" href="/faq">Visit all FAQs <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="accordion-list">{faqs.slice(0, 4).map((faq) => <details className="accordion-item" key={faq.slug}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}{faqs.length === 0 ? <p className="empty-state">FAQs will appear here when published.</p> : null}</div></div>
    </section>

    <section className="final-cta-section"><div className="shell final-cta-panel"><div className="final-cta-mark"><Image src={settings.logoPath} alt="" width={72} height={72} /></div><div className="final-cta-copy"><span className="eyebrow">THE NEXT STEP STARTS HERE</span><h2>Bring the question.<br /><em>Build the right thing.</em></h2><p>You do not need a perfect brief. Share the outcome you are aiming for and the questions you are working through.</p></div><div className="final-cta-actions"><Link className="button button-primary" href="/contact">Tell us about your project <MoveUpRight size={17} aria-hidden="true" /></Link><Link className="final-cta-phone" href="/contact">Or view contact options <ArrowRight size={15} aria-hidden="true" /></Link></div></div></section>
  </>;
}
