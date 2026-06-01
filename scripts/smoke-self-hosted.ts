import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run npm run install:local first.");
  const sql = postgres(url, {
    ssl: url.includes("sslmode=require") ? "require" : undefined,
    prepare: false,
  });

  try {
    await sql`SELECT 1`;
    const [{ id: areaId }] = await sql<{ id: number }[]>`
      INSERT INTO areas (name, sort_order)
      VALUES ('Smoke Test', 9999)
      RETURNING id
    `;
    const [{ id: projectId }] = await sql<{ id: number }[]>`
      INSERT INTO projects (area_id, name, description, working_directory, agent, sort_order)
      VALUES (${areaId}, 'Smoke Project', 'Temporary smoke-test project.', ${process.cwd()}, 'codex', 0)
      RETURNING id
    `;
    const [{ id: commandId }] = await sql<{ id: number }[]>`
      INSERT INTO commands (project_id, body, agent, working_dir, auto_log)
      VALUES (${projectId}, 'pwd && git status --short', 'codex', ${process.cwd()}, false)
      RETURNING id
    `;
    const [claim] = await sql<{ id: number }[]>`
      WITH candidate AS (
        SELECT id
        FROM commands
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE commands c
      SET status = 'running', claimed_by = 'smoke-test', claimed_at = NOW(), started_at = NOW(), updated_at = NOW()
      FROM candidate
      WHERE c.id = candidate.id
      RETURNING c.id
    `;
    if (claim?.id !== commandId) throw new Error("Smoke command was not claimable.");
    await sql`
      UPDATE commands
      SET status = 'completed', result = 'smoke ok', completed_at = NOW(), updated_at = NOW()
      WHERE id = ${commandId}
    `;
    await sql`
      INSERT INTO daemon_heartbeats (daemon_id, dashboard_url, version, note, last_seen_at)
      VALUES ('smoke-test', 'http://localhost:3030', 'smoke', 'ok', NOW())
      ON CONFLICT (daemon_id)
      DO UPDATE SET last_seen_at = NOW(), note = 'ok'
    `;
    await sql`DELETE FROM commands WHERE project_id = ${projectId}`;
    await sql`DELETE FROM projects WHERE id = ${projectId}`;
    await sql`DELETE FROM areas WHERE id = ${areaId}`;
    await sql`DELETE FROM daemon_heartbeats WHERE daemon_id = 'smoke-test'`;
    console.log("Self-hosted smoke test passed: db, project insert, command queue, claim, completion, heartbeat.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('role "praxia" does not exist')) {
    console.error(
      'Could not connect to the Docker Postgres default. A different local Postgres is answering on port 5432, or the Docker database is not running. Run `npm run db:up`, or set DATABASE_URL to your real Postgres connection string.',
    );
  } else if (message.includes("ECONNREFUSED")) {
    console.error(
      'Postgres is not reachable. Run `npm run db:up`, or set DATABASE_URL to your real Postgres connection string.',
    );
  } else {
    console.error(error);
  }
  process.exit(1);
});
