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
    )
    UPDATE commands c
    SET
      status = 'running',
      claimed_by = ${daemonId},
      claimed_at = NOW(),
      started_at = NOW(),
      updated_at = NOW()
    FROM candidate, projects p
    WHERE c.id = candidate.id
      AND p.id = c.project_id
    RETURNING c.id, c.project_id, p.name AS project_name, c.body, c.agent, c.working_dir
  `;

  return NextResponse.json({ command: command ?? null });
}
