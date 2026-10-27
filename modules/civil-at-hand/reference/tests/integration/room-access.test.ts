// Runs the real accessRoom() gatekeeper against a tiny in-memory stand-in for MongoDB.
// Run with: node --import tsx --experimental-test-module-mocks --test tests/integration/room-access.test.ts
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { hashPasscode } from "@/lib/rooms";

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let store: Doc[] = [];

function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$or") return (cond as Doc[]).some((f) => matches(doc, f));
    if (key === "$expr") { const [op, a, b] = (cond as Doc).$lt ? ["$lt", ...(cond as Doc).$lt] : []; const val = (x: string) => (typeof x === "string" && x.startsWith("$") ? doc[x.slice(1)] : x); return op === "$lt" && val(a) < val(b); }
    if (cond === null) return doc[key] === null || doc[key] === undefined;
    return doc[key] === cond;
  });
}
function applyUpdate(doc: Doc, update: Doc) {
  for (const [k, v] of Object.entries(update.$inc || {})) doc[k] = (doc[k] || 0) + (v as number);
  Object.assign(doc, update.$set || {});
  for (const [k, v] of Object.entries(update.$push || {})) { const { $each, $slice } = v as Doc; doc[k] = [...(doc[k] || []), ...$each].slice($slice); }
}
const query = (get: () => Doc | null) => ({ lean: async () => { const d = get(); return d ? JSON.parse(JSON.stringify(d), (_k, v) => v) && d : null; }, select() { return this; } });
const DataRoom = {
  findOne: (f: Doc) => query(() => store.find((d) => matches(d, f)) || null),
  findOneAndUpdate: (f: Doc, u: Doc) => query(() => { const d = store.find((x) => matches(x, f)); if (d) applyUpdate(d, u); return d || null; }),
  updateOne: async (f: Doc, u: Doc) => { const d = store.find((x) => matches(x, f)); if (d) applyUpdate(d, u); },
};
mock.module("@/models/DataRoom", { namedExports: { DataRoom } });
mock.module("@/lib/db", { namedExports: { dbConnect: async () => undefined } });
mock.module("@/lib/rate-limit", { namedExports: { tooManyRequests: async () => false } });

const TOKEN = "a".repeat(48);
const req = (ip = "1.2.3.4") => new Request("https://x.test", { headers: { "x-real-ip": ip, "user-agent": "Mozilla/5.0 (Windows) Chrome/1" } });
async function room(over: Doc = {}): Promise<Doc> {
  return { _id: "r1", token: TOKEN, title: "T", active: true, expiresAt: new Date(Date.now() + 3600_000), passcodeHash: await hashPasscode("GOODPASS"), failedAttempts: 0, lockedUntil: null, maxViews: null, viewCount: 0,
    paymentStatus: "free", requirePayment: false, allowDownload: true, accessLog: [], columns: [], rows: [], ...over };
}

test("accessRoom enforces passcode, lockout, open limit, payment, expiry and revocation", async () => {
  const { accessRoom } = await import("@/lib/room-access");

  store = [await room()];
  assert.equal((await accessRoom(req(), "short", "", "open") as Doc).status, 404, "bad token shape");
  assert.equal((await accessRoom(req(), "b".repeat(48), "", "open") as Doc).status, 404, "unknown token");
  let r = await accessRoom(req(), TOKEN, "", "open") as Doc; assert.equal(r.status, 401); assert.equal(r.code, "passcode");
  r = await accessRoom(req(), TOKEN, "WRONG", "open") as Doc; assert.equal(r.remaining, 3);
  r = await accessRoom(req(), TOKEN, "GOODPASS", "open") as Doc; assert.equal(r.ok, true); assert.equal(store[0].failedAttempts, 0, "reset after success"); assert.equal(store[0].viewCount, 1);
  assert.deepEqual(store[0].accessLog.map((e: Doc) => e.kind), ["denied", "denied", "open"]);

  // five wrong passcodes lock the room, and even the right passcode is refused while locked
  store = [await room()];
  for (let i = 0; i < 4; i += 1) await accessRoom(req(), TOKEN, "nope", "open");
  r = await accessRoom(req(), TOKEN, "nope", "open") as Doc; assert.equal(r.code, "locked"); assert.ok(store[0].lockedUntil);
  r = await accessRoom(req(), TOKEN, "GOODPASS", "open") as Doc; assert.equal(r.code, "locked");

  // open limit: second device is refused, the same device may reload
  store = [await room({ maxViews: 1 })];
  assert.equal((await accessRoom(req("5.5.5.5"), TOKEN, "GOODPASS", "open") as Doc).ok, true);
  assert.equal((await accessRoom(req("5.5.5.5"), TOKEN, "GOODPASS", "open") as Doc).ok, true, "reload from same device");
  assert.equal(store[0].viewCount, 1, "reload not counted");
  r = await accessRoom(req("6.6.6.6"), TOKEN, "GOODPASS", "open") as Doc; assert.equal(r.code, "exhausted"); assert.equal(store[0].viewCount, 1);

  // payment lock, pause, expiry
  store = [await room({ paymentStatus: "unpaid", requirePayment: true })];
  assert.equal((await accessRoom(req(), TOKEN, "GOODPASS", "open") as Doc).code, "awaiting-payment");
  store = [await room({ active: false })]; assert.equal((await accessRoom(req(), TOKEN, "GOODPASS", "open") as Doc).status, 404);
  store = [await room({ expiresAt: new Date(Date.now() - 1000) })]; assert.equal((await accessRoom(req(), TOKEN, "GOODPASS", "open") as Doc).status, 404);

  // no passcode set: opens straight away; downloads honour the switch
  store = [await room({ passcodeHash: "" })]; assert.equal((await accessRoom(req(), TOKEN, "", "open") as Doc).ok, true);
  store = [await room({ allowDownload: false })]; assert.equal((await accessRoom(req(), TOKEN, "GOODPASS", "download") as Doc).code, "no-download");
  store = [await room({ allowDownload: true })]; assert.equal((await accessRoom(req(), TOKEN, "GOODPASS", "download") as Doc).ok, true);
  assert.equal((await accessRoom(req(), TOKEN, "bad", "download") as Doc).code, "passcode", "downloads need the passcode too");
});
