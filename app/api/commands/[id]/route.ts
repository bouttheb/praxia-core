import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireDaemonKey } from "@/lib/security";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const guard = requireDaemonKey(req);
  if (guard) return guard;

  const { id } = await params;
  const commandId = Number(id);
  if (!Number.isFinite(commandId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: unknown;
    result?: unknown;
    error?: unknown;
    exitCode?: unknown;
    durationMs?: unknown;
  } | null;

  const status = typeof body?.status === "string" ? body.status : "";
  if (!["completed", "failed", "blocked", "needs_input", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "unsupported status" }, { status: 400 });
  }

  const result = typeof body?.result === "string" ? body.result : null;
  const error = typeof body?.error === "string" ? body.error : null;
  const exitCode = Number.isFinite(Number(body?.exitCode)) ? Number(body?.exitCode) : null;
  const durationMs = Number.isFinite(Number(body?.durationMs)) ? Number(body?.durationMs) : null;

  const [updated] = await sql<{ id: number; project_id: number; auto_log: boolean }[]>`
    UPDATE commands
    SET
      status = ${status},
      result = ${result},
      error = ${error},
      exit_code = ${exitCode},
      duration_ms = ${durationMs},
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${commandId}
    RETURNING id, project_id, auto_log
  `;

  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (updated.auto_log && status === "completed") {
    const today = result?.trim().slice(0, 4000) || "Command completed.";
    await sql`
      INSERT INTO updates (project_id, today, tomorrow, completion_percent, source)
      SELECT ${updated.project_id}, ${today}, 'Review the run result and choose the next command.', completion_percent, 'daemon'
      FROM projects
      WHERE id = ${updated.project_id}
    `;
  }

  return NextResponse.json({ ok: true });
}
