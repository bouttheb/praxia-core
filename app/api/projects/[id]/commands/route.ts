import { NextResponse } from "next/server";
import { parseAgentKey } from "@/lib/agents";
import { sql } from "@/lib/db";
import { stripPraxiaProgressReport } from "@/lib/progress-report";
import { checkCommandBody, requireCommandKeyIfConfigured } from "@/lib/security";
import { loadCommandProjectContext } from "@/lib/workflow-queue";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// The per-project conversation: each command is one user turn (body) plus the
// agent's full reply (result). GET returns the thread; POST appends a turn that
// the daemon picks up and answers.

export type ProjectChatMessage = {
  id: number;
  body: string;
  status: string;
  agent: string;
  result: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

// Demo thread shown when no database is configured (mirrors loadAreas's
// demo-mode behavior) so local development renders a realistic conversation.
function demoMessages(): ProjectChatMessage[] {
  const now = Date.now();
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60000).toISOString();
  return [
    {
      id: 1,
      body: "What's the current state of this project?",
      status: "completed",
      agent: "claude",
      result:
        "The core pipeline is in good shape. Three things stand out:\n\n1. **Indexing works end-to-end** — `src/indexer.ts` walks the vault and writes the search table.\n2. **The CLI entry point** (`notes search <query>`) returns ranked results with snippets.\n3. **One gap:** there's no incremental re-index yet, so every run rebuilds from scratch.\n\n```bash\nnpm run index && npm run search -- \"meeting notes\"\n```\n\nWant me to add the incremental re-index next?",
      error: null,
      created_at: at(40),
      completed_at: at(38),
    },
    {
      id: 2,
      body: "Yes — and make sure it skips unchanged files.",
      status: "needs_input",
      agent: "claude",
      result:
        "Incremental re-index is in: `src/indexer.ts` now stores each file's mtime and skips unchanged ones — a no-op run finishes in ~80ms.\n\nOne decision I need from you: should deleted notes be **removed from the index immediately**, or kept until the next full rebuild? Immediate removal is cleaner but adds a directory scan per run.",
      error: null,
      created_at: at(12),
      completed_at: at(9),
    },
    {
      id: 3,
      body: "Remove them immediately.",
      status: "running",
      agent: "claude",
      result: null,
      error: null,
      created_at: at(1),
      completed_at: null,
    },
  ];
}

export async function GET(req: Request, { params }: Params) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      project: { id: projectId, name: "Demo project", agent: "claude", working_directory: "~/code/demo" },
      messages: demoMessages(),
    });
  }

  const project = await loadCommandProjectContext(projectId);
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  const messages = await sql<ProjectChatMessage[]>`
    SELECT id, body, status, agent, result, error, created_at, completed_at
    FROM commands
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT 80
  `;

  return NextResponse.json({
    project: { id: project.id, name: project.name, agent: project.agent, working_directory: project.working_directory },
    messages: messages
      .slice()
      .reverse()
      .map((message) => ({ ...message, result: message.result ? stripPraxiaProgressReport(message.result) : message.result })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const guard = requireCommandKeyIfConfigured(req);
  if (guard) return guard;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const payload = (await req.json().catch(() => null)) as { body?: unknown; agent?: unknown } | null;
  const commandBody = checkCommandBody(payload?.body);
  if (commandBody instanceof Response) return commandBody;

  const project = await loadCommandProjectContext(projectId);
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  const agent = parseAgentKey(payload?.agent, project.agent);

  // Direct ad-hoc command — chat turns skip the workflow/scope machinery (the
  // agent itself pushes back conversationally) and don't auto-log every reply.
  const [message] = await sql<ProjectChatMessage[]>`
    INSERT INTO commands (project_id, body, agent, working_dir, auto_log)
    VALUES (${project.id}, ${commandBody}, ${agent}, ${project.working_directory}, FALSE)
    RETURNING id, body, status, agent, result, error, created_at, completed_at
  `;

  return NextResponse.json({ ok: true, message });
}
