export const PRODUCT_URLS = {
  civilMargin: "https://civilmarzin.civilathand.in/",
  civilAtHand: "https://civilathand.in/"
} as const;

export const BRAND = {
  workingName: "NS Engineering Studio",
  shortName: "NS",
  tagline: "Practical tools for the built world.",
  description: "A connected home for civil engineering, architecture and construction — from learning and practical tools to clearer project-cost decisions.",
  phone: "7703977002",
  logoPath: "/brand/ns-logo-original.png",
  defaultSiteUrl: "http://localhost:3000",
  nav: [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Capabilities", href: "/services" },
    { label: "How it works", href: "/process" },
    { label: "About", href: "/about" }
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
  heroEyebrow: "Civil engineering · Architecture · Construction",
  heroHeadline: "Build your knowledge.\nSee the whole project.",
  heroDescription: "Two practical products for the built world: Civil At Hand helps people learn, practise and grow; CivilMargin helps civil contractors understand project costs and margin with more clarity.",
  aboutHeadline: "Useful tools for the people who shape the built world.",
  aboutBody: "NS Engineering Studio brings together practical digital products for civil engineering, architecture and construction. Civil At Hand is designed to support learning, tools and career growth across the built-environment community. CivilMargin focuses on cost and margin visibility for civil contractors and subcontractors. Each product has a distinct role, with clear explanations and practical next steps.",
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

// Starter content explains the ecosystem honestly; product features and subscription plans live on their own official sites.
export const STARTER_SERVICES: ServiceItem[] = [
  { slug: "civil-engineering-learning", title: "Civil engineering learning & practice", summary: "Build understanding with structured learning and practical resources.", body: "Civil At Hand is designed for people across the civil engineering and architecture journey, from students and fresh graduates to working professionals. Explore learning resources, practical examples, tools, mentorship and career information on the product website. Availability of individual resources can change over time.", icon: "Compass", published: true, sortOrder: 1, isStarter: true },
  { slug: "architecture-and-bim", title: "Architecture & BIM knowledge", summary: "Explore resources for design, documentation and the built environment.", body: "Civil At Hand brings civil engineering and architecture learning together in one place, including resources for design and BIM professionals. Visit the live product for current materials and features. This website is an overview and does not replace project-specific professional advice.", icon: "Layers", published: true, sortOrder: 2, isStarter: true },
  { slug: "quantity-surveying-and-boq", title: "BOQ & quantity-surveying workflows", summary: "Bring quantities, measurements and cost information into clearer view.", body: "CivilMargin is built around comparing BOQs, measurement records, bills, supplier quotes, material issues, variations and cash flow. The product shows checks with supporting calculations for human review. Findings are review prompts, not automatic accusations or accounting advice.", icon: "PanelsTopLeft", published: true, sortOrder: 3, isStarter: true },
  { slug: "project-cost-visibility", title: "Project cost & margin visibility", summary: "Review budget, committed cost, actual cost and potential margin movement.", body: "CivilMargin supports civil contractors and subcontractors by comparing project records and surfacing items that may need attention. Its current capabilities, trial and plans are described on its official product website. It works alongside existing processes and does not replace accounting or project-management systems.", icon: "Route", published: true, sortOrder: 4, isStarter: true },
  { slug: "construction-site-workflows", title: "Construction knowledge & site workflows", summary: "Connect practical knowledge with real construction work.", body: "Civil At Hand is the learning and professional-development destination for the broader built-environment community. Explore courses, study resources, practical tools, career information and other materials that are currently available on its official site.", icon: "Lightbulb", published: true, sortOrder: 5, isStarter: true },
  { slug: "careers-and-professional-growth", title: "Careers & professional growth", summary: "Find resources for the next stage of your civil or architecture career.", body: "Civil At Hand is intended to support students, graduates, site professionals, QA/QC teams, quantity surveyors, design and BIM professionals, and people exploring their next career step. Current jobs, mentorship and learning options are maintained on the product website.", icon: "CircleHelp", published: true, sortOrder: 6, isStarter: true }
];

export const STARTER_FAQS: FaqItem[] = [
  { slug: "which-product", question: "Which product should I use?", answer: "Choose Civil At Hand if you are looking for civil engineering or architecture learning, practical tools, mentorship or career resources. Choose CivilMargin if you work with civil construction project records and want to review BOQs, bills, materials, costs and margin. The Products page links directly to both official sites.", published: true, sortOrder: 1, isStarter: true },
  { slug: "civil-at-hand-audience", question: "Who is Civil At Hand for?", answer: "Civil At Hand is intended for civil engineering and architecture students, graduates, site and QA/QC professionals, design and BIM professionals, quantity surveyors, construction professionals and people exploring a career in the built environment.", published: true, sortOrder: 2, isStarter: true },
  { slug: "civilmargin-purpose", question: "What does CivilMargin help review?", answer: "CivilMargin compares project records such as BOQs, measurement books, bills, supplier quotes, material issues, variations and cash flow, and surfaces items for a person to review. A finding is a prompt to check the records; it is not a conclusion of error or misconduct.", published: true, sortOrder: 3, isStarter: true },
  { slug: "existing-tools", question: "Do the products replace my current tools?", answer: "CivilMargin is described as working alongside existing accounting and spreadsheet workflows rather than replacing them. Civil At Hand is a learning and professional-resource platform. Check each product's official site for current integrations, supported file formats and feature availability.", published: true, sortOrder: 4, isStarter: true },
  { slug: "professional-advice", question: "Can I rely on these products as project approval or professional certification?", answer: "No. Educational resources and product findings are designed to support understanding and review, not to replace project-specific engineering judgement, contract checks, accounting advice, statutory approvals or professional certification. Have qualified people review project decisions before acting on them.", published: true, sortOrder: 5, isStarter: true }
];
