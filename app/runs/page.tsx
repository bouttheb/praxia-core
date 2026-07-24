import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RelativeTime } from "@/components/RelativeTime";
import { loadCommands } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const tone: Record<string, string> = {
  queued: "var(--color-info)",
  running: "var(--color-accent)",
  completed: "var(--color-success)",
  failed: "var(--color-danger)",
  blocked: "var(--color-danger)",
  needs_input: "var(--color-warn)",
  cancelled: "var(--color-ink-faint)",
};

export default async function RunsPage() {
  const commands = await loadCommands(100).catch(() => []);

  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[1100px] mx-auto">
          <header className="flex items-end justify-between gap-4 flex-wrap mb-8">
            <div>
              <div className="eyebrow">Daemon queue</div>
              <h1 className="serif text-4xl mt-2">Runs</h1>
            </div>
            <Link href="/chat" className="btn btn-primary">
              New command
            </Link>
          </header>

          <div className="space-y-3">
            {commands.map((command) => (
              <article key={command.id} className="surface-solid p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="status-chip" style={{ color: tone[command.status] ?? "var(--color-ink)" }}>
                        {command.status.replaceAll("_", " ")}
                      </span>
                      <span className="status-chip">{command.agent}</span>
                      {command.workflow_template_label && <span className="status-chip">{command.workflow_template_label}</span>}
                      {command.workflow_step_index != null && command.workflow_total_steps != null && (
                        <span className="status-chip">
                          Step {command.workflow_step_index + 1}/{command.workflow_total_steps}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{command.project_name}</span>
                    </div>
                    {command.workflow_step_title && (
                      <p className="mt-3 text-sm font-semibold">
                        {command.workflow_step_title}
                      </p>
                    )}
                    <p className="mt-3 text-sm whitespace-pre-wrap" style={{ color: "var(--color-ink-mute)" }}>
                      {command.body}
                    </p>
                  </div>
                  <div className="text-xs shrink-0" style={{ color: "var(--color-ink-faint)" }}>
                    <RelativeTime iso={command.created_at} />
                  </div>
                </div>
                {(command.result || command.error) && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-[10px] uppercase tracking-widest" style={{ color: "var(--color-ink-faint)" }}>
                      Result
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap text-xs p-3 rounded-[12px]" style={{ background: "var(--color-bg-sunken)" }}>
                      {command.error || command.result}
                    </pre>
                  </details>
                )}
              </article>
            ))}
          </div>

          {commands.length === 0 && (
            <div className="surface-solid p-6">
              No runs yet. Queue your first command from the command page.
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
