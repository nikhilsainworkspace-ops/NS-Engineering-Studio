import { InputError } from "@/modules/civil-at-hand/lib/errors";

export const taskStatuses = ["todo", "in-progress", "done", "cancelled"] as const;
export const taskPriorities = ["low", "normal", "high", "urgent"] as const;
export const taskRelatedKinds = ["none", "contact", "project"] as const;

export type TaskInput = {
  title: string;
  description: string;
  status: typeof taskStatuses[number];
  priority: typeof taskPriorities[number];
  dueAt: Date | null;
  relatedKind: typeof taskRelatedKinds[number];
  relatedId: string;
  assignedContactId: string;
};

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) throw new InputError("Choose a valid due date.");
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new InputError("Choose a valid due date.");
  return date;
}

export function normalizeTaskInput(input: Record<string, unknown>): TaskInput {
  const title = cleanText(input.title, 160);
  if (!title) throw new InputError("Enter a task title.");

  const status = typeof input.status === "string" && taskStatuses.includes(input.status as typeof taskStatuses[number])
    ? input.status as TaskInput["status"] : "todo";
  const priority = typeof input.priority === "string" && taskPriorities.includes(input.priority as typeof taskPriorities[number])
    ? input.priority as TaskInput["priority"] : "normal";
  const requestedKind = typeof input.relatedKind === "string" && taskRelatedKinds.includes(input.relatedKind as typeof taskRelatedKinds[number])
    ? input.relatedKind as TaskInput["relatedKind"] : "none";
  const relatedId = requestedKind === "none" ? "" : cleanText(input.relatedId, 64);
  if (requestedKind !== "none" && !/^[a-f\d]{24}$/i.test(relatedId)) {
    throw new InputError("Choose a valid related contact or project, or set the link to None.");
  }
  const assignedContactId = cleanText(input.assignedContactId, 64);
  if (assignedContactId && !/^[a-f\d]{24}$/i.test(assignedContactId)) {
    throw new InputError("Choose a valid team member to assign this task to, or leave it unassigned.");
  }

  return {
    title,
    description: cleanText(input.description, 2400),
    status,
    priority,
    dueAt: parseDate(input.dueAt),
    relatedKind: requestedKind,
    relatedId,
    assignedContactId,
  };
}
