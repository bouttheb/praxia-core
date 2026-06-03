import { NextResponse } from "next/server";
import { loadAreas } from "@/lib/dashboard-data";
import { sql } from "@/lib/db";
import { requireCommandKeyIfConfigured } from "@/lib/security";
import { parseAgentKey } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ areas: await loadAreas() });
}

export async function POST(req: Request) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as {
    areaName?: unknown;
    name?: unknown;
    description?: unknown;
    workingDirectory?: unknown;
    agent?: unknown;
  } | null;

  const areaName = typeof body?.areaName === "string" && body.areaName.trim() ? body.areaName.trim() : "Personal Projects";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "project name required" }, { status: 400 });
  const description = typeof body?.description === "string" ? body.description.trim() || null : null;
  const workingDirectory = typeof body?.workingDirectory === "string" ? body.workingDirectory.trim() || null : null;
  const agent = parseAgentKey(body?.agent);

  const [existingArea] = await sql<{ id: number }[]>`
    SELECT id FROM areas WHERE name = ${areaName} ORDER BY id LIMIT 1
  `;

  const areaId =
    existingArea?.id ??
    (
      await sql<{ id: number }[]>`
        INSERT INTO areas (name, sort_order)
        VALUES (${areaName}, COALESCE((SELECT MAX(sort_order) + 1 FROM areas), 0))
        RETURNING id
      `
    )[0]?.id;

  if (!areaId) return NextResponse.json({ error: "could not create project group" }, { status: 500 });

  const [project] = await sql<{ id: number }[]>`
    INSERT INTO projects (
      area_id, name, description, working_directory, agent, sort_order
    )
    VALUES (
      ${areaId},
      ${name},
      ${description},
      ${workingDirectory},
      ${agent},
      COALESCE((SELECT MAX(sort_order) + 1 FROM projects WHERE area_id = ${areaId}), 0)
    )
    RETURNING id
  `;

  return NextResponse.json({ ok: true, projectId: project.id });
}
