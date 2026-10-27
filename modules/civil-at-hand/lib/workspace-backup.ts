import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { Contact } from "@/modules/civil-at-hand/models/Contact";
import { DataRoom } from "@/modules/civil-at-hand/models/DataRoom";
import { Project } from "@/modules/civil-at-hand/models/Project";
import { Task } from "@/modules/civil-at-hand/models/Task";
import { PrivateNote } from "@/modules/civil-at-hand/models/PrivateNote";
import { AdminPreference } from "@/modules/civil-at-hand/models/AdminPreference";
import { Rate } from "@/modules/civil-at-hand/models/Rate";
import { ShareLink } from "@/modules/civil-at-hand/models/ShareLink";
import { NoteAsset } from "@/modules/civil-at-hand/models/NoteAsset";
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

/** Version 4 collections added to the backup. Keys are the backup field names. */
export const v4BackupCollections = {
  siteReports: SiteReport, estimates: Estimate, materials: Material, stockMovements: StockMovement, materialRequests: MaterialRequest,
  purchaseOrders: PurchaseOrder, workers: Worker, attendance: Attendance, workerTransactions: WorkerTxn, invoices: Invoice, expenses: Expense,
  documents: ProjectDocument, tenders: Tender, publicPages: PublicPage,
  customForms: CustomForm, customFormResponses: CustomFormResponse,
} as const;

type BinaryRow = { _id: unknown; data: Buffer; [key: string]: unknown };
const encodeBinary = (rows: unknown[]) => (rows as BinaryRow[]).map((row) => {
  const { data, ...rest } = row;
  return { ...rest, _id: String(row._id), dataBase64: Buffer.from(data).toString("base64") };
});

/** Snapshot of workspace records. Secret bearer tokens, passcode hashes and shared-room rows are intentionally excluded. */
export async function createWorkspaceBackup() {
  await dbConnect();
  const [contacts, projects, rates, links, rooms, tasks, privateNotes, adminPreferences, noteAssetDocs] = await Promise.all([
    Contact.find().lean(), Project.find().lean(), Rate.find().lean(),
    ShareLink.find({}, { token: 0 }).lean(), DataRoom.find({}, { token: 0, rows: 0, passcodeHash: 0, accessLog: 0 }).lean(),
    Task.find().lean(), PrivateNote.find().lean(), AdminPreference.find().lean(), NoteAsset.find().select("+data noteId filename mimeType size createdAt updatedAt").lean(),
  ]);
  const noteAssets = (noteAssetDocs as unknown as { _id: unknown; noteId: unknown; filename: string; mimeType: string; size: number; data: Buffer; createdAt: Date; updatedAt: Date }[]).map((asset) => ({
    _id: String(asset._id), noteId: String(asset.noteId), filename: asset.filename, mimeType: asset.mimeType, size: asset.size,
    dataBase64: Buffer.from(asset.data).toString("base64"), createdAt: asset.createdAt, updatedAt: asset.updatedAt,
  }));
  const v4Entries = await Promise.all(Object.entries(v4BackupCollections).map(async ([key, model]) => {
    const source = model as unknown as { find: (filter: object, projection?: object) => { lean: () => Promise<unknown[]> } };
    const rows = key === "customForms" ? await source.find({}, { token: 0 }).lean() : await source.find({}).lean();
    return [key, rows] as const;
  }));
  const v4 = Object.fromEntries(v4Entries) as Record<keyof typeof v4BackupCollections, unknown[]>;
  const [documentFiles, pageImages, settingsRows, counters] = await Promise.all([
    DocumentFile.find().select("+data").lean(), PageImage.find().select("+data").lean(), BusinessSetting.find().lean(), Counter.find().lean(),
  ]);
  return {
    app: "civil-at-hand", version: 6, exportedAt: new Date().toISOString(), contacts, projects, rates,
    formLinks: links, dataRooms: rooms, tasks, privateNotes, noteAssets, adminPreferences,
    ...v4,
    documentFiles: encodeBinary(documentFiles), pageImages: encodeBinary(pageImages), businessSettings: settingsRows, counters,
    restoreNotes: "Merge restore does not restore existing public form tokens, custom form tokens, private share tokens, unlisted public-page keys or shared-database row snapshots. Restored custom forms are inactive and receive new share tokens; reactivate and reshare only after reviewing them.",
  };
}

export function workspaceBackupCounts(backup: Awaited<ReturnType<typeof createWorkspaceBackup>>) {
  return {
    contacts: backup.contacts.length, projects: backup.projects.length, rates: backup.rates.length, formLinks: backup.formLinks.length,
    dataRooms: backup.dataRooms.length, tasks: backup.tasks.length, privateNotes: backup.privateNotes.length,
    noteAssets: backup.noteAssets.length, adminPreferences: backup.adminPreferences.length,
    ...Object.fromEntries(Object.keys(v4BackupCollections).map((key) => [key, (backup[key as keyof typeof v4BackupCollections] as unknown[]).length])),
    documentFiles: backup.documentFiles.length, pageImages: backup.pageImages.length,
  };
}
