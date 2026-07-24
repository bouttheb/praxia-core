import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireDaemonKey } from "@/lib/security";
import type { AgentKey } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requireDaemonKey(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as { daemonId?: unknown } | null;
  const daemonId = typeof body?.daemonId === "string" && body.daemonId.trim() ? body.daemonId.trim() : "unnamed-daemon";

  const [command] = await sql<
    {
      id: number;
      project_id: number;
      project_name: string;
      body: string;
      agent: AgentKey;
      working_dir: string | null;
      completion_percent: number;
      vision_md: string | null;
      latest_today: string | null;
      latest_tomorrow: string | null;
      workflow_run_id: number | null;
      workflow_step_id: number | null;
      workflow_template_label: string | null;
      workflow_step_index: number | null;
      workflow_total_steps: number | null;
      workflow_step_title: string | null;
      workflow_definition_of_done: string[] | null;
    }[]
  >`
    WITH candidate AS (
      SELECT c.id
      FROM commands c
      JOIN projects p ON p.id = c.project_id
      WHERE c.status = 'queued'
        AND (p.required_daemon_id IS NULL OR p.required_daemon_id = ${daemonId})
        AND NOT EXISTS (
          SELECT 1
          FROM commands running
          WHERE running.project_id = c.project_id
            AND running.status = 'running'
        )
      ORDER BY c.created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    updated AS (
      UPDATE commands c
      SET
        status = 'running',
        claimed_by = ${daemonId},
        claimed_at = NOW(),
        started_at = NOW(),
        updated_at = NOW()
      FROM candidate
      WHERE c.id = candidate.id
      RETURNING c.*
    )
    SELECT
      u.id,
      u.project_id,
      p.name AS project_name,
      u.body,
      u.agent,
      u.working_dir,
      u.workflow_run_id,
      u.workflow_step_id,
      p.completion_percent,
      p.vision_md,
      wr.template_label AS workflow_template_label,
      ws.step_index AS workflow_step_index,
      wr.total_steps AS workflow_total_steps,
      ws.title AS workflow_step_title,
      wr.definition_of_done AS workflow_definition_of_done,
      lu.today AS latest_today,
      lu.tomorrow AS latest_tomorrow
    FROM updated u
    JOIN projects p ON p.id = u.project_id
    LEFT JOIN workflow_runs wr ON wr.id = u.workflow_run_id
    LEFT JOIN workflow_steps ws ON ws.id = u.workflow_step_id
    LEFT JOIN LATERAL (
      SELECT today, tomorrow
      FROM updates u
      WHERE u.project_id = p.id
      ORDER BY u.created_at DESC
      LIMIT 1
    ) lu ON TRUE
  `;

  if (command?.workflow_run_id) {
    await sql`
      UPDATE workflow_runs
      SET status = 'running', current_step_index = COALESCE(${command.workflow_step_index}, current_step_index), updated_at = NOW()
      WHERE id = ${command.workflow_run_id}
        AND status IN ('queued', 'running')
    `;
  }
  if (command?.workflow_step_id) {
    await sql`
      UPDATE workflow_steps
      SET status = 'running', updated_at = NOW()
      WHERE id = ${command.workflow_step_id}
        AND status = 'queued'
    `;
  }

  return NextResponse.json({ command: command ?? null });
}
