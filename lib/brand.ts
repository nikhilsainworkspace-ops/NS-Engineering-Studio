export const BRAND = {
  workingName: "NS Engineering Studio",
  shortName: "NS",
  tagline: "Digital experiences. Engineered with intent.",
  description: "Product thinking, considered design and dependable engineering for digital experiences built around real needs.",
  phone: "7703977002",
  logoPath: "/brand/ns-logo-original.png",
  defaultSiteUrl: "http://localhost:3000",
  nav: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Capabilities", href: "/services" },
    { label: "Approach", href: "/process" },
    { label: "Studio", href: "/about" },
    { label: "FAQs", href: "/faq" }
  ] as const
} as const;

export type SiteSettings = {
  brandName: string;
  tagline: string;
  description: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroDescription: string;
  aboutHeadline: string;
  aboutBody: string;
  phone: string;
  email: string;
  logoPath: string;
  siteTitle: string;
  siteDescription: string;
  instagramUrl: string;
  linkedinUrl: string;
  showStarterNotice: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brandName: BRAND.workingName,
  tagline: BRAND.tagline,
  description: BRAND.description,
  heroEyebrow: "Strategy · Design · Engineering",
  heroHeadline: "Digital experiences,\nengineered to move.",
  heroDescription: "From first principles to final details, bring product thinking, considered design and dependable engineering together to make your next digital move clearer.",
  aboutHeadline: "Complex work, made clearer. Digital products, built with intent.",
  aboutBody: "NS Engineering Studio connects product thinking, design and engineering to help teams plan, build and improve digital experiences. The work begins with understanding the real problem, the people affected and the practical constraints around it. Scope, priorities and next steps are made clear before delivery begins.",
  phone: BRAND.phone,
  email: "",
  logoPath: BRAND.logoPath,
  siteTitle: `${BRAND.workingName} — ${BRAND.tagline}`,
  siteDescription: BRAND.description,
  instagramUrl: "",
  linkedinUrl: "",
  showStarterNotice: false
};

export type ServiceItem = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  icon: string;
  published: boolean;
  sortOrder: number;
  isStarter?: boolean;
};

export type FaqItem = {
  slug: string;
  question: string;
  answer: string;
  published: boolean;
  sortOrder: number;
  isStarter?: boolean;
};

// Replace these illustrative offerings before launch. They contain no customer evidence or performance claims.
export const STARTER_SERVICES: ServiceItem[] = [
  { slug: "strategy-and-planning", title: "Product strategy & discovery", summary: "Turn a broad opportunity into a focused, testable plan.", body: "Clarify the users, problem, business context and constraints before committing to a build. Discovery work may include stakeholder conversations, journey mapping, requirements, prioritisation and a delivery roadmap. The exact deliverables and scope are agreed in the project brief.", icon: "Compass", published: true, sortOrder: 1, isStarter: true },
  { slug: "digital-presence", title: "Web engineering", summary: "Build responsive, accessible digital experiences for real people.", body: "Plan and implement modern websites and web applications with attention to responsive layouts, accessibility, performance, maintainability and search fundamentals. Confirm the required integrations, content, hosting and release requirements for each engagement before work begins.", icon: "PanelsTopLeft", published: true, sortOrder: 2, isStarter: true },
  { slug: "product-design-systems", title: "Product design & design systems", summary: "Make complex journeys feel clear and consistent.", body: "Shape information architecture, core user journeys, interaction patterns and reusable interface foundations. Deliverables can include user flows, interface concepts, component specifications and implementation guidance, based on the needs and constraints of the project.", icon: "Layers", published: true, sortOrder: 3, isStarter: true },
  { slug: "integrations-automation", title: "Integrations & automation", summary: "Connect tools and reduce repetitive operational work.", body: "Map recurring tasks and system boundaries, then assess practical ways to connect services, automate handoffs and reduce manual duplication. Security, access permissions, reliability, error handling and human review are considered as part of the proposed solution.", icon: "Route", published: true, sortOrder: 4, isStarter: true },
  { slug: "technical-architecture", title: "Technical architecture", summary: "Make informed choices before complexity becomes expensive.", body: "Review application structure, data flows, APIs, deployment needs and operational constraints. Architecture guidance should fit the current stage of the product and the team's capacity; avoid unnecessary complexity and document trade-offs clearly.", icon: "Lightbulb", published: true, sortOrder: 5, isStarter: true },
  { slug: "project-support", title: "Ongoing improvement", summary: "Keep the experience useful as needs change.", body: "Prioritise incremental improvements, address defects, refine key journeys and plan maintenance in manageable steps. Support arrangements, service levels, response times and availability must be explicitly agreed for each engagement rather than assumed.", icon: "CircleHelp", published: true, sortOrder: 6, isStarter: true }
];

export const STARTER_FAQS: FaqItem[] = [
  { slug: "getting-started", question: "What should I bring to the first conversation?", answer: "A short description of the goal, who the work is for, what exists today and any important constraints is enough to begin. A complete brief is helpful but not required. Please do not send passwords, payment details or other sensitive information through the public form.", published: true, sortOrder: 1, isStarter: true },
  { slug: "scope-and-timing", question: "Can you help shape an idea before it is fully defined?", answer: "The discovery and planning conversation can help clarify the problem, explore options and identify open questions. The right next step depends on the project's needs and the services available; the scope is confirmed directly before any work is agreed.", published: true, sortOrder: 2, isStarter: true },
  { slug: "what-to-include", question: "How are scope, timing and estimates decided?", answer: "They depend on requirements, dependencies, access to decision-makers and the quality of existing materials. After an initial discussion, the next step is to clarify the deliverables, assumptions and uncertainties before committing to a schedule or estimate.", published: true, sortOrder: 3, isStarter: true },
  { slug: "existing-platform", question: "Can you work with an existing website or platform?", answer: "Potentially. An initial review can establish the current architecture, ownership, technical constraints and priorities. Access and implementation work should only begin after responsibilities and permissions have been confirmed.", published: true, sortOrder: 4, isStarter: true },
  { slug: "security-access", question: "How should I share credentials or private data?", answer: "Do not include credentials, private customer data, payment information or production secrets in the contact form or ordinary email. Access should be arranged through an appropriate secure channel after the scope and responsibilities are agreed.", published: true, sortOrder: 5, isStarter: true }
];
