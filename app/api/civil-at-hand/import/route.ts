import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { categories, contactStatuses, getFields } from "@/modules/civil-at-hand/lib/categories";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";
import { parseCsv, unprotectCell } from "@/modules/civil-at-hand/lib/csv";
import { emailKey, phoneKey } from "@/modules/civil-at-hand/lib/duplicates";
import { googleLabeledValues, safeGoogleEmailLabel, safeGooglePhoneLabel } from "@/modules/civil-at-hand/lib/google-contacts";
import { Contact } from "@/modules/civil-at-hand/models/Contact";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_DATA_ROWS = 1000;
const MAX_REPORTED_ERRORS = 20;

type PreparedContact = {
  category: string;
  name: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  birthday?: string;
  phoneLabel?: "Mobile" | "Work" | "Home" | "Main" | "Other";
  emailLabel?: "Work" | "Home" | "Other";
  phoneNumbers?: { label: "Mobile" | "Work" | "Home" | "Main" | "Other"; number: string }[];
  emailAddresses?: { label: "Work" | "Home" | "Other"; value: string }[];
  isTeamMember?: boolean;
  teamRole?: string;
  teamDepartment?: string;
  phone: string;
  email: string;
  organization: string;
  city: string;
  state: string;
  status: string;
  source: "import";
  linkId: string;
  tags: string[];
  notes: string;
  followUpAt: Date | null;
  details: Record<string, string>;
};

function normalizeHeader(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function rowIsEmpty(row: string[]) { return row.every((cell) => !cell.trim()); }

function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.text === "string") return object.text;
    if (Array.isArray(object.richText)) return object.richText.map((part) => cellText((part as Record<string, unknown>).text)).join("");
    if ("result" in object) return cellText(object.result);
    if (typeof object.hyperlink === "string") return object.hyperlink;
    return "";
  }
  return String(value).trim();
}

async function readRows(fileName: string, bytes: Buffer): Promise<string[][]> {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv") return parseCsv(new TextDecoder("utf-8").decode(bytes));
  if (extension !== "xlsx") throw new Error("Please upload a .csv or .xlsx file. Older .xls files are not supported; save them as .xlsx first.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The Excel workbook has no worksheet to import.");
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column += 1) cells.push(cellText(row.getCell(column).value));
    rows.push(cells);
  });
  return rows;
}

function buildHeaderLookup(headers: string[], values: string[]) {
  const lookup = new Map<string, string>();
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key && (!lookup.has(key) || !lookup.get(key)) && values[index]) lookup.set(key, values[index].trim());
  });
  return (aliases: string[]) => {
    for (const alias of aliases) {
      const value = lookup.get(normalizeHeader(alias));
      if (value) return value.trim();
    }
    return "";
  };
}

function parseStatus(value: string) {
  const key = normalizeHeader(value);
  const found = contactStatuses.find((item) => normalizeHeader(item.value) === key || normalizeHeader(item.label) === key);
  return found?.value || "new";
}

function parseCategory(value: string) {
  const key = normalizeHeader(value);
  return categories.find((item) => normalizeHeader(item.id) === key || normalizeHeader(item.label) === key);
}

type ImportedPhone = { label: "Mobile" | "Work" | "Home" | "Main" | "Other"; number: string };
type ImportedEmail = { label: "Work" | "Home" | "Other"; value: string };
function parseLabeledItems(raw: string, kind: "phone"): ImportedPhone[];
function parseLabeledItems(raw: string, kind: "email"): ImportedEmail[];
function parseLabeledItems(raw: string, kind: "phone" | "email"): ImportedPhone[] | ImportedEmail[] {
  const parts = raw.split(/[;|]/).map((part) => part.trim()).filter(Boolean).slice(0, 10);
  if (kind === "phone") {
    const known = new Set(["mobile", "work", "home", "main", "other"]);
    const labels: Record<string, ImportedPhone["label"]> = { mobile: "Mobile", work: "Work", home: "Home", main: "Main", other: "Other" };
    return parts.flatMap((part): ImportedPhone[] => {
      const split = part.indexOf(":");
      const rawLabel = split > 0 ? part.slice(0, split).trim().toLowerCase() : "mobile";
      const number = (split > 0 ? part.slice(split + 1) : part).trim().slice(0, 40);
      if (!number) return [];
      return [{ label: known.has(rawLabel) ? labels[rawLabel] : "Other", number }];
    });
  }
  const known = new Set(["work", "home", "other"]);
  const labels: Record<string, ImportedEmail["label"]> = { work: "Work", home: "Home", other: "Other" };
  return parts.flatMap((part): ImportedEmail[] => {
    const split = part.indexOf(":");
    const rawLabel = split > 0 ? part.slice(0, split).trim().toLowerCase() : "work";
    const value = (split > 0 ? part.slice(split + 1) : part).trim().slice(0, 180).toLowerCase();
    if (!value) return [];
    return [{ label: known.has(rawLabel) ? labels[rawLabel] : "Other", value }];
  });
}

function prepareRow(headers: string[], values: string[], line: number): { contact?: PreparedContact; error?: string } {
  const get = buildHeaderLookup(headers, values);
  const categoryValue = get(["Category", "categoryId", "Contact category", "Category ID"]);
  const category = categoryValue ? parseCategory(categoryValue) : parseCategory("general-contact");
  if (!category) return { error: `Unknown category "${categoryValue}".` };

  const details: Record<string, string> = {};
  for (const field of getFields(category.id)) {
    // Export workbooks use one display label per unique field key. Include that key's
    // labels from every category so those shared columns round-trip correctly.
    const aliases = [field.key, field.label, ...categories.flatMap((item) => getFields(item.id).filter((other) => other.key === field.key).map((other) => other.label))];
    if (field.key === "fullName") aliases.push("Name", "Full Name");
    if (field.key === "phone") aliases.push("Phone", "Phone number", "Mobile", "Mobile number");
    if (field.key === "whatsapp") aliases.push("WhatsApp", "WhatsApp number");
    if (field.key === "email") aliases.push("Email", "Email address");
    if (field.key === "organization") aliases.push("Business / Company", "Company", "Business name");
    if (field.key === "workingLocations") aliases.push("Working / Delivery Locations", "Working / supply locations");
    if (field.key === "notes") aliases.push("Notes", "Additional notes");
    details[field.key] = cleanText(get(aliases), field.key === "notes" ? 6000 : 2000);
  }

  const googlePhones = googleLabeledValues(headers, values, "phone").map((item) => ({ label: safeGooglePhoneLabel(item.label), number: item.value.slice(0, 40) }));
  const googleEmails = googleLabeledValues(headers, values, "email").map((item) => ({ label: safeGoogleEmailLabel(item.label), value: item.value.slice(0, 180).toLowerCase() }));
  const rawFirstName = cleanText(get(["First Name", "Given Name", "givenName", "firstName"]), 80);
  const rawLastName = cleanText(get(["Surname", "Last Name", "Family Name", "FamilyName", "lastName"]), 80);
  const nameFromColumns = [rawFirstName, rawLastName].filter(Boolean).join(" ");
  const name = cleanText(get(["Name", "Full Name", "fullName"]) || details.fullName || nameFromColumns, 160);
  const splitName = name.split(/\s+/).filter(Boolean);
  const firstName = rawFirstName || cleanText(splitName[0] || "", 80);
  const lastName = rawLastName || cleanText(splitName.length > 1 ? splitName.slice(1).join(" ") : "", 80);
  const phoneFromGoogle = googlePhones[0];
  const phone = cleanText(get(["Phone", "Phone number", "Mobile", "Mobile number"]) || phoneFromGoogle?.number || details.phone, 40);
  const phoneLabelRaw = cleanText(get(["Phone Label", "phoneLabel"]) || phoneFromGoogle?.label, 20).toLowerCase();
  const phoneLabel = ({ mobile: "Mobile", work: "Work", home: "Home", main: "Main", other: "Other" } as Record<string, "Mobile" | "Work" | "Home" | "Main" | "Other">)[phoneLabelRaw] || "Mobile";
  const phoneNumbers = [...parseLabeledItems(get(["Additional Phones", "Additional Phone Numbers", "phoneNumbers"]), "phone"), ...googlePhones.slice(1)];
  const emailFromGoogle = googleEmails[0];
  const email = cleanText(get(["Email", "Email address"]) || emailFromGoogle?.value || details.email, 180).toLowerCase();
  const emailLabel = safeGoogleEmailLabel(get(["Email Label", "emailLabel"]) || emailFromGoogle?.label || "Work");
  const emailAddresses = [...parseLabeledItems(get(["Additional Emails", "Additional Email Addresses", "emailAddresses"]), "email"), ...googleEmails.slice(1)];
  const jobTitle = cleanText(get(["Job Title", "Job title", "jobTitle", "Organization 1 - Title", "Organization Title"]), 120);
  const birthday = cleanText(get(["Birthday", "birthday"]), 10);
  const isTeamMember = ["yes", "true", "1", "y"].includes(normalizeHeader(get(["Team Member", "Is Team Member", "isTeamMember"])));
  const teamRole = cleanText(get(["Team Role", "teamRole"]), 120);
  const teamDepartment = cleanText(get(["Team / Department", "Team Department", "teamDepartment"]), 120);
  if (!name) return { error: "Name is required." };
  if (!phone && !email && !phoneNumbers.length && !emailAddresses.length) return { error: "Add a phone number or email address." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email address does not look valid." };
  if (emailAddresses.some((item) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value))) return { error: "An additional email address does not look valid." };
  if (birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || Number.isNaN(Date.parse(`${birthday}T00:00:00Z`)) || new Date(`${birthday}T00:00:00Z`).toISOString().slice(0, 10) !== birthday)) return { error: "Birthday must be a real date in YYYY-MM-DD format." };

  details.fullName = name;
  details.phone = phone;
  details.email = email;
  details.organization = cleanText(get(["Business / Company", "Business or company name", "organization", "Company", "Organization 1 - Name", "Organization Name"]) || details.organization, 180);
  details.city = cleanText(get(["City", "city", "Address 1 - City", "Address 2 - City", "Address 1 City"]) || details.city, 120);
  details.state = cleanText(get(["State", "state", "Region", "Address 1 - Region", "Address 2 - Region"]) || details.state, 120);
  details.whatsapp = cleanText(get(["WhatsApp", "WhatsApp number"]) || details.whatsapp, 40);
  details.workingLocations = cleanText(get(["Working / Delivery Locations", "Working / supply locations", "workingLocations"]) || details.workingLocations, 2000);
  details.notes = cleanText(get(["Notes", "Additional notes"]) || details.notes, 6000);

  const rawFollowUp = get(["Follow-up Date", "Follow Up Date", "followUpAt"]);
  const parsedFollowUp = rawFollowUp ? new Date(rawFollowUp) : null;
  const followUpAt = parsedFollowUp && !Number.isNaN(parsedFollowUp.getTime()) ? parsedFollowUp : null;
  const rawTags = get(["Tags", "Labels", "Group Membership", "tags"]);
  const tags = rawTags.split(/[,;|]|:::/).map((tag) => tag.replace(/^\s*\*\s*/, "").trim().slice(0, 40)).filter((tag) => tag && normalizeHeader(tag) !== "mycontacts").slice(0, 30);

  return { contact: {
    category: category.id,
    name,
    firstName,
    lastName,
    jobTitle,
    birthday,
    phoneLabel,
    emailLabel,
    phoneNumbers: phoneNumbers.filter((item, index, all) => {
      if (phoneKey(item.number) && phoneKey(item.number) === phoneKey(phone)) return false;
      const key = phoneKey(item.number);
      return all.findIndex((candidate) => key ? phoneKey(candidate.number) === key : candidate.number === item.number) === index;
    }).slice(0, 10),
    emailAddresses: emailAddresses.filter((item, index, all) => {
      if (emailKey(item.value) === emailKey(email)) return false;
      const key = emailKey(item.value);
      return all.findIndex((candidate) => emailKey(candidate.value) === key) === index;
    }).slice(0, 10),
    isTeamMember,
    teamRole,
    teamDepartment,
    phone,
    email,
    organization: details.organization,
    city: details.city,
    state: details.state,
    status: parseStatus(get(["Status", "Relationship status"])),
    source: "import",
    linkId: "",
    tags,
    notes: details.notes,
    followUpAt,
    details,
  } };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Choose a CSV or Excel (.xlsx) file to import." }, { status: 400 });
    }
    if (file.size <= 0) return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "The file is too large. The maximum upload size is 4 MB." }, { status: 413 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const rows = await readRows(file.name, bytes);
    const usableRows = rows.map((row) => row.map(unprotectCell)).filter((row) => !rowIsEmpty(row));
    if (usableRows.length < 2) return NextResponse.json({ error: "The file needs a header row and at least one contact row." }, { status: 400 });
    if (usableRows.length - 1 > MAX_DATA_ROWS) return NextResponse.json({ error: `Import up to ${MAX_DATA_ROWS} contacts at a time. Split this file into smaller files and try again.` }, { status: 413 });

    const headers = usableRows[0].map((cell) => cell.trim());
    const normalizedHeaders = headers.map(normalizeHeader);
    const hasName = normalizedHeaders.some((header) => ["name", "fullname", "firstname", "givenname", "lastname", "familyname", "surname"].includes(header));
    if (!hasName) {
      return NextResponse.json({ error: "Could not find a contact name column. Use a NS Engineering Studio template or a Google Contacts CSV export." }, { status: 400 });
    }

    const prepared: PreparedContact[] = [];
    const rowErrors: { row: number; message: string }[] = [];
    let invalid = 0;
    for (let index = 1; index < usableRows.length; index += 1) {
      const result = prepareRow(headers, usableRows[index], index + 1);
      if (result.contact) prepared.push(result.contact);
      else {
        invalid += 1;
        if (rowErrors.length < MAX_REPORTED_ERRORS) rowErrors.push({ row: index + 1, message: result.error || "Could not read this row." });
      }
    }

    await dbConnect();
    const existing = (await Contact.find({}, { phone: 1, email: 1, phoneNumbers: 1, emailAddresses: 1 }).lean()) as unknown as {
      phone?: string; email?: string; phoneNumbers?: { number?: string }[]; emailAddresses?: { value?: string }[];
    }[];
    const seenPhones = new Set(existing.flatMap((contact) => [contact.phone, ...(contact.phoneNumbers || []).map((entry) => entry.number)].map(phoneKey)).filter(Boolean));
    const seenEmails = new Set(existing.flatMap((contact) => [contact.email, ...(contact.emailAddresses || []).map((entry) => entry.value)].map((value) => emailKey(String(value || ""))).filter(Boolean)));
    const toInsert: PreparedContact[] = [];
    let duplicates = 0;
    for (const contact of prepared) {
      const phones = [contact.phone, ...(contact.phoneNumbers || []).map((entry) => entry.number)].map(phoneKey).filter(Boolean);
      const emails = [contact.email, ...(contact.emailAddresses || []).map((entry) => entry.value)].map((value) => emailKey(String(value || ""))).filter(Boolean);
      if (phones.some((phone) => seenPhones.has(phone)) || emails.some((email) => seenEmails.has(email))) { duplicates += 1; continue; }
      toInsert.push(contact);
      phones.forEach((phone) => seenPhones.add(phone));
      emails.forEach((email) => seenEmails.add(email));
    }

    let created = 0;
    if (toInsert.length) {
      const result = await Contact.insertMany(toInsert, { ordered: true });
      created = result.length;
    }
    await audit(request, "data-imported", `${created} contacts created`);
    return NextResponse.json({
      ok: true,
      created,
      duplicates,
      failed: invalid,
      errors: rowErrors,
      message: `Imported ${created} contact(s), skipped ${duplicates} duplicate(s), and found ${invalid} invalid row(s).`,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import this file.";
    console.error("Contact import error:", error);
    if (/zip|central directory|unexpected end|file signature|corrupt|invalid workbook/i.test(message)) {
      return NextResponse.json({ error: "This Excel file could not be read. Open it in Excel or LibreOffice and save it again as .xlsx, or use CSV." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not import contacts. Check the file format and database connection, then try again." }, { status: 503 });
  }
}
