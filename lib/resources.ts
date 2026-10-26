export type GuideSection = {
  heading: string;
  paragraph: string;
  bullets?: string[];
};

export type GuideArticle = {
  slug: string;
  title: string;
  category: "Site practice" | "Estimating" | "Design & BIM" | "Project controls" | "Career growth";
  readTime: string;
  summary: string;
  intro: string;
  sections: GuideSection[];
  takeaways: string[];
};

// Editorial starter guides. They are educational references, not project-specific engineering advice.
export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: "start-with-a-clear-boq",
    title: "A clearer way to start a BOQ review",
    category: "Estimating",
    readTime: "6 min read",
    summary: "A practical sequence for reviewing scope, units, quantities, rates and assumptions before relying on an estimate.",
    intro: "A useful BOQ review is more than checking arithmetic. It connects the stated scope to measurable quantities, consistent units, the basis of rates and the assumptions that can change the final cost.",
    sections: [
      { heading: "Confirm what is included", paragraph: "Begin with the latest drawings, specifications, scope notes and exclusions. A quantity that is arithmetically correct can still be wrong if it was taken from a superseded revision or a different scope." },
      { heading: "Check units and measurement basis", paragraph: "Look for inconsistent units, repeated descriptions, missing items and quantities that are difficult to trace back to a measurement sheet.", bullets: ["Keep item descriptions and units consistent across sheets.", "Write down the drawing or measurement source used.", "Separate assumptions from confirmed quantities."] },
      { heading: "Review the rate build-up", paragraph: "Separate material, labour, plant, transport, wastage, overhead and tax assumptions where relevant. Compare like-for-like specifications rather than selecting a rate because the number looks lower." },
      { heading: "Keep a review trail", paragraph: "Record the issue, the evidence checked, the proposed correction and who needs to approve it. The purpose of a review note is to make the next decision easier, not to assign blame." }
    ],
    takeaways: ["Use the latest approved inputs.", "Trace quantities back to a source.", "Make assumptions and approvals visible."]
  },
  {
    slug: "concrete-volume-basics",
    title: "Concrete volume: dimensions, units and allowances",
    category: "Site practice",
    readTime: "5 min read",
    summary: "Understand the basic volume calculation and which real-world factors a simple calculator cannot decide for you.",
    intro: "For a simple rectangular element, volume is length × width × depth. The arithmetic is straightforward; the challenge is making sure the dimensions, units and scope reflect the actual element being measured.",
    sections: [
      { heading: "Convert to one consistent unit", paragraph: "If dimensions are entered in metres, the result is cubic metres. Convert millimetres or feet before multiplying, and check that every dimension uses the same unit." },
      { heading: "Measure the shape you actually have", paragraph: "Irregular shapes, slopes, openings, steps and construction joints may need to be split into smaller measurable shapes. Avoid applying a rectangular formula to geometry it does not represent." },
      { heading: "Separate net quantity from procurement allowance", paragraph: "A wastage or ordering allowance can be useful for planning, but it is a separate assumption from the net geometric volume. State the allowance used and confirm it against project practice and supplier constraints." },
      { heading: "Check before ordering or placing", paragraph: "Have the site engineer or responsible professional confirm drawings, levels, formwork dimensions, mix requirements and order quantities before work proceeds." }
    ],
    takeaways: ["Keep units consistent.", "Split irregular geometry into measurable parts.", "Treat allowances as assumptions, not exact requirements."]
  },
  {
    slug: "reading-drawings-revisions",
    title: "A reliable routine for reading drawing revisions",
    category: "Design & BIM",
    readTime: "7 min read",
    summary: "A repeatable check for revision numbers, dimensions, notes, coordination issues and site distribution.",
    intro: "A drawing set only helps when people are using the same current information. A short revision routine can prevent old dimensions and uncoordinated details from quietly entering site work.",
    sections: [
      { heading: "Start with the title block", paragraph: "Check the drawing number, title, discipline, revision, issue date and status. Do not rely on a filename alone to decide whether a drawing is current." },
      { heading: "Review the change, not only the cloud", paragraph: "Compare the current revision with the previously issued version. Check dimensions, levels, notes, schedules, material callouts and referenced details—not just the visually obvious edits." },
      { heading: "Coordinate interfaces", paragraph: "Pay attention where architecture, structure and services meet. Record clashes or missing information with a drawing reference and a clear question for the responsible designer." },
      { heading: "Distribute and retire old copies", paragraph: "Use the agreed document-control process to communicate the new issue, withdraw superseded copies and confirm that site teams know which revision to follow." }
    ],
    takeaways: ["Check status and revision in the title block.", "Compare referenced details and schedules too.", "Close the loop on distribution."]
  },
  {
    slug: "site-quality-checklist",
    title: "Building a useful site quality checklist",
    category: "Site practice",
    readTime: "6 min read",
    summary: "Create checklists that connect a work stage to evidence, responsibility, acceptance criteria and closure.",
    intro: "A checklist works best when it guides a real inspection. A long list of generic boxes may record activity, but it can miss the evidence and responsibility needed to close an issue properly.",
    sections: [
      { heading: "Define the hold point", paragraph: "Name the activity and stage that needs inspection, who must be present and what cannot proceed until the agreed check is complete." },
      { heading: "Use project-approved criteria", paragraph: "Link each check to the applicable drawing, method statement, specification or approved inspection and test plan. Do not invent tolerances or acceptance limits for a specific project." },
      { heading: "Capture evidence and responsibility", paragraph: "Include date, location, drawing reference, observations, evidence references, responsible person and due date where appropriate." },
      { heading: "Close the loop", paragraph: "Track corrective action, re-inspection and approval. A closed issue should have a clear reason and supporting record, not just a changed status." }
    ],
    takeaways: ["Use approved project-specific criteria.", "Capture enough evidence to understand the check.", "Define who closes each action."]
  },
  {
    slug: "understanding-project-margin",
    title: "Project margin is a moving picture",
    category: "Project controls",
    readTime: "7 min read",
    summary: "Understand the difference between budget, committed cost, actual cost and forecast—and why the labels matter.",
    intro: "A project can look healthy against its original estimate and still face pressure from supplier commitments, changed quantities, delayed billing or future work that has not yet been fully costed.",
    sections: [
      { heading: "Keep the cost categories distinct", paragraph: "Budget is a plan, committed cost reflects obligations such as approved purchase orders, actual cost reflects recorded expenditure and forecast cost estimates the final outcome. Do not combine them without labelling the basis." },
      { heading: "Track changes with evidence", paragraph: "Variations, quantity growth, supplier-rate changes and billing differences should be reviewed with their supporting records and approval status." },
      { heading: "Forecast under visible assumptions", paragraph: "A forecast should state what remains to be done, which costs are estimated and what assumptions influence the result. Scenarios are more honest than a single unexplained point estimate." },
      { heading: "Use tools as decision support", paragraph: "Software can surface discrepancies and organise records, but professional review is still needed for contract interpretation, tax treatment, billing certification and commercial decisions." }
    ],
    takeaways: ["Do not mix budget, commitments and actuals.", "Trace movements to records.", "Make forecast assumptions visible."]
  },
  {
    slug: "bim-coordination-basics",
    title: "BIM coordination: make issues actionable",
    category: "Design & BIM",
    readTime: "6 min read",
    summary: "Turn a model clash or coordination note into an issue that a team can understand, assign and close.",
    intro: "A coordination model is most valuable when it helps a multidisciplinary team resolve questions before they become expensive site rework. A clash count alone rarely explains priority or responsibility.",
    sections: [
      { heading: "Describe the location and impact", paragraph: "Record the model views, level, grid, element identifiers and discipline interface so another person can reproduce the concern." },
      { heading: "Separate hard clashes from planning concerns", paragraph: "Some issues are geometric intersections; others concern access, maintenance clearance, construction sequence or unresolved design intent. Label the issue type clearly." },
      { heading: "Assign one owner and due date", paragraph: "Every issue needs a responsible discipline or person, an agreed response and a target date. Avoid assigning a vague action to an entire project team." },
      { heading: "Verify the proposed resolution", paragraph: "Recheck the updated model and referenced drawings, confirm downstream implications and close the issue only when the responsible reviewers agree." }
    ],
    takeaways: ["Provide reproducible location information.", "Assign one clear owner.", "Verify the updated design before closing."]
  },
  {
    slug: "early-career-civil-engineer",
    title: "A practical growth plan for early-career engineers",
    category: "Career growth",
    readTime: "5 min read",
    summary: "Build confidence through core concepts, field observation, drawing literacy, communication and reflective practice.",
    intro: "Early-career growth is easier to plan when it is built around repeatable practice. You do not need to know everything at once; you need a disciplined way to notice gaps, ask questions and learn from reviewed work.",
    sections: [
      { heading: "Strengthen the fundamentals", paragraph: "Revisit surveying, materials, structural concepts, construction methods and quantity measurement alongside the project work you are exposed to." },
      { heading: "Connect drawings with site conditions", paragraph: "With permission and supervision, compare drawing intent to what is built. Note questions, revisions, interfaces and the reasoning behind decisions." },
      { heading: "Practise clear technical communication", paragraph: "Write concise site observations, reference the right document and separate what you observed from what you infer or recommend." },
      { heading: "Ask for review and keep a learning log", paragraph: "Record questions, feedback and what you would do differently next time. Follow your organisation's safety rules and the supervision requirements for your role." }
    ],
    takeaways: ["Pair theory with supervised practice.", "Communicate evidence clearly.", "Treat feedback as part of the workflow."]
  }
];

export function getGuideBySlug(slug: string): GuideArticle | undefined {
  return GUIDE_ARTICLES.find((article) => article.slug === slug);
}
