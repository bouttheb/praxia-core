import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import {
  buildNavigatorChatPrompt,
  buildNavigatorPlanPrompt,
  runNavigatorAgent,
} from "@/lib/navigator-agent";
import { requireCommandKeyIfConfigured } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

const execFileAsync = promisify(execFile);
const STATE_DIR = ".praxia-navigator";
const CLI = path.join(process.cwd(), "tools/praxia-navigator/bin/praxia-navigator.mjs");

type NavigatorAction =
  | "index"
  | "plan"
  | "authorize-selected"
  | "dispatch"
  | "work"
  | "handoff"
  | "ingest"
  | "loop"
  | "agent-run"
  | "report"
  | "chat";

const KNOWN_ACTIONS = new Set<NavigatorAction>([
  "index",
  "plan",
  "authorize-selected",
  "dispatch",
  "work",
  "handoff",
  "ingest",
  "loop",
  "agent-run",
  "report",
  "chat",
]);

function navigatorRoot() {
  return path.resolve(process.env.PRAXIA_NAVIGATOR_ROOT || path.join(process.cwd(), ".."));
}

function isNavigatorAction(value: unknown): value is NavigatorAction {
  return typeof value === "string" && KNOWN_ACTIONS.has(value as NavigatorAction);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(root: string, relativePath: string, fallback: T): Promise<T> {
  const fullPath = path.join(root, relativePath);
  if (!(await exists(fullPath))) return fallback;
  return JSON.parse(await fs.readFile(fullPath, "utf8")) as T;
}

async function listDir(root: string, relativePath: string): Promise<string[]> {
  const fullPath = path.join(root, relativePath);
  if (!(await exists(fullPath))) return [];
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() || entry.isDirectory())
    .map((entry) => path.posix.join(relativePath, entry.name))
    .sort();
}

async function latestPlan(root: string) {
  const plansDir = path.join(root, STATE_DIR, "plans");
  if (!(await exists(plansDir))) return null;
  const jsonFiles = (await fs.readdir(plansDir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();
  if (!jsonFiles[0]) return null;
  return JSON.parse(await fs.readFile(path.join(plansDir, jsonFiles[0]), "utf8"));
}

function hashString(value: string) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function stableTaskId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56);
  return `${slug || "task"}-${hashString(title).slice(0, 8)}`;
}

async function authorizeSelected(root: string, taskIds: string[]) {
  const plan = await latestPlan(root);
  if (!plan) throw new Error("No plan available");
  const selected = (plan.approvalTasks ?? []).filter((task: { id: string }) => taskIds.includes(task.id));
  if (!selected.length) throw new Error("No selected tasks found");

  const queuePath = path.join(root, STATE_DIR, "queue.json");
  const queue = await readJson<{ version: number; updatedAt: string | null; tasks: Array<Record<string, unknown>> }>(
    root,
    path.join(STATE_DIR, "queue.json"),
    { version: 1, updatedAt: null, tasks: [] },
  );
  const existing = new Set(queue.tasks.map((task) => String(task.id)));
  const now = new Date().toISOString();
  for (const task of selected) {
    const id = task.id ?? stableTaskId(task.title);
    if (existing.has(id)) continue;
    queue.tasks.push({
      id,
      title: task.title,
      status: "queued",
      sourcePlan: plan.markdownPath ?? path.posix.join(STATE_DIR, "plans", `${String(plan.id).replace(/^plan-/, "")}.md`),
      scope: task.scope,
      guardrails: task.guardrails,
      authorizedAt: now,
      updatedAt: now,
      notes: [],
    });
    existing.add(id);
  }
  queue.updatedAt = now;
  await fs.mkdir(path.dirname(queuePath), { recursive: true });
  await fs.writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  return { added: selected.length, queuePath: path.relative(root, queuePath) };
}

async function state(root: string) {
  const index = await readJson<{ generatedAt: string; files: unknown[]; projects: unknown[] } | null>(
    root,
    path.join(STATE_DIR, "index.json"),
    null,
  );
  const queue = await readJson<{ tasks: unknown[] }>(root, path.join(STATE_DIR, "queue.json"), { tasks: [] });
  return {
    root,
    index: index
      ? {
          generatedAt: index.generatedAt,
          files: index.files.length,
          projects: index.projects,
        }
      : null,
    latestPlan: await latestPlan(root),
    queue,
    artifacts: {
      handoffs: await listDir(root, path.join(STATE_DIR, "agent-handoffs")),
      results: await listDir(root, path.join(STATE_DIR, "agent-results")),
      reviews: await listDir(root, path.join(STATE_DIR, "reviews")),
      completions: await listDir(root, path.join(STATE_DIR, "completions")),
      proposals: await listDir(root, path.join(STATE_DIR, "proposals")),
      pulses: await listDir(root, path.join(STATE_DIR, "pulses")),
      reports: await listDir(root, path.join(STATE_DIR, "reports")),
    },
  };
}

async function runCli(root: string, args: string[]) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, ...args, "--root", root], {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 20,
  });
  return { stdout, stderr };
}

async function writeInboxText(root: string, text: string): Promise<string> {
  const inboxDir = path.join(root, STATE_DIR, "inbox");
  await fs.mkdir(inboxDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fullPath = path.join(inboxDir, `${stamp}.txt`);
  await fs.writeFile(fullPath, text);
  return path.relative(root, fullPath);
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export async function GET(req: Request) {
  const denied = requireCommandKeyIfConfigured(req);
  if (denied) return denied;
  return NextResponse.json(await state(navigatorRoot()));
}

export async function POST(req: Request) {
  const denied = requireCommandKeyIfConfigured(req);
  if (denied) return denied;

  const root = navigatorRoot();
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as NavigatorAction;
    if (!isNavigatorAction(action)) {
      return NextResponse.json({ error: "Unknown navigator action" }, { status: 400 });
    }

    // Agent-backed actions: Praxia Core is self-hosted, so Claude runs right
    // here on the server instead of via a queued daemon action.
    if (action === "plan") {
      const text = requireString(body.text, "text");
      const inboxPath = await writeInboxText(root, text);
      const reply = await runNavigatorAgent(root, buildNavigatorPlanPrompt(root, text, inboxPath));
      return NextResponse.json({ reply, state: await state(root) });
    }
    if (action === "chat") {
      const text = requireString(body.text, "text");
      const reply = await runNavigatorAgent(root, buildNavigatorChatPrompt(root, text));
      return NextResponse.json({ reply, state: await state(root) });
    }

    let result: { stdout: string; stderr: string } | null = null;

    if (action === "index") {
      result = await runCli(root, ["index"]);
    } else if (action === "authorize-selected") {
      const authorized = await authorizeSelected(root, Array.isArray(body.taskIds) ? body.taskIds.map(String) : []);
      return NextResponse.json({ result: authorized, state: await state(root) });
    } else if (action === "dispatch") {
      result = await runCli(root, ["dispatch", "--limit", String(body.limit ?? 1)]);
    } else if (action === "work") {
      result = await runCli(root, ["work", "--limit", String(body.limit ?? 3)]);
    } else if (action === "handoff") {
      result = await runCli(root, ["handoff", "--limit", String(body.limit ?? 3)]);
    } else if (action === "ingest") {
      const resultsDir = path.join(root, STATE_DIR, "manual-results");
      await fs.mkdir(resultsDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const resultFile = path.join(resultsDir, `${stamp}.json`);
      await fs.writeFile(resultFile, JSON.stringify(body.result, null, 2));
      result = await runCli(root, ["ingest", "--result", path.relative(root, resultFile)]);
    } else if (action === "loop") {
      result = await runCli(root, [
        "loop",
        "--cycles",
        String(body.cycles ?? 1),
        "--limit",
        String(body.limit ?? 3),
        "--interval-ms",
        String(body.intervalMs ?? 300000),
      ]);
    } else if (action === "agent-run") {
      result = await runCli(root, ["agent-run", "--command", requireString(body.command, "command"), "--limit", String(body.limit ?? 1)]);
    } else if (action === "report") {
      result = await runCli(root, ["report"]);
    }

    return NextResponse.json({ result, state: await state(root) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Navigator action failed" },
      { status: 400 },
    );
  }
}
