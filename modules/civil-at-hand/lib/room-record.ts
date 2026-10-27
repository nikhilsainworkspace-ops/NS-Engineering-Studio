import { getBaseUrl } from "@/modules/civil-at-hand/lib/brand";
import { roomStatus } from "@/modules/civil-at-hand/lib/rooms";
import type { DataRoomDoc, RoomRecord } from "@/modules/civil-at-hand/lib/types";

type Lean = Partial<DataRoomDoc> & { _id: unknown; token: string };

/** The browser-safe view of a room. Never includes the token's rows, the passcode hash or raw IP data. */
export function toRoomRecord(room: Lean, requestUrl: string, detail = false): RoomRecord {
  const base = {
    _id: String(room._id), title: room.title || "", recipientName: room.recipientName || "", recipientContact: room.recipientContact || "", message: room.message || "",
    dataset: (room.dataset || "contacts") as "contacts" | "rates", rowCount: room.rowCount || 0, masked: Boolean(room.masked), active: Boolean(room.active),
    expiresAt: new Date(room.expiresAt as Date).toISOString(), hasPasscode: Boolean(room.passcodeHash), maxViews: room.maxViews ?? null, viewCount: room.viewCount || 0,
    allowDownload: Boolean(room.allowDownload), watermark: Boolean(room.watermark), price: room.price ?? null, paymentStatus: room.paymentStatus || "free",
    paidAt: room.paidAt ? new Date(room.paidAt).toISOString() : null, requirePayment: Boolean(room.requirePayment), invoiceNote: room.invoiceNote || "",
    lastViewedAt: room.lastViewedAt ? new Date(room.lastViewedAt).toISOString() : null,
    status: roomStatus({ active: Boolean(room.active), expiresAt: room.expiresAt as Date, maxViews: room.maxViews ?? null, viewCount: room.viewCount || 0, paymentStatus: room.paymentStatus || "free", requirePayment: Boolean(room.requirePayment), lockedUntil: room.lockedUntil }),
    shareUrl: `${getBaseUrl(requestUrl)}/workspace/shared/${room.token}`, createdAt: new Date(room.createdAt as Date).toISOString(),
  };
  if (!detail) return base;
  return {
    ...base, columns: room.columns || [], preview: (room.rows || []).slice(0, 15),
    accessLog: [...(room.accessLog || [])].reverse().map((e) => ({ at: new Date(e.at).toISOString(), kind: e.kind, ip: e.ip, agent: e.agent })),
  };
}
