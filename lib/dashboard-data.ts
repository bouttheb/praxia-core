import { sql, type AreaWithProjects, type CommandRow } from "@/lib/db";

function demoAreas(): AreaWithProjects[] {
  const now = new Date().toISOString();
  return [
    {
      id: 1,
      name: "Open Source",
      sort_order: 0,
      hidden: false,
      projects: [
        {
          id: 1,
          area_id: 1,
          name: "Notes CLI",
          description: "A command-line tool for indexing local markdown notes.",
          completion_percent: 62,
          sort_order: 0,
          archived: false,
          hidden: false,
          working_directory: "~/code/notes-cli",
          vision_md: "# Notes CLI Vision\n\nMake local markdown notes searchable without sending private content to a hosted service.",
          agent: "codex",
          fallback_agent: null,
          required_daemon_id: null,
          updated_at: now,
          latest_update: {
            id: 1,
            project_id: 1,
            today: "Indexed README and architecture notes, then added a smoke-test command.",
            tomorrow: "Add project import docs and a release checklist.",
            completion_percent: 62,
            created_at: now,
          },
          command_counts: { queued: 0, running: 0, blocked: 0, failed: 0 },
        },
        {
          id: 2,
          area_id: 1,
          name: "Webhook Relay",
          description: "Local-first webhook fan-out service with retries and logs.",
          completion_percent: 35,
          sort_order: 1,
          archived: false,
          hidden: false,
          working_directory: "~/code/webhook-relay",
          vision_md: "# Webhook Relay Vision\n\nProvide a small, understandable relay for projects that need dependable webhooks.",
          agent: "claude",
          fallback_agent: null,
          required_daemon_id: null,
          updated_at: now,
          latest_update: {
            id: 2,
            project_id: 2,
            today: "Added retry states and a basic delivery log.",
            tomorrow: "Build the failed-delivery inspection page.",
            completion_percent: 35,
            created_at: now,
          },
          command_counts: { queued: 1, running: 0, blocked: 0, failed: 0 },
        },
      ],
    },
    {
      id: 2,
      name: "Personal Projects",
      sort_order: 1,
      hidden: false,
      projects: [
        {
          id: 3,
          area_id: 2,
          name: "Habit Journal",
          description: "Private habit tracker with weekly summaries and project notes.",
          completion_percent: 18,
          sort_order: 0,
          archived: false,
          hidden: false,
          working_directory: "~/code/habit-journal",
          vision_md: "# Habit Journal Vision\n\nTrack small daily practices and roll them into a useful weekly review.",
          agent: "claude",
          fallback_agent: null,
          required_daemon_id: null,
          updated_at: now,
          latest_update: {
            id: 3,
            project_id: 3,
            today: "Created the data model and first dashboard sketch.",
            tomorrow: "Add sign-in and per-user scoping.",
            completion_percent: 18,
            created_at: now,
          },
          command_counts: { queued: 0, running: 0, blocked: 1, failed: 0 },
        },
      ],
    },
  ];
}

export async function loadAreas(): Promise<AreaWithProjects[]> {
  if (!process.env.DATABASE_URL) return demoAreas();

  const rows = await sql<
    {
      area_id: number;
      area_name: string;
      area_sort: number;
      area_hidden: boolean;
      project_id: number | null;
      project_name: string | null;
      description: string | null;
      completion_percent: number | null;
      project_sort: number | null;
      archived: boolean | null;
      project_hidden: boolean | null;
      working_directory: string | null;
      vision_md: string | null;
      agent: "claude" | "codex" | null;
      fallback_agent: "claude" | "codex" | null;
      required_daemon_id: string | null;
      project_updated_at: string | null;
      latest_id: number | null;
      latest_today: string | null;
      latest_tomorrow: string | null;
      latest_completion: number | null;
      latest_created_at: string | null;
      queued_count: number;
      running_count: number;
      blocked_count: number;
      failed_count: number;
    }[]
  >`
    SELECT
      a.id AS area_id,
      a.name AS area_name,
      a.sort_order AS area_sort,
      a.hidden AS area_hidden,
      p.id AS project_id,
      p.name AS project_name,
      p.description,
      p.completion_percent,
      p.sort_order AS project_sort,
      p.archived,
      p.hidden AS project_hidden,
      p.working_directory,
      p.vision_md,
      p.agent,
      p.fallback_agent,
      p.required_daemon_id,
      p.updated_at AS project_updated_at,
      lu.id AS latest_id,
      lu.today AS latest_today,
      lu.tomorrow AS latest_tomorrow,
      lu.completion_percent AS latest_completion,
      lu.created_at AS latest_created_at,
      COALESCE(cc.queued_count, 0)::int AS queued_count,
      COALESCE(cc.running_count, 0)::int AS running_count,
      COALESCE(cc.blocked_count, 0)::int AS blocked_count,
      COALESCE(cc.failed_count, 0)::int AS failed_count
    FROM areas a
    LEFT JOIN projects p ON p.area_id = a.id AND p.archived = FALSE
    LEFT JOIN LATERAL (
      SELECT u.id, u.today, u.tomorrow, u.completion_percent, u.created_at
      FROM updates u
      WHERE u.project_id = p.id
      ORDER BY u.created_at DESC
      LIMIT 1
    ) lu ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued') AS queued_count,
        COUNT(*) FILTER (WHERE status = 'running') AS running_count,
        COUNT(*) FILTER (WHERE status IN ('blocked', 'needs_input')) AS blocked_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count
      FROM commands c
      WHERE c.project_id = p.id
        AND c.created_at > NOW() - INTERVAL '14 days'
    ) cc ON TRUE
    WHERE a.hidden = FALSE
    ORDER BY a.sort_order, a.id, p.sort_order, p.id
  `;

  const map = new Map<number, AreaWithProjects>();
  for (const row of rows) {
    if (!map.has(row.area_id)) {
      map.set(row.area_id, {
        id: row.area_id,
        name: row.area_name,
        sort_order: row.area_sort,
        hidden: row.area_hidden,
        projects: [],
      });
    }
    if (row.project_id == null || row.project_hidden) continue;
    map.get(row.area_id)!.projects.push({
      id: row.project_id,
      area_id: row.area_id,
      name: row.project_name!,
      description: row.description,
      completion_percent: row.completion_percent ?? 0,
      sort_order: row.project_sort ?? 0,
      archived: row.archived ?? false,
      hidden: row.project_hidden ?? false,
      working_directory: row.working_directory,
      vision_md: row.vision_md,
      agent: row.agent ?? "claude",
      fallback_agent: row.fallback_agent,
      required_daemon_id: row.required_daemon_id,
      updated_at: row.project_updated_at ?? "",
      latest_update:
        row.latest_id == null
          ? null
          : {
              id: row.latest_id,
              project_id: row.project_id,
              today: row.latest_today ?? "",
              tomorrow: row.latest_tomorrow ?? "",
              completion_percent: row.latest_completion ?? 0,
              created_at: row.latest_created_at ?? "",
            },
      command_counts: {
        queued: row.queued_count,
        running: row.running_count,
        blocked: row.blocked_count,
        failed: row.failed_count,
      },
    });
  }
  return Array.from(map.values());
}

export async function loadCommands(limit = 50): Promise<CommandRow[]> {
  if (!process.env.DATABASE_URL) return [];

  return sql<CommandRow[]>`
    SELECT
      c.id,
      c.project_id,
      p.name AS project_name,
      c.body,
      c.status,
      c.agent,
      c.working_dir,
      c.result,
      c.error,
      c.exit_code,
      c.claimed_by,
      c.created_at,
      c.updated_at,
      c.started_at,
      c.completed_at
    FROM commands c
    JOIN projects p ON p.id = c.project_id
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `;
}

export function averageProgress(areas: AreaWithProjects[]) {
  const projects = areas.flatMap((area) => area.projects);
  if (projects.length === 0) return 0;
  return Math.round(projects.reduce((sum, project) => sum + project.completion_percent, 0) / projects.length);
}
