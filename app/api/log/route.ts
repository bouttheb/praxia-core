import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireDaemonKey } from "@/lib/security";

export const dynamic = "force-dynamic";

// Compatibility endpoint for the `/log-*` skills (and any local tooling) that
// record end-of-day progress with the global daemon write key.
//
//   GET  /api/log                 -> { projects: [{ project_id, name, completion_percent }] }
//   GET  /api/log?project_id=38   -> { project_id, name, completion_percent }
//   POST /api/log  { project_id, today, tomorrow, completion_percent, source? }
//
// Auth: Authorization: Bearer <DASHBOARD_WRITE_KEY>.

export async function GET(req: Request) {
  const guard = requireDaemonKey(req);
  if (guard) return guard;

  const idParam = new URL(req.url).searchParams.get("project_id");
  if (idParam != null) {
    const projectId = Number(idParam);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: "bad project_id" }, { status: 400 });
    }
    const [project] = await sql<{ project_id: number; name: string; completion_percent: number }[]>`
      SELECT id AS project_id, name, completion_percent FROM projects WHERE id = ${projectId}
    `;
    if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(project);
  }

  const projects = await sql<
    { project_id: number; name: string; completion_percent: number; area_name: string | null }[]
  >`
    SELECT p.id AS project_id, p.name, p.completion_percent, a.name AS area_name
    FROM projects p
    LEFT JOIN areas a ON a.id = p.area_id
    WHERE p.archived = FALSE
    ORDER BY p.id
  `;
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const guard = requireDaemonKey(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as {
    project_id?: unknown;
    today?: unknown;
    tomorrow?: unknown;
    completion_percent?: unknown;
    source?: unknown;
  } | null;

  if (
    !body ||
    typeof body.project_id !== "number" ||
    typeof body.today !== "string" ||
    typeof body.tomorrow !== "string" ||
    typeof body.completion_percent !== "number"
  ) {
    return NextResponse.json(
      { error: "project_id, today, tomorrow, completion_percent required" },
      { status: 400 },
    );
  }

  const today = body.today.trim();
  const tomorrow = body.tomorrow.trim();
  if (!today) {
    return NextResponse.json({ error: "today must be non-empty" }, { status: 400 });
  }
  const pct = Math.max(0, Math.min(100, Math.round(body.completion_percent)));
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "claude-code";

  const [project] = await sql<{ id: number }[]>`SELECT id FROM projects WHERE id = ${body.project_id}`;
  if (!project) {
    return NextResponse.json({ error: `project ${body.project_id} not found` }, { status: 404 });
  }

  const [update] = await sql`
    INSERT INTO updates (project_id, today, tomorrow, completion_percent, source)
    VALUES (${body.project_id}, ${today}, ${tomorrow}, ${pct}, ${source})
    RETURNING *
  `;

  await sql`
    UPDATE projects
    SET completion_percent = ${pct}, updated_at = NOW()
    WHERE id = ${body.project_id}
  `;

  return NextResponse.json({ ok: true, update });
}
