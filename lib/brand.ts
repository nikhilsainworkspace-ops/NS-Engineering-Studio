export const BRAND = {
  workingName: "NS Studio",
  shortName: "NS",
  tagline: "Thoughtful work. Clear next steps.",
  description: "A flexible starting point for a professional services brand — with a clear process, useful guidance and a focus on the work that matters.",
  phone: "7703977002",
  logoPath: "/brand/ns-logo-original.png",
  defaultSiteUrl: "http://localhost:3000",
  nav: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "FAQ", href: "/faq" }
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
  heroEyebrow: "A more considered way forward",
  heroHeadline: "Good ideas deserve\na clearer path.",
  heroDescription: "Practical thinking, purposeful design and steady support to help turn your next idea into meaningful progress.",
  aboutHeadline: "Clear thinking. Thoughtful execution.",
  aboutBody: "NS Studio is a working brand concept for a professional services business. Use this space to explain what you do, who you help and the principles that guide your work. Keep the story specific, honest and useful to the people you serve.",
  phone: BRAND.phone,
  email: "",
  logoPath: BRAND.logoPath,
  siteTitle: `${BRAND.workingName} — Thoughtful work. Clear next steps.`,
  siteDescription: BRAND.description,
  instagramUrl: "",
  linkedinUrl: "",
  showStarterNotice: true
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
  { slug: "strategy-and-planning", title: "Strategy & planning", summary: "Turn a broad ambition into a more focused plan.", body: "Use this service page to explain your planning or advisory offer, what a client can expect, what they should prepare and how an engagement typically begins. Replace this illustrative copy with your real scope and deliverables.", icon: "Compass", published: true, sortOrder: 1, isStarter: true },
  { slug: "digital-presence", title: "Digital presence", summary: "Create a clearer, more useful experience for your audience.", body: "Describe the digital work you genuinely provide, such as website planning, content structure or digital communications. Add real deliverables, boundaries and examples before publishing this page.", icon: "PanelsTopLeft", published: true, sortOrder: 2, isStarter: true },
  { slug: "project-support", title: "Project support", summary: "Bring structure and momentum to work in progress.", body: "Explain the specific project or operational support available from your business. State the intended scope and working approach clearly; remove any service you do not offer.", icon: "Route", published: true, sortOrder: 3, isStarter: true }
];

export const STARTER_FAQS: FaqItem[] = [
  { slug: "getting-started", question: "How do we get started?", answer: "Use the contact form to describe what you are working on and the kind of help you are considering. The business owner should replace this starter answer with their actual intake process before launch.", published: true, sortOrder: 1, isStarter: true },
  { slug: "scope-and-timing", question: "Can the scope be tailored to a specific need?", answer: "That depends on the services and capacity the owner offers. Confirm the real engagement options, timing and any prerequisites here before publishing.", published: true, sortOrder: 2, isStarter: true },
  { slug: "what-to-include", question: "What should I include in an inquiry?", answer: "A short description of your goal, current situation and any important constraints is a useful start. Please do not include passwords, payment details or other highly sensitive information in the form.", published: true, sortOrder: 3, isStarter: true }
];
