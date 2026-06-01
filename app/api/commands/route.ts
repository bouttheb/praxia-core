import { NextResponse } from "next/server";
import { loadCommands } from "@/lib/dashboard-data";
import { sql } from "@/lib/db";
import { checkCommandBody, requireCommandKeyIfConfigured } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ commands: await loadCommands(100) });
}

export async function POST(req: Request) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as {
    projectId?: unknown;
    body?: unknown;
    agent?: unknown;
    autoLog?: unknown;
  } | null;

  const projectId = Number(body?.projectId);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const commandBody = checkCommandBody(body?.body);
  if (commandBody instanceof Response) return commandBody;

  const [project] = await sql<{ id: number; agent: "claude" | "codex"; working_directory: string | null }[]>`
    SELECT id, agent, working_directory
    FROM projects
    WHERE id = ${projectId}
      AND archived = FALSE
      AND hidden = FALSE
  `;
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  const agent = body?.agent === "claude" || body?.agent === "codex" ? body.agent : project.agent;
  const [command] = await sql<{ id: number }[]>`
    INSERT INTO commands (project_id, body, agent, working_dir, auto_log)
    VALUES (${projectId}, ${commandBody}, ${agent}, ${project.working_directory}, ${body?.autoLog !== false})
    RETURNING id
  `;

  return NextResponse.json({ ok: true, commandId: command.id });
}
