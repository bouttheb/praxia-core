import { AppShell } from "@/components/AppShell";
import { ManageClient } from "@/components/ManageClient";

export const dynamic = "force-dynamic";

export default function ManagePage() {
  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[1180px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Project specs</div>
            <h1 className="serif text-4xl mt-2">Manage</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
              Edit project specs, source docs, default agents, daemon affinity, visibility, and dates.
            </p>
          </header>
          <ManageClient />
        </div>
      </main>
    </AppShell>
  );
}
