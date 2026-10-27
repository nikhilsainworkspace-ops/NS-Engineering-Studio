export type FieldType = "text" | "textarea" | "email" | "tel" | "url" | "select";
export type FormField = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};
export type Category = { id: string; label: string; short: string; description: string; fields: FormField[] };

const field = (key: string, label: string, type: FieldType = "text", required = false, options?: string[], placeholder?: string): FormField => ({ key, label, type, required, options, placeholder });
const capacity = ["Less than 10 / 10 से कम", "10–20 people / 10–20 लोग", "21–50 people / 21–50 लोग", "51–100 people / 51–100 लोग", "101–500 people / 101–500 लोग", "More than 500 / 500 से अधिक"];
const common: FormField[] = [
  field("fullName", "Name / नाम", "text", true, undefined, "Your full name / अपना पूरा नाम"),
  field("phone", "Phone number / मोबाइल नंबर", "tel", true, undefined, "+91 …"),
  field("whatsapp", "WhatsApp number / व्हाट्सऐप नंबर", "tel", false, undefined, "If different from phone"),
  field("email", "Email / ईमेल", "email", false, undefined, "name@example.com"),
  field("organization", "Business or company name / फर्म या कंपनी का नाम", "text"),
  field("city", "City / शहर", "text", true),
  field("state", "State / राज्य", "text", true),
  field("workingLocations", "Where can you work or supply? / आप कहाँ काम या सप्लाई कर सकते हैं?", "textarea", false, undefined, "Cities, districts, states / शहर, जिले, राज्य"),
  field("yearsExperience", "Experience / अनुभव", "select", false, ["New business / नया व्यवसाय", "1–2 years / 1–2 साल", "3–5 years / 3–5 साल", "6–10 years / 6–10 साल", "10+ years / 10+ साल"]),
];

export const categories: Category[] = [
  {
    id: "general-contact", label: "General Contact / Team Member", short: "General Contact", description: "A flexible Google Contacts-style record for people, staff and business relationships.",
    fields: [field("relationshipType", "Relationship type / संबंध", "select", false, ["Team member", "Client", "Supplier", "Contractor", "Partner", "Consultant", "Other"])],
  },
  {
    id: "manpower-supplier", label: "Manpower Supplier", short: "Manpower", description: "Skilled labour, helpers and teams for construction sites.",
    fields: [field("workerTypes", "Workers you provide / कौन-कौन से कर्मचारी देते हैं?", "textarea", true, undefined, "Helpers, welders, electricians…"), field("teamSize", "Team capacity / कितने लोग दे सकते हैं?", "select", true, capacity), field("skillLevels", "Skills and trades / कौशल और काम", "textarea"), field("availability", "Availability / कब से उपलब्ध हैं?", "select", false, ["Immediately / तुरंत", "Within 7 days / 7 दिन में", "Within 15 days / 15 दिन में", "Discuss first / बातचीत के बाद"])],
  },
  {
    id: "vendor-supplier", label: "Vendor / Material Supplier", short: "Vendor", description: "Construction materials, machinery, tools and safety supplies.",
    fields: [field("supplierType", "Supplier type / सप्लायर का प्रकार", "select", true, ["Cement / सीमेंट", "Steel / सरिया", "Electrical / इलेक्ट्रिकल", "Plumbing / प्लंबिंग", "Safety equipment / सुरक्षा उपकरण", "Machinery or tools / मशीनरी या टूल्स", "Aggregates or sand / गिट्टी या रेत", "Finishing materials / फिनिशिंग सामग्री", "Other / अन्य"]), field("productCategories", "Products supplied / कौन-सा सामान सप्लाई करते हैं?", "textarea", true), field("brands", "Brands / ब्रांड", "text"), field("supplyCapacity", "Supply capacity / सप्लाई क्षमता", "text", false, undefined, "e.g. 500 bags/week or 10 MT"), field("gstin", "GSTIN (optional) / जीएसटी नंबर", "text"), field("deliveryLocations", "Delivery locations / डिलीवरी की जगह", "textarea")],
  },
  {
    id: "subcontractor", label: "Subcontractor", short: "Subcontractor", description: "Specialist teams for plumbing, painting, fabrication and civil work.",
    fields: [field("workSpecialty", "Work speciality / काम की विशेषज्ञता", "textarea", true, undefined, "Civil, plumbing, painting, fabrication…"), field("teamSize", "Team capacity / टीम में कितने लोग हैं?", "select", true, capacity), field("projectTypes", "Projects handled / किस तरह के प्रोजेक्ट किए हैं?", "textarea"), field("equipment", "Equipment available / उपलब्ध मशीनरी", "textarea"), field("certifications", "Licences or certifications / लाइसेंस या प्रमाणपत्र", "text")],
  },
  {
    id: "contractor", label: "Contractor", short: "Contractor", description: "Civil, structural, MEP and other works contractors.",
    fields: [field("contractorType", "Contractor type / कॉन्ट्रैक्टर का प्रकार", "select", true, ["Civil / सिविल", "Building / बिल्डिंग", "Roads and infrastructure / सड़क और इन्फ्रास्ट्रक्चर", "MEP / इलेक्ट्रिकल-प्लंबिंग", "Turnkey / टर्नकी", "Other / अन्य"]), field("workSpecialty", "Work speciality / काम की विशेषज्ञता", "textarea", true), field("teamSize", "Team capacity / टीम की क्षमता", "select", false, capacity), field("projectSize", "Typical project size / सामान्य प्रोजेक्ट का आकार", "text"), field("licenses", "Registration or licence details / रजिस्ट्रेशन या लाइसेंस", "text")],
  },
  {
    id: "project-liaisoning", label: "Project Liaisoning & Outsourcing", short: "Liaisoning", description: "Project introductions, coordination and specialist outsourcing.",
    fields: [field("liaisonType", "Support offered / किस तरह की सहायता देते हैं?", "textarea", true), field("sectors", "Sectors / क्षेत्र", "text", false, undefined, "Buildings, EPC, roads, factories…"), field("regions", "Regions covered / कार्यक्षेत्र", "text"), field("relationships", "Relevant contacts or experience / संबंधित संपर्क या अनुभव", "textarea"), field("engagementModel", "Engagement model / काम का तरीका", "select", false, ["Referral / रेफरल", "Consulting / सलाह", "Outsourcing / आउटसोर्सिंग", "Project coordination / प्रोजेक्ट समन्वय", "Open to discussion / बातचीत के लिए तैयार"])],
  },
  {
    id: "investor-partner", label: "Investors & Execution Partners", short: "Investor / Partner", description: "Investment, project execution and delivery partnerships.",
    fields: [field("partnershipRole", "Your role / आपकी भूमिका", "select", true, ["Investor / निवेशक", "Execution partner / प्रोजेक्ट चलाने वाले पार्टनर", "Both / दोनों", "Strategic partner / रणनीतिक पार्टनर"]), field("investmentRange", "Investment range (optional) / निवेश की सीमा", "select", false, ["To discuss / बातचीत के अनुसार", "Below ₹10 lakh / ₹10 लाख से कम", "₹10–50 lakh / ₹10–50 लाख", "₹50 lakh–₹1 crore / ₹50 लाख–₹1 करोड़", "Above ₹1 crore / ₹1 करोड़ से अधिक"]), field("projectInterest", "Interested projects / किस तरह के प्रोजेक्ट में रुचि है?", "textarea", true), field("preferredRegions", "Preferred regions / पसंदीदा क्षेत्र", "text")],
  },
  {
    id: "business-development", label: "Business Development", short: "Business Development", description: "New work opportunities, client introductions and contract leads.",
    fields: [field("opportunityType", "Opportunity type / अवसर का प्रकार", "textarea", true), field("targetClients", "Client network / किन ग्राहकों से संपर्क है?", "textarea"), field("sectors", "Sectors / क्षेत्र", "text"), field("regions", "Regions / कार्यक्षेत्र", "text"), field("experienceSummary", "Experience / अनुभव", "textarea")],
  },
  {
    id: "financial-resources", label: "Financial Resources Network", short: "Financial Resources", description: "Working capital, project finance and business funding connections.",
    fields: [field("fundingType", "Financial support type / वित्तीय सहायता का प्रकार", "select", true, ["Working capital / वर्किंग कैपिटल", "Project finance / प्रोजेक्ट फाइनेंस", "Invoice or bill funding / बिल फाइनेंस", "Equipment finance / मशीनरी फाइनेंस", "Investor introduction / निवेशक संपर्क", "Other / अन्य"]), field("amountRange", "Typical amount / अनुमानित राशि", "select", false, ["To discuss / बातचीत के अनुसार", "Below ₹10 lakh / ₹10 लाख से कम", "₹10–50 lakh / ₹10–50 लाख", "₹50 lakh–₹1 crore / ₹50 लाख–₹1 करोड़", "Above ₹1 crore / ₹1 करोड़ से अधिक"]), field("fundingConditions", "Terms or conditions / शर्तें", "textarea"), field("regions", "Regions supported / कार्यक्षेत्र", "text")],
  },
  {
    id: "joint-venture", label: "Joint Venture & Strategic Partnership", short: "JV / Partnership", description: "Businesses joining capabilities, resources and project opportunities.",
    fields: [field("contribution", "What can you contribute? / आप क्या योगदान दे सकते हैं?", "textarea", true), field("desiredPartner", "Partner sought / किस तरह का पार्टनर चाहिए?", "textarea", true), field("projectTypes", "Project types / प्रोजेक्ट का प्रकार", "text"), field("profitModel", "Preferred arrangement / पसंदीदा व्यवस्था", "select", false, ["Revenue share / रेवेन्यू शेयर", "Profit share / लाभ साझा", "Work-package partnership / काम के पैकेज की साझेदारी", "Open to discussion / बातचीत के अनुसार"]), field("regions", "Regions / कार्यक्षेत्र", "text")],
  },
  {
    id: "client-network", label: "Client Network", short: "Client", description: "Builders, EPC companies, factories and developers needing civil services.",
    fields: [field("clientType", "Client type / ग्राहक का प्रकार", "select", true, ["Builder / बिल्डर", "EPC company / EPC कंपनी", "Factory / फैक्ट्री", "Infrastructure developer / इन्फ्रास्ट्रक्चर डेवलपर", "Government contractor / सरकारी कॉन्ट्रैक्टर", "Consultant / कंसल्टेंट", "Other / अन्य"]), field("projectRequirement", "What do you need? / आपको किस काम की जरूरत है?", "textarea", true), field("expectedStart", "Expected start / काम कब शुरू होगा?", "select", false, ["Immediately / तुरंत", "Within 1 month / 1 महीने में", "Within 3 months / 3 महीने में", "Planning stage / अभी योजना बन रही है"]), field("budgetRange", "Budget range (optional) / बजट (वैकल्पिक)", "text"), field("procurementNeeds", "Materials, teams or services needed / सामान, टीम या सेवाएं", "textarea")],
  },
];

const tailFields: FormField[] = [field("notes", "Anything else we should know? / अन्य जानकारी", "textarea", false, undefined, "Share any extra details / अन्य जानकारी लिखें")];
export function getCategory(id: string) { return categories.find((item) => item.id === id); }
export function getFields(id: string): FormField[] { return [...common, ...(getCategory(id)?.fields || []), ...tailFields]; }
export function categoryLabel(id: string) { return getCategory(id)?.label || id.replaceAll("-", " "); }
export const contactStatuses = [
  { value: "new", label: "New" }, { value: "contacted", label: "Contacted" }, { value: "qualified", label: "Qualified" },
  { value: "active", label: "Active" }, { value: "on-hold", label: "On hold" }, { value: "closed", label: "Closed" },
];
