import { InputError } from "@/modules/civil-at-hand/lib/errors";

export const MAX_PRIVATE_NOTE_TITLE = 160;
export const MAX_PRIVATE_NOTE_CONTENT = 20_000;
export const MAX_PRIVATE_NOTE_TAGS = 10;
export const MAX_PRIVATE_NOTE_TAG_LENGTH = 30;

export type NormalizedPrivateNoteInput = {
  title: string; content: string; tags: string[]; pinned: boolean; archived: boolean; favorite: boolean;
  folder: string; category: string; projectId: string; dueAt: Date | null;
};

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) throw new InputError("Choose a valid note due date.");
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new InputError("Choose a valid note due date.");
  return parsed;
}

/** Validate and normalize untrusted browser input before it reaches MongoDB. */
export function normalizePrivateNoteInput(payload: Record<string, unknown>): NormalizedPrivateNoteInput {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (payload.content !== undefined && typeof payload.content !== "string") throw new InputError("Note content must be text.");
  const content = typeof payload.content === "string" ? payload.content : "";
  if (!title) throw new InputError("Add a title for this note.");
  if (title.length > MAX_PRIVATE_NOTE_TITLE) throw new InputError(`The title must be ${MAX_PRIVATE_NOTE_TITLE} characters or fewer.`);
  if (content.length > MAX_PRIVATE_NOTE_CONTENT) throw new InputError(`The note must be ${MAX_PRIVATE_NOTE_CONTENT.toLocaleString()} characters or fewer.`);

  let rawTags: unknown[] = [];
  if (Array.isArray(payload.tags)) rawTags = payload.tags;
  else if (typeof payload.tags === "string") rawTags = payload.tags.split(",");
  else if (payload.tags !== undefined && payload.tags !== null) throw new InputError("Tags must be a list separated by commas.");
  const tags: string[] = [];
  for (const rawTag of rawTags) {
    if (typeof rawTag !== "string") throw new InputError("Each tag must be text.");
    const tag = rawTag.trim(); if (!tag) continue;
    if (tag.length > MAX_PRIVATE_NOTE_TAG_LENGTH) throw new InputError(`Each tag must be ${MAX_PRIVATE_NOTE_TAG_LENGTH} characters or fewer.`);
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > MAX_PRIVATE_NOTE_TAGS) throw new InputError(`Use no more than ${MAX_PRIVATE_NOTE_TAGS} tags per note.`);

  for (const key of ["pinned", "archived", "favorite"] as const) {
    const label = key === "pinned" ? "Pin" : key === "archived" ? "Archive" : "Favourite";
    if (payload[key] !== undefined && typeof payload[key] !== "boolean") throw new InputError(`${label} status must be true or false.`);
  }
  const folder = typeof payload.folder === "string" && payload.folder.trim() ? payload.folder.trim().slice(0, 80) : "Inbox";
  const category = typeof payload.category === "string" && payload.category.trim() ? payload.category.trim().slice(0, 60) : "General";
  const projectId = typeof payload.projectId === "string" ? payload.projectId.trim().slice(0, 64) : "";
  if (projectId && !/^[a-f\d]{24}$/i.test(projectId)) throw new InputError("Choose a valid linked project or leave it empty.");

  return { title, content, tags, pinned: payload.pinned === true, archived: payload.archived === true, favorite: payload.favorite === true, folder, category, projectId, dueAt: parseDate(payload.dueAt) };
}
