import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const STATE_DIR = ".praxia-navigator";

// Praxia Core is self-hosted: the web server runs on the same machine as the
// repos, so the Navigator's agent calls run Claude directly instead of queueing
// to a paired daemon.
export async function runNavigatorAgent(root: string, prompt: string): Promise<string> {
  const bin = process.env.CLAUDE_BIN || "claude";
  const { stdout } = await execFileAsync(bin, ["-p", "--permission-mode", "bypassPermissions", prompt], {
    cwd: root,
    maxBuffer: 1024 * 1024 * 20,
  });
  const reply = stdout.trim();
  if (!reply) throw new Error("The planner returned an empty reply.");
  return reply.slice(0, 12000);
}

export function latestNavigatorPlan(root: string) {
  const plansDir = path.join(root, STATE_DIR, "plans");
  if (!existsSync(plansDir)) return null;
  const jsonFiles = readdirSync(plansDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();
  if (!jsonFiles[0]) return null;
  return JSON.parse(readFileSync(path.join(plansDir, jsonFiles[0]), "utf8")) as Record<string, unknown> & {
    id?: string;
    generatedAt?: string;
    goals?: string[];
    blockers?: string[];
    openDecisions?: string[];
    recommendation?: { decision?: string; narrative?: string };
    approvalTasks?: Array<{ id: string; title: string; scope?: { targetProjects?: string[] } }>;
    projectMatches?: Array<{ root: string; score: number }>;
  };
}

export function latestNavigatorPlanFile(root: string) {
  const plansDir = path.join(root, STATE_DIR, "plans");
  if (!existsSync(plansDir)) return null;
  const jsonFiles = readdirSync(plansDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();
  return jsonFiles[0] ? `${STATE_DIR}/plans/${jsonFiles[0]}` : null;
}

export function buildNavigatorPlanPrompt(root: string, text: string, inboxPath: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return [
    "You are the Praxia Navigator planner. Your working directory is the Navigator workspace root; the user's projects live in subdirectories.",
    "",
    "A brain dump from the user is below. Turn it into an actionable plan grounded in this workspace.",
    "",
    "Navigator state lives in .praxia-navigator/:",
    "- plans/ holds plan versions; the newest <timestamp>.json + .md is the ACTIVE plan",
    "- index.json is a generated codebase index (very large; read selectively if helpful)",
    `- This brain dump is also saved at ${inboxPath}`,
    "",
    "Steps:",
    "1. Read the brain dump carefully. List the workspace directories (ls) to ground project references; briefly explore projects the dump mentions when it helps you scope tasks realistically.",
    "2. Convert the brain dump into the plan JSON below. Every entry in approvalTasks must be a CONCRETE work item from the brain dump (what to build/fix/change, in which project) — never process boilerplate. Cover everything material; merge duplicates; order by priority.",
    "3. Push back honestly. If something is not doable as described, underspecified, contradictory, or risky, say so: capture it in blockers / openDecisions AND raise direct questions in your reply. Do not silently include undoable tasks — flag or reshape them.",
    `4. Write the plan to .praxia-navigator/plans/${stamp}.json and a short human-readable summary to .praxia-navigator/plans/${stamp}.md. NEVER overwrite or delete existing plan files.`,
    "",
    "Plan JSON schema (match exactly — the dashboard renders these fields):",
    "{",
    `  "id": "plan-${stamp}",`,
    '  "version": 1,',
    `  "generatedAt": "${new Date().toISOString()}",`,
    '  "detectedCapabilities": ["..."],',
    '  "goals": ["..."],',
    '  "blockers": ["..."],',
    '  "openDecisions": ["..."],',
    '  "urgencySignals": ["..."],',
    '  "recommendation": { "decision": "<short headline>", "narrative": "<honest assessment, including your pushback>" },',
    '  "projectMatches": [{ "root": "<workspace dir>", "score": <integer, higher = more central> }],',
    '  "fileMatches": [],',
    '  "approvalTasks": [',
    "    {",
    '      "id": "<kebab-case-from-title>-<8 hex chars>",',
    '      "title": "<concrete task from the brain dump>",',
    '      "status": "proposed",',
    '      "authorization": "pending",',
    '      "guardrails": ["Do not change unrelated programs.", "Run the narrowest useful verification before marking complete."],',
    '      "scope": {',
    '        "relevantFiles": ["<real paths you verified, or empty>"],',
    '        "allowedActions": ["inspect", "edit relevant files", "run local verification", "update docs"],',
    '        "targetProjects": ["<workspace dirs>"],',
    '        "requiresApprovalFor": ["new program creation", "production data changes", "credential access", "destructive deletes"]',
    "      }",
    "    }",
    "  ]",
    "}",
    "",
    "Notes on fields: goals = the dump's real goals, deduplicated and cleaned up (not raw sentences). detectedCapabilities = up to 8 short lowercase tags. Use real workspace directory names in projectMatches/targetProjects.",
    "",
    "Finally, reply in plain prose (2-6 sentences, shown directly in the plan chat): summarize the plan and ask your pushback questions. Be direct and conversational.",
    "",
    "Brain dump:",
    '"""',
    text,
    '"""',
  ].join("\n");
}

export function buildNavigatorChatPrompt(root: string, message: string) {
  const plan = latestNavigatorPlan(root);
  const planFile = latestNavigatorPlanFile(root);
  const planSummary = plan
    ? JSON.stringify({
        id: plan.id,
        generatedAt: plan.generatedAt,
        goals: (plan.goals ?? []).slice(0, 16),
        blockers: (plan.blockers ?? []).slice(0, 8),
        openDecisions: (plan.openDecisions ?? []).slice(0, 8),
        approvalTasks: (plan.approvalTasks ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          targetProjects: task.scope?.targetProjects,
        })),
        recommendation: plan.recommendation,
        projectMatches: (plan.projectMatches ?? []).slice(0, 8).map((p) => ({ root: p.root, score: p.score })),
      })
    : null;

  return [
    "You are the Praxia Navigator planning assistant. Your working directory is the Navigator workspace root.",
    "",
    "Navigator state lives in .praxia-navigator/:",
    "- plans/ holds plan versions; the newest <timestamp>.json (+ matching .md) is the ACTIVE plan",
    "- inbox/ holds the brain-dump transcripts plans were generated from (newest file = latest brain dump)",
    "- queue.json holds tasks the user has authorized",
    "",
    planSummary ? `Active plan summary:\n${planSummary}` : "There is no plan yet.",
    planFile ? `Full active plan file: ${planFile}` : "",
    "",
    "The user says:",
    '"""',
    message,
    '"""',
    "",
    "Instructions:",
    "- If this is a question, answer it directly and concisely in plain prose (a few sentences, no headings). Read the plan file or the latest inbox transcript if you need detail.",
    "- If the user requests changes to the plan, apply them: copy the latest plan JSON, modify the relevant fields, and write it as a NEW version in .praxia-navigator/plans/ using a fresh UTC timestamp filename, plus a short matching .md summary. Keep ids of unchanged tasks stable. Never delete or overwrite existing plan files. Then reply with a 1-3 sentence summary of what changed.",
    "- Your reply is shown directly in the Navigator chat panel.",
  ].join("\n");
}
