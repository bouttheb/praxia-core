import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { clampCompletionPercent, parsePraxiaProgressReport } from "@/lib/progress-report";
import { requireDaemonKey } from "@/lib/security";
import { advanceWorkflowAfterCommand } from "@/lib/workflow-queue";

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
    sourceDocsMarkdown?: unknown;
  } | null;

  const status = typeof body?.status === "string" ? body.status : "";
  if (!["completed", "failed", "blocked", "needs_input", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "unsupported status" }, { status: 400 });
  }

  const result = typeof body?.result === "string" ? body.result : null;
  const error = typeof body?.error === "string" ? body.error : null;
  const exitCode = Number.isFinite(Number(body?.exitCode)) ? Number(body?.exitCode) : null;
  const durationMs = Number.isFinite(Number(body?.durationMs)) ? Number(body?.durationMs) : null;
  const sourceDocsMarkdown =
    typeof body?.sourceDocsMarkdown === "string" && body.sourceDocsMarkdown.trim()
      ? body.sourceDocsMarkdown.trim().slice(0, 150_000)
      : null;

  const report = parsePraxiaProgressReport(result);
  const finalStatus = deriveFinalStatus(status, report?.workflowStepStatus);

  const [updated] = await sql<
    {
      id: number;
      project_id: number;
      auto_log: boolean;
      completion_percent: number;
      vision_md: string | null;
    }[]
  >`
    UPDATE commands c
    SET
      status = ${finalStatus},
      result = ${result},
      error = ${error},
      exit_code = ${exitCode},
      duration_ms = ${durationMs},
      completed_at = NOW(),
      updated_at = NOW()
    FROM projects p
    WHERE c.id = ${commandId}
      AND p.id = c.project_id
    RETURNING c.id, c.project_id, c.auto_log, p.completion_percent, p.vision_md
  `;

  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  const nextCompletion =
    finalStatus === "completed" && report?.completionPercent != null
      ? clampCompletionPercent(report.completionPercent)
      : updated.completion_percent;

  if (sourceDocsMarkdown && sourceDocsMarkdown !== updated.vision_md) {
    await sql`
      UPDATE projects
      SET vision_md = ${sourceDocsMarkdown}, updated_at = NOW()
      WHERE id = ${updated.project_id}
    `;
  }

  if (updated.auto_log && finalStatus === "completed") {
    const today = report?.summary ?? result?.trim().slice(0, 4000) ?? "Command completed.";
    const tomorrow = report?.next ?? "Review the run result and choose the next command.";
    await sql.begin(async (tx) => {
      await tx`
        UPDATE projects
        SET completion_percent = ${nextCompletion}, updated_at = NOW()
        WHERE id = ${updated.project_id}
      `;
      await tx`
        INSERT INTO updates (project_id, today, tomorrow, completion_percent, source)
        VALUES (${updated.project_id}, ${today}, ${tomorrow}, ${nextCompletion}, 'daemon')
      `;
    });
  }

  const workflowAdvance = await advanceWorkflowAfterCommand({
    commandId,
    status: finalStatus,
    resultSummary: report?.summary ?? error ?? result?.trim().slice(0, 1000) ?? null,
  });

  return NextResponse.json({
    ok: true,
    progress: {
      completionPercent: nextCompletion,
      parsedReport: Boolean(report),
      sourceDocsSynced: Boolean(sourceDocsMarkdown),
    },
    workflow: workflowAdvance,
  });
}

function deriveFinalStatus(status: string, workflowStepStatus: string | null | undefined) {
  if (status !== "completed") {
    return status as "failed" | "blocked" | "needs_input" | "cancelled";
  }
  const normalized = workflowStepStatus?.trim().toLowerCase().replaceAll(" ", "_");
  if (normalized === "blocked" || normalized === "needs_input" || normalized === "failed" || normalized === "cancelled") {
    return normalized;
  }
  return "completed";
}
