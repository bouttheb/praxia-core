import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Monogram } from "@/components/Monogram";
import { RelativeTime } from "@/components/RelativeTime";
import { agentLabel } from "@/lib/agents";
import { commandPreview, shouldShowCommandDetails } from "@/lib/command-display";
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
      <AutoRefresh />
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
                <div className="flex items-start gap-4">
                  <Monogram name={command.project_name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{command.project_name}</span>
                      <span className="status-chip" style={{ color: tone[command.status] ?? "var(--color-ink)" }}>
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: tone[command.status] ?? "var(--color-ink-faint)" }}
                        />
                        {command.status.replaceAll("_", " ")}
                      </span>
                      <span className="status-chip">{agentLabel(command.agent)}</span>
                      {command.workflow_template_label && <span className="status-chip">{command.workflow_template_label}</span>}
                      {command.workflow_step_index != null && command.workflow_total_steps != null && (
                        <span className="status-chip">
                          Step {command.workflow_step_index + 1}/{command.workflow_total_steps}
                        </span>
                      )}
                    </div>
                    {command.workflow_step_title && (
                      <p className="mt-2.5 text-sm font-semibold">{command.workflow_step_title}</p>
                    )}
                    <p className="mt-2.5 text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-ink-mute)" }}>
                      {commandPreview(command.body)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                      <RelativeTime iso={command.created_at} />
                    </span>
                    <Link
                      href={`/chat?project=${command.project_id}`}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Open chat →
                    </Link>
                  </div>
                </div>
                {shouldShowCommandDetails(command.status, command.error, command.result) && (
                  <details className="mt-4 ml-[52px]">
                    <summary
                      className="cursor-pointer text-xs font-medium select-none"
                      style={{ color: "var(--color-ink-faint)" }}
                    >
                      Technical details
                    </summary>
                    <pre
                      className="mt-3 whitespace-pre-wrap text-xs p-3 rounded-[12px] leading-relaxed"
                      style={{ background: "var(--color-bg-sunken)", border: "1px solid var(--color-line)" }}
                    >
                      {command.error || command.result}
                    </pre>
                  </details>
                )}
              </article>
            ))}
          </div>

          {commands.length === 0 && (
            <div className="surface-solid px-6 py-14 flex flex-col items-center text-center">
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-[14px]"
                style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-strong)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h16M4 12h16M4 19h16" />
                </svg>
              </span>
              <h2 className="mt-4 font-semibold">No runs yet</h2>
              <p className="mt-1.5 text-sm max-w-[380px]" style={{ color: "var(--color-ink-mute)" }}>
                Every command you send from a project chat shows up here with its status and full output.
              </p>
              <Link href="/chat" className="btn btn-primary mt-5">
                Start a conversation
              </Link>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
