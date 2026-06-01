import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __praxiaCoreSql: ReturnType<typeof postgres> | undefined;
}

function buildSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return postgres("postgres://invalid-host:5432/none", { max: 1, prepare: false });
  }
  return postgres(url, {
    ssl: url.includes("sslmode=require") ? "require" : undefined,
    max: 5,
    idle_timeout: 20,
    onnotice: () => undefined,
    prepare: false,
  });
}

export const sql = globalThis.__praxiaCoreSql ?? buildSql();
if (process.env.NODE_ENV !== "production") globalThis.__praxiaCoreSql = sql;

export type Area = {
  id: number;
  name: string;
  sort_order: number;
  hidden: boolean;
};

export type Project = {
  id: number;
  area_id: number;
  name: string;
  description: string | null;
  completion_percent: number;
  sort_order: number;
  archived: boolean;
  hidden: boolean;
  working_directory: string | null;
  vision_md: string | null;
  agent: "claude" | "codex";
  fallback_agent: "claude" | "codex" | null;
  required_daemon_id: string | null;
  updated_at: string;
};

export type Update = {
  id: number;
  project_id: number;
  today: string;
  tomorrow: string;
  completion_percent: number;
  created_at: string;
};

export type ProjectWithLatest = Project & {
  latest_update: Update | null;
  command_counts: {
    queued: number;
    running: number;
    blocked: number;
    failed: number;
  };
};

export type AreaWithProjects = Area & {
  projects: ProjectWithLatest[];
};

export type CommandStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "needs_input"
  | "cancelled";

export type CommandRow = {
  id: number;
  project_id: number;
  project_name: string;
  body: string;
  status: CommandStatus;
  agent: "claude" | "codex";
  working_dir: string | null;
  result: string | null;
  error: string | null;
  exit_code: number | null;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};
