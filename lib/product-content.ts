import { PRODUCT_URLS } from "@/lib/brand";

export type ProductGuide = {
  slug: "civilmargin" | "civil-at-hand";
  name: string;
  eyebrow: string;
  headline: string;
  summary: string;
  officialUrl: string;
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
    boundaries: "CivilMargin supports decision-making; it does not replace your accounting system, statutory books, qualified quantity-surveying review, contract interpretation, tax or legal advice. RA bill outputs are drafts for review. Confirm the current features, security notes, pricing and terms on the official website."
  },
  {
    slug: "civil-at-hand",
    name: "Civil At Hand",
    eyebrow: "LEARNING & PRACTICAL RESOURCES",
    headline: "Keep learning connected to real work.",
    summary: "Civil At Hand is the companion destination for people exploring civil engineering, architecture and the wider built environment. Use the official site to find currently available learning materials, practical tools and professional-development resources.",
    officialUrl: PRODUCT_URLS.civilAtHand,
    audience: "Students, graduates, site professionals, designers, BIM practitioners and people growing their careers",
    role: "Learning, practice and professional growth",
    benefits: [
      { title: "Build understanding step by step", body: "Use learning material to revisit concepts and connect technical principles with the questions that appear during study and practice." },
      { title: "Explore practical topics", body: "Find relevant content across civil engineering, construction and architecture as resources become available on the live platform." },
      { title: "Support professional development", body: "Use structured learning and career-oriented information to identify areas for further study and supervised practice." },
      { title: "Keep real-world context in view", body: "Pair educational content with approved drawings, codes, specifications, supervision and feedback from qualified professionals." }
    ],
    workflows: [
      { number: "01", title: "Choose the topic", body: "Start with a concept, task, study goal or area of professional development you want to understand better." },
      { number: "02", title: "Learn and practise", body: "Review the materials that are currently available and work through the examples within their stated scope." },
      { number: "03", title: "Apply with review", body: "Use new knowledge as a foundation for supervised practice. A learning resource is not project approval or professional certification." }
    ],
    goodFit: ["You are studying civil engineering or architecture", "You want to refresh a technical concept", "You work on site, in QA/QC, design or BIM", "You are building a structured professional-development plan"],
    boundaries: "The live Civil At Hand website is the source of truth for current availability. Learning resources support understanding and do not replace professional qualification, local regulations, project-specific instructions or competent supervision."
  }
];

export function getProductGuide(slug: string): ProductGuide | undefined {
  return PRODUCT_GUIDES.find((product) => product.slug === slug);
}
