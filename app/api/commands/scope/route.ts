import { NextResponse } from "next/server";
import { parseAgentKey } from "@/lib/agents";
import { assessScope } from "@/lib/scope-gate";
import { checkCommandBody, requireCommandKeyIfConfigured } from "@/lib/security";
import { loadCommandProjectContext } from "@/lib/workflow-queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const body = (await req.json().catch(() => null)) as {
    projectId?: unknown;
    body?: unknown;
    agent?: unknown;
  } | null;

  const projectId = Number(body?.projectId);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const commandBody = checkCommandBody(body?.body);
  if (commandBody instanceof Response) return commandBody;

  const project = await loadCommandProjectContext(projectId);
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    agent: parseAgentKey(body?.agent, project.agent),
    assessment: assessScope({
      projectName: project.name,
      projectDescription: project.description,
      projectVision: project.vision_md,
      latestToday: project.latest_today,
      latestTomorrow: project.latest_tomorrow,
      completionPercent: project.completion_percent,
      commandBody,
    }),
  });
}
