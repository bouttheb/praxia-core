import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getCloudPlan } from "@/lib/cloud-plans";

export const dynamic = "force-dynamic";

export default async function CloudSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan = getCloudPlan(params.plan);

  return (
    <AppShell loadNavAreas={false}>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[980px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Praxia Cloud</div>
            <h1 className="serif text-4xl mt-2">Create your workspace</h1>
            <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--color-ink-mute)" }}>
              Hosted signup will create an account, workspace, subscription, and first daemon pairing code.
            </p>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
            <form className="surface-solid p-5 space-y-4">
              <div className="eyebrow">Signup shell</div>
              <label className="block text-sm font-medium">
                Email
                <input className="input mt-2 w-full" type="email" placeholder="you@example.com" />
              </label>
              <label className="block text-sm font-medium">
                Name
                <input className="input mt-2 w-full" placeholder="Your name" />
              </label>
              <label className="block text-sm font-medium">
                Workspace
                <input className="input mt-2 w-full" placeholder="Personal workspace" />
              </label>
              <button type="button" className="btn btn-primary" disabled>
                Auth API next
              </button>
              <p className="text-sm" style={{ color: "var(--color-ink-faint)" }}>
                This page is the hosted signup surface; the next build connects it to sessions, email verification, Stripe checkout, and daemon pairing.
              </p>
            </form>

            <aside className="surface-solid p-5">
              <div className="eyebrow">Selected plan</div>
              <h2 className="serif text-3xl mt-2">{plan.name}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>{plan.description}</p>
              <dl className="mt-5 space-y-3 text-sm">
                <PlanRow label="Projects" value={String(plan.projects)} />
                <PlanRow label="Runs/mo" value={plan.runsMonthly.toLocaleString()} />
                <PlanRow label="Machines" value={String(plan.machines)} />
                <PlanRow label="Members" value={String(plan.members)} />
              </dl>
              <Link href="/cloud/pricing" className="btn mt-5">Change plan</Link>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt style={{ color: "var(--color-ink-mute)" }}>{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
