import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { emailKey, phoneKey } from "@/modules/civil-at-hand/lib/duplicates";

export type DuplicateSummary = { _id: string; name: string; phone: string; email: string; category: string };

/** Existing contacts that share this phone number or email. Call dbConnect() first. */
export async function findDuplicateContacts(
  phone: string,
  email: string,
  excludeId?: string,
  phoneNumbers: { number?: string }[] = [],
  emailAddresses: { value?: string }[] = [],
): Promise<DuplicateSummary[]> {
  const rows = (await Contact.find({}, { name: 1, phone: 1, email: 1, category: 1, phoneNumbers: 1, emailAddresses: 1 }).lean()) as unknown as {
    _id: unknown; name?: string; phone?: string; email?: string; category?: string;
    phoneNumbers?: { number?: string }[]; emailAddresses?: { value?: string }[];
  }[];
  const incomingPhones = new Set([phone, ...phoneNumbers.map((entry) => entry.number || "")].map(phoneKey).filter(Boolean));
  const incomingEmails = new Set([email, ...emailAddresses.map((entry) => entry.value || "")].map(emailKey).filter(Boolean));
  if (!incomingPhones.size && !incomingEmails.size) return [];
  return rows.filter((row) => {
    if (String(row._id) === excludeId) return false;
    const rowPhones = [row.phone, ...(row.phoneNumbers || []).map((entry) => entry.number)].map(phoneKey).filter(Boolean);
    const rowEmails = [row.email, ...(row.emailAddresses || []).map((entry) => entry.value)].map(emailKey).filter(Boolean);
    return rowPhones.some((key) => incomingPhones.has(key)) || rowEmails.some((key) => incomingEmails.has(key));
  }).slice(0, 5).map((row) => ({ _id: String(row._id), name: row.name || "", phone: row.phone || "", email: row.email || "", category: row.category || "" }));
}
