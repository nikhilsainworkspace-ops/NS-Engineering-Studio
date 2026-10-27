import { headers } from "next/headers";
import { getAdminSession as getStudioAdminSession } from "@/lib/auth";
import { adminIsConfigured } from "@/lib/env";
import { fetchSiteAllowed } from "@/modules/civil-at-hand/lib/security";

/** The workspace uses the same identity and server-side session as the NS website admin. */
export function authConfigured(): boolean {
  return adminIsConfigured();
}

export async function isAdmin(_options: { touch?: boolean } = {}): Promise<boolean> {
  if (!adminIsConfigured()) return false;
  try {
    const requestHeaders = await headers();
    if (!fetchSiteAllowed(requestHeaders.get("sec-fetch-site"))) return false;
    return Boolean(await getStudioAdminSession());
  } catch {
    // Never log cookies, request headers, or database connection details from an auth guard.
    return false;
  }
}

export async function requireAdmin(): Promise<boolean> {
  return isAdmin();
}
