import { AppShell } from "@/components/AppShell";
import { NavigatorClient } from "@/components/NavigatorClient";

export const dynamic = "force-dynamic";

export default function NavigatorPage() {
  return (
    <AppShell>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[1480px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Weekly orchestration</div>
            <h1 className="serif text-4xl mt-2">Navigator</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
              Turn a long transcript into an approved work queue grounded in your local codebase.
            </p>
          </header>
          <NavigatorClient />
        </div>
      </main>
    </AppShell>
  );
}
