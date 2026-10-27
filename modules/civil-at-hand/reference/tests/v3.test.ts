import assert from "node:assert/strict";
import test from "node:test";
import { base32Decode, base32Encode, generateTotpSecret, hotp, isValidTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { clientIpFromHeaders, fetchSiteAllowed, maskEmail, maskIp, maskPhone, shortAgent } from "@/lib/security";
import { assertSnapshotSize, buildContactSnapshot, buildRateSnapshot, consentAllows, generatePasscode, hashPasscode, isRepeatView, normalizeMaxViews, normalizePayment, resolveExpiry, roomStatus, validatePasscode, verifyPasscode, whatsappMessage } from "@/lib/rooms";
import { compareRates, isStaleRate, normalizeRateInput, rateGroupLabel } from "@/lib/rates";
import { completeness, mergeContactRecords } from "@/lib/merge";
import { normalizeContactInput } from "@/lib/contact-input";
import { normalizeProjectInput } from "@/lib/projects";
import { buildReport } from "@/lib/reports";

/* ---------- 2-step verification ---------- */
test("TOTP matches the RFC 6238 test vectors (SHA-1)", () => {
  const secret = base32Encode(new TextEncoder().encode("12345678901234567890"));
  assert.equal(hotp(secret, Math.floor(59 / 30), 8), "94287082");
  assert.equal(hotp(secret, Math.floor(1111111109 / 30), 8), "07081804");
  assert.equal(hotp(secret, Math.floor(20000000000 / 30), 8), "65353130");
});
test("base32 round-trips and rejects bad characters", () => {
  const bytes = new Uint8Array([1, 2, 3, 250, 251, 252, 0, 9, 8, 7]);
  assert.deepEqual(Array.from(base32Decode(base32Encode(bytes))), Array.from(bytes));
  assert.throws(() => base32Decode("AB1!"));
  assert.equal(isValidTotpSecret("not valid!"), false);
  assert.equal(isValidTotpSecret(undefined), false);
  assert.equal(isValidTotpSecret(generateTotpSecret()), true);
});
test("verifyTotp accepts current and ±1 step, rejects others and bad shapes", () => {
  const secret = generateTotpSecret(); const now = 1_700_000_000_000; const step = Math.floor(now / 30000);
  assert.equal(verifyTotp(secret, hotp(secret, step), now), step);
  assert.equal(verifyTotp(secret, hotp(secret, step - 1), now), step - 1);
  assert.equal(verifyTotp(secret, hotp(secret, step + 1), now), step + 1);
  assert.equal(verifyTotp(secret, hotp(secret, step + 5), now), null);
  assert.equal(verifyTotp(secret, "12345", now), null);
  assert.equal(verifyTotp(secret, "abcdef", now), null);
  assert.match(otpauthUrl("ABC", "admin", "Civil At Hand"), /^otpauth:\/\/totp\/Civil%20At%20Hand%3Aadmin\?secret=ABC&issuer=Civil%20At%20Hand/);
});

/* ---------- security helpers ---------- */
test("only same-origin / direct requests pass the cross-site guard", () => {
  assert.equal(fetchSiteAllowed("same-origin"), true); assert.equal(fetchSiteAllowed("none"), true); assert.equal(fetchSiteAllowed(null), true);
  assert.equal(fetchSiteAllowed("cross-site"), false); assert.equal(fetchSiteAllowed("same-site"), false);
});
test("IPs are masked, agents summarised, contact details masked", () => {
  assert.equal(maskIp("203.0.113.57"), "203.0.113.x"); assert.equal(maskIp("2001:db8:abcd:12::1"), "2001:db8:abcd::x"); assert.equal(maskIp(""), "unknown");
  assert.equal(shortAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537"), "Chrome on Windows");
  assert.equal(shortAgent("Mozilla/5.0 (iPhone) Safari/604"), "Safari on iOS");
  assert.equal(maskPhone("+91 98765 43210"), "91•••••••210"); assert.equal(maskPhone(""), ""); assert.equal(maskPhone("123"), "•••");
  assert.equal(maskEmail("ravi@example.com"), "ra••@example.com"); assert.equal(maskEmail(""), "");
  assert.equal(clientIpFromHeaders((n) => (n === "x-real-ip" ? "1.2.3.4" : null)), "1.2.3.4");
  assert.equal(clientIpFromHeaders((n) => (n === "x-forwarded-for" ? "9.9.9.9, 5.6.7.8" : null)), "5.6.7.8");
});

/* ---------- data rooms ---------- */
const base = { active: true, expiresAt: new Date(Date.now() + 3600_000), maxViews: null, viewCount: 0, paymentStatus: "free", requirePayment: false, lockedUntil: null };
test("room status follows pause, expiry, open limit, payment and lock rules", () => {
  assert.equal(roomStatus(base), "live");
  assert.equal(roomStatus({ ...base, active: false }), "paused");
  assert.equal(roomStatus({ ...base, expiresAt: new Date(Date.now() - 1000) }), "expired");
  assert.equal(roomStatus({ ...base, maxViews: 2, viewCount: 2 }), "exhausted");
  assert.equal(roomStatus({ ...base, maxViews: 2, viewCount: 1 }), "live");
  assert.equal(roomStatus({ ...base, paymentStatus: "unpaid", requirePayment: true }), "awaiting-payment");
  assert.equal(roomStatus({ ...base, paymentStatus: "paid", requirePayment: true }), "live");
  assert.equal(roomStatus({ ...base, paymentStatus: "unpaid", requirePayment: false }), "live");
  assert.equal(roomStatus({ ...base, lockedUntil: new Date(Date.now() + 60_000) }), "locked");
  assert.equal(roomStatus({ ...base, expiresAt: null }), "expired");
});
test("expiry is required, in the future, and at most a year away", () => {
  const now = new Date("2026-10-13T10:00:00Z");
  assert.equal(resolveExpiry({ expiryHours: 24 }, now).toISOString(), "2026-10-14T10:00:00.000Z");
  assert.equal(resolveExpiry({ expiresAt: "2026-10-20T10:00:00Z" }, now).toISOString(), "2026-10-20T10:00:00.000Z");
  assert.throws(() => resolveExpiry({}, now), /expiry is required/); assert.throws(() => resolveExpiry({ expiryHours: 0 }, now), /future/);
  assert.throws(() => resolveExpiry({ expiresAt: "2025-01-01T00:00:00Z" }, now), /future/); assert.throws(() => resolveExpiry({ expiryHours: 24 * 400 }, now), /one year/);
  assert.throws(() => resolveExpiry({ expiresAt: "garbage" }, now), /expiry is required/);
});
test("passcodes are strong, hashed, and verified without storing the plain text", async () => {
  const code = generatePasscode(); assert.equal(code.length, 8); assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  const hash = await hashPasscode("Secret-123"); assert.ok(hash.startsWith("scrypt$")); assert.ok(!hash.includes("Secret-123"));
  assert.equal(await verifyPasscode("Secret-123", hash), true); assert.equal(await verifyPasscode("secret-123", hash), false);
  assert.equal(await verifyPasscode("", hash), false); assert.equal(await verifyPasscode("x", "garbage"), false);
  assert.notEqual(await hashPasscode("Secret-123"), hash);
  assert.throws(() => validatePasscode("abc"), /4 to 40/); assert.equal(validatePasscode("  abcd  "), "abcd");
});
test("payment and open-limit input is validated", () => {
  assert.deepEqual(normalizePayment({ paymentStatus: "unpaid", price: "₹5,000", requirePayment: true }), { paymentStatus: "unpaid", price: 5000, requirePayment: true, invoiceNote: "" });
  assert.equal(normalizePayment({ paymentStatus: "free", requirePayment: true }).requirePayment, false);
  assert.equal(normalizePayment({}).paymentStatus, "free"); assert.throws(() => normalizePayment({ price: "abc" }), /Price/); assert.throws(() => normalizePayment({ price: -5 }), /Price/);
  assert.equal(normalizeMaxViews(""), null); assert.equal(normalizeMaxViews(0), null); assert.equal(normalizeMaxViews("3"), 3); assert.throws(() => normalizeMaxViews(-1), /Open limit/);
});
test("reloading from the same device within 15 minutes is not a new open", () => {
  const now = new Date("2026-10-13T10:00:00Z");
  const log = [{ at: new Date("2026-10-13T09:50:00Z"), kind: "open", ip: "1.2.3.x", agent: "Chrome on Windows" }];
  assert.equal(isRepeatView(log, "1.2.3.x", "Chrome on Windows", now), true);
  assert.equal(isRepeatView(log, "9.9.9.x", "Chrome on Windows", now), false);
  assert.equal(isRepeatView(log, "1.2.3.x", "Chrome on Windows", new Date("2026-10-13T10:30:00Z")), false);
  assert.equal(isRepeatView([], "a", "b", now), false);
  assert.equal(isRepeatView([{ ...log[0], kind: "denied" }], "1.2.3.x", "Chrome on Windows", now), false);
});
test("a contact who said no is never shared; unknown needs the override", () => {
  assert.equal(consentAllows("yes", true), true); assert.equal(consentAllows("", true), false); assert.equal(consentAllows(undefined, true), false);
  assert.equal(consentAllows("", false), true); assert.equal(consentAllows("no", false), false); assert.equal(consentAllows("no", true), false);
});
const sample = [
  { category: "manpower-supplier", name: "Ravi Kumar", phone: "9876543210", email: "ravi@example.com", organization: "Ravi Labour", city: "Ludhiana", state: "Punjab", notes: "SECRET internal note", tags: ["secret-tag"], status: "qualified",
    details: { whatsapp: "9876543210", workingLocations: "Punjab", yearsExperience: "10", notes: "SECRET details note", skills: "Masons" } },
];
test("a shared snapshot contains only chosen fields and never private data", () => {
  const snap = buildContactSnapshot(sample as never, ["name", "city", "phone"], true, false);
  const text = JSON.stringify(snap);
  for (const secret of ["SECRET", "secret-tag", "qualified"]) assert.ok(!text.includes(secret), `leaked ${secret}`);
  assert.deepEqual(snap.columns.slice(0, 3).map((c) => c.key), ["name", "city", "phone"]);
  assert.equal(snap.rows[0].name, "Ravi Kumar"); assert.equal(snap.rows[0].phone, "9876543210"); assert.ok(!("email" in snap.rows[0]));
  assert.ok(snap.columns.some((c) => c.key.startsWith("d.")));
  assert.ok(!snap.columns.some((c) => c.key === "d.notes" || c.key === "d.fullName"));
});
test("shared snapshots include selected Google Contacts fields and mask all extra phone/email values", () => {
  const contacts = [{
    category: "general-contact", name: "Asha Rao", jobTitle: "Engineer", teamRole: "Team Lead", birthday: "1990-04-05",
    organization: "Rao Build", phone: "+91 98765 43210", phoneLabel: "Mobile", phoneNumbers: [{ label: "Work", number: "01724442222" }],
    email: "asha@example.com", emailAddresses: [{ label: "Home", value: "asha.home@example.com" }], tags: ["trusted", "north"],
    city: "Chandigarh", state: "Punjab", details: { whatsapp: "9876543210", notes: "PRIVATE" }, notes: "PRIVATE", status: "qualified",
  }];
  const snap = buildContactSnapshot(contacts as never, ["name", "jobTitle", "teamRole", "phone", "additionalPhones", "email", "additionalEmails", "birthday", "tags"], false, false);
  assert.equal(snap.rows[0].jobTitle, "Engineer");
  assert.equal(snap.rows[0].teamRole, "Team Lead");
  assert.equal(snap.rows[0].additionalPhones, "Work: 01724442222");
  assert.equal(snap.rows[0].additionalEmails, "Home: asha.home@example.com");
  assert.equal(snap.rows[0].birthday, "1990-04-05");
  assert.equal(snap.rows[0].tags, "trusted, north");
  assert.ok(!JSON.stringify(snap).includes("PRIVATE"));
  const masked = buildContactSnapshot(contacts as never, ["phone", "additionalPhones", "email", "additionalEmails"], false, true);
  assert.ok(!JSON.stringify(masked).includes("01724442222"));
  assert.ok(!JSON.stringify(masked).includes("asha.home@example.com"));
});

test("preview mode masks phone and email", () => {
  const snap = buildContactSnapshot(sample as never, ["name", "phone", "email", "whatsapp"], false, true);
  assert.equal(snap.rows[0].phone, "98•••••210"); assert.equal(snap.rows[0].email, "ra••@example.com"); assert.ok(!JSON.stringify(snap).includes("9876543210"));
  assert.throws(() => buildContactSnapshot(sample as never, [], false, false), /at least one field/);
});
test("rate snapshots and size limits", () => {
  const snap = buildRateSnapshot([{ item: "Cement", group: "material", spec: "OPC 53", unit: "bag", rate: 385, supplierName: "ABC", city: "Mohali", state: "Punjab", validTill: "2026-12-31" }], ["item", "rate", "validTill"], rateGroupLabel);
  assert.deepEqual(snap.rows[0], { item: "Cement", rate: "385", validTill: "2026-12-31" });
  assert.throws(() => assertSnapshotSize([]), /nothing to share/);
  assert.throws(() => assertSnapshotSize(Array.from({ length: 3001 }, () => ({ a: "b" }))), /3000/);
  assertSnapshotSize([{ a: "b" }]);
});
test("the WhatsApp message carries link, passcode and expiry", () => {
  const msg = whatsappMessage({ recipient: "Acme", title: "Suppliers", url: "https://x.test/shared/abc", passcode: "K7M2QPXA", expiresAt: "2026-10-20T10:00:00Z", ownerName: "Civil At Hand" });
  assert.ok(msg.includes("https://x.test/shared/abc") && msg.includes("K7M2QPXA") && msg.includes("Hello Acme,"));
});

/* ---------- rate book ---------- */
test("rate input is validated and compared across suppliers", () => {
  const r = normalizeRateInput({ item: "  Cement  ", rate: "₹1,250.456", group: "bogus", validTill: "2026-12-31", supplierContactId: "zzz" });
  assert.equal(r.item, "Cement"); assert.equal(r.rate, 1250.46); assert.equal(r.group, "material"); assert.equal(r.supplierContactId, ""); assert.ok(r.validTill instanceof Date);
  assert.throws(() => normalizeRateInput({ rate: 5 }), /Item name/); assert.throws(() => normalizeRateInput({ item: "x", rate: "abc" }), /rate/); assert.throws(() => normalizeRateInput({ item: "x" }), /rate/);
  const list = [{ _id: "1", item: "Cement", spec: "OPC", unit: "bag", rate: 400, supplierName: "A" }, { _id: "2", item: "cement", spec: "opc", unit: "BAG", rate: 380, supplierName: "B" }, { _id: "3", item: "Sand", unit: "cum", rate: 900 }];
  const out = compareRates(list); assert.equal(out[0].quotes, 2); assert.equal(out[0].low, 380); assert.equal(out[0].high, 400); assert.equal(out[0].average, 390); assert.equal(out[0].bestSupplier, "B");
  assert.equal(isStaleRate("2026-01-01T00:00:00Z", new Date("2026-10-13")), true); assert.equal(isStaleRate("2026-10-01T00:00:00Z", new Date("2026-10-13")), false);
});

/* ---------- merge ---------- */
test("merging fills blanks, unions tags, keeps history, and a refusal to share wins", () => {
  const primary = { _id: "a", phone: "9876543210", email: "", organization: "", tags: ["x"], notes: "one", details: { skills: "", city: "A" }, rating: 3, shareConsent: "yes", interactions: [{ at: "2026-01-02", type: "call", note: "n1" }] };
  const other = { _id: "b", phone: "1111111111", email: "A@B.COM", organization: "Org", tags: ["x", "y"], notes: "two", details: { skills: "Mason", city: "B" }, rating: 5, shareConsent: "no", flag: "avoid", interactions: [{ at: "2026-01-01", type: "note", note: "n0" }] };
  const m = mergeContactRecords(primary, [other]);
  assert.equal(m.phone, "9876543210"); assert.equal(m.email, "a@b.com"); assert.equal(m.organization, "Org"); assert.deepEqual(m.tags, ["x", "y"]);
  assert.equal(m.details.skills, "Mason"); assert.equal(m.details.city, "A"); assert.equal(m.notes, "one\n---\ntwo"); assert.equal(m.rating, 5);
  assert.equal(m.shareConsent, "no"); assert.equal(m.flag, "avoid"); assert.deepEqual(m.interactions.map((i) => i.note), ["n0", "n1"]);
  assert.ok(completeness(other) > completeness({ _id: "z" }));
});

/* ---------- existing validators gained optional fields ---------- */
const VALID = { fullName: "A B", phone: "9876543210", city: "Jaipur", state: "Rajasthan", workerTypes: "Welders", teamSize: "10–20 people / 10–20 लोग" };
test("rating, flag and consent are only touched when sent", () => {
  const without = normalizeContactInput({ category: "manpower-supplier", details: VALID });
  assert.ok(!("rating" in without) && !("flag" in without) && !("shareConsent" in without));
  const withExtras = normalizeContactInput({ category: "manpower-supplier", details: VALID, rating: 9, flag: "avoid", shareConsent: "yes" });
  assert.equal(withExtras.rating, 5); assert.equal(withExtras.flag, "avoid"); assert.equal(withExtras.shareConsent, "yes");
  assert.equal(normalizeContactInput({ category: "manpower-supplier", details: VALID, flag: "weird", shareConsent: "maybe" }).flag, "");
});
test("project billing is parsed and reported as money to collect", () => {
  const p = normalizeProjectInput({ title: "Road", estimatedValue: "100000", billedAmount: "60,000", receivedAmount: "25000" });
  assert.equal(p.billedAmount, 60000); assert.equal(p.receivedAmount, 25000);
  const report = buildReport([], [{ status: "ongoing", estimatedValue: 1, billedAmount: 60000, receivedAmount: 25000 }, { status: "completed", estimatedValue: 1, billedAmount: 10000, receivedAmount: 12000 }], [], new Date(), [{ price: 5000, paymentStatus: "paid", viewCount: 3, status: "live" }, { price: 2000, paymentStatus: "unpaid", viewCount: 0, status: "expired" }]);
  assert.equal(report.outstanding, 35000); assert.equal(report.billedTotal, 70000); assert.equal(report.dataSold, 5000); assert.equal(report.dataPending, 2000); assert.equal(report.liveRooms, 1); assert.equal(report.roomOpens, 3);
});
