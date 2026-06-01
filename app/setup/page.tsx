import { AppShell } from "@/components/AppShell";
import { ProjectCreateForm } from "@/components/ProjectCreateForm";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[980px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Setup</div>
            <h1 className="serif text-4xl mt-2">Add your first project</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
              Point Praxia Core at repos on the machine where your daemon runs.
            </p>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5">
            <ProjectCreateForm />
            <aside className="surface-solid p-5 h-fit">
              <div className="eyebrow">Daemon</div>
              <ol className="mt-4 space-y-3 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                <li>1. Copy <code>.env.example</code> to <code>.env.local</code>.</li>
                <li>2. Set <code>DATABASE_URL</code> and <code>DASHBOARD_WRITE_KEY</code>.</li>
                <li>3. Run <code>npm run db:init</code>.</li>
                <li>4. Start the web app with <code>npm run dev</code>.</li>
                <li>5. Start the daemon with <code>node daemon/dashboard-daemon.mjs</code>.</li>
              </ol>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
