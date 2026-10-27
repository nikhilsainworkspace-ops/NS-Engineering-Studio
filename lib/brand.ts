export const PRODUCT_URLS = {
  civilMargin: "https://civilmarzin.civilathand.in/",
  civilAtHand: "/workspace"
} as const;

export const BRAND = {
  workingName: "NS Engineering Studio",
  shortName: "NS",
  tagline: "Engineering services and digital tools for the built world.",
  description: "NS Engineering Studio brings engineering services, project workflows and practical software together for civil engineering, architecture and construction.",
  phone: "7703977002",
  logoPath: "/brand/ns-monogram.svg",
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
  serviceCoverage: string;
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
  heroHeadline: "Plan with clarity.\nBuild with confidence.",
  heroDescription: "Engineering services and digital workflows for civil engineering, architecture and construction. Explore practical calculators, project resources and the NS Engineering Studio construction workspace.",
  aboutHeadline: "Useful tools for the people who shape the built world.",
  aboutBody: "NS Engineering Studio brings together civil engineering and architectural service enquiries, practical engineering tools, and a construction business workspace. Service suitability depends on project scope, location, professional qualifications and applicable regulations. The platform is designed to keep workflows clear and project information organised.",
  serviceCoverage: "NS Engineering Studio accepts enquiries from across India. This does not mean the company has an office or guaranteed delivery capacity in every state or city. Before an engagement is confirmed, service availability, professional qualifications, deliverables, schedule and applicable local requirements must be checked for the specific project location.",
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
  { slug: "civil-engineering-consultancy", title: "Civil engineering consultancy", summary: "Planning, quantity review and technical coordination for construction work.", body: "Discuss project planning, quantity calculations, technical drafting, construction documentation and coordination needs. Deliverables depend on project scope, location, available inputs, professional qualifications and applicable requirements. No project-specific design is approved through this enquiry form.", icon: "Compass", published: true, sortOrder: 1, isStarter: true },
  { slug: "architectural-planning", title: "Architectural planning & design", summary: "Concept planning, residential and commercial layouts, elevations and visualisation.", body: "Enquire about architectural planning, floor plans, elevations, interior planning and 3D visualisation. Final scope, site constraints, local approvals and qualified professional responsibilities must be confirmed for each project.", icon: "Layers", published: true, sortOrder: 2, isStarter: true },
  { slug: "estimation-boq", title: "Estimation & BOQ", summary: "Quantity take-offs, bill of quantities and material estimation support.", body: "Request quantity take-offs, BOQ preparation or review, material estimation and estimation documentation based on the drawings, specifications and assumptions you provide. All quantities and rates require project-specific checking before procurement or contractual use.", icon: "PanelsTopLeft", published: true, sortOrder: 3, isStarter: true },
  { slug: "construction-planning", title: "Construction & project planning", summary: "Practical planning and coordination support for project execution.", body: "Discuss construction planning, schedule coordination, documentation, progress records and project workflow requirements. Site-specific decisions must follow approved drawings, contracts, safety obligations and applicable local rules.", icon: "Route", published: true, sortOrder: 4, isStarter: true },
  { slug: "manpower-supply", title: "Construction & civil manpower supply", summary: "Enquiries for suitable skilled and unskilled workforce categories across India.", body: "Submit manpower requirements including role categories, quantities, work location and approximate duration. Availability depends on location, worker category, applicable labour requirements, project conditions and confirmation by the NS Engineering Studio team. A submitted enquiry is not a supply guarantee.", icon: "Lightbulb", published: true, sortOrder: 5, isStarter: true },
  { slug: "engineering-software", title: "Engineering software & construction workflows", summary: "Practical calculators, project resources and a construction operations workspace.", body: "Explore engineering calculators, technical reading and the integrated construction workspace for contacts, projects, estimates, procurement, workforce, finance and documentation. Features requiring MongoDB or other configuration are unavailable until the deployment is configured.", icon: "CircleHelp", published: true, sortOrder: 6, isStarter: true }
];

export const STARTER_FAQS: FaqItem[] = [
  { slug: "where-services-available", question: "Where are services available?", answer: "NS Engineering Studio accepts enquiries from across India. Actual availability depends on project location, scope, professional qualifications, resource availability and applicable regulations. An enquiry does not confirm an office or delivery capability in every location.", published: true, sortOrder: 1, isStarter: true },
  { slug: "what-can-i-request", question: "What engineering services can I enquire about?", answer: "You can enquire about civil engineering consultancy, architectural planning, residential and commercial layouts, quantity take-offs, BOQs, material estimation, project planning, construction documentation, drafting and visualisation. The team must confirm the actual deliverables and any required qualified review before engagement.", published: true, sortOrder: 2, isStarter: true },
  { slug: "manpower-availability", question: "Can I request construction manpower?", answer: "Yes. Submit the skill category, quantity, work location and duration. Availability is subject to confirmation, site conditions, worker suitability and applicable employment and labour requirements.", published: true, sortOrder: 3, isStarter: true },
  { slug: "engineering-workspace", question: "What is included in the Engineering Workspace?", answer: "The workspace contains existing construction business workflows such as contacts, projects, tasks, estimates, rates, materials, procurement, workforce, finance, documents, tenders, reports, public pages and custom forms. It requires a correctly configured database and administrator account.", published: true, sortOrder: 4, isStarter: true },
  { slug: "professional-approval", question: "Do online tools replace professional review or statutory approval?", answer: "No. Calculators and resources support planning and understanding, not professional certification, design approval, structural verification, permit approval, contract advice or compliance determinations. Project work must be checked by appropriately qualified professionals against approved project documents and applicable rules.", published: true, sortOrder: 5, isStarter: true }
];
