import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, ArrowUpRight, BookOpen, Building2, Calculator, CheckCircle2,
  Compass, GraduationCap, HardHat, Ruler, ShieldCheck, TrendingUp,
  Users, BookOpenCheck, Clock3, Calculator as CalculatorIcon
} from "lucide-react";
import { getContent } from "@/lib/content";
import { getSiteSettings } from "@/lib/settings";
import { PRODUCT_URLS, type FaqItem, type ServiceItem } from "@/lib/brand";
import { GUIDE_ARTICLES } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Civil Engineering, Architecture & Construction Products",
  description: "Discover Civil At Hand for learning, practical tools and career growth, and CivilMargin for civil construction project cost and margin visibility.",
  alternates: { canonical: "/" }
};

const ecosystemPrinciples = [
  { icon: Compass, title: "Clear next steps", text: "Know where to start, what each product is for and where to go next." },
  { icon: ShieldCheck, title: "Practical, not hype", text: "Useful learning and reviewable project insights without unsupported promises." },
  { icon: Users, title: "Made for real work", text: "Support for learners, site teams, designers, quantity surveyors and contractors." }
];

const audiences = [
  { icon: GraduationCap, title: "Students & graduates", text: "Learn concepts, build practical understanding and explore career paths." },
  { icon: HardHat, title: "Site & QA/QC teams", text: "Find practical knowledge and resources connected to work on site." },
  { icon: Ruler, title: "Architecture & BIM", text: "Explore resources across design, documentation and the built environment." },
  { icon: Calculator, title: "Contractors & QS teams", text: "Review quantities, bills, materials, costs and possible margin movement." }
];

const products = [
  {
    name: "CivilMargin",
    slug: "civilmargin",
    detailHref: "/products/civilmargin",
    descriptor: "Project cost & margin visibility",
    summary: "Bring BOQs, measurement books, bills, supplier quotes, material issues, variations and cash flow into one reviewable picture.",
    audience: "For civil contractors and subcontractors",
    url: PRODUCT_URLS.civilMargin,
    action: "Explore CivilMargin",
    icon: TrendingUp,
    className: "product-card-margin",
    features: ["Budget vs committed vs actual cost", "Supplier and material variance checks", "Findings with calculations for human review"]
  },
  {
    name: "Civil At Hand",
    slug: "civil-at-hand",
    detailHref: "/products/civil-at-hand",
    descriptor: "Learn · Practise · Grow",
    summary: "A practical home for the civil engineering and architecture community, bringing learning resources, tools, mentorship and career information together.",
    audience: "For learners and built-environment professionals",
    url: PRODUCT_URLS.civilAtHand,
    action: "Explore Civil At Hand",
    icon: BookOpen,
    className: "product-card-learning",
    features: ["Courses and study resources", "Practical examples and engineering tools", "Career guidance and professional growth"]
  }
];

export default async function HomePage() {
  const [settings, services, faqs] = await Promise.all([
    getSiteSettings(),
    getContent<ServiceItem>("services"),
    getContent<FaqItem>("faqs")
  ]);
  const [firstLine, ...restLines] = settings.heroHeadline.split("\n");
  const secondLine = restLines.join(" ");

  return <>
    <section className="hero hero-premium ecosystem-hero">
      <div className="hero-grid shell">
        <div className="hero-copy">
          <span className="eyebrow">{settings.heroEyebrow}</span>
          <h1>{firstLine}{secondLine ? <><br /><em>{secondLine}</em></> : null}</h1>
          <p className="hero-description">{settings.heroDescription}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/products">Explore our products <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link className="button button-outline" href="/contact">Ask about your needs <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="hero-meta" aria-label="Our focus">
            <span><CheckCircle2 size={15} aria-hidden="true" /> Learning & practical tools</span>
            <span><CheckCircle2 size={15} aria-hidden="true" /> Project cost visibility</span>
            <span><CheckCircle2 size={15} aria-hidden="true" /> Built-world focus</span>
          </div>
        </div>
        <div className="ecosystem-visual" aria-label="Two connected products for civil engineering, architecture and construction">
          <div className="ecosystem-visual-grid" aria-hidden="true" />
          <div className="ecosystem-visual-heading"><span className="ecosystem-symbol"><Building2 size={19} /></span><span><strong>THE BUILT-WORLD TOOLKIT</strong><small>ONE HOME · TWO PRODUCTS</small></span></div>
          {products.map((product, index) => {
            const Icon = product.icon;
            return <a key={product.name} className={`ecosystem-mini-product ${product.className}`} href={product.url} target="_blank" rel="noopener noreferrer">
              <span className="ecosystem-mini-index">0{index + 1}</span><span className="ecosystem-mini-icon"><Icon size={22} aria-hidden="true" /></span>
              <span className="ecosystem-mini-copy"><strong>{product.name}</strong><small>{product.descriptor}</small></span><ArrowUpRight className="ecosystem-mini-arrow" size={17} aria-hidden="true" />
            </a>;
          })}
          <div className="ecosystem-visual-foot"><span><span className="ecosystem-status-dot" /> Practical tools for real-world work</span><span>NS / BUILT ENVIRONMENT</span></div>
        </div>
      </div>
    </section>

    <section className="ecosystem-products section" id="products">
      <div className="shell">
        <div className="section-heading">
          <div><span className="eyebrow">OUR PRODUCTS</span><h2>Two clear paths.<br /><span>One built-world focus.</span></h2></div>
          <p>Pick the product that fits the work in front of you. Each has its own purpose, features and official website.</p>
        </div>
        <div className="ecosystem-product-grid">
          {products.map((product, index) => {
            const Icon = product.icon;
            return <article key={product.name} className={`ecosystem-product-card ${product.className}`}>
              <div className="ecosystem-product-top"><span className="ecosystem-product-icon"><Icon size={25} aria-hidden="true" /></span><span className="ecosystem-product-number">PRODUCT 0{index + 1}</span></div>
              <p className="ecosystem-product-audience">{product.audience}</p>
              <h3>{product.name}</h3>
              <h4>{product.descriptor}</h4>
              <p className="ecosystem-product-summary">{product.summary}</p>
              <ul>{product.features.map((feature) => <li key={feature}><CheckCircle2 size={16} aria-hidden="true" />{feature}</li>)}</ul>
              <div className="ecosystem-product-actions"><Link className="button button-outline ecosystem-product-detail-action" href={product.detailHref}>See how it fits <ArrowRight size={15} aria-hidden="true" /></Link><a className="button button-primary ecosystem-product-action" href={product.url} target="_blank" rel="noopener noreferrer">{product.action} <ArrowUpRight size={17} aria-hidden="true" /></a></div>
              <span className="ecosystem-external-note">Official product links open in a new tab</span>
            </article>;
          })}
        </div>
        <p className="ecosystem-honesty-note">Features can change over time. See each official product site for current availability, plans and terms.</p>
      </div>
    </section>

    <section className="section section-soft ecosystem-audience-section">
      <div className="shell">
        <div className="section-heading"><div><span className="eyebrow">WHO IT IS FOR</span><h2>Useful at different<br /><span>stages of the journey.</span></h2></div><p>From the first civil engineering course to managing construction cost records, the right resource depends on your role and current question.</p></div>
        <div className="ecosystem-audience-grid">{audiences.map(({ icon: Icon, title, text }, index) => <article className="ecosystem-audience-card" key={title}><span className="ecosystem-audience-count">0{index + 1}</span><span className="ecosystem-audience-icon"><Icon size={22} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div>
    </section>

    <section className="section ecosystem-why-section">
      <div className="shell ecosystem-why-layout">
        <div className="ecosystem-why-intro"><span className="eyebrow">WHY THIS ECOSYSTEM</span><h2>Make complex work<br /><em>easier to navigate.</em></h2><p>Engineering has technical depth. The digital tools around it should help people understand a topic, review the information and make the next step clearer.</p><Link className="text-link" href="/about">Learn about the studio <ArrowRight size={16} aria-hidden="true" /></Link></div>
        <div className="ecosystem-principles">{ecosystemPrinciples.map(({ icon: Icon, title, text }, index) => <article className="ecosystem-principle" key={title}><span className="ecosystem-principle-number">0{index + 1}</span><span className="ecosystem-principle-icon"><Icon size={21} aria-hidden="true" /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </div>
    </section>

    <section className="section section-soft capability-section" id="capabilities">
      <div className="shell">
        <div className="section-heading"><div><span className="eyebrow">EXPLORE BY NEED</span><h2>Start with what<br /><span>you are working on.</span></h2></div><p>Browse the core areas supported across our two products. Visit the official product sites for detailed features and current availability.</p></div>
        {services.length ? <div className="service-grid">{services.slice(0, 6).map((service) => <article className="service-card ecosystem-service-card" key={service.slug}><div className="service-card-top"><span className="service-card-index">{String(service.sortOrder).padStart(2, "0")}</span></div><h3>{service.title}</h3><p>{service.summary}</p><Link className="text-link" href={`/services/${service.slug}`}>Understand this area <ArrowRight size={15} aria-hidden="true" /></Link></article>)}</div> : <div className="empty-state">Capabilities are being updated. <Link className="text-link" href="/products">Explore the products <ArrowRight size={15} /></Link></div>}
        <div className="section-actions"><Link className="text-link" href="/services">View all focus areas <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </div>
    </section>

    <section className="section section-soft practical-hub-section">
      <div className="shell">
        <div className="section-heading"><div><span className="eyebrow">TOOLS FOR THE NEXT STEP</span><h2>More than a landing page.<br /><span>A useful place to begin.</span></h2></div><p>Browse a guide, run a simple planning calculation, or find the pathway that matches your work. Each feature explains its purpose and limitations.</p></div>
        <div className="practical-hub-grid">
          <Link className="practical-hub-card hub-card-calculator" href="/tools"><span className="practical-hub-icon"><CalculatorIcon size={23} aria-hidden="true" /></span><span className="practical-hub-kicker">INTERACTIVE TOOLS</span><h3>Engineering calculators</h3><p>Explore concrete volume, paint coverage, reinforcement weight and project margin scenarios with visible formulas.</p><span className="text-link">Open the toolbench <ArrowRight size={15} /></span></Link>
          <Link className="practical-hub-card hub-card-guides" href="/resources"><span className="practical-hub-icon"><BookOpenCheck size={23} aria-hidden="true" /></span><span className="practical-hub-kicker">KNOWLEDGE LIBRARY</span><h3>Guides & checklists</h3><p>Read practical explainers covering BOQ reviews, drawing revisions, BIM coordination and site quality.</p><span className="text-link">Explore the guides <ArrowRight size={15} /></span></Link>
          <Link className="practical-hub-card hub-card-pathways" href="/industries"><span className="practical-hub-icon"><Compass size={23} aria-hidden="true" /></span><span className="practical-hub-kicker">CHOOSE YOUR PATH</span><h3>Find your workstream</h3><p>See how the products map to contractor, QS, architecture, BIM, site and early-career needs.</p><span className="text-link">Find your pathway <ArrowRight size={15} /></span></Link>
        </div>
      </div>
    </section>

    <section className="section featured-guides-section">
      <div className="shell">
        <div className="section-heading"><div><span className="eyebrow">FROM THE RESOURCE LIBRARY</span><h2>Useful ideas, clearly<br /><span>explained.</span></h2></div><p>Start with short, practical reading. These guides are educational references; project-specific work must follow approved documents and professional review.</p></div>
        <div className="featured-guides-grid">{GUIDE_ARTICLES.slice(0, 3).map((guide, index) => <article className="featured-guide-card" key={guide.slug}><div className="featured-guide-top"><span>{guide.category}</span><span>0{index + 1}</span></div><h3><Link href={`/resources/${guide.slug}`}>{guide.title}</Link></h3><p>{guide.summary}</p><div className="featured-guide-bottom"><span><Clock3 size={14} aria-hidden="true" />{guide.readTime}</span><Link className="text-link" href={`/resources/${guide.slug}`}>Read guide <ArrowUpRight size={14} /></Link></div></article>)}</div>
        <div className="section-actions"><Link className="text-link" href="/resources">Browse all {GUIDE_ARTICLES.length} guides <ArrowRight size={15} aria-hidden="true" /></Link></div>
      </div>
    </section>

    <section className="section faq-section">
      <div className="shell faq-preview"><div className="faq-intro"><span className="eyebrow">GOOD TO KNOW</span><h2 className="faq-preview-title">A few questions,<br /><em>made clearer.</em></h2><p>Compare the products and understand where their roles differ.</p><Link className="text-link" href="/faq">Visit all FAQs <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="accordion-list">{faqs.slice(0, 4).map((faq) => <details className="accordion-item" key={faq.slug}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}{faqs.length === 0 ? <p className="empty-state">FAQs will appear here when published.</p> : null}</div></div>
    </section>

    <section className="final-cta-section"><div className="shell final-cta-panel ecosystem-final-cta"><div className="final-cta-mark"><Image src={settings.logoPath} alt="" width={72} height={72} /></div><div className="final-cta-copy"><span className="eyebrow">NOT SURE WHERE TO BEGIN?</span><h2>Find the right<br /><em>next step.</em></h2><p>Tell us what you are trying to do and we will direct your question to the most relevant product or contact pathway.</p></div><div className="final-cta-actions"><Link className="button button-primary" href="/products">Compare the products <ArrowRight size={17} aria-hidden="true" /></Link><Link className="final-cta-phone" href="/tools">Try an engineering tool <ArrowUpRight size={15} aria-hidden="true" /></Link><Link className="final-cta-phone" href="/contact">Contact the team <ArrowUpRight size={15} aria-hidden="true" /></Link></div></div></section>
  </>;
}
