import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAgentKey } from "@/lib/agents";
import { normalizeWorkingDirectory, requireCommandKeyIfConfigured } from "@/lib/security";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "project name required" }, { status: 400 });
    fields.push(`name = $${fields.length + 1}`);
    values.push(name);
  }
  if (typeof body.description === "string" || body.description === null) {
    fields.push(`description = $${fields.length + 1}`);
    values.push(typeof body.description === "string" ? body.description.trim() || null : null);
  }
  if (typeof body.completion_percent === "number") {
    fields.push(`completion_percent = $${fields.length + 1}`);
    values.push(Math.max(0, Math.min(100, Math.round(body.completion_percent))));
  }
  if (typeof body.sort_order === "number") {
    fields.push(`sort_order = $${fields.length + 1}`);
    values.push(Math.round(body.sort_order));
  }
  if (typeof body.area_id === "number") {
    fields.push(`area_id = $${fields.length + 1}`);
    values.push(Math.round(body.area_id));
  }
  if (typeof body.archived === "boolean") {
    fields.push(`archived = $${fields.length + 1}`);
    values.push(body.archived);
  }
  if (typeof body.hidden === "boolean") {
    fields.push(`hidden = $${fields.length + 1}`);
    values.push(body.hidden);
  }
  if (typeof body.working_directory === "string" || body.working_directory === null) {
    fields.push(`working_directory = $${fields.length + 1}`);
    values.push(typeof body.working_directory === "string" ? normalizeWorkingDirectory(body.working_directory.trim()) : null);
  }
  if (typeof body.vision_md === "string" || body.vision_md === null) {
    fields.push(`vision_md = $${fields.length + 1}`);
    values.push(typeof body.vision_md === "string" ? body.vision_md.trim() || null : null);
  }
  if (isAgentKey(body.agent)) {
    fields.push(`agent = $${fields.length + 1}`);
    values.push(body.agent);
  }
  if (body.fallback_agent === null || isAgentKey(body.fallback_agent)) {
    fields.push(`fallback_agent = $${fields.length + 1}`);
    values.push(body.fallback_agent);
  }
  if (
    body.required_daemon_id === null ||
    (typeof body.required_daemon_id === "string" && /^[A-Za-z0-9_.:-]{0,80}$/.test(body.required_daemon_id.trim()))
  ) {
    fields.push(`required_daemon_id = $${fields.length + 1}`);
    values.push(typeof body.required_daemon_id === "string" ? body.required_daemon_id.trim() || null : null);
  }

  let dueDatePatched = false;
  let nextDueDate: string | null = null;
  if (body.due_date === null || (typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date))) {
    dueDatePatched = true;
    nextDueDate = body.due_date;
  } else if (body.due_date === "") {
    dueDatePatched = true;
  }
  if (dueDatePatched) {
    fields.push(`due_date = $${fields.length + 1}`);
    values.push(nextDueDate);
  }

  if (fields.length === 0) return NextResponse.json({ error: "no fields to update" }, { status: 400 });

  let oldDueDate: string | null = null;
  if (dueDatePatched) {
    const [pre] = await sql<{ due_date: string | null }[]>`
      SELECT due_date::text AS due_date FROM projects WHERE id = ${projectId}
    `;
    oldDueDate = pre?.due_date ?? null;
  }

  if (dueDatePatched && oldDueDate !== nextDueDate) {
    fields.push(`due_date_changed_at = NOW()`);
  }
  fields.push(`updated_at = NOW()`);

  values.push(projectId);
  const [project] = await sql.unsafe(
    `UPDATE projects SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values as never,
  );
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const result = await sql`DELETE FROM projects WHERE id = ${projectId} RETURNING id`;
  if (result.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
