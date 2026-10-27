import { PRODUCT_URLS } from "@/lib/brand";

export type ProductGuide = {
  slug: "civilmargin" | "engineering-workspace";
  name: string;
  eyebrow: string;
  headline: string;
  summary: string;
  officialUrl: string;
  launchVerified: boolean;
  audience: string;
  role: string;
  benefits: { title: string; body: string }[];
  workflows: { number: string; title: string; body: string }[];
  goodFit: string[];
  boundaries: string;
};

export const PRODUCT_GUIDES: ProductGuide[] = [
  {
    slug: "civilmargin",
    name: "CivilMargin",
    eyebrow: "CONSTRUCTION COST & MARGIN VISIBILITY",
    headline: "See the project numbers behind the decision.",
    summary: "CivilMargin is a construction finance-control workspace for civil contractors. It connects BOQs, measurements, supplier bills, variations, materials and cash-flow assumptions so teams can review cost gaps and potential margin movement with supporting records.",
    officialUrl: PRODUCT_URLS.civilMargin,
    launchVerified: false,
    audience: "Civil contractors, subcontractors, owners, project managers, QS and accounts teams",
    role: "Project cost control and review",
    benefits: [
      { title: "Compare planned and actual costs", body: "Keep budget, committed cost, actual expenditure and forecast in distinct categories so the basis of a number remains visible." },
      { title: "Review quantities and bills", body: "Bring BOQ quantities, measurement records, bills and variations into a review workflow, with prompts that need a person to check the evidence." },
      { title: "Track suppliers and materials", body: "Compare like-for-like supplier quotes and review material issues against the expected quantity and allowance." },
      { title: "Plan cash scenarios", body: "Explore assumptions around receivables, payables and future cost rather than treating a forecast as a guarantee." }
    ],
    workflows: [
      { number: "01", title: "Bring the project records", body: "Start with the BOQ or cost sheet and bring in the available project records using the formats and workflow described on the official product site." },
      { number: "02", title: "Review the findings", body: "Check each prompt against its calculations and source records. A flagged difference is a review prompt, not a conclusion that someone is at fault." },
      { number: "03", title: "Decide and document", body: "Record the explanation, correction or approval according to your own contract and governance requirements." }
    ],
    goodFit: ["You manage one or more civil construction projects", "You need a clearer view of cost, commitments and potential margin changes", "Your team reviews BOQs, bills, measurements, materials or variations", "You want review prompts tied to records rather than unexplained totals"],
    boundaries: "CivilMargin supports decision-making; it does not replace your accounting system, statutory books, qualified quantity-surveying review, contract interpretation, tax or legal advice. RA bill outputs are drafts for review. The external destination supplied with the source project was not verified in this build. Confirm the current launch URL, features, security notes, pricing and terms before relying on or promoting the product."
  },
  {
    slug: "engineering-workspace",
    name: "Engineering Workspace",
    eyebrow: "CONSTRUCTION OPERATIONS WORKSPACE",
    headline: "Keep construction workflows connected.",
    summary: "The NS Engineering Studio workspace brings construction-business operations into one protected place, including contacts, projects, tasks, estimates, materials, procurement, workforce, finance, documents, tenders, reports and public forms.",
    officialUrl: PRODUCT_URLS.civilAtHand,
    launchVerified: true,
    audience: "Civil contractors, project teams, estimators, operations and construction administrators",
    role: "Construction operations and records",
    benefits: [
      { title: "Keep records organised", body: "Manage business contacts, project information and follow-ups in one workspace." },
      { title: "Track operational workflows", body: "Use tasks, estimates, rates, procurement, workforce and finance features already present in the integrated application." },
      { title: "Create useful reports", body: "Use reporting and export tools to review current records and prepare follow-up actions." },
      { title: "Keep controls in place", body: "Protected admin APIs, session checks and configured database access are required for private workflows." }
    ],
    workflows: [
      { number: "01", title: "Choose the topic", body: "Start with the contact, construction project, estimate or operational workflow that needs a structured record." },
      { number: "02", title: "Work through the record", body: "Use contacts, projects, estimates, tasks and other modules your account is authorised to access." },
      { number: "03", title: "Review and follow up", body: "Use reports and exports as operational aids, and verify important outputs before contractual, accounting or construction decisions." }
    ],
    goodFit: ["You coordinate construction projects and site teams", "You need a clearer estimate, procurement or workforce workflow", "You manage operational records or follow-ups", "You need structured reports and exports"],
    boundaries: "This workspace does not replace accounting, statutory records, qualified engineering review, local regulations or contract requirements. Database, email and other provider-backed features must be configured before use."
  }
];

export function getProductGuide(slug: string): ProductGuide | undefined {
  return PRODUCT_GUIDES.find((product) => product.slug === slug);
}
