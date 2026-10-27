import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { normalizeTaskInput, taskStatuses } from "@/modules/civil-at-hand/lib/tasks";
import { Task } from "@/modules/civil-at-hand/models/Task";
import { Contact } from "@/modules/civil-at-hand/models/Contact";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });
  try {
    const normalized = normalizeTaskInput((await request.json()) as Record<string, unknown>);
    await dbConnect();
    if (normalized.assignedContactId) {
      const assignee = await Contact.findOne({ _id: normalized.assignedContactId, isTeamMember: true }).select("_id").lean();
      if (!assignee) throw new InputError("Choose a valid contact marked as a team member.");
    }
    const task = await Task.findByIdAndUpdate(id, normalized, { new: true, runValidators: true }).lean();
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    await audit(request, "task-updated", normalized.title.slice(0, 80));
    return NextResponse.json({ task }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Task update error:", error);
    return NextResponse.json({ error: "Could not update this task." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });
  try {
    const body = (await request.json()) as { status?: unknown };
    if (typeof body.status !== "string" || !taskStatuses.includes(body.status as typeof taskStatuses[number])) {
      return NextResponse.json({ error: "Choose a valid task status." }, { status: 400 });
    }
    await dbConnect();
    const task = await Task.findByIdAndUpdate(id, { $set: { status: body.status } }, { new: true, runValidators: true }).lean();
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    await audit(request, "task-status-changed", String(body.status));
    return NextResponse.json({ task }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Task status update error:", error);
    return NextResponse.json({ error: "Could not update this task." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });
  try {
    await dbConnect();
    const result = await Task.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    await audit(request, "task-deleted", String(result.title || "").slice(0, 80));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Task delete error:", error);
    return NextResponse.json({ error: "Could not delete this task." }, { status: 503 });
  }
}
