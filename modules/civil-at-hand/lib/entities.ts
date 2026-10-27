// Field definitions for the construction-management modules. Shared by API validation and forms.
import { opt, type FieldSpec } from "@/modules/civil-at-hand/lib/entity-spec";

export type EntityDef = {
  key: string;
  /** Singular label used in messages, e.g. "material". */
  label: string;
  fields: FieldSpec[];
  /** Field shown as the record name. */
  titleField: string;
  /** Prefix key in settings.prefixes used to number new records, if any. */
  numberPrefix?: "quotation" | "invoice" | "bill" | "purchaseOrder" | "materialRequest";
};

/* ---------------------------------------------------------------- statuses */
export const siteReportStatuses = opt(["draft", "Draft"], ["submitted", "Submitted for review"], ["approved", "Approved"], ["returned", "Returned for changes"]);
export const estimateStatuses = opt(["draft", "Draft"], ["sent", "Sent to client"], ["approved", "Approved / awarded"], ["rejected", "Not accepted"], ["cancelled", "Cancelled"]);
export const materialRequestStatuses = opt(["requested", "Requested"], ["approved", "Approved"], ["ordered", "Ordered"], ["fulfilled", "Fulfilled"], ["rejected", "Rejected"], ["cancelled", "Cancelled"]);
export const purchaseOrderStatuses = opt(["draft", "Draft"], ["issued", "Issued to supplier"], ["partially-received", "Partly received"], ["received", "Fully received"], ["closed", "Closed"], ["cancelled", "Cancelled"]);
export const invoiceStates = opt(["draft", "Draft"], ["issued", "Issued"], ["void", "Void"]);
export const workerStatuses = opt(["active", "Active"], ["inactive", "Inactive"]);
export const attendanceStatuses = opt(["present", "Present"], ["half-day", "Half day"], ["absent", "Absent"], ["leave", "Leave"]);
export const workerTxnTypes = opt(["advance", "Advance paid"], ["payment", "Wage payment"], ["deduction", "Deduction"], ["bonus", "Bonus / allowance"]);
export const tenderStatuses = opt(["identified", "Identified"], ["preparing", "Preparing bid"], ["submitted", "Submitted"], ["won", "Won"], ["lost", "Lost"], ["cancelled", "Cancelled / not bid"]);
export const tenderDecisions = opt(["pending", "Decision pending"], ["bid", "Bid"], ["no-bid", "No bid"]);
export const emdStatuses = opt(["not-required", "Not required"], ["pending", "To be paid"], ["paid", "Paid"], ["refunded", "Refunded"], ["forfeited", "Forfeited"]);
export const documentCategories = opt(
  ["contract", "Contract / agreement"], ["drawing", "Drawing"], ["boq", "BOQ / estimate"], ["quotation", "Quotation"],
  ["purchase-order", "Purchase order"], ["supplier-bill", "Supplier bill"], ["client-invoice", "Client invoice"], ["site-photo", "Site photo"],
  ["inspection", "Inspection / quality record"], ["certificate", "Certificate / licence"], ["safety", "Safety document"], ["minutes", "Meeting minutes"],
  ["approval", "Approval / permit"], ["handover", "Handover / completion"], ["correspondence", "Correspondence"], ["other", "Other"],
);
export const approvalStatuses = opt(["not-required", "No approval needed"], ["pending", "Awaiting approval"], ["approved", "Approved"], ["rejected", "Rejected"]);
export const paymentModes = opt(["bank-transfer", "Bank transfer / NEFT / RTGS"], ["upi", "UPI"], ["cheque", "Cheque"], ["cash", "Cash"], ["card", "Card"], ["adjustment", "Adjustment"], ["other", "Other"]);

export const labelOf = (options: { value: string; label: string }[], value: string) => options.find((item) => item.value === value)?.label || value || "—";

/* ---------------------------------------------------------------- site reports */
export const siteReportDef: EntityDef = {
  key: "site-reports", label: "site report", titleField: "date",
  fields: [
    { key: "projectId", label: "Project", kind: "ref", ref: "project", required: true },
    { key: "date", label: "Report date", kind: "date", required: true },
    { key: "weather", label: "Weather / site conditions", kind: "text", max: 120, placeholder: "Clear, light rain after 3 pm…" },
    { key: "workDone", label: "Work completed today", kind: "textarea", required: true, max: 4000 },
    { key: "quantities", label: "Measured quantities", kind: "items", max: 60, itemFields: [
      { key: "description", label: "Work item", kind: "text", required: true, max: 200 },
      { key: "unit", label: "Unit", kind: "select", optionsFrom: "units", max: 20 },
      { key: "qty", label: "Quantity", kind: "number", required: true, maxValue: 1e9 },
    ] },
    { key: "labourCount", label: "Workers on site", kind: "number", maxValue: 100000 },
    { key: "labourNotes", label: "Labour and subcontractors", kind: "textarea", max: 2000 },
    { key: "materialsUsed", label: "Materials received or used", kind: "textarea", max: 2000 },
    { key: "equipment", label: "Equipment used", kind: "textarea", max: 1000 },
    { key: "issues", label: "Delays, issues or hindrances", kind: "textarea", max: 2000 },
    { key: "safetyNotes", label: "Safety and quality observations", kind: "textarea", max: 2000 },
    { key: "nextDayPlan", label: "Plan for the next day", kind: "textarea", max: 2000 },
    { key: "preparedBy", label: "Prepared by", kind: "text", max: 120 },
    { key: "status", label: "Status", kind: "select", options: siteReportStatuses, defaultValue: "draft", hidden: true },
    { key: "reviewNote", label: "Reviewer note", kind: "textarea", max: 1000, hidden: true },
  ],
};

/* ---------------------------------------------------------------- estimates / BOQ */
export const estimateItemFields: FieldSpec[] = [
  { key: "code", label: "Item no.", kind: "text", max: 30 },
  { key: "section", label: "Section", kind: "text", max: 120 },
  { key: "description", label: "Description", kind: "textarea", required: true, max: 1500 },
  { key: "unit", label: "Unit", kind: "text", max: 20 },
  { key: "qty", label: "Quantity", kind: "number", maxValue: 1e9, defaultValue: 0 },
  { key: "materialRate", label: "Material rate", kind: "money", defaultValue: 0 },
  { key: "wastagePct", label: "Wastage %", kind: "percent", maxValue: 100, defaultValue: 0 },
  { key: "labourRate", label: "Labour rate", kind: "money", defaultValue: 0 },
  { key: "equipmentRate", label: "Equipment rate", kind: "money", defaultValue: 0 },
  { key: "otherRate", label: "Other / transport rate", kind: "money", defaultValue: 0 },
  { key: "rateSource", label: "Rate source", kind: "text", max: 160 },
  { key: "rateDate", label: "Rate date", kind: "date" },
  { key: "rateOverridden", label: "Rate changed manually", kind: "bool" },
  { key: "notes", label: "Notes", kind: "text", max: 300 },
];

export const estimateDef: EntityDef = {
  key: "estimates", label: "estimate", titleField: "title", numberPrefix: "quotation",
  fields: [
    { key: "title", label: "Estimate / quotation title", kind: "text", required: true, max: 200 },
    { key: "projectId", label: "Project", kind: "ref", ref: "project" },
    { key: "clientContactId", label: "Client contact", kind: "ref", ref: "contact" },
    { key: "clientName", label: "Client name", kind: "text", max: 200 },
    { key: "clientAddress", label: "Client address", kind: "textarea", max: 600 },
    { key: "siteLocation", label: "Site / location", kind: "text", max: 200 },
    { key: "issueDate", label: "Date", kind: "date" },
    { key: "validUntil", label: "Valid until", kind: "date" },
    { key: "items", label: "BOQ items", kind: "items", max: 1000, itemFields: estimateItemFields },
    { key: "overheadPct", label: "Overheads %", kind: "percent", maxValue: 100, defaultValue: 0 },
    { key: "contingencyPct", label: "Contingency %", kind: "percent", maxValue: 100, defaultValue: 0 },
    { key: "marginPct", label: "Margin %", kind: "percent", maxValue: 300, defaultValue: 0 },
    { key: "discountAmount", label: "Discount amount", kind: "money", defaultValue: 0 },
    { key: "taxPct", label: "Tax %", kind: "percent", maxValue: 100, defaultValue: 0 },
    { key: "taxLabel", label: "Tax label", kind: "text", max: 30, defaultValue: "GST" },
    { key: "terms", label: "Terms and conditions", kind: "textarea", max: 6000 },
    { key: "notes", label: "Internal notes (not printed)", kind: "textarea", max: 3000 },
  ],
};

/* ---------------------------------------------------------------- procurement and inventory */
export const materialDef: EntityDef = {
  key: "materials", label: "material", titleField: "name",
  fields: [
    { key: "name", label: "Material name", kind: "text", required: true, max: 160, placeholder: "e.g. OPC 53 grade cement" },
    { key: "category", label: "Category", kind: "select", optionsFrom: "materialCategories", max: 80 },
    { key: "spec", label: "Grade / specification", kind: "text", max: 200, placeholder: "e.g. IS 12269, Fe 500D" },
    { key: "unit", label: "Unit", kind: "select", optionsFrom: "units", required: true, max: 20 },
    { key: "minStock", label: "Minimum stock (reorder level)", kind: "number", maxValue: 1e9 },
    { key: "maxStock", label: "Maximum stock", kind: "number", maxValue: 1e9 },
    { key: "standardRate", label: "Standard rate", kind: "money" },
    { key: "preferredSupplierId", label: "Preferred supplier", kind: "ref", ref: "contact" },
    { key: "notes", label: "Notes", kind: "textarea", max: 1000 },
    { key: "archived", label: "Archived", kind: "bool", hidden: true },
  ],
};

export const materialRequestDef: EntityDef = {
  key: "material-requests", label: "material request", titleField: "number", numberPrefix: "materialRequest",
  fields: [
    { key: "projectId", label: "Project / site", kind: "ref", ref: "project", required: true },
    { key: "neededBy", label: "Needed by", kind: "date" },
    { key: "requestedBy", label: "Requested by", kind: "text", max: 120 },
    { key: "items", label: "Materials", kind: "items", required: true, max: 100, itemFields: [
      { key: "materialId", label: "Material", kind: "ref", ref: "material" },
      { key: "description", label: "Description", kind: "text", required: true, max: 200 },
      { key: "unit", label: "Unit", kind: "text", max: 20 },
      { key: "qty", label: "Quantity", kind: "number", required: true, min: 0.001, maxValue: 1e9 },
      { key: "note", label: "Note", kind: "text", max: 200 },
    ] },
    { key: "notes", label: "Notes", kind: "textarea", max: 2000 },
    { key: "status", label: "Status", kind: "select", options: materialRequestStatuses, defaultValue: "requested", hidden: true },
    { key: "decisionNote", label: "Approval note", kind: "textarea", max: 1000, hidden: true },
  ],
};

export const purchaseOrderItemFields: FieldSpec[] = [
  { key: "materialId", label: "Material", kind: "ref", ref: "material" },
  { key: "description", label: "Description", kind: "text", required: true, max: 200 },
  { key: "unit", label: "Unit", kind: "text", max: 20 },
  { key: "qty", label: "Quantity", kind: "number", required: true, min: 0.001, maxValue: 1e9 },
  { key: "rate", label: "Rate", kind: "money", defaultValue: 0 },
  { key: "taxPct", label: "Tax %", kind: "percent", maxValue: 100, defaultValue: 0 },
];

export const purchaseOrderDef: EntityDef = {
  key: "purchase-orders", label: "purchase order", titleField: "number", numberPrefix: "purchaseOrder",
  fields: [
    { key: "supplierContactId", label: "Supplier (from contacts)", kind: "ref", ref: "contact" },
    { key: "supplierName", label: "Supplier name", kind: "text", required: true, max: 200 },
    { key: "projectId", label: "Project / site", kind: "ref", ref: "project" },
    { key: "materialRequestId", label: "Material request", kind: "ref", ref: "materialRequest" },
    { key: "orderDate", label: "Order date", kind: "date" },
    { key: "expectedDate", label: "Expected delivery", kind: "date" },
    { key: "deliverTo", label: "Deliver to", kind: "select", options: opt(["store", "Main store / yard"], ["project", "Project site"]), defaultValue: "store" },
    { key: "items", label: "Order lines", kind: "items", required: true, max: 200, itemFields: purchaseOrderItemFields },
    { key: "freight", label: "Freight / delivery charges", kind: "money", defaultValue: 0 },
    { key: "terms", label: "Terms (printed)", kind: "textarea", max: 3000 },
    { key: "notes", label: "Internal notes", kind: "textarea", max: 2000 },
  ],
};

/* ---------------------------------------------------------------- workforce */
export const workerDef: EntityDef = {
  key: "workers", label: "worker", titleField: "name",
  fields: [
    { key: "name", label: "Worker name", kind: "text", required: true, max: 120 },
    { key: "trade", label: "Trade / skill", kind: "select", optionsFrom: "trades", max: 80 },
    { key: "skillLevel", label: "Skill level", kind: "select", options: opt(["helper", "Helper / unskilled"], ["semi-skilled", "Semi-skilled"], ["skilled", "Skilled"], ["supervisor", "Supervisor / foreman"]), defaultValue: "skilled" },
    { key: "phone", label: "Phone", kind: "text", max: 40 },
    { key: "labourSupplierId", label: "Labour contractor / supplier", kind: "ref", ref: "contact" },
    { key: "projectId", label: "Current project", kind: "ref", ref: "project" },
    { key: "wageType", label: "Pay basis", kind: "select", options: opt(["daily", "Daily wage"], ["monthly", "Monthly salary"]), defaultValue: "daily" },
    { key: "dailyWage", label: "Daily wage", kind: "money" },
    { key: "monthlySalary", label: "Monthly salary", kind: "money" },
    { key: "otRate", label: "Overtime rate per hour", kind: "money" },
    { key: "joinDate", label: "Joined on", kind: "date" },
    { key: "idType", label: "ID document type", kind: "select", options: opt(["", "Not recorded"], ["aadhaar", "Aadhaar"], ["voter-id", "Voter ID"], ["pan", "PAN"], ["driving-licence", "Driving licence"], ["other", "Other"]), defaultValue: "" },
    { key: "idLast4", label: "ID last 4 characters only", kind: "text", max: 4, help: "Only the last four characters are stored, never the full ID number." },
    { key: "safetyTrainingExpiry", label: "Safety training / permit expiry", kind: "date" },
    { key: "emergencyContact", label: "Emergency contact", kind: "text", max: 160 },
    { key: "status", label: "Status", kind: "select", options: workerStatuses, defaultValue: "active" },
    { key: "notes", label: "Notes", kind: "textarea", max: 1000 },
  ],
};

export const workerTxnDef: EntityDef = {
  key: "worker-transactions", label: "worker payment entry", titleField: "type",
  fields: [
    { key: "workerId", label: "Worker", kind: "ref", ref: "worker", required: true },
    { key: "date", label: "Date", kind: "date", required: true },
    { key: "type", label: "Entry type", kind: "select", options: workerTxnTypes, required: true },
    { key: "amount", label: "Amount", kind: "money", required: true, min: 0.01 },
    { key: "projectId", label: "Project", kind: "ref", ref: "project" },
    { key: "mode", label: "Paid by", kind: "select", options: paymentModes, defaultValue: "cash" },
    { key: "note", label: "Note", kind: "text", max: 300 },
  ],
};

/* ---------------------------------------------------------------- finance */
export const invoiceItemFields: FieldSpec[] = [
  { key: "description", label: "Description", kind: "text", required: true, max: 300 },
  { key: "unit", label: "Unit", kind: "text", max: 20 },
  { key: "qty", label: "Quantity", kind: "number", required: true, min: 0, maxValue: 1e9 },
  { key: "rate", label: "Rate", kind: "money", required: true },
  { key: "taxPct", label: "Tax %", kind: "percent", maxValue: 100, defaultValue: 0 },
];

export const invoiceDef: EntityDef = {
  key: "invoices", label: "invoice", titleField: "number",
  fields: [
    { key: "kind", label: "Type", kind: "select", options: opt(["receivable", "Client invoice (money in)"], ["payable", "Supplier / subcontractor bill (money out)"]), required: true },
    { key: "partyContactId", label: "Client or supplier (from contacts)", kind: "ref", ref: "contact" },
    { key: "partyName", label: "Client or supplier name", kind: "text", required: true, max: 200 },
    { key: "projectId", label: "Project", kind: "ref", ref: "project" },
    { key: "purchaseOrderId", label: "Purchase order", kind: "ref", ref: "purchaseOrder" },
    { key: "partyReference", label: "Their bill / reference no.", kind: "text", max: 80 },
    { key: "date", label: "Invoice date", kind: "date", required: true },
    { key: "dueDate", label: "Due date", kind: "date" },
    { key: "items", label: "Lines", kind: "items", required: true, max: 200, itemFields: invoiceItemFields },
    { key: "retentionAmount", label: "Retention / deduction held", kind: "money", defaultValue: 0 },
    { key: "notes", label: "Notes (printed)", kind: "textarea", max: 3000 },
    { key: "state", label: "Status", kind: "select", options: invoiceStates, defaultValue: "issued", hidden: true },
  ],
};

export const paymentFields: FieldSpec[] = [
  { key: "date", label: "Payment date", kind: "date", required: true },
  { key: "amount", label: "Amount", kind: "money", required: true, min: 0.01 },
  { key: "mode", label: "Mode", kind: "select", options: paymentModes, defaultValue: "bank-transfer" },
  { key: "reference", label: "Reference / UTR / cheque no.", kind: "text", max: 120 },
  { key: "note", label: "Note", kind: "text", max: 300 },
];

export const expenseDef: EntityDef = {
  key: "expenses", label: "expense", titleField: "description",
  fields: [
    { key: "date", label: "Date", kind: "date", required: true },
    { key: "category", label: "Category", kind: "select", optionsFrom: "expenseCategories", required: true, max: 80 },
    { key: "description", label: "What was it for?", kind: "text", required: true, max: 200 },
    { key: "amount", label: "Amount", kind: "money", required: true, min: 0.01 },
    { key: "projectId", label: "Project", kind: "ref", ref: "project" },
    { key: "paidTo", label: "Paid to", kind: "text", max: 160 },
    { key: "mode", label: "Paid by", kind: "select", options: paymentModes, defaultValue: "cash" },
    { key: "reference", label: "Reference / bill no.", kind: "text", max: 120 },
    { key: "note", label: "Note", kind: "textarea", max: 1000 },
  ],
};

/* ---------------------------------------------------------------- documents */
export const documentDef: EntityDef = {
  key: "documents", label: "document", titleField: "title",
  fields: [
    { key: "title", label: "Document title", kind: "text", required: true, max: 200 },
    { key: "category", label: "Category", kind: "select", options: documentCategories, required: true },
    { key: "projectId", label: "Project", kind: "ref", ref: "project" },
    { key: "docNumber", label: "Document / drawing number", kind: "text", max: 80 },
    { key: "revision", label: "Current revision label", kind: "text", max: 20, placeholder: "R0, Rev A…" },
    { key: "issuedBy", label: "Issued by / owner", kind: "text", max: 160 },
    { key: "issueDate", label: "Issue date", kind: "date" },
    { key: "expiryDate", label: "Expiry / renewal date", kind: "date" },
    { key: "approvalStatus", label: "Approval", kind: "select", options: approvalStatuses, defaultValue: "not-required" },
    { key: "tags", label: "Tags", kind: "tags", max: 20 },
    { key: "notes", label: "Notes", kind: "textarea", max: 2000 },
    { key: "archived", label: "Archived", kind: "bool", hidden: true },
  ],
};

/* ---------------------------------------------------------------- tenders */
export const tenderDef: EntityDef = {
  key: "tenders", label: "tender", titleField: "title",
  fields: [
    { key: "title", label: "Tender / opportunity name", kind: "text", required: true, max: 240 },
    { key: "authority", label: "Client / authority", kind: "text", max: 200 },
    { key: "refNumber", label: "Tender reference no.", kind: "text", max: 120 },
    { key: "category", label: "Work category", kind: "select", optionsFrom: "projectTypes", max: 120 },
    { key: "location", label: "Location", kind: "text", max: 200 },
    { key: "source", label: "Where you found it", kind: "text", max: 160, placeholder: "e-procurement portal, newspaper, referral…" },
    { key: "publishedDate", label: "Published on", kind: "date" },
    { key: "preBidDate", label: "Pre-bid meeting", kind: "date" },
    { key: "submissionDeadline", label: "Submission deadline", kind: "datetime" },
    { key: "estimatedValue", label: "Estimated value (as published)", kind: "money" },
    { key: "bidValue", label: "Our bid value", kind: "money" },
    { key: "emdAmount", label: "EMD / bid security", kind: "money" },
    { key: "emdStatus", label: "EMD status", kind: "select", options: emdStatuses, defaultValue: "not-required" },
    { key: "emdReference", label: "EMD reference (BG / DD / online)", kind: "text", max: 160 },
    { key: "decision", label: "Bid / no-bid", kind: "select", options: tenderDecisions, defaultValue: "pending" },
    { key: "decisionReason", label: "Reason for decision", kind: "textarea", max: 1000 },
    { key: "status", label: "Stage", kind: "select", options: tenderStatuses, defaultValue: "identified" },
    { key: "checklist", label: "Eligibility and document checklist", kind: "items", max: 60, itemFields: [
      { key: "label", label: "Item", kind: "text", required: true, max: 200 },
      { key: "done", label: "Ready", kind: "bool" },
    ] },
    { key: "followUpAt", label: "Next follow-up", kind: "date" },
    { key: "winnerName", label: "Winning bidder (if known)", kind: "text", max: 200 },
    { key: "winningBid", label: "Winning bid value", kind: "money" },
    { key: "outcomeNote", label: "Outcome notes / lessons", kind: "textarea", max: 2000 },
    { key: "projectId", label: "Linked project", kind: "ref", ref: "project", hidden: true },
  ],
};

/* ---------------------------------------------------------------- public pages */
export const publicPageTemplates = opt(
  ["company-profile", "Company profile"], ["services", "Services"], ["portfolio", "Project portfolio"],
  ["project-showcase", "Single project showcase"], ["case-study", "Case study"], ["capabilities", "Capabilities and experience"],
  ["gallery", "Gallery"], ["documents", "Public documents"], ["contact", "Contact / enquiry page"], ["custom", "Custom page"],
);
export const publicBlockTypes = opt(
  ["heading", "Heading"], ["text", "Paragraphs"], ["list", "Bullet list"], ["image", "Image"], ["gallery", "Image gallery"],
  ["facts", "Key facts (label + value)"], ["cta", "Button link"], ["contact", "Business contact details"], ["divider", "Divider"],
);
