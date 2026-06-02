import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CloudPricingTable } from "@/components/cloud/CloudPricingTable";

export const dynamic = "force-dynamic";

export default function CloudPricingPage() {
  return (
    <AppShell loadNavAreas={false}>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[1180px] mx-auto">
          <header className="flex items-end justify-between gap-4 flex-wrap mb-8">
            <div>
              <div className="eyebrow">Praxia Cloud</div>
              <h1 className="serif text-4xl mt-2">Hosted pricing</h1>
              <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--color-ink-mute)" }}>
                Praxia Cloud sells the command center. Your own machine and AI accounts still run the code.
              </p>
            </div>
            <Link href="/cloud" className="btn">Cloud plan</Link>
          </header>

          <CloudPricingTable />
        </div>
      </main>
    </AppShell>
  );
}
