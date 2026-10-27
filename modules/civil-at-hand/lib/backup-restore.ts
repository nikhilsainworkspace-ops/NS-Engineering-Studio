import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { normalizePrivateNoteInput } from "@/modules/civil-at-hand/lib/private-notes";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { Rate } from "@/modules/civil-at-hand/models/Rate";
import { Task } from "@/modules/civil-at-hand/models/Task";
import { PrivateNote } from "@/modules/civil-at-hand/models/PrivateNote";
import { NoteAsset } from "@/modules/civil-at-hand/models/NoteAsset";
import { AdminPreference } from "@/modules/civil-at-hand/models/AdminPreference";
import { documentDef, estimateDef, expenseDef, invoiceDef, materialDef, materialRequestDef, purchaseOrderDef, siteReportDef, tenderDef, workerDef, workerTxnDef } from "@/modules/civil-at-hand/lib/entities";
import { detectFileType, validImage } from "@/modules/civil-at-hand/lib/file-types";
import { defaultSettings, normalizeSettingsInput, withDefaults } from "@/modules/civil-at-hand/lib/settings";
import { Attendance } from "@/modules/civil-at-hand/models/Attendance";
import { BusinessSetting } from "@/modules/civil-at-hand/models/BusinessSetting";
import { Counter } from "@/modules/civil-at-hand/models/Counter";
import { DocumentFile } from "@/modules/civil-at-hand/models/DocumentFile";
import { Estimate } from "@/modules/civil-at-hand/models/Estimate";
import { Expense } from "@/modules/civil-at-hand/models/Expense";
import { Invoice } from "@/modules/civil-at-hand/models/Invoice";
import { Material } from "@/modules/civil-at-hand/models/Material";
import { MaterialRequest } from "@/modules/civil-at-hand/models/MaterialRequest";
import { PageImage } from "@/modules/civil-at-hand/models/PageImage";
import { ProjectDocument } from "@/modules/civil-at-hand/models/ProjectDocument";
import { PublicPage } from "@/modules/civil-at-hand/models/PublicPage";
import { CustomForm } from "@/modules/civil-at-hand/models/CustomForm";
import { CustomFormResponse } from "@/modules/civil-at-hand/models/CustomFormResponse";
import { PurchaseOrder } from "@/modules/civil-at-hand/models/PurchaseOrder";
import { SiteReport } from "@/modules/civil-at-hand/models/SiteReport";
import { StockMovement } from "@/modules/civil-at-hand/models/StockMovement";
import { Tender } from "@/modules/civil-at-hand/models/Tender";
import { Worker } from "@/modules/civil-at-hand/models/Worker";
import { WorkerTxn } from "@/modules/civil-at-hand/models/WorkerTxn";

const MAX_COLLECTION_RECORDS = 5000;
const OBJECT_ID = /^[a-f\d]{24}$/i;
type RecordObject = Record<string, unknown> & { _id?: unknown };
type CollectionSpec = { key: string; label: string; Model: mongoose.Model<Record<string, unknown>>; fields: string[]; max: number };
const COLLECTIONS: CollectionSpec[] = [
  { key: "contacts", label: "contacts", Model: Contact as unknown as mongoose.Model<Record<string, unknown>>, max: 5000, fields: ["category", "name", "firstName", "lastName", "jobTitle", "birthday", "phoneLabel", "emailLabel", "phoneNumbers", "emailAddresses", "isTeamMember", "teamRole", "teamDepartment", "phone", "email", "organization", "city", "state", "status", "source", "linkId", "tags", "notes", "followUpAt", "details", "rating", "flag", "shareConsent", "lastContactedAt", "interactions", "createdAt", "updatedAt"] },
  { key: "projects", label: "projects", Model: Project as unknown as mongoose.Model<Record<string, unknown>>, max: 3000, fields: ["title", "clientName", "clientContactId", "linkedContactIds", "city", "state", "projectType", "status", "estimatedValue", "billedAmount", "receivedAmount", "startDate", "endDate", "followUpAt", "source", "notes", "createdAt", "updatedAt"] },
  { key: "rates", label: "rates", Model: Rate as unknown as mongoose.Model<Record<string, unknown>>, max: 5000, fields: ["item", "group", "spec", "unit", "rate", "supplierName", "supplierContactId", "city", "state", "validTill", "notes", "createdAt", "updatedAt"] },
  { key: "tasks", label: "tasks", Model: Task as unknown as mongoose.Model<Record<string, unknown>>, max: 3000, fields: ["title", "description", "status", "priority", "dueAt", "relatedKind", "relatedId", "assignedContactId", "createdAt", "updatedAt"] },
  { key: "privateNotes", label: "private notes", Model: PrivateNote as unknown as mongoose.Model<Record<string, unknown>>, max: 5000, fields: ["title", "content", "tags", "pinned", "archived", "favorite", "folder", "category", "projectId", "dueAt", "deletedAt", "history", "createdAt", "updatedAt"] },
  // Version 4 construction-management collections (backup version 5).
  ...v4Collections(),
];

function v4Collections(): CollectionSpec[] {
  const M = (model: unknown) => model as mongoose.Model<Record<string, unknown>>;
  const keys = (def: { fields: { key: string }[] }, ...extra: string[]) => [...def.fields.map((field) => field.key), ...extra, "createdAt", "updatedAt"];
  return [
    { key: "siteReports", label: "site reports", Model: M(SiteReport), max: 20000, fields: keys(siteReportDef, "reviewedAt") },
    { key: "estimates", label: "estimates", Model: M(Estimate), max: 10000, fields: keys(estimateDef, "number", "groupId", "version", "status", "sentAt", "decidedAt", "decisionNote", "convertedProjectId", "totals") },
    { key: "materials", label: "materials", Model: M(Material), max: 10000, fields: keys(materialDef) },
    { key: "stockMovements", label: "stock movements", Model: M(StockMovement), max: 100000, fields: ["materialId", "type", "from", "to", "qty", "rate", "date", "refKind", "refId", "refLabel", "note", "clientRef", "reversalOfId", "reversedById", "createdAt", "updatedAt"] },
    { key: "materialRequests", label: "material requests", Model: M(MaterialRequest), max: 20000, fields: keys(materialRequestDef, "number", "decidedAt") },
    { key: "purchaseOrders", label: "purchase orders", Model: M(PurchaseOrder), max: 20000, fields: keys(purchaseOrderDef, "number", "status", "issuedAt", "receipts", "total") },
    { key: "workers", label: "workers", Model: M(Worker), max: 20000, fields: keys(workerDef) },
    { key: "attendance", label: "attendance marks", Model: M(Attendance), max: 300000, fields: ["workerId", "projectId", "date", "status", "otHours", "note", "createdAt", "updatedAt"] },
    { key: "workerTransactions", label: "worker payments", Model: M(WorkerTxn), max: 100000, fields: keys(workerTxnDef) },
    { key: "invoices", label: "invoices and bills", Model: M(Invoice), max: 50000, fields: keys(invoiceDef, "number", "state", "payments", "total", "paid", "voidReason") },
    { key: "expenses", label: "expenses", Model: M(Expense), max: 100000, fields: keys(expenseDef) },
    { key: "documents", label: "documents", Model: M(ProjectDocument), max: 20000, fields: keys(documentDef, "currentVersion", "latestFileId", "latestFileName", "approvedAt") },
    { key: "tenders", label: "tenders", Model: M(Tender), max: 10000, fields: keys(tenderDef) },
    // Restored pages always come back unpublished, so nothing becomes public without the owner publishing it again.
    { key: "publicPages", label: "public pages", Model: M(PublicPage), max: 1000, fields: ["slug", "title", "template", "summary", "visibility", "expiresAt", "seoTitle", "seoDescription", "allowIndexing", "showInNav", "navOrder", "coverImageId", "blocks", "createdAt", "updatedAt"] },
    // Public tokens are deliberately excluded from backups; restore new forms paused with fresh tokens.
    { key: "customForms", label: "custom forms", Model: M(CustomForm), max: 500, fields: ["title", "description", "active", "expiresAt", "submissions", "fields", "createdAt", "updatedAt"] },
    { key: "customFormResponses", label: "custom form responses", Model: M(CustomFormResponse), max: 50000, fields: ["formId", "formTitle", "fields", "answers", "submittedAt", "createdAt", "updatedAt"] },
  ];
}

type BinarySpec = { key: string; label: string; Model: mongoose.Model<Record<string, unknown>>; fields: string[]; check: (row: Record<string, unknown>, data: Buffer) => string | null; max: number };
const BINARY: BinarySpec[] = [
  { key: "documentFiles", label: "document files", Model: DocumentFile as unknown as mongoose.Model<Record<string, unknown>>, max: 20000, fields: ["documentId", "version", "revisionLabel", "filename", "mimeType", "size", "sha256", "note", "createdAt", "updatedAt"],
    check: (row, data) => (data.length > 4 * 1024 * 1024 ? "file exceeds 4 MB" : detectFileType(String(row.filename || ""), data)?.mime === row.mimeType ? null : "file content does not match its type") },
  { key: "pageImages", label: "public page images", Model: PageImage as unknown as mongoose.Model<Record<string, unknown>>, max: 2000, fields: ["filename", "alt", "mimeType", "size", "createdAt", "updatedAt"],
    check: (row, data) => (data.length > 2 * 1024 * 1024 ? "image exceeds 2 MB" : validImage(data, String(row.mimeType)) ? null : "image content does not match its type") },
];

export type ValidatedWorkspaceBackup = {
  collections: Record<string, { _id: string; fields: Record<string, unknown> }[]>;
  noteAssets: { _id: string; fields: Record<string, unknown> }[];
  adminPreference: { autoLockMinutes: number } | null;
  binary: Record<string, { _id: string; fields: Record<string, unknown> }[]>;
  settings: Record<string, unknown> | null;
  counters: { _id: string; seq: number }[];
  counts: Record<string, number>;
  invalid: string[];
};
function objectRecord(value: unknown): value is RecordObject { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function projectFields(record: RecordObject, fields: string[]) {
  const result: Record<string, unknown> = {};
  for (const field of fields) if (record[field] !== undefined) result[field] = record[field];
  return result;
}
function validImageBytes(data: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === "image/gif") return data.length >= 6 && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"));
  if (mimeType === "image/webp") return data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function validateWorkspaceBackup(backup: unknown): Promise<ValidatedWorkspaceBackup> {
  if (!objectRecord(backup) || backup.app !== "civil-at-hand" || ![3, 4, 5, 6].includes(Number(backup.version))) throw new InputError("Choose a valid NS Engineering Studio workspace JSON backup (version 3, 4, 5 or 6).");
  const collections: ValidatedWorkspaceBackup["collections"] = {};
  const counts: Record<string, number> = {};
  const invalid: string[] = [];
  for (const spec of COLLECTIONS) {
    const raw = backup[spec.key];
    if (raw === undefined) { collections[spec.key] = []; counts[spec.key] = 0; continue; }
    if (!Array.isArray(raw)) throw new InputError(`Backup field “${spec.key}” must be a list.`);
    if (raw.length > spec.max) throw new InputError(`Backup contains too many ${spec.label} (maximum ${spec.max.toLocaleString()}).`);
    const rows: { _id: string; fields: Record<string, unknown> }[] = [];
    for (let index = 0; index < raw.length; index++) {
      const item = raw[index];
      if (!objectRecord(item) || typeof item._id !== "string" || !OBJECT_ID.test(item._id)) { invalid.push(`${spec.label} #${index + 1}: missing or invalid record ID`); continue; }
      const fields = projectFields(item, spec.fields);
      if (spec.key === "customForms") {
        fields.token = randomBytes(24).toString("hex");
        fields.active = false;
      }
      if (spec.key === "privateNotes") {
        try { Object.assign(fields, normalizePrivateNoteInput(fields)); } catch (error) { invalid.push(`private notes #${index + 1}: ${error instanceof Error ? error.message : "invalid note"}`); continue; }
      } else if (spec.key === "tasks" && (typeof fields.title !== "string" || !String(fields.title).trim())) { invalid.push(`tasks #${index + 1}: missing title`); continue; }
      else if (spec.key === "projects" && (typeof fields.title !== "string" || !String(fields.title).trim())) { invalid.push(`projects #${index + 1}: missing title`); continue; }
      else if (spec.key === "contacts" && (typeof fields.name !== "string" || !String(fields.name).trim() || typeof fields.category !== "string")) { invalid.push(`contacts #${index + 1}: missing name or category`); continue; }
      else if (spec.key === "rates" && (typeof fields.item !== "string" || !String(fields.item).trim() || !Number.isFinite(Number(fields.rate)))) { invalid.push(`rates #${index + 1}: missing item or invalid rate`); continue; }
      try { await new spec.Model({ _id: item._id, ...fields }).validate(); }
      catch (error) { invalid.push(`${spec.label} #${index + 1}: ${error instanceof Error ? error.message : "validation failed"}`); continue; }
      rows.push({ _id: item._id, fields });
    }
    collections[spec.key] = rows; counts[spec.key] = rows.length;
  }
  const rawPreferences = backup.adminPreferences === undefined ? [] : backup.adminPreferences;
  let adminPreference: { autoLockMinutes: number } | null = null;
  if (!Array.isArray(rawPreferences)) throw new InputError("Backup field “adminPreferences” must be a list.");
  if (rawPreferences.length > 1) invalid.push("admin preferences: expected at most one workspace preference record");
  if (rawPreferences.length) {
    const item = rawPreferences[0];
    if (!objectRecord(item) || item._id !== "admin" || ![0, 5, 15, 30, 60].includes(Number(item.autoLockMinutes))) invalid.push("admin preferences #1: invalid workspace preference record");
    else adminPreference = { autoLockMinutes: Number(item.autoLockMinutes) };
  }
  const rawAssets = backup.noteAssets === undefined ? [] : backup.noteAssets;
  if (!Array.isArray(rawAssets)) throw new InputError("Backup field “noteAssets” must be a list.");
  if (rawAssets.length > MAX_COLLECTION_RECORDS) throw new InputError("Backup contains too many note images.");
  const noteAssets: ValidatedWorkspaceBackup["noteAssets"] = [];
  for (let index = 0; index < rawAssets.length; index++) {
    const asset = rawAssets[index];
    if (!objectRecord(asset) || typeof asset._id !== "string" || !OBJECT_ID.test(asset._id) || typeof asset.noteId !== "string" || !OBJECT_ID.test(asset.noteId)) { invalid.push(`note image #${index + 1}: invalid image or note ID`); continue; }
    if (!Array.isArray(backup.privateNotes) || !(backup.privateNotes as Record<string, unknown>[]).some((note) => String(note?._id || "") === asset.noteId)) invalid.push(`note image #${index + 1}: attached note is missing from the backup`);
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(String(asset.mimeType)) || typeof asset.dataBase64 !== "string") { invalid.push(`note image #${index + 1}: unsupported image data`); continue; }
    if (asset.dataBase64.length > 2_800_000) { invalid.push(`note image #${index + 1}: encoded data exceeds the 2 MB limit`); continue; }
    const data = Buffer.from(asset.dataBase64, "base64");
    if (!data.length || data.length > 2 * 1024 * 1024 || data.toString("base64").replace(/=+$/, "") !== asset.dataBase64.replace(/=+$/, "") || !validImageBytes(data, String(asset.mimeType))) { invalid.push(`note image #${index + 1}: invalid, mismatched or oversized image data`); continue; }
    noteAssets.push({ _id: asset._id, fields: { noteId: asset.noteId, filename: String(asset.filename || "note-image").replace(/[\\/\r\n\0]/g, "-").slice(0, 180), mimeType: asset.mimeType, size: data.length, data, createdAt: asset.createdAt, updatedAt: asset.updatedAt } });
  }
  counts.noteAssets = noteAssets.length;
  counts.adminPreferences = adminPreference ? 1 : 0;

  const binary: ValidatedWorkspaceBackup["binary"] = {};
  for (const spec of BINARY) {
    const raw = backup[spec.key] === undefined ? [] : backup[spec.key];
    if (!Array.isArray(raw)) throw new InputError(`Backup field “${spec.key}” must be a list.`);
    if (raw.length > spec.max) throw new InputError(`Backup contains too many ${spec.label}.`);
    const rows: { _id: string; fields: Record<string, unknown> }[] = [];
    raw.forEach((item, index) => {
      if (!objectRecord(item) || typeof item._id !== "string" || !OBJECT_ID.test(item._id) || typeof item.dataBase64 !== "string") { invalid.push(`${spec.label} #${index + 1}: invalid record`); return; }
      const data = Buffer.from(item.dataBase64, "base64");
      const problem = !data.length ? "empty file" : spec.check(item, data);
      if (problem) { invalid.push(`${spec.label} #${index + 1}: ${problem}`); return; }
      rows.push({ _id: item._id, fields: { ...projectFields(item, spec.fields), size: data.length, data } });
    });
    binary[spec.key] = rows; counts[spec.key] = rows.length;
  }

  let settings: Record<string, unknown> | null = null;
  const rawSettings = backup.businessSettings === undefined ? [] : backup.businessSettings;
  if (!Array.isArray(rawSettings)) throw new InputError("Backup field “businessSettings” must be a list.");
  const businessRow = rawSettings.find((row) => objectRecord(row) && row._id === "business") as RecordObject | undefined;
  if (businessRow && objectRecord(businessRow.value)) {
    try { settings = normalizeSettingsInput(businessRow.value, withDefaults(defaultSettings)) as unknown as Record<string, unknown>; }
    catch (error) { invalid.push(`business settings: ${error instanceof Error ? error.message : "invalid"}`); }
  }
  counts.businessSettings = settings ? 1 : 0;

  const rawCounters = backup.counters === undefined ? [] : backup.counters;
  if (!Array.isArray(rawCounters)) throw new InputError("Backup field “counters” must be a list.");
  const counters = rawCounters.filter((row) => objectRecord(row) && typeof row._id === "string" && /^[a-zA-Z]+-\d{4}$/.test(row._id) && Number.isInteger(Number(row.seq)) && Number(row.seq) >= 0)
    .map((row) => ({ _id: String((row as RecordObject)._id), seq: Number((row as RecordObject).seq) }));
  counts.counters = counters.length;
  return { collections, noteAssets, adminPreference, binary, settings, counters, counts, invalid };
}

export async function applyWorkspaceBackup(checked: ValidatedWorkspaceBackup): Promise<Record<string, number>> {
  await dbConnect();
  const outcomes: Record<string, number> = {};
  for (const spec of COLLECTIONS) {
    const rows = checked.collections[spec.key] || [];
    if (!rows.length) { outcomes[spec.key] = 0; continue; }
    const operations = rows.map((row) => {
      const fields = spec.key === "publicPages" ? { ...row.fields, status: "draft", publishedAt: null } : row.fields;
      // Attendance is unique per worker per day: merge by that natural key so a restore never duplicates a day.
      if (spec.key === "attendance") return { updateOne: { filter: { workerId: fields.workerId, date: fields.date }, update: { $set: fields }, upsert: true } };
      return { updateOne: { filter: { _id: new mongoose.Types.ObjectId(row._id) }, update: { $set: fields, $setOnInsert: { _id: new mongoose.Types.ObjectId(row._id) } }, upsert: true } };
    });
    const result = await spec.Model.bulkWrite(operations as never[]);
    outcomes[spec.key] = result.upsertedCount + result.modifiedCount;
  }
  for (const spec of BINARY) {
    const rows = checked.binary[spec.key] || [];
    if (!rows.length) { outcomes[spec.key] = 0; continue; }
    const operations = rows.map((row) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(row._id) }, update: { $set: row.fields, $setOnInsert: { _id: new mongoose.Types.ObjectId(row._id) } }, upsert: true } }));
    const result = await spec.Model.bulkWrite(operations as never[]);
    outcomes[spec.key] = result.upsertedCount + result.modifiedCount;
  }
  if (checked.settings) {
    await BusinessSetting.findOneAndUpdate({ _id: "business" }, { $set: { value: checked.settings } }, { upsert: true });
    outcomes.businessSettings = 1;
  } else outcomes.businessSettings = 0;
  // Counters only move forward, so a restore can never cause a document number to be issued twice.
  for (const counter of checked.counters) await Counter.updateOne({ _id: counter._id }, { $max: { seq: counter.seq } }, { upsert: true });
  outcomes.counters = checked.counters.length;
  if (checked.noteAssets.length) {
    const operations = checked.noteAssets.map((asset) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(asset._id) }, update: { $set: asset.fields, $setOnInsert: { _id: new mongoose.Types.ObjectId(asset._id) } }, upsert: true } }));
    const result = await NoteAsset.bulkWrite(operations as never[]);
    outcomes.noteAssets = result.upsertedCount + result.modifiedCount;
  } else outcomes.noteAssets = 0;
  if (checked.adminPreference) {
    await AdminPreference.findOneAndUpdate({ _id: "admin" }, { $set: checked.adminPreference, $setOnInsert: { _id: "admin" } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    outcomes.adminPreferences = 1;
  } else outcomes.adminPreferences = 0;
  return outcomes;
}

export function workspaceBackupWarnings(checked: ValidatedWorkspaceBackup) {
  const warnings = ["Restore is merge-only: it updates or adds records by their original ID and does not delete records absent from the backup.", "Public form tokens, custom form tokens, private share tokens, and shared database row snapshots are deliberately not restored. Custom forms restore inactive with fresh links; review, reactivate and reshare any forms you need.", "Public pages are restored as unpublished drafts. Review and publish them again when ready."];
  if (checked.invalid.length) warnings.push(`${checked.invalid.length} record(s) failed validation. Fix the source backup before restoring.`);
  return warnings;
}
