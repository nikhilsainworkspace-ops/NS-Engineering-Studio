// Server-side gatekeeper for client access to a data room. Every client request goes through here.
import { createHash } from "node:crypto";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { tooManyRequests } from "@/modules/civil-at-hand/lib/rate-limit";
import { isRepeatView, LOCK_MINUTES, MAX_ATTEMPTS, roomStatus, verifyPasscode } from "@/modules/civil-at-hand/lib/rooms";
import { clientIpFromHeaders, maskIp, shortAgent } from "@/modules/civil-at-hand/lib/security";
import { DataRoom } from "@/modules/civil-at-hand/models/DataRoom";
import type { DataRoomDoc } from "@/modules/civil-at-hand/lib/types";

export const TOKEN_PATTERN = /^[a-f0-9]{48}$/;
export const UNAVAILABLE = "This link is unavailable or has expired. Please ask the sender for a new link.";

type Lean = DataRoomDoc & { _id: unknown };
export type AccessResult =
  | { ok: true; room: Lean }
  | { ok: false; status: number; code: string; message: string; remaining?: number };

const fail = (status: number, code: string, message: string, remaining?: number): AccessResult => ({ ok: false, status, code, message, remaining });

export async function accessRoom(request: Request, token: string, passcode: string, kind: "open" | "download"): Promise<AccessResult> {
  if (!TOKEN_PATTERN.test(token)) return fail(404, "unavailable", UNAVAILABLE);
  if (await tooManyRequests(request, "room", 90, 600)) return fail(429, "rate", "Too many requests from this device. Please wait a few minutes and try again.");
  await dbConnect();
  const room = (await DataRoom.findOne({ token }).lean()) as unknown as Lean | null;
  if (!room) return fail(404, "unavailable", UNAVAILABLE);
  const now = new Date();
  const status = roomStatus(room, now);
  if (status === "paused" || status === "expired") return fail(404, "unavailable", UNAVAILABLE);
  if (status === "awaiting-payment") return fail(403, "awaiting-payment", "This access has not been activated yet. Please contact the sender.");
  if (status === "locked") return fail(429, "locked", `Too many wrong passcodes. Please try again after ${LOCK_MINUTES} minutes.`);
  // "exhausted" is decided below, after the passcode check, so a reload from the same device is still allowed.

  const ip = maskIp(clientIpFromHeaders((name) => request.headers.get(name)));
  const agent = shortAgent(request.headers.get("user-agent"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const push = (entry: { kind: string }): Record<string, any> => ({ $push: { accessLog: { $each: [{ at: now, ip, agent, ...entry }], $slice: -60 } } });

  if (room.passcodeHash) {
    const good = passcode ? await verifyPasscode(passcode, room.passcodeHash) : false;
    if (!good) {
      const after = (await DataRoom.findOneAndUpdate({ _id: room._id }, { $inc: { failedAttempts: 1 }, ...push({ kind: "denied" }) }, { new: true }).lean()) as unknown as Lean | null;
      const used = after?.failedAttempts ?? 1;
      if (used >= MAX_ATTEMPTS) {
        await DataRoom.updateOne({ _id: room._id }, { $set: { failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) } });
        return fail(429, "locked", `Too many wrong passcodes. Please try again after ${LOCK_MINUTES} minutes.`);
      }
      return fail(401, "passcode", passcode ? "That passcode is not correct." : "Enter the passcode you were given.", MAX_ATTEMPTS - used);
    }
    if (room.failedAttempts) await DataRoom.updateOne({ _id: room._id }, { $set: { failedAttempts: 0 } });
  }

  if (kind === "download") {
    if (!room.allowDownload) return fail(403, "no-download", "Downloads are not enabled for this link.");
    await DataRoom.updateOne({ _id: room._id }, push({ kind: "download" }));
    return { ok: true, room };
  }

  if (isRepeatView(room.accessLog, ip, agent, now)) {
    await DataRoom.updateOne({ _id: room._id }, { $set: { lastViewedAt: now } });
    return { ok: true, room };
  }
  // Count the open atomically so two people cannot slip past an "open limit" together.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { _id: room._id, $or: [{ maxViews: null }, { $expr: { $lt: ["$viewCount", "$maxViews"] } }] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { $inc: { viewCount: 1 }, $set: { lastViewedAt: now }, ...push({ kind: "open" }) };
  const counted = await DataRoom.findOneAndUpdate(filter, update, { new: true }).lean();
  if (!counted) return fail(410, "exhausted", "This link has reached the number of times it may be opened. Please ask the sender for a new link.");
  return { ok: true, room };
}

/** Stable short fingerprint so a leaked file can be traced to the person it was licensed to. */
export function licenseCode(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 8).toUpperCase();
}
