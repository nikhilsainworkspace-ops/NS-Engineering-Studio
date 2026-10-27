import { AuditLog } from "@/modules/civil-at-hand/models/AuditLog";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { clientIpFromHeaders, maskIp, shortAgent } from "@/modules/civil-at-hand/lib/security";

/** Record an admin or security event. Never throws: logging must not break the action it describes. Never pass secrets. */
export async function audit(request: Request | null, action: string, detail = "") {
  try {
    await dbConnect();
    const ip = request ? maskIp(clientIpFromHeaders((name) => request.headers.get(name))) : "";
    const agent = request ? shortAgent(request.headers.get("user-agent")) : "";
    await AuditLog.create({ action: action.slice(0, 60), detail: detail.slice(0, 300), ip, agent });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}
