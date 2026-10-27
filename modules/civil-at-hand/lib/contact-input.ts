import { getCategory, getFields } from "@/modules/civil-at-hand/lib/categories";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { emailKey, phoneKey } from "@/modules/civil-at-hand/lib/duplicates";

export function cleanText(value: unknown, max = 2000): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\u0000/g, "").trim().slice(0, max);
}

const PHONE_LABELS = ["Mobile", "Work", "Home", "Main", "Other"] as const;
const EMAIL_LABELS = ["Work", "Home", "Other"] as const;
function cleanPhones(value: unknown): { label: typeof PHONE_LABELS[number]; number: string }[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const number = cleanText(row.number ?? row.value, 40);
    if (!number) return [];
    const raw = cleanText(row.label, 20);
    const label = PHONE_LABELS.includes(raw as typeof PHONE_LABELS[number]) ? raw as typeof PHONE_LABELS[number] : "Mobile";
    return [{ label, number }];
  });
}
function cleanEmails(value: unknown): { label: typeof EMAIL_LABELS[number]; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const address = cleanText(row.value ?? row.email, 180).toLowerCase();
    if (!address) return [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new InputError(`“${address}” is not a valid email address.`);
    const raw = cleanText(row.label, 20);
    const label = EMAIL_LABELS.includes(raw as typeof EMAIL_LABELS[number]) ? raw as typeof EMAIL_LABELS[number] : "Work";
    return [{ label, value: address }];
  });
}
function validBirthday(value: unknown): string {
  const birthday = cleanText(value, 10);
  if (!birthday) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new InputError("Enter a valid birthday date.");
  const date = new Date(`${birthday}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) throw new InputError("Enter a valid birthday date.");
  return birthday;
}

export function normalizeContactInput(payload: Record<string, unknown>) {
  const category = cleanText(payload.category, 80);
  const definition = getCategory(category);
  if (!definition) throw new InputError("Choose a valid civil-work category.");
  const inputDetails = (payload.details && typeof payload.details === "object" && !Array.isArray(payload.details)) ? payload.details as Record<string, unknown> : {};
  const details: Record<string, string> = {};
  for (const item of getFields(category)) details[item.key] = cleanText(inputDetails[item.key], item.key === "notes" ? 6000 : 2000);

  const givenFirst = cleanText(payload.firstName ?? inputDetails.firstName, 80);
  const givenLast = cleanText(payload.lastName ?? inputDetails.lastName, 80);
  const legacyName = cleanText(details.fullName || payload.name, 160);
  const split = legacyName.split(/\s+/).filter(Boolean);
  const firstName = givenFirst || (split[0] || "");
  const lastName = givenLast || (split.length > 1 ? split.slice(1).join(" ") : "");
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const name = composedName || legacyName;
  const phone = cleanText(payload.phone ?? details.phone, 40);
  const email = cleanText(payload.email ?? details.email, 180).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("Enter a valid email address.");
  if (!name) throw new InputError("Name is required.");
  if (!phone && !email && !cleanPhones(payload.phoneNumbers).length && !cleanEmails(payload.emailAddresses).length) throw new InputError("Please provide a phone number or email address.");
  const requiredFields = payload.source === "public-link" ? getFields(category) : (definition.fields || []);
  const missing = requiredFields.filter((item) => item.required && !cleanText(details[item.key])).map((item) => item.label);
  if (missing.length) throw new InputError(`Please complete required fields: ${missing.join(", ")}`);

  const tags = Array.isArray(payload.tags) ? payload.tags.map((tag) => cleanText(tag, 40)).filter(Boolean).slice(0, 30) : cleanText(payload.tags, 500).split(",").map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 30);
  const validStatuses = ["new", "contacted", "qualified", "active", "on-hold", "closed"];
  const status = validStatuses.includes(String(payload.status)) ? String(payload.status) : "new";
  const followUp = cleanText(payload.followUpAt, 40);
  const followUpAt = followUp && !Number.isNaN(Date.parse(followUp)) ? new Date(followUp) : null;
  const extra: { rating?: number; flag?: string; shareConsent?: string } = {};
  if ("rating" in payload) { const r = Math.round(Number(payload.rating)); extra.rating = Number.isFinite(r) ? Math.min(5, Math.max(0, r)) : 0; }
  if ("flag" in payload) extra.flag = ["preferred", "avoid"].includes(String(payload.flag)) ? String(payload.flag) : "";
  if ("shareConsent" in payload) extra.shareConsent = ["yes", "no"].includes(String(payload.shareConsent)) ? String(payload.shareConsent) : "";

  // Keep legacy category-form fields in details so old forms, exports and data-room snapshots continue to work.
  details.fullName = name;
  details.phone = phone;
  details.email = email;
  details.organization = cleanText(payload.organization ?? details.organization, 180);
  details.city = cleanText(payload.city ?? details.city, 120);
  details.state = cleanText(payload.state ?? details.state, 120);
  details.notes = cleanText(payload.notes ?? details.notes, 6000);
  if (payload.jobTitle !== undefined) details.jobTitle = cleanText(payload.jobTitle, 120);
  if (payload.birthday !== undefined) details.birthday = validBirthday(payload.birthday);

  const rawPhoneLabel = cleanText(payload.phoneLabel, 20);
  const phoneLabel = PHONE_LABELS.includes(rawPhoneLabel as typeof PHONE_LABELS[number]) ? rawPhoneLabel : "Mobile";
  const rawEmailLabel = cleanText(payload.emailLabel, 20);
  const emailLabel = EMAIL_LABELS.includes(rawEmailLabel as typeof EMAIL_LABELS[number]) ? rawEmailLabel : "Work";
  const teamRole = cleanText(payload.teamRole, 120);
  const teamDepartment = cleanText(payload.teamDepartment, 120);
  const isTeamMember = payload.isTeamMember === true || payload.isTeamMember === "true";
  const mainPhoneKey = phoneKey(phone);
  const seenPhones = new Set<string>(mainPhoneKey ? [mainPhoneKey] : []);
  const additionalPhones = cleanPhones(payload.phoneNumbers).filter((entry) => {
    const key = phoneKey(entry.number);
    if (key && seenPhones.has(key)) return false;
    if (key) seenPhones.add(key);
    return true;
  }).slice(0, 10);
  const mainEmailKey = emailKey(email);
  const seenEmails = new Set<string>(mainEmailKey ? [mainEmailKey] : []);
  const additionalEmails = cleanEmails(payload.emailAddresses).filter((entry) => {
    const key = emailKey(entry.value);
    if (!key || seenEmails.has(key)) return false;
    seenEmails.add(key);
    return true;
  }).slice(0, 10);
  return {
    ...extra,
    category, name, firstName, lastName,
    jobTitle: cleanText(payload.jobTitle, 120), birthday: validBirthday(payload.birthday), phoneLabel, emailLabel,
    phoneNumbers: additionalPhones, emailAddresses: additionalEmails,
    isTeamMember, teamRole, teamDepartment,
    phone, email,
    organization: cleanText(payload.organization ?? details.organization, 180),
    city: cleanText(payload.city ?? details.city, 120),
    state: cleanText(payload.state ?? details.state, 120),
    status,
    source: payload.source === "public-link" ? "public-link" : "manual",
    linkId: cleanText(payload.linkId, 120),
    tags,
    notes: cleanText(payload.notes ?? details.notes, 6000),
    followUpAt,
    details,
  };
}
