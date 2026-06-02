export type CloudPlanKey = "free" | "builder" | "pro" | "studio";

export type CloudPlan = {
  key: CloudPlanKey;
  name: string;
  priceMonthly: number;
  projects: number;
  runsMonthly: number;
  machines: number;
  retentionDays: number;
  members: number;
  description: string;
  features: string[];
};

export const cloudPlans: CloudPlan[] = [
  {
    key: "free",
    name: "Free",
    priceMonthly: 0,
    projects: 3,
    runsMonthly: 25,
    machines: 1,
    retentionDays: 7,
    members: 1,
    description: "Try the hosted dashboard with one local machine.",
    features: ["3 projects", "25 runs per month", "1 paired machine", "7-day run history"],
  },
  {
    key: "builder",
    name: "Builder",
    priceMonthly: 29,
    projects: 12,
    runsMonthly: 500,
    machines: 1,
    retentionDays: 30,
    members: 1,
    description: "For solo builders managing a real portfolio of AI coding projects.",
    features: ["12 projects", "500 runs per month", "1 paired machine", "30-day run history"],
  },
  {
    key: "pro",
    name: "Pro",
    priceMonthly: 59,
    projects: 36,
    runsMonthly: 1000,
    machines: 3,
    retentionDays: 180,
    members: 3,
    description: "For serious operators running projects across multiple machines.",
    features: ["36 projects", "1,000 runs per month", "3 paired machines", "180-day run history"],
  },
  {
    key: "studio",
    name: "Studio",
    priceMonthly: 129,
    projects: 100,
    runsMonthly: 3000,
    machines: 5,
    retentionDays: 365,
    members: 5,
    description: "For small teams and client-work studios coordinating many builds.",
    features: ["100 projects", "3,000 runs per month", "5+ paired machines", "1-year run history"],
  },
];

export function formatPlanPrice(plan: CloudPlan) {
  if (plan.priceMonthly === 0) return "$0";
  return `$${plan.priceMonthly}`;
}

export function getCloudPlan(key: string | null | undefined) {
  return cloudPlans.find((plan) => plan.key === key) ?? cloudPlans[1];
}
