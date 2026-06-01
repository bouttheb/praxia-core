import { AppShell } from "@/components/AppShell";
import { ProjectCreateForm } from "@/components/ProjectCreateForm";
import { loadDaemonHeartbeats } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const heartbeats = await loadDaemonHeartbeats().catch(() => []);

  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[1100px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Setup</div>
            <h1 className="serif text-4xl mt-2">Connect your machine</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
              Praxia Core has two halves: this web dashboard and a local daemon running where your repos live.
            </p>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
            <div className="space-y-5">
              <SetupSteps />
              <ProjectCreateForm />
            </div>
            <aside className="space-y-5">
              <DaemonConnectionCard heartbeats={heartbeats} />
              <ProjectOnboardingCard />
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function SetupSteps() {
  return (
    <section className="surface-solid p-5">
      <div className="eyebrow">First run</div>
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <StepCard
          number="1"
          title="Start the web app"
          body="Create .env.local, set DATABASE_URL and DASHBOARD_WRITE_KEY, then initialize Postgres."
          command="npm run db:init"
        />
        <StepCard
          number="2"
          title="Start the daemon"
          body="Run the daemon on the computer that has your repos and logged-in AI CLIs."
          command="node daemon/dashboard-daemon.mjs"
        />
        <StepCard
          number="3"
          title="Add projects"
          body="Enter each repo's local path and choose whether Claude Code or Codex should run it."
          command="/setup"
        />
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  body,
  command,
}: {
  number: string;
  title: string;
  body: string;
  command: string;
}) {
  return (
    <div className="rounded-[16px] p-4" style={{ border: "1px solid var(--color-line)", background: "var(--color-bg-elevated)" }}>
      <div className="status-chip">{number}</div>
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-sm mt-2" style={{ color: "var(--color-ink-mute)" }}>{body}</p>
      <code className="block text-xs mt-3 rounded-[10px] p-2 overflow-x-auto" style={{ background: "var(--color-bg-sunken)" }}>
        {command}
      </code>
    </div>
  );
}

function DaemonConnectionCard({
  heartbeats,
}: {
  heartbeats: Array<{
    daemon_id: string;
    last_seen_at: string;
    dashboard_url: string | null;
    version: string | null;
    note: string | null;
  }>;
}) {
  return (
    <section className="surface-solid p-5">
      <div className="eyebrow">Daemon connection</div>
      <h2 className="serif text-2xl mt-2">Local runner</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
        The daemon polls this dashboard, claims queued commands, runs them in project folders, then posts results back.
      </p>

      <div className="mt-4 rounded-[14px] p-3" style={{ border: "1px solid var(--color-line)", background: "var(--color-bg-sunken)" }}>
        <code className="text-xs whitespace-pre-wrap">{`mkdir -p ~/.praxia
cp .env.local ~/.praxia/dashboard.env
node daemon/dashboard-daemon.mjs`}</code>
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--color-ink-faint)" }}>
          Connected machines
        </div>
        {heartbeats.length > 0 ? (
          <div className="mt-2 space-y-2">
            {heartbeats.map((heartbeat) => (
              <div key={heartbeat.daemon_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{heartbeat.daemon_id}</span>
                <span className="status-chip" style={{ color: isFresh(heartbeat.last_seen_at) ? "var(--color-success)" : "var(--color-warn)" }}>
                  {isFresh(heartbeat.last_seen_at) ? "online" : "quiet"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--color-ink-faint)" }}>
            No daemon heartbeat yet. Start the daemon after your database is configured.
          </p>
        )}
      </div>
    </section>
  );
}

function ProjectOnboardingCard() {
  return (
    <section className="surface-solid p-5">
      <div className="eyebrow">Project onboarding</div>
      <ol className="mt-4 space-y-3 text-sm" style={{ color: "var(--color-ink-mute)" }}>
        <li><strong style={{ color: "var(--color-ink)" }}>Choose an area.</strong> Examples: Open Source, Client Work, Personal.</li>
        <li><strong style={{ color: "var(--color-ink)" }}>Add the repo path.</strong> Use the path as seen by the daemon machine.</li>
        <li><strong style={{ color: "var(--color-ink)" }}>Pick an agent.</strong> Claude Code or Codex can be the project default.</li>
        <li><strong style={{ color: "var(--color-ink)" }}>Sync docs.</strong> Praxia reads README, VISION, and ARCHITECTURE files when available.</li>
        <li><strong style={{ color: "var(--color-ink)" }}>Queue a command.</strong> The daemon receives it and runs in that folder.</li>
      </ol>
    </section>
  );
}

function isFresh(iso: string) {
  return Date.now() - new Date(iso).getTime() < 90_000;
}
