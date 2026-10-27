import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";

// Project lifecycle, in order. The original seven values are unchanged so existing records keep working;
// "estimation", "awarded", "planning", "defects" and "closed" were added in version 4.
export const projectStatuses = [
  { value: "lead", label: "Enquiry / lead" },
  { value: "estimation", label: "Estimation" },
  { value: "quoted", label: "Quoted" },
  { value: "negotiation", label: "Negotiation" },
  { value: "awarded", label: "Awarded" },
  { value: "planning", label: "Planning / mobilising" },
  { value: "ongoing", label: "Active (ongoing)" },
  { value: "on-hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "defects", label: "Defects liability period" },
  { value: "closed", label: "Closed (final accounts done)" },
  { value: "lost", label: "Lost" },
];
export const projectStatusValues = projectStatuses.map((item) => item.value);
/** Statuses that count as an open sales lead / pipeline. */
export const openLeadStatuses = ["lead", "estimation", "quoted", "negotiation"];
/** Work that has been won and is being delivered (site work can be expected). */
export const deliveryStatuses = ["awarded", "planning", "ongoing", "on-hold", "defects"];
/** Finished or dead: no reminders, not counted as active. */
export const finishedStatuses = ["completed", "closed", "lost"];
export const isProjectFinished = (status: string) => finishedStatuses.includes(status);

export const projectTypes = [
  "Building / बिल्डिंग",
  "Road & infrastructure / सड़क और इन्फ्रास्ट्रक्चर",
  "Industrial / फैक्ट्री",
  "Interior & finishing / इंटीरियर और फिनिशिंग",
  "Repair & maintenance / मरम्मत",
  "Liaisoning & approvals / अनुमति और लाइज़निंग",
  "Other / अन्य",
];

export function projectStatusLabel(value: string): string {
  return projectStatuses.find((item) => item.value === value)?.label || value;
}

function parseDate(value: unknown): Date | null {
  const text = cleanText(value, 40);
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : new Date(ms);
}

function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/[%\s]/g, ""));
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new InputError("Progress must be between 0 and 100 per cent.");
  return Math.round(number);
}

function parseMilestones(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new InputError("Milestones must be a list.");
  if (value.length > 60) throw new InputError("Keep milestones to 60 or fewer.");
  return value.map((item, index) => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const title = cleanText(row.title, 160);
    if (!title) throw new InputError(`Milestone ${index + 1} needs a name.`);
    const done = row.done === true;
    return { title, dueDate: parseDate(row.dueDate), done, doneAt: done ? parseDate(row.doneAt) || new Date() : null, weight: parsePercent(row.weight) ?? 0 };
  });
}

function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(number) || number < 0 || number > 1e13) throw new InputError("Estimated value must be a positive number in rupees.");
  return Math.round(number);
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function normalizeProjectInput(payload: Record<string, unknown>) {
  const title = cleanText(payload.title, 160);
  if (!title) throw new InputError("Project or lead name is required.");
  const status = projectStatusValues.includes(String(payload.status)) ? String(payload.status) : "lead";
  const clientContactId = cleanText(payload.clientContactId, 24);
  const linked = Array.isArray(payload.linkedContactIds) ? payload.linkedContactIds : [];
  const linkedContactIds = Array.from(new Set(linked.map((id) => cleanText(id, 24)).filter((id) => OBJECT_ID.test(id)))).slice(0, 60);
  return {
    title,
    clientName: cleanText(payload.clientName, 160),
    clientContactId: OBJECT_ID.test(clientContactId) ? clientContactId : "",
    linkedContactIds,
    city: cleanText(payload.city, 120),
    state: cleanText(payload.state, 120),
    projectType: cleanText(payload.projectType, 120),
    status,
    estimatedValue: parseMoney(payload.estimatedValue),
    billedAmount: parseMoney(payload.billedAmount),
    receivedAmount: parseMoney(payload.receivedAmount),
    startDate: parseDate(payload.startDate),
    endDate: parseDate(payload.endDate),
    followUpAt: parseDate(payload.followUpAt),
    source: cleanText(payload.source, 120),
    notes: cleanText(payload.notes, 6000),
    ...workspaceFields(payload),
  };
}

/** Validates the workspace fields that may be changed on their own (quick PATCH from the project workspace). */
export function normalizeProjectPatch(payload: Record<string, unknown>) {
  const allowed = ["milestones", "progressPercent", "budget", "actualStartDate", "actualEndDate"];
  const picked: Record<string, unknown> = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(payload, key)) picked[key] = payload[key];
  return workspaceFields(picked);
}

/**
 * Version 4 workspace fields. They are only included when the caller sent them, so an older screen
 * that does not know about a field can never erase it by saving the rest of the project.
 */
function workspaceFields(payload: Record<string, unknown>) {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);
  const result: Record<string, unknown> = {};
  if (has("siteAddress")) result.siteAddress = cleanText(payload.siteAddress, 500);
  if (has("contractRef")) result.contractRef = cleanText(payload.contractRef, 120);
  if (has("managerName")) result.managerName = cleanText(payload.managerName, 120);
  if (has("scope")) result.scope = cleanText(payload.scope, 4000);
  if (has("budget")) result.budget = parseMoney(payload.budget);
  if (has("progressPercent")) result.progressPercent = parsePercent(payload.progressPercent);
  if (has("actualStartDate")) result.actualStartDate = parseDate(payload.actualStartDate);
  if (has("actualEndDate")) result.actualEndDate = parseDate(payload.actualEndDate);
  if (has("milestones")) result.milestones = parseMilestones(payload.milestones);
  return result as { siteAddress?: string; contractRef?: string; managerName?: string; scope?: string; budget?: number | null; progressPercent?: number | null; actualStartDate?: Date | null; actualEndDate?: Date | null; milestones?: ReturnType<typeof parseMilestones> };
}
