import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isAdmin } from "@/modules/civil-at-hand/lib/auth";
import { dbConnect } from "@/modules/civil-at-hand/lib/db";
import { InputError } from "@/modules/civil-at-hand/lib/errors";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { normalizeProjectInput, normalizeProjectPatch, projectStatusValues } from "@/modules/civil-at-hand/lib/projects";
import { Project } from "@/modules/civil-at-hand/models/Project";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const normalized = normalizeProjectInput(payload);
    await dbConnect();
    const project = await Project.findByIdAndUpdate(id, normalized, { new: true, runValidators: true }).lean();
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    await audit(request, "project-updated", normalized.title.slice(0, 80));
    return NextResponse.json({ project });
  } catch (error) {
    console.error("Project update error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not update this project." }, { status: 503 });
  }
}

/** Quick actions: change status and/or follow-up date. */
export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  try {
    const body = (await request.json()) as { followUpAt?: string | null; status?: string } & Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { ...normalizeProjectPatch(body) };
    if ("followUpAt" in body) {
      if (body.followUpAt === null || body.followUpAt === "") update.followUpAt = null;
      else if (typeof body.followUpAt === "string" && !Number.isNaN(Date.parse(body.followUpAt))) update.followUpAt = new Date(body.followUpAt);
      else return NextResponse.json({ error: "Choose a valid follow-up date." }, { status: 400 });
    }
    if (typeof body.status === "string") {
      if (!projectStatusValues.includes(body.status)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
      update.status = body.status;
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    await dbConnect();
    const project = await Project.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (update.status) await audit(request, "project-stage-changed", String(update.status));
    return NextResponse.json({ project });
  } catch (error) {
    console.error("Project quick update error:", error);
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Could not update this project." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  try {
    await dbConnect();
    const result = await Project.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    await audit(request, "project-deleted", String(result.title || "").slice(0, 80));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Project delete error:", error);
    return NextResponse.json({ error: "Could not delete this project." }, { status: 503 });
  }
}
