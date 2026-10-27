// Browser-safe parts of the data-room feature (no Node-only imports), used by both the server and the admin screens.
export const MAX_ROOM_ROWS = 3000;
export type RoomColumn = { key: string; label: string };
export type RoomStatus = "live" | "paused" | "expired" | "exhausted" | "awaiting-payment" | "locked";

export const roomStatusLabel: Record<RoomStatus, string> = {
  live: "Live", paused: "Paused", expired: "Expired", exhausted: "Open limit reached", "awaiting-payment": "Awaiting payment", locked: "Locked (wrong passcodes)",
};

export const contactShareFields: RoomColumn[] = [
  { key: "name", label: "Name" }, { key: "categoryLabel", label: "Category" }, { key: "organization", label: "Business / Company" },
  { key: "jobTitle", label: "Job title" }, { key: "teamRole", label: "Team role" }, { key: "city", label: "City" }, { key: "state", label: "State" },
  { key: "phoneLabel", label: "Phone label" }, { key: "phone", label: "Phone" }, { key: "additionalPhones", label: "Additional phone numbers" }, { key: "whatsapp", label: "WhatsApp" },
  { key: "emailLabel", label: "Email label" }, { key: "email", label: "Email" }, { key: "additionalEmails", label: "Additional email addresses" }, { key: "birthday", label: "Birthday" }, { key: "tags", label: "Labels / tags" },
  { key: "workingLocations", label: "Working / Delivery Locations" }, { key: "yearsExperience", label: "Experience" },
];

export const rateShareFields: RoomColumn[] = [
  { key: "item", label: "Item" }, { key: "groupLabel", label: "Type" }, { key: "spec", label: "Brand / Grade / Size" }, { key: "unit", label: "Unit" },
  { key: "rate", label: "Rate (INR)" }, { key: "supplierName", label: "Supplier" }, { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "validTill", label: "Valid till" },
];

/** Contacts a data room may include. A contact who said "no" is never included. */
export function consentAllows(consent: string | undefined, requireConsent: boolean): boolean {
  if (consent === "no") return false;
  return requireConsent ? consent === "yes" : true;
}


export function whatsappMessage(opts: { recipient: string; title: string; url: string; passcode?: string; expiresAt: Date | string; ownerName: string }): string {
  const when = new Date(opts.expiresAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return [`Hello ${opts.recipient || ""}`.trim() + ",", `Here is your secure access to "${opts.title}":`, opts.url, opts.passcode ? `Passcode: ${opts.passcode}` : "", `This link is valid until ${when}. It is confidential and licensed only to you.`, `— ${opts.ownerName}`].filter(Boolean).join("\n");
}

