import Link from "next/link";
import { cloudPlans, formatPlanPrice } from "@/lib/cloud-plans";

export function CloudPricingTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? "md:grid-cols-2" : "lg:grid-cols-4"}`}>
      {cloudPlans.map((plan) => (
        <section
          key={plan.key}
          className="surface-solid p-5 flex flex-col"
          style={plan.key === "builder" ? { borderColor: "rgba(37, 99, 235, 0.28)" } : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="serif text-2xl">{plan.name}</h2>
              <p className="text-sm mt-2" style={{ color: "var(--color-ink-mute)" }}>{plan.description}</p>
            </div>
            {plan.key === "builder" && <span className="status-chip" style={{ color: "var(--color-info)" }}>Start</span>}
          </div>

          <div className="mt-5">
            <span className="serif text-4xl">{formatPlanPrice(plan)}</span>
            <span className="text-sm" style={{ color: "var(--color-ink-faint)" }}> / mo</span>
          </div>

          <dl className="grid grid-cols-2 gap-2 mt-5 text-sm">
            <PlanLimit label="Projects" value={String(plan.projects)} />
            <PlanLimit label="Runs/mo" value={plan.runsMonthly.toLocaleString()} />
            <PlanLimit label="Machines" value={String(plan.machines)} />
            <PlanLimit label="History" value={`${plan.retentionDays}d`} />
          </dl>

          <ul className="mt-5 space-y-2 text-sm flex-1" style={{ color: "var(--color-ink-mute)" }}>
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <Link href={`/cloud/signup?plan=${plan.key}`} className={`btn mt-5 ${plan.key === "builder" ? "btn-primary" : ""}`}>
            Choose {plan.name}
          </Link>
        </section>
      ))}
    </div>
  );
}

function PlanLimit({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] p-3" style={{ background: "var(--color-bg-sunken)" }}>
      <dt className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--color-ink-faint)" }}>{label}</dt>
      <dd className="font-semibold mt-1">{value}</dd>
    </div>
  );
}
