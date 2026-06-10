import { AppShell } from "@/components/AppShell";
import { ProjectChat } from "@/components/ProjectChat";
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
      <main className="flex-1 min-w-0 flex overflow-hidden">
        {projects.length > 0 ? (
          <ProjectChat
            projects={projects}
            initialProjectId={Number.isFinite(initialProjectId) ? initialProjectId : null}
            initialPrompt={params.prompt ?? ""}
          />
        ) : (
          <div className="p-10 flex-1">
            <div className="surface-solid p-6">Add a project before starting a conversation.</div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
