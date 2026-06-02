import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CloudPricingTable } from "@/components/cloud/CloudPricingTable";

export const dynamic = "force-dynamic";

const phases = [
  {
    name: "Accounts",
    status: "Designing",
    body: "Hosted Praxia needs login, organizations, memberships, and project ownership before any command can be queued.",
  },
  {
    name: "Device pairing",
    status: "Scaffolded",
    body: "A short-lived pairing code turns a hosted account into an outbound-only daemon connection from the user's machine.",
  },
  {
    name: "Guided install",
    status: "Next",
    body: "The onboarding assistant should watch for prerequisites, explain each terminal command, and confirm heartbeat before importing projects.",
  },
  {
    name: "Billing",
    status: "Later",
    body: "Subscription limits should attach to organizations after auth and device pairing are proven reliable.",
  },
];

const pairingSteps = [
  "User creates an account and opens a workspace.",
  "Praxia Cloud creates a short-lived pairing code.",
  "The daemon runs on the user's machine and submits the code outbound.",
  "Cloud exchanges the code for a revocable device token.",
  "The daemon polls for commands scoped to that workspace and device.",
];

export default function CloudPage() {
  return (
    <AppShell loadNavAreas={false}>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[1120px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Hosted version</div>
            <h1 className="serif text-4xl mt-2">Praxia Cloud plan</h1>
            <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--color-ink-mute)" }}>
              The hosted product keeps the same local daemon model, but Praxia provides auth, Postgres, pairing, audit logs, billing, and the guided onboarding assistant.
            </p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Link href="/cloud/pricing" className="btn btn-primary">Pricing</Link>
              <Link href="/cloud/signup?plan=builder" className="btn">Signup shell</Link>
              <Link href="/cloud/login" className="btn">Login shell</Link>
            </div>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
            <div className="space-y-5">
              <section className="surface-solid p-5">
                <div className="eyebrow">Launch sequence</div>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  {phases.map((phase) => (
                    <div key={phase.name} className="rounded-[16px] p-4" style={{ border: "1px solid var(--color-line)", background: "var(--color-bg-elevated)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-semibold">{phase.name}</h2>
                        <span className="status-chip">{phase.status}</span>
                      </div>
                      <p className="text-sm mt-3" style={{ color: "var(--color-ink-mute)" }}>{phase.body}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3">
                  <div className="eyebrow">Pricing hypothesis</div>
                  <h2 className="serif text-2xl mt-2">Plans and limits</h2>
                </div>
                <CloudPricingTable compact />
              </section>

              <section className="surface-solid p-5">
                <div className="eyebrow">Pairing flow</div>
                <h2 className="serif text-2xl mt-2">Connect a user's machine without inbound access</h2>
                <ol className="mt-4 grid gap-3">
                  {pairingSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-[14px] p-3" style={{ border: "1px solid var(--color-line)", background: "var(--color-bg-elevated)" }}>
                      <span className="status-chip">{index + 1}</span>
                      <span className="text-sm" style={{ color: "var(--color-ink-mute)" }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="surface-solid p-5">
                <div className="eyebrow">Assistant script</div>
                <h2 className="serif text-2xl mt-2">What the hosted AI walks through</h2>
                <div className="mt-4 rounded-[14px] p-3" style={{ border: "1px solid var(--color-line)", background: "var(--color-bg-sunken)" }}>
                  <code className="text-xs whitespace-pre-wrap">{`1. Check Node, Git, Codex, and Claude Code.
2. Install the Praxia daemon package.
3. Pair this machine with the browser code.
4. Confirm heartbeat from the daemon.
5. Scan local project folders and import selected repos.
6. Queue a harmless first command and explain where the result appears.`}</code>
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="surface-solid p-5">
                <div className="eyebrow">Mode flag</div>
                <h2 className="serif text-2xl mt-2">Cloud stays off by default</h2>
                <p className="mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                  Self-hosted installs remain the default. Hosted-only APIs return disabled until the deployment sets <code>PRAXIA_MODE=cloud</code>.
                </p>
              </section>

              <section className="surface-solid p-5">
                <div className="eyebrow">Current scaffold</div>
                <ul className="mt-4 space-y-3 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                  <li><strong style={{ color: "var(--color-ink)" }}>Schema:</strong> accounts, sessions, invites, usage, devices, pairing codes, subscriptions, audit events.</li>
                  <li><strong style={{ color: "var(--color-ink)" }}>API:</strong> disabled-by-default pairing creation and completion endpoints.</li>
                  <li><strong style={{ color: "var(--color-ink)" }}>Docs:</strong> hosted architecture, milestones, and acceptance gates.</li>
                </ul>
              </section>

              <section className="surface-solid p-5">
                <div className="eyebrow">Security gates</div>
                <ul className="mt-4 space-y-3 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                  <li>Real auth before command creation.</li>
                  <li>Org-scoped queries before multi-tenant launch.</li>
                  <li>Revocable device tokens.</li>
                  <li>Audit events for every pairing and command.</li>
                  <li>Rate limits on pairing, command queueing, and daemon polling.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
