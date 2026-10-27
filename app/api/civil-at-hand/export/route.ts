import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { categories, getFields, categoryLabel } from "@/modules/civil-at-hand/lib/categories";
import { cellString, escapeCsv } from "@/modules/civil-at-hand/lib/csv";
import { projectStatusLabel } from "@/modules/civil-at-hand/lib/projects";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { rateGroupLabel } from "@/modules/civil-at-hand/lib/rates";
import { Rate } from "@/modules/civil-at-hand/models/Rate";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { Project } from "@/modules/civil-at-hand/models/Project";

export const runtime = "nodejs";
export const maxDuration = 30;

type Column = { key: string; header: string };
const baseColumns: Column[] = [
  { key: "name", header: "Name" }, { key: "firstName", header: "First Name" }, { key: "lastName", header: "Surname" },
  { key: "categoryLabel", header: "Category" }, { key: "status", header: "Status" },
  { key: "phone", header: "Phone" }, { key: "phoneLabel", header: "Phone Label" }, { key: "additionalPhones", header: "Additional Phones" },
  { key: "whatsapp", header: "WhatsApp" }, { key: "emailLabel", header: "Email Label" }, { key: "email", header: "Email" }, { key: "additionalEmails", header: "Additional Emails" },
  { key: "organization", header: "Business / Company" }, { key: "jobTitle", header: "Job Title" }, { key: "birthday", header: "Birthday" },
  { key: "city", header: "City" }, { key: "state", header: "State" }, { key: "isTeamMember", header: "Team Member" }, { key: "teamRole", header: "Team Role" }, { key: "teamDepartment", header: "Team / Department" },
  { key: "workingLocations", header: "Working / Delivery Locations" }, { key: "tags", header: "Tags / Labels" }, { key: "followUpAt", header: "Follow-up Date" },
  { key: "notes", header: "Notes" }, { key: "source", header: "Source" }, { key: "createdAt", header: "Created At" }, { key: "updatedAt", header: "Updated At" },
];
const projectColumns: Column[] = [
  { key: "title", header: "Project / Lead" }, { key: "statusLabel", header: "Status" }, { key: "clientName", header: "Client" },
  { key: "projectType", header: "Type" }, { key: "city", header: "City" }, { key: "state", header: "State" },
  { key: "estimatedValue", header: "Estimated Value (INR)" }, { key: "billedAmount", header: "Billed (INR)" }, { key: "receivedAmount", header: "Received (INR)" }, { key: "outstanding", header: "Outstanding (INR)" }, { key: "startDate", header: "Start Date" }, { key: "endDate", header: "End Date" },
  { key: "followUpAt", header: "Follow-up Date" }, { key: "source", header: "Lead Source" }, { key: "notes", header: "Notes" },
  { key: "createdAt", header: "Created At" }, { key: "updatedAt", header: "Updated At" },
];

function fileResponse(format: "csv" | "xlsx", columns: Column[], rows: Record<string, unknown>[], baseName: string, sheetName: string) {
  if (format === "csv") {
    const csv = [columns.map((col) => escapeCsv(col.header)).join(","), ...rows.map((row) => columns.map((col) => escapeCsv(row[col.key])).join(","))].join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${baseName}.csv"`, "Cache-Control": "no-store" } });
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = process.env.NEXT_PUBLIC_APP_NAME || "NS Engineering Studio";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: Math.min(42, Math.max(16, column.header.length + 2)) }));
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176B59" } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  return workbook.xlsx.writeBuffer().then((bytes: ArrayBuffer) => new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${baseName}.xlsx"`, "Cache-Control": "no-store" } }));
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  if (url.searchParams.get("scope") === "projects") {
    try {
      await dbConnect();
      const projects = (await Project.find().sort({ updatedAt: -1 }).limit(5000).lean()) as unknown as Record<string, unknown>[];
      const rows = projects.map((project) => ({ ...project, statusLabel: projectStatusLabel(String(project.status || "")), outstanding: Math.max(0, Number(project.billedAmount || 0) - Number(project.receivedAmount || 0)) || "" }));
      return await fileResponse(format, projectColumns, rows, "civil-at-hand-projects", "Projects");
    } catch (error) {
      console.error("Project export error:", error);
      return NextResponse.json({ error: "Could not export projects. Check the database connection." }, { status: 503 });
    }
  }

  if (url.searchParams.get("scope") === "rates") {
    try {
      await dbConnect();
      const rates = (await Rate.find().sort({ item: 1 }).limit(10_000).lean()) as unknown as Record<string, unknown>[];
      const rows = rates.map((rate) => ({ ...rate, groupLabel: rateGroupLabel(String(rate.group || "")) }));
      const rateColumns: Column[] = [
        { key: "item", header: "Item" }, { key: "groupLabel", header: "Type" }, { key: "spec", header: "Brand / Grade / Size" }, { key: "unit", header: "Unit" }, { key: "rate", header: "Rate (INR)" },
        { key: "supplierName", header: "Supplier" }, { key: "city", header: "City" }, { key: "state", header: "State" }, { key: "validTill", header: "Valid Till" }, { key: "notes", header: "Notes" }, { key: "updatedAt", header: "Updated At" },
      ];
      await audit(request, "data-exported", `${rows.length} rates`);
      return await fileResponse(format, rateColumns, rows, "civil-at-hand-rate-book", "Rates");
    } catch (error) {
      console.error("Rate export error:", error);
      return NextResponse.json({ error: "Could not export rates. Check the database connection." }, { status: 503 });
    }
  }

  // A blank file with the right column names and two example rows, ready to fill in and import.
  if (url.searchParams.get("scope") === "template") {
    const templateColumns: Column[] = [
      { key: "name", header: "Name" }, { key: "firstName", header: "First Name" }, { key: "lastName", header: "Surname" }, { key: "category", header: "Category" },
      { key: "phone", header: "Phone" }, { key: "phoneLabel", header: "Phone Label" }, { key: "additionalPhones", header: "Additional Phones (label: number; label: number)" },
      { key: "whatsapp", header: "WhatsApp" }, { key: "emailLabel", header: "Email Label" }, { key: "email", header: "Email" }, { key: "additionalEmails", header: "Additional Emails (label: email; label: email)" },
      { key: "organization", header: "Business / Company" }, { key: "jobTitle", header: "Job Title" }, { key: "birthday", header: "Birthday (YYYY-MM-DD)" },
      { key: "city", header: "City" }, { key: "state", header: "State" }, { key: "isTeamMember", header: "Team Member (Yes/No)" }, { key: "teamRole", header: "Team Role" }, { key: "teamDepartment", header: "Team / Department" }, { key: "workingLocations", header: "Working / Delivery Locations" }, { key: "tags", header: "Tags / Labels" }, { key: "notes", header: "Notes" },
    ];
    const examples = [
      { name: "Example Manpower Services", firstName: "Example", lastName: "Manpower Services", category: "manpower-supplier", phone: "9876500001", phoneLabel: "Mobile", additionalPhones: "Work: 01724000000", whatsapp: "9876500001", emailLabel: "Work", email: "", additionalEmails: "Work: contact@example.com", organization: "Example Manpower Services", jobTitle: "Supplier", birthday: "", city: "Ludhiana", state: "Punjab", isTeamMember: "No", teamRole: "", teamDepartment: "", workingLocations: "Punjab, Haryana", tags: "example, supplier", notes: "Delete this example row" },
      { name: "Example Cement Traders", firstName: "Example", lastName: "Cement Traders", category: "vendor-supplier", phone: "9876500002", phoneLabel: "Work", additionalPhones: "", whatsapp: "", emailLabel: "Work", email: "sales@example.com", additionalEmails: "", organization: "Example Cement Traders", jobTitle: "Sales", birthday: "", city: "Chandigarh", state: "Chandigarh", isTeamMember: "No", teamRole: "", teamDepartment: "", workingLocations: "Tricity", tags: "example, materials", notes: "Delete this example row" },
    ];
    return await fileResponse(format, templateColumns, examples, "civil-at-hand-import-template", "Import template");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  const category = (url.searchParams.get("category") || "").slice(0, 80);
  const status = (url.searchParams.get("status") || "").slice(0, 40);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  if (category) filter.category = category;
  if (["new", "contacted", "qualified", "active", "on-hold", "closed"].includes(status)) filter.status = status;
  const detailKeys = Array.from(new Set(categories.flatMap((item) => getFields(item.id).map((field) => field.key))));
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(escaped, "i");
    filter.$or = [
      { name: expression }, { firstName: expression }, { lastName: expression }, { phone: expression }, { "phoneNumbers.number": expression }, { email: expression }, { "emailAddresses.value": expression }, { organization: expression }, { jobTitle: expression }, { teamRole: expression },
      { city: expression }, { state: expression }, { birthday: expression }, { tags: expression }, { notes: expression },
      ...detailKeys.map((key) => ({ [`details.${key}`]: expression })),
    ];
  }
  try {
    await dbConnect();
    const contacts = (await Contact.find(filter).sort({ updatedAt: -1 }).limit(20_000).lean()) as unknown as Record<string, unknown>[];
    const customKeys = detailKeys.filter((key) => !["fullName", "phone", "whatsapp", "email", "organization", "city", "state", "workingLocations", "notes"].includes(key));
    const customColumns: Column[] = customKeys.map((key) => {
      const owner = categories.find((item) => getFields(item.id).some((field) => field.key === key));
      const label = owner ? getFields(owner.id).find((field) => field.key === key)?.label : "";
      return { key: `details.${key}`, header: label || key };
    });
    const columns = [...baseColumns, ...customColumns];
    const rows = contacts.map((contact) => {
      const details = (contact.details || {}) as Record<string, unknown>;
      const row: Record<string, unknown> = {
        name: contact.name, firstName: contact.firstName || "", lastName: contact.lastName || "", categoryLabel: categoryLabel(String(contact.category || "")), status: contact.status,
        phone: contact.phone, phoneLabel: contact.phoneLabel || "Mobile", additionalPhones: Array.isArray(contact.phoneNumbers) ? (contact.phoneNumbers as { label?: string; number?: string }[]).map((item) => `${item.label || "Mobile"}: ${item.number || ""}`).join("; ") : "",
        whatsapp: details.whatsapp, emailLabel: contact.emailLabel || "Work", email: contact.email, additionalEmails: Array.isArray(contact.emailAddresses) ? (contact.emailAddresses as { label?: string; value?: string }[]).map((item) => `${item.label || "Work"}: ${item.value || ""}`).join("; ") : "",
        organization: contact.organization, jobTitle: contact.jobTitle || "", birthday: contact.birthday || "", city: contact.city, state: contact.state,
        isTeamMember: contact.isTeamMember ? "Yes" : "No", teamRole: contact.teamRole || "", teamDepartment: contact.teamDepartment || "", workingLocations: details.workingLocations,
        tags: Array.isArray(contact.tags) ? contact.tags.map((tag) => cellString(tag)).join(", ") : "", followUpAt: contact.followUpAt, notes: contact.notes, source: contact.source,
        createdAt: contact.createdAt, updatedAt: contact.updatedAt,
      };
      for (const key of customKeys) row[`details.${key}`] = details[key];
      return row;
    });
    await audit(request, "data-exported", `${rows.length} contacts`);
    return await fileResponse(format, columns, rows, "civil-at-hand-contacts", "Contacts");
  } catch (error) {
    console.error("Contact export error:", error);
    return NextResponse.json({ error: "Could not export records. Check the database connection." }, { status: 503 });
  }
}
