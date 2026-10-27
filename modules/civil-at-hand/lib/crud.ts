// Shared admin CRUD route builders. Every handler checks the MongoDB-backed admin session first
// (via adminHandler → isAdmin), validates input with the shared field specs, and writes an audit entry.
import mongoose from "mongoose";
import { adminHandler, ConflictError, json, NotFoundError, plain, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { escapeRegex, normalizePartial, normalizeRecord } from "@/modules/civil-at-hand/lib/entity-spec";
import type { EntityDef } from "@/modules/civil-at-hand/lib/entities";
import { InputError } from "@/modules/civil-at-hand/lib/errors";

type Doc = Record<string, unknown> & { _id?: unknown };
type AnyModel = mongoose.Model<Record<string, unknown>>;
export type IdContext = { params: Promise<{ id: string }> };

export type CrudOptions = {
  model: AnyModel;
  def: EntityDef;
  /** Query-string keys that may filter the list, mapped to document fields. */
  filters?: string[];
  /** Fields searched by ?q= (case-insensitive contains). */
  searchFields?: string[];
  sort?: Record<string, 1 | -1>;
  limit?: number;
  /** Fields excluded from list responses (for large or private values). */
  listProjection?: Record<string, 0>;
  /** Adjusts validated data before create/update (numbering, totals, cross-checks). */
  prepare?: (data: Record<string, unknown>, info: { request: Request; existing: Doc | null }) => Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Throw ConflictError to refuse editing a record in its current state. */
  guardEdit?: (existing: Doc) => void;
  /** Throw ConflictError to refuse deleting a record in its current state. */
  guardDelete?: (existing: Doc) => void | Promise<void>;
  /** Short, non-sensitive text recorded in the activity log. */
  describe?: (doc: Doc) => string;
};

function describeDefault(options: CrudOptions, doc: Doc) {
  if (options.describe) return options.describe(doc).slice(0, 120);
  const value = doc[options.def.titleField];
  return String(value instanceof Date ? value.toISOString().slice(0, 10) : value || "").slice(0, 120);
}

export function collectionRoutes(options: CrudOptions) {
  const GET = adminHandler(`${options.def.label} list error`, async (request: Request) => {
    await dbConnect();
    const url = new URL(request.url);
    const filter: Record<string, unknown> = {};
    for (const key of options.filters || []) {
      const value = url.searchParams.get(key);
      if (value !== null && value !== "") filter[key] = value.slice(0, 80);
    }
    const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
    if (q && options.searchFields?.length) filter.$or = options.searchFields.map((field) => ({ [field]: { $regex: escapeRegex(q), $options: "i" } }));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || options.limit || 1000, 1), 3000);
    const rows = await options.model.find(filter, options.listProjection || {}).sort(options.sort || { updatedAt: -1 }).limit(limit).lean();
    return json({ items: plain(rows) });
  });

  const POST = adminHandler(`${options.def.label} create error`, async (request: Request) => {
    const payload = await readJson(request);
    let data = normalizeRecord(options.def.fields, payload);
    await dbConnect();
    if (options.prepare) data = await options.prepare(data, { request, existing: null });
    const created = await options.model.create(data);
    const doc = created.toObject() as Doc;
    await audit(request, `${options.def.key}-created`, describeDefault(options, doc));
    return json({ item: plain(doc) }, 201);
  });

  return { GET, POST };
}

export function itemRoutes(options: CrudOptions) {
  async function load(id: string): Promise<Doc> {
    if (!mongoose.isValidObjectId(id)) throw new InputError(`Invalid ${options.def.label} ID.`);
    await dbConnect();
    const existing = await options.model.findById(id).lean() as Doc | null;
    if (!existing) throw new NotFoundError(`This ${options.def.label} was not found. It may have been deleted.`);
    return existing;
  }

  const GET = adminHandler(`${options.def.label} read error`, async (_request: Request, context: IdContext) => {
    const { id } = await context.params;
    return json({ item: plain(await load(id)) });
  });

  const PUT = adminHandler(`${options.def.label} update error`, async (request: Request, context: IdContext) => {
    const { id } = await context.params;
    const payload = await readJson(request);
    const existing = await load(id);
    options.guardEdit?.(existing);
    let data = normalizeRecord(options.def.fields.filter((field) => !field.hidden || Object.prototype.hasOwnProperty.call(payload, field.key)), payload);
    if (options.prepare) data = await options.prepare(data, { request, existing });
    // Optimistic concurrency: refuse to overwrite a record that changed since it was loaded here.
    const updated = await options.model.findOneAndUpdate({ _id: id, updatedAt: existing.updatedAt }, { $set: data }, { new: true, runValidators: true }).lean() as Doc | null;
    if (!updated) throw new ConflictError("This record was changed somewhere else a moment ago. Refresh and try again.");
    await audit(request, `${options.def.key}-updated`, describeDefault(options, updated));
    return json({ item: plain(updated) });
  });

  const PATCH = adminHandler(`${options.def.label} quick update error`, async (request: Request, context: IdContext) => {
    const { id } = await context.params;
    const payload = await readJson(request);
    const existing = await load(id);
    options.guardEdit?.(existing);
    let data = normalizePartial(options.def.fields, payload);
    if (!Object.keys(data).length) throw new InputError("Nothing to update.");
    if (options.prepare) data = await options.prepare({ ...existing, ...data }, { request, existing });
    delete data._id; delete data.createdAt; delete data.updatedAt; delete data.__v;
    const updated = await options.model.findOneAndUpdate({ _id: id, updatedAt: existing.updatedAt }, { $set: data }, { new: true, runValidators: true }).lean() as Doc | null;
    if (!updated) throw new ConflictError("This record was changed somewhere else a moment ago. Refresh and try again.");
    await audit(request, `${options.def.key}-updated`, describeDefault(options, updated));
    return json({ item: plain(updated) });
  });

  const DELETE = adminHandler(`${options.def.label} delete error`, async (request: Request, context: IdContext) => {
    const { id } = await context.params;
    const existing = await load(id);
    await options.guardDelete?.(existing);
    await options.model.deleteOne({ _id: id });
    await audit(request, `${options.def.key}-deleted`, describeDefault(options, existing));
    return json({ ok: true });
  });

  return { GET, PUT, PATCH, DELETE, load };
}

/** Returns the reference only when it is new or changed, so editing a record never fails because of an old link. */
export function changedRef(data: Record<string, unknown>, existing: Doc | null, key: string): unknown {
  return existing && String(existing[key] || "") === String(data[key] || "") ? "" : data[key];
}

/** Confirms that referenced records exist, so a crafted request cannot link to random IDs. */
export async function assertExists(model: AnyModel, id: unknown, label: string) {
  if (!id) return;
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) throw new InputError(`Choose a valid ${label}.`);
  const found = await model.exists({ _id: id });
  if (!found) throw new InputError(`The selected ${label} no longer exists. Refresh and choose again.`);
}
