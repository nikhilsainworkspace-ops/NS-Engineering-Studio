import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { adminIsConfigured } from "@/lib/env";

export const runtime = "nodejs";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    await dbConnect();
    return NextResponse.json({ database: "connected", databaseName: process.env.CIVIL_AT_HAND_MONGODB_DB || "from workspace connection string", authConfigured: adminIsConfigured() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ database: "error", message: "MongoDB could not be reached. Check your URI, database user and Atlas network access." }, { status: 503 });
  }
}
