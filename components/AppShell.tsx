import { LeftNav } from "@/components/LeftNav";
import { loadAreas } from "@/lib/dashboard-data";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const areas = await loadAreas().catch(() => []);

  return (
    <div className="h-[100dvh] overflow-hidden flex" style={{ background: "var(--color-bg)" }}>
      <LeftNav areas={areas.map((area) => ({ id: area.id, name: area.name }))} />
      <div className="flex-1 min-w-0 flex overflow-hidden">{children}</div>
    </div>
  );
}
