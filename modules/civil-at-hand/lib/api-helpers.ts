import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { InputError } from "@/modules/civil-at-hand/lib/errors";

export const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } as const;

/** A request that is valid but conflicts with the record's current state (for example editing a sent quotation). */
export class ConflictError extends Error { constructor(message: string) { super(message); this.name = "ConflictError"; } }
export class NotFoundError extends Error { constructor(message = "Record not found.") { super(message); this.name = "NotFoundError"; } }

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
export const unauthorized = () => json({ error: "Sign in to continue." }, 401);

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2_000_000) throw new InputError("This request is too large. Split it into smaller parts.");
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Send a valid form.");
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("Send a valid form.");
  }
}

/** Maps errors to safe responses. Internal details stay in the server log only. */
export function errorResponse(error: unknown, context: string, fallback = "Could not complete this action. Check the database connection and try again.") {
  if (error instanceof InputError) return json({ error: error.message }, 400);
  if (error instanceof ConflictError) return json({ error: error.message }, 409);
  if (error instanceof NotFoundError) return json({ error: error.message }, 404);
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: number }).code : undefined;
  if (code === 11000) return json({ error: "This record already exists (duplicate entry). Refresh and check before trying again." }, 409);
  const name = typeof error === "object" && error && "name" in error ? (error as { name?: string }).name : "";
  if (name === "ValidationError" || name === "CastError") return json({ error: "Some values were not accepted. Check the form and try again." }, 400);
  console.error(`${context}:`, error instanceof Error ? error.message : error);
  return json({ error: fallback }, 503);
}

/** Wraps an admin-only handler: verifies the server-side session first, then maps errors safely. */
export function adminHandler<C>(context: string, handler: (request: Request, ctx: C) => Promise<Response>) {
  return async (request: Request, ctx: C): Promise<Response> => {
    if (!(await isAdmin())) return unauthorized();
    try { return await handler(request, ctx); }
    catch (error) { return errorResponse(error, context); }
  };
}

/** Serialises lean MongoDB documents (ObjectIds and Dates) into plain JSON-safe objects. */
export function plain<T = Record<string, unknown>>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function todayKey(timezone = "Asia/Kolkata", now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
