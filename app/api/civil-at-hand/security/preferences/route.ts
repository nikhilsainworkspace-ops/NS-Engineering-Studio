import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { AdminPreference } from "@/modules/civil-at-hand/models/AdminPreference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED_MINUTES = [0, 5, 15, 30, 60] as const;
const PRIVATE_HEADERS = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate", Pragma: "no-cache", Expires: "0", Vary: "Cookie" };

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export async function GET() {
  if (!(await isAdmin())) return response({ error: "Sign in to continue." }, 401);
  try {
    await dbConnect();
    const preference = await AdminPreference.findByIdAndUpdate(
      "admin",
      { $setOnInsert: { autoLockMinutes: 15 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return response({ autoLockMinutes: preference?.autoLockMinutes ?? 15 });
  } catch (error) {
    console.error("Admin preference read failed:", error);
    return response({ error: "Could not load security preferences from the database." }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return response({ error: "Sign in to continue." }, 401);
  let body: { autoLockMinutes?: unknown };
  try { body = await request.json(); }
  catch { return response({ error: "Send a valid JSON request." }, 400); }

  const value = Number(body.autoLockMinutes);
  if (!ALLOWED_MINUTES.includes(value as (typeof ALLOWED_MINUTES)[number])) {
    return response({ error: "Auto-lock must be 0, 5, 15, 30, or 60 minutes. Zero disables the browser auto-lock and is not recommended." }, 400);
  }

  try {
    await dbConnect();
    await AdminPreference.findByIdAndUpdate("admin", { $set: { autoLockMinutes: value } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    await audit(request, "security-setting-updated", `Browser auto-lock changed to ${value === 0 ? "never" : `${value} minutes`}`);
    return response({ ok: true, autoLockMinutes: value });
  } catch (error) {
    console.error("Admin preference update failed:", error);
    return response({ error: "Could not save security preferences to the database." }, 503);
  }
}
