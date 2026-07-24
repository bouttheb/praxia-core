import { NextResponse } from "next/server";
import { loadCommands } from "@/lib/dashboard-data";
import { checkCommandBody, requireCommandKeyIfConfigured } from "@/lib/security";
import { parseAgentKey } from "@/lib/agents";
import { assessScope } from "@/lib/scope-gate";
import { loadCommandProjectContext, queueWorkflow } from "@/lib/workflow-queue";

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
    force?: unknown;
  } | null;

  const projectId = Number(body?.projectId);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const commandBody = checkCommandBody(body?.body);
  if (commandBody instanceof Response) return commandBody;

  const project = await loadCommandProjectContext(projectId);
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  const agent = parseAgentKey(body?.agent, project.agent);
  const assessment = assessScope({
    projectName: project.name,
    projectDescription: project.description,
    projectVision: project.vision_md,
    latestToday: project.latest_today,
    latestTomorrow: project.latest_tomorrow,
    completionPercent: project.completion_percent,
    commandBody,
  });

  const force = body?.force === true;
  if (assessment.decision === "reject" || (!force && assessment.decision !== "execute")) {
    return NextResponse.json(
      {
        error: assessment.decision === "reject" ? "command rejected by scope gate" : "scope clarification required",
        assessment,
      },
      { status: assessment.decision === "reject" ? 403 : 422 },
    );
  }

  const queued = await queueWorkflow({
    project,
    commandBody,
    agent,
    autoLog: body?.autoLog !== false,
    assessment: force && assessment.decision !== "execute" ? { ...assessment, decision: "execute" } : assessment,
  });

  return NextResponse.json({ ok: true, commandId: queued.commandId, workflowRunId: queued.workflowRunId, assessment });
}
