import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import type { AgentKey } from "@/lib/agents";

loadEnv({ path: ".env.local" });
loadEnv();

type SeedProject = {
  name: string;
  description: string;
  completion: number;
  agent: AgentKey;
  workingDirectory: string;
  today: string;
  tomorrow: string;
  vision: string;
};

type SeedArea = {
  name: string;
  projects: SeedProject[];
};

const seed: SeedArea[] = [
  {
    name: "Open Source",
    projects: [
      {
        name: "Notes CLI",
        description: "A command-line tool for indexing local markdown notes.",
        completion: 62,
        agent: "codex",
        workingDirectory: "~/code/notes-cli",
        today: "Indexed README and architecture notes, then added a smoke-test command.",
        tomorrow: "Add project import docs and a release checklist.",
        vision: "# Notes CLI Vision\n\nMake local markdown notes searchable without sending private content to a hosted service.",
      },
      {
        name: "Webhook Relay",
        description: "Local-first webhook fan-out service with retries and logs.",
        completion: 35,
        agent: "claude",
        workingDirectory: "~/code/webhook-relay",
        today: "Added retry states and a basic delivery log.",
        tomorrow: "Build the failed-delivery inspection page.",
        vision: "# Webhook Relay Vision\n\nProvide a small, understandable relay for projects that need dependable webhooks.",
      },
    ],
  },
  {
    name: "Client Work",
    projects: [
      {
        name: "Portfolio Site",
        description: "A client website refresh with a mobile-first editor workflow.",
        completion: 48,
        agent: "codex",
        workingDirectory: "~/work/portfolio-site",
        today: "Queued the homepage polish task and captured the current design notes.",
        tomorrow: "Review mobile spacing and deploy the final static build.",
        vision: "# Portfolio Site Vision\n\nHelp the client update copy, images, and layout without digging through code.",
      },
    ],
  },
  {
    name: "Personal Projects",
    projects: [
      {
        name: "Habit Journal",
        description: "Private habit tracker with weekly summaries and project notes.",
        completion: 18,
        agent: "claude",
        workingDirectory: "~/code/habit-journal",
        today: "Created the data model and first dashboard sketch.",
        tomorrow: "Add sign-in and per-user scoping.",
        vision: "# Habit Journal Vision\n\nTrack small daily practices and roll them into a useful weekly review.",
      },
    ],
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, {
    ssl: url.includes("sslmode=require") ? "require" : undefined,
    prepare: false,
  });

  const [{ count }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM areas`;
  if (count > 0) {
    console.log(`areas already has ${count} row(s); skipping seed.`);
    await sql.end();
    return;
  }

  const [{ id: organizationId }] = await sql<{ id: number }[]>`
    INSERT INTO organizations (name) VALUES ('Personal') RETURNING id
  `;

  let projectCount = 0;
  for (let areaIndex = 0; areaIndex < seed.length; areaIndex++) {
    const area = seed[areaIndex];
    const [{ id: areaId }] = await sql<{ id: number }[]>`
      INSERT INTO areas (organization_id, name, sort_order)
      VALUES (${organizationId}, ${area.name}, ${areaIndex})
      RETURNING id
    `;

    for (let projectIndex = 0; projectIndex < area.projects.length; projectIndex++) {
      const project = area.projects[projectIndex];
      const [{ id: projectId }] = await sql<{ id: number }[]>`
        INSERT INTO projects (
          area_id, name, description, completion_percent, sort_order,
          working_directory, vision_md, agent
        )
        VALUES (
          ${areaId}, ${project.name}, ${project.description}, ${project.completion},
          ${projectIndex}, ${project.workingDirectory}, ${project.vision}, ${project.agent}
        )
        RETURNING id
      `;
      await sql`
        INSERT INTO updates (project_id, today, tomorrow, completion_percent, source)
        VALUES (${projectId}, ${project.today}, ${project.tomorrow}, ${project.completion}, 'seed')
      `;
      projectCount++;
    }
  }

  await sql.end();
  console.log(`Seeded ${seed.length} area(s) and ${projectCount} project(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
