// A small, dependency-free field specification used by both the server (validation) and the
// browser (generic forms). Keeping one definition per field means a form can never offer a value
// the API would reject, and the API never trusts values the form did not describe.
import { InputError } from "@/modules/civil-at-hand/lib/errors";

export type FieldKind =
  | "text" | "textarea" | "number" | "money" | "percent" | "date" | "datetime" | "select"
  | "ref" | "bool" | "tags" | "items";

export type RefKind = "contact" | "project" | "material" | "worker" | "estimate" | "purchaseOrder" | "materialRequest" | "shareLink";

export type FieldSpec = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** Maximum characters for text, or maximum items for lists. */
  max?: number;
  /** Numeric bounds. */
  min?: number;
  maxValue?: number;
  options?: { value: string; label: string }[];
  /** Name of a settings list (for example "units") that supplies select options in the browser. */
  optionsFrom?: string;
  ref?: RefKind;
  defaultValue?: unknown;
  help?: string;
  placeholder?: string;
  /** Hide in the generic form (set by a dedicated control or by the server). */
  hidden?: boolean;
  /** Show only in the generic table/list. */
  wide?: boolean;
  itemFields?: FieldSpec[];
};

const OBJECT_ID = /^[a-f\d]{24}$/i;
export const isObjectId = (value: unknown): value is string => typeof value === "string" && OBJECT_ID.test(value);

export function cleanString(value: unknown, max: number): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  // Strip control characters except tab/newline, then trim and cap.
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
}

export function parseNumber(value: unknown, label: string, min = 0, max = 1e13): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(number)) throw new InputError(`${label} must be a number.`);
  if (number < min || number > max) throw new InputError(`${label} must be between ${min.toLocaleString("en-IN")} and ${max.toLocaleString("en-IN")}.`);
  return Math.round(number * 1000) / 1000;
}

/** Accepts YYYY-MM-DD or an ISO timestamp. Returns null for blank input. */
export function parseDateValue(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") throw new InputError(`Choose a valid ${label.toLowerCase()}.`);
  const text = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : text;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new InputError(`Choose a valid ${label.toLowerCase()}.`);
  const year = new Date(ms).getUTCFullYear();
  if (year < 1990 || year > 2200) throw new InputError(`${label} looks wrong. Check the year.`);
  return new Date(ms);
}

function normalizeField(spec: FieldSpec, raw: unknown): unknown {
  const max = spec.max ?? (spec.kind === "textarea" ? 4000 : 200);
  switch (spec.kind) {
    case "text":
    case "textarea": {
      const text = cleanString(raw, max);
      if (spec.required && !text) throw new InputError(`${spec.label} is required.`);
      if (!text && typeof spec.defaultValue === "string") return spec.defaultValue;
      return text;
    }
    case "number":
    case "money":
    case "percent": {
      const min = spec.min ?? (spec.kind === "percent" ? 0 : 0);
      const maxValue = spec.maxValue ?? (spec.kind === "percent" ? 100 : 1e13);
      const number = parseNumber(raw, spec.label, min, maxValue);
      if (spec.required && number === null) throw new InputError(`${spec.label} is required.`);
      if (number === null) return spec.defaultValue ?? null;
      return spec.kind === "money" ? Math.round(number * 100) / 100 : number;
    }
    case "date":
    case "datetime": {
      const date = parseDateValue(raw, spec.label);
      if (spec.required && !date) throw new InputError(`${spec.label} is required.`);
      return date;
    }
    case "select": {
      const text = cleanString(raw, 80);
      const allowed = spec.options?.map((option) => option.value);
      if (allowed && allowed.length) {
        if (!text) {
          if (spec.required && spec.defaultValue === undefined) throw new InputError(`Choose ${spec.label.toLowerCase()}.`);
          return spec.defaultValue ?? "";
        }
        if (!allowed.includes(text)) throw new InputError(`Choose a valid ${spec.label.toLowerCase()}.`);
        return text;
      }
      // Options supplied by owner-managed settings lists: accept any short text.
      const free = cleanString(raw, max);
      if (spec.required && !free) throw new InputError(`Choose ${spec.label.toLowerCase()}.`);
      return free;
    }
    case "ref": {
      const text = cleanString(raw, 24);
      if (!text) {
        if (spec.required) throw new InputError(`Choose ${spec.label.toLowerCase()}.`);
        return "";
      }
      if (!OBJECT_ID.test(text)) throw new InputError(`Choose a valid ${spec.label.toLowerCase()}.`);
      return text;
    }
    case "bool":
      return raw === true || raw === "true" || raw === "on" || raw === 1;
    case "tags": {
      const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
      return Array.from(new Set(list.map((item) => cleanString(item, 60)).filter(Boolean))).slice(0, spec.max ?? 30);
    }
    case "items": {
      if (raw === undefined || raw === null) return [];
      if (!Array.isArray(raw)) throw new InputError(`${spec.label} must be a list.`);
      const limit = spec.max ?? 500;
      if (raw.length > limit) throw new InputError(`${spec.label} can have at most ${limit} rows.`);
      const rows = raw.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new InputError(`${spec.label} row ${index + 1} is not valid.`);
        try { return normalizeRecord(spec.itemFields || [], item as Record<string, unknown>); }
        catch (error) {
          if (error instanceof InputError) throw new InputError(`${spec.label} row ${index + 1}: ${error.message}`);
          throw error;
        }
      });
      if (spec.required && !rows.length) throw new InputError(`Add at least one row to ${spec.label.toLowerCase()}.`);
      return rows;
    }
    default:
      return undefined;
  }
}

/** Validates a full record. Unknown keys are dropped. Throws InputError with a readable message. */
export function normalizeRecord(specs: FieldSpec[], payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const spec of specs) result[spec.key] = normalizeField(spec, payload[spec.key]);
  return result;
}

/** Validates only the keys present in the payload (for PATCH). */
export function normalizePartial(specs: FieldSpec[], payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const spec of specs) if (Object.prototype.hasOwnProperty.call(payload, spec.key)) result[spec.key] = normalizeField(spec, payload[spec.key]);
  return result;
}

export const opt = (...pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));

/** Escape user text before using it inside a MongoDB regular expression. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
