import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AreaSection } from "@/components/AreaSection";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DashboardPraxiaLauncher } from "@/components/DashboardPraxiaLauncher";
import { averageProgress, loadAreas, loadCommands } from "@/lib/dashboard-data";
import type { AreaWithProjects } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  let areas: AreaWithProjects[] = [];
  let connError: string | null = null;
  try {
    areas = await loadAreas();
  } catch (error) {
    connError = error instanceof Error ? error.message : "Failed to load projects.";
  }

  const totalProjects = areas.reduce((sum, area) => sum + area.projects.length, 0);
  const overall = averageProgress(areas);
  const commands = await loadCommands(8).catch(() => []);
  const activeRuns = commands.filter((command) => command.status === "queued" || command.status === "running").length;
  const blockedRuns = commands.filter((command) => command.status === "blocked" || command.status === "needs_input" || command.status === "failed").length;
  const dashboardProjects = areas.flatMap((area) =>
    area.projects.map((project) => ({
      id: project.id,
      name: project.name,
      area: area.name,
      description: project.description,
      vision_md: project.vision_md,
      last_today: project.latest_update?.today ?? null,
      last_tomorrow: project.latest_update?.tomorrow ?? null,
    })),
  );

  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <AutoRefresh />
        <div className="px-6 lg:px-10 py-8 max-w-[1200px] mx-auto">
          <header className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="eyebrow">Praxia Core</div>
              <h1 className="serif text-4xl mt-2">Project dashboard</h1>
              <div className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                {totalProjects > 0
                  ? `${totalProjects} projects across ${areas.length} areas - ${overall}% overall progress`
                  : "Add projects to start tracking AI coding work."}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <Link href="/chat" className="btn btn-primary">
                Command
              </Link>
              <Link href="/runs" className="btn">
                Runs
              </Link>
              <Link href="/setup" className="btn">
                Setup
              </Link>
            </div>
          </header>

          <DashboardPraxiaLauncher projects={dashboardProjects} />

          {connError && (
            <div className="surface-solid p-6 text-sm mb-8" style={{ color: "var(--color-danger)" }}>
              <div className="serif text-lg mb-2" style={{ color: "var(--color-ink)" }}>
                Database not connected
              </div>
              {connError}
              <div className="mt-3" style={{ color: "var(--color-ink-mute)" }}>
                Copy <code>.env.example</code> to <code>.env.local</code>, set <code>DATABASE_URL</code>, then run{" "}
                <code>npm run db:init && npm run db:seed</code>.
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3 mb-10">
            <MetricCard label="Projects" value={totalProjects} hint="tracked locally" />
            <MetricCard label="Active runs" value={activeRuns} hint="queued or running" />
            <MetricCard label="Needs attention" value={blockedRuns} hint="blocked, failed, or input needed" />
          </div>

          <div className="space-y-12">
            {areas.map((area) => {
              const areaPct = averageProgress([area]);
              return (
                <div id={`area-${area.id}`} key={area.id}>
                  <AreaSection area={area} areaPct={areaPct} />
                </div>
              );
            })}
          </div>

          {areas.length === 0 && !connError && (
            <div className="surface-solid p-6">
              <h2 className="serif text-2xl">No projects yet</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                Use the setup page or seed script to create your first area and project.
              </p>
              <Link href="/setup" className="btn btn-primary mt-4">
                Open setup
              </Link>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="surface-solid p-5">
      <div className="text-sm font-semibold" style={{ color: "var(--color-ink-mute)" }}>
        {label}
      </div>
      <div className="serif text-4xl mt-3">{value}</div>
      <div className="text-xs mt-1" style={{ color: "var(--color-ink-faint)" }}>
        {hint}
      </div>
    </div>
  );
}
