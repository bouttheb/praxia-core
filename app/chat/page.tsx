import { AppShell } from "@/components/AppShell";
import { CommandComposer } from "@/components/CommandComposer";
import { loadAreas } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ project?: string; prompt?: string }>;

export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const areas = await loadAreas().catch(() => []);
  const projects = areas.flatMap((area) =>
    area.projects.map((project) => ({
      id: project.id,
      name: project.name,
      area: area.name,
      agent: project.agent,
    })),
  );
  const initialProjectId = Number(params.project);

  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[980px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Remote command</div>
            <h1 className="serif text-4xl mt-2">Command a project</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
              Queue work from your browser or phone. The paired daemon runs it on the machine that has the repo.
            </p>
          </header>
          {projects.length > 0 ? (
            <CommandComposer
              projects={projects}
              initialProjectId={Number.isFinite(initialProjectId) ? initialProjectId : null}
              initialPrompt={params.prompt ?? ""}
            />
          ) : (
            <div className="surface-solid p-6">
              Add a project before queueing commands.
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
