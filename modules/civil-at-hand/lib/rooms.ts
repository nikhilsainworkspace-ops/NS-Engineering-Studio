// Rules for "Data rooms": time-limited, optionally passcode-protected snapshots of your data
// that you can share with a client. Pure helpers only (no database), so they are easy to test.
import { scrypt as scryptCb, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getFields, categoryLabel } from "@/modules/civil-at-hand/lib/categories";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { maskEmail, maskPhone } from "@/modules/civil-at-hand/lib/security";
import { cleanText } from "@/modules/civil-at-hand/lib/contact-input";
import { MAX_ROOM_ROWS, contactShareFields, rateShareFields, type RoomColumn, type RoomStatus } from "@/modules/civil-at-hand/lib/room-shared";

export * from "@/modules/civil-at-hand/lib/room-shared";

const scrypt = promisify(scryptCb) as unknown as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const MAX_ROOM_BYTES = 8 * 1024 * 1024;
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const MAX_EXPIRY_HOURS = 24 * 366;

export type RoomRow = Record<string, string>;
export type PaymentStatus = "free" | "unpaid" | "paid";

/* ---------- passcodes ---------- */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L to avoid mistakes when typing from WhatsApp
export function generatePasscode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(passcode, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(String(passcode || "").slice(0, 200), Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function validatePasscode(value: string): string {
  const text = String(value || "").trim();
  if (text.length < 4 || text.length > 40) throw new InputError("Passcode must be 4 to 40 characters.");
  return text;
}

/* ---------- state ---------- */
export type RoomState = {
  active: boolean; expiresAt: Date | string | null; maxViews: number | null; viewCount: number;
  paymentStatus: string; requirePayment: boolean; lockedUntil?: Date | string | null;
};

export function roomStatus(room: RoomState, now: Date = new Date()): RoomStatus {
  if (!room.active) return "paused";
  if (!room.expiresAt || new Date(room.expiresAt).getTime() <= now.getTime()) return "expired";
  if (room.maxViews !== null && room.maxViews !== undefined && room.viewCount >= room.maxViews) return "exhausted";
  if (room.requirePayment && room.paymentStatus !== "paid" && room.paymentStatus !== "free") return "awaiting-payment";
  if (room.lockedUntil && new Date(room.lockedUntil).getTime() > now.getTime()) return "locked";
  return "live";
}


/** Opening the page again from the same device within 15 minutes does not use up another "open". */
export function isRepeatView(log: { at: Date | string; kind: string; ip: string; agent: string }[] | undefined, ip: string, agent: string, now: Date = new Date()): boolean {
  const last = [...(log || [])].reverse().find((entry) => entry.kind === "open");
  if (!last) return false;
  return last.ip === ip && last.agent === agent && now.getTime() - new Date(last.at).getTime() < 15 * 60 * 1000;
}

/* ---------- what can be shared ---------- */
type ContactLike = {
  category: string; name: string; firstName?: string; lastName?: string; jobTitle?: string; teamRole?: string;
  phone?: string; phoneLabel?: string; phoneNumbers?: { label?: string; number?: string }[];
  email?: string; emailLabel?: string; emailAddresses?: { label?: string; value?: string }[];
  organization?: string; city?: string; state?: string; birthday?: string; tags?: string[];
  details?: Record<string, unknown>;
};

const CONTACT_BASE_KEYS = new Set(contactShareFields.map((field) => field.key));
const NEVER_SHARE = new Set(["notes", "fullName"]);

/** Category-specific columns (skills, capacity, products…) for the categories present in the selection. */
export function detailColumnsFor(categoryIds: string[]): RoomColumn[] {
  const seen = new Set<string>(); const out: RoomColumn[] = [];
  for (const id of categoryIds) {
    for (const field of getFields(id)) {
      if (CONTACT_BASE_KEYS.has(field.key) || NEVER_SHARE.has(field.key) || ["whatsapp"].includes(field.key) || seen.has(field.key)) continue;
      seen.add(field.key); out.push({ key: `d.${field.key}`, label: field.label.split(" / ")[0] });
    }
  }
  return out;
}

export function buildContactSnapshot(contacts: ContactLike[], fieldKeys: string[], includeDetails: boolean, mask: boolean): { columns: RoomColumn[]; rows: RoomRow[] } {
  const wanted = new Set(fieldKeys);
  const baseColumns = contactShareFields.filter((field) => wanted.has(field.key));
  const detailColumns = includeDetails ? detailColumnsFor(Array.from(new Set(contacts.map((c) => c.category)))) : [];
  const columns = [...baseColumns, ...detailColumns];
  if (!columns.length) throw new InputError("Choose at least one field to share.");
  const rows = contacts.map((contact) => {
    const details = (contact.details || {}) as Record<string, unknown>;
    // The snapshot is intentionally built from an allow-list of share fields. Do not
    // spread a full contact document here: private notes and admin-only metadata
    // must never leak into a client link.
    const additionalPhones = (contact.phoneNumbers || [])
      .filter((entry) => String(entry.number || "").trim() && String(entry.number || "").trim() !== String(contact.phone || "").trim())
      .map((entry) => `${entry.label || "Mobile"}: ${mask ? maskPhone(String(entry.number || "")) : String(entry.number || "")}`)
      .join("; ");
    const additionalEmails = (contact.emailAddresses || [])
      .filter((entry) => String(entry.value || "").trim() && String(entry.value || "").trim().toLowerCase() !== String(contact.email || "").trim().toLowerCase())
      .map((entry) => `${entry.label || "Work"}: ${mask ? maskEmail(String(entry.value || "")) : String(entry.value || "")}`)
      .join("; ");
    const source: Record<string, string> = {
      name: contact.name, categoryLabel: categoryLabel(contact.category), organization: contact.organization || "", jobTitle: contact.jobTitle || String(details.jobTitle || ""),
      teamRole: contact.teamRole || "", city: contact.city || "", state: contact.state || "",
      phoneLabel: contact.phoneLabel || "Mobile", phone: contact.phone || "", additionalPhones, whatsapp: String(details.whatsapp || ""),
      emailLabel: contact.emailLabel || "Work", email: contact.email || "", additionalEmails,
      birthday: contact.birthday || String(details.birthday || ""), tags: Array.isArray(contact.tags) ? contact.tags.join(", ") : "",
      workingLocations: String(details.workingLocations || ""), yearsExperience: String(details.yearsExperience || ""),
    };
    if (mask) { source.phone = maskPhone(source.phone); source.whatsapp = maskPhone(source.whatsapp); source.email = maskEmail(source.email); }
    const row: RoomRow = {};
    for (const column of columns) {
      row[column.key] = column.key.startsWith("d.") ? cleanText(details[column.key.slice(2)], 600) : cleanText(source[column.key], 600);
    }
    return row;
  });
  return { columns, rows };
}

export function buildRateSnapshot(rates: { item: string; group: string; spec?: string; unit?: string; rate: number; supplierName?: string; city?: string; state?: string; validTill?: Date | string | null }[], fieldKeys: string[], groupLabel: (g: string) => string): { columns: RoomColumn[]; rows: RoomRow[] } {
  const wanted = new Set(fieldKeys);
  const columns = rateShareFields.filter((field) => wanted.has(field.key));
  if (!columns.length) throw new InputError("Choose at least one field to share.");
  const rows = rates.map((rate) => {
    const source: Record<string, string> = {
      item: rate.item, groupLabel: groupLabel(rate.group), spec: rate.spec || "", unit: rate.unit || "", rate: String(rate.rate ?? ""),
      supplierName: rate.supplierName || "", city: rate.city || "", state: rate.state || "", validTill: rate.validTill ? new Date(rate.validTill).toISOString().slice(0, 10) : "",
    };
    const row: RoomRow = {};
    for (const column of columns) row[column.key] = cleanText(source[column.key], 600);
    return row;
  });
  return { columns, rows };
}

export function assertSnapshotSize(rows: RoomRow[]) {
  if (!rows.length) throw new InputError("No records match your selection, so there is nothing to share.");
  if (rows.length > MAX_ROOM_ROWS) throw new InputError(`A shared database can hold up to ${MAX_ROOM_ROWS} rows. Narrow your selection and try again.`);
  if (JSON.stringify(rows).length > MAX_ROOM_BYTES) throw new InputError("This selection is too large to share. Choose fewer fields or fewer records.");
}

/* ---------- input ---------- */
export function resolveExpiry(input: { expiryHours?: unknown; expiresAt?: unknown }, now: Date = new Date()): Date {
  let date: Date | null = null;
  const hours = Number(input.expiryHours);
  if (input.expiryHours !== undefined && input.expiryHours !== null && input.expiryHours !== "" && Number.isFinite(hours)) date = new Date(now.getTime() + hours * 3600_000);
  else if (typeof input.expiresAt === "string" && input.expiresAt && !Number.isNaN(Date.parse(input.expiresAt))) date = new Date(input.expiresAt);
  if (!date) throw new InputError("Choose how long this link should work (an expiry is required).");
  if (date.getTime() <= now.getTime() + 60_000) throw new InputError("The expiry must be in the future.");
  if (date.getTime() > now.getTime() + MAX_EXPIRY_HOURS * 3600_000) throw new InputError("The expiry can be at most one year away.");
  return date;
}

export function normalizePayment(payload: Record<string, unknown>) {
  const status = ["free", "unpaid", "paid"].includes(String(payload.paymentStatus)) ? String(payload.paymentStatus) as PaymentStatus : "free";
  let price: number | null = null;
  if (payload.price !== undefined && payload.price !== null && payload.price !== "") {
    const n = Number(String(payload.price).replace(/[,₹\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new InputError("Price must be a positive amount in rupees.");
    price = Math.round(n);
  }
  return { paymentStatus: status, price, requirePayment: payload.requirePayment === true && status !== "free", invoiceNote: cleanText(payload.invoiceNote, 500) };
}

export function normalizeMaxViews(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || Number(value) === 0) return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 10_000) throw new InputError("Open limit must be a whole number between 1 and 10,000.");
  return n;
}
